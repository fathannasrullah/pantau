#!/usr/bin/env node
/**
 * Mengambil data dari sumber publik lalu menuliskannya ke public/data/live.json,
 * yang ikut ter-deploy bersama situs.
 *
 * Kenapa lewat sini, bukan fetch langsung dari browser: BMKG dan MAGMA tidak
 * mengirim header CORS, jadi panggilan dari halaman statis akan diblokir
 * browser. Mengambilnya di CI membuat app tetap statis, sumbernya tetap resmi,
 * dan setiap angka membawa stempel waktu sendiri.
 *
 * Aturan main: satu sumber gagal tidak boleh menjatuhkan yang lain, dan tidak
 * boleh menjatuhkan build. Sumber yang gagal ditulis apa adanya (ok:false)
 * supaya app bisa menandainya, bukan diam-diam menampilkan angka lama.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '..', 'public', 'data', 'live.json')

const VOLCANO = { lat: -6.102, lon: 105.423 }
/** Perairan Selat Sunda di utara tubuh gunung, untuk tinggi gelombang. */
const STRAIT = { lat: -6.0, lon: 105.55 }
const QUAKE_RADIUS_KM = 300
/**
 * BMKG melaporkan gempa se-Indonesia. Untuk app tentang satu gunung, gempa di
 * Sulawesi hanya kebisingan — atau lebih buruk, dikira berhubungan. Hanya yang
 * sejangkauan Selat Sunda yang ditampilkan.
 */
const BMKG_RADIUS_KM = 500
/** Lebih tua dari ini bukan lagi "informasi terkini", hanya arsip. */
const BMKG_MAX_AGE_DAYS = 7
const TIMEOUT_MS = 20_000

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Cuplikan respons mentah terakhir per sumber, untuk laporan diagnostik. */
const rawSamples = new Map()

async function fetchJson(url, sampleKey, extraHeaders) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json', ...extraHeaders },
  })
  const text = await res.text()
  if (sampleKey && !rawSamples.has(sampleKey)) {
    rawSamples.set(sampleKey, text.slice(0, 600))
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`respons bukan JSON: ${text.slice(0, 80)}`)
  }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Angin permukaan di atas kawah — menentukan ke mana abu terbawa. */
async function wind() {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${VOLCANO.lat}&longitude=${VOLCANO.lon}` +
    '&current=wind_speed_10m,wind_direction_10m' +
    '&wind_speed_unit=kmh&timezone=UTC'
  const raw = await fetchJson(url, 'wind')
  const c = raw?.current
  const speed = num(c?.wind_speed_10m)
  const direction = num(c?.wind_direction_10m)
  if (speed === null || direction === null) throw new Error('field angin kosong')
  return {
    url,
    observedAt: str(c?.time) ? `${c.time}Z` : null,
    data: { speedKmh: speed, directionDeg: direction },
  }
}

/** Tinggi gelombang di Selat Sunda — bahaya khas Krakatau, bukan sekadar abu. */
async function waves() {
  const url =
    'https://marine-api.open-meteo.com/v1/marine' +
    `?latitude=${STRAIT.lat}&longitude=${STRAIT.lon}` +
    '&current=wave_height&timezone=UTC'
  const raw = await fetchJson(url, 'waves')
  const height = num(raw?.current?.wave_height)
  if (height === null) throw new Error('tinggi gelombang kosong')
  return {
    url,
    observedAt: str(raw.current?.time) ? `${raw.current.time}Z` : null,
    data: { waveHeightM: height },
  }
}

/**
 * Gempa di sekitar gunung, 24 jam terakhir, dari katalog USGS.
 *
 * Ini gempa tektonik regional, BUKAN kegempaan vulkanik (letusan, embusan,
 * tremor) yang hanya dimiliki seismograf pos pengamatan PVMBG. Labelnya di app
 * harus tetap membedakan keduanya.
 */
async function quakes() {
  const since = new Date(Date.now() - 24 * 3600_000)
  const url =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    `&latitude=${VOLCANO.lat}&longitude=${VOLCANO.lon}` +
    `&maxradiuskm=${QUAKE_RADIUS_KM}` +
    `&starttime=${since.toISOString()}&orderby=time`
  const weekUrl =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    `&latitude=${VOLCANO.lat}&longitude=${VOLCANO.lon}` +
    `&maxradiuskm=${QUAKE_RADIUS_KM}` +
    `&starttime=${new Date(Date.now() - 7 * 24 * 3600_000).toISOString()}`

  const [raw, weekRaw] = await Promise.all([
    fetchJson(url, 'quakes'),
    fetchJson(weekUrl).catch(() => null),
  ])
  const features = Array.isArray(raw?.features) ? raw.features : []

  // 24 ember satu jam, ember terakhir adalah jam berjalan.
  const hourly = new Array(24).fill(0)
  const events = []
  for (const f of features) {
    const ms = num(f?.properties?.time)
    if (ms === null) continue
    const hoursAgo = Math.floor((Date.now() - ms) / 3600_000)
    if (hoursAgo >= 0 && hoursAgo < 24) hourly[23 - hoursAgo] += 1
    const mag = num(f.properties?.mag)
    if (mag !== null) {
      events.push({
        mag,
        place: str(f.properties?.place),
        timeISO: new Date(ms).toISOString(),
        depthKm: num(f.geometry?.coordinates?.[2]),
      })
    }
  }
  events.sort((a, b) => b.mag - a.mag)

  return {
    url,
    observedAt: new Date().toISOString(),
    data: {
      radiusKm: QUAKE_RADIUS_KM,
      total: features.length,
      // Radius ini sering sepi selama sehari; hitungan sepekan mencegah grafik
      // kosong terbaca sebagai data yang gagal dimuat.
      total7d: Array.isArray(weekRaw?.features) ? weekRaw.features.length : null,
      hourly,
      largest: events[0] ?? null,
    },
  }
}

/** Gempa dirasakan versi BMKG — sumber resmi Indonesia, termasuk potensi tsunami. */
async function bmkg() {
  const base = 'https://data.bmkg.go.id/DataMKG/TEWS/'
  const latestUrl = `${base}autogempa.json`
  const recentUrl = `${base}gempaterkini.json`

  const [latestRaw, recentRaw] = await Promise.all([
    fetchJson(latestUrl, 'bmkg'),
    fetchJson(recentUrl).catch(() => null),
  ])

  const one = (g) => {
    if (!g || typeof g !== 'object') return null
    const wilayah = str(g.Wilayah)
    const magnitude = str(g.Magnitude)
    const dateTime = str(g.DateTime)
    if (!wilayah || !magnitude || !dateTime) return null
    const parsed = new Date(dateTime)
    if (Number.isNaN(parsed.getTime())) return null

    const [latText, lonText] = (str(g.Coordinates) || '').split(',')
    const lat = Number.parseFloat(latText)
    const lon = Number.parseFloat(lonText)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    return {
      timeISO: parsed.toISOString(),
      magnitude,
      depth: str(g.Kedalaman),
      area: wilayah,
      potential: str(g.Potensi),
      felt: str(g.Dirasakan),
      distanceKm: Math.round(distanceKm(VOLCANO.lat, VOLCANO.lon, lat, lon)),
    }
  }

  const candidates = [
    latestRaw?.Infogempa?.gempa,
    ...(Array.isArray(recentRaw?.Infogempa?.gempa)
      ? recentRaw.Infogempa.gempa
      : []),
  ]
    .map(one)
    .filter(Boolean)

  if (!candidates.length) throw new Error('bentuk autogempa.json tidak dikenali')

  const seen = new Set()
  const oldest = Date.now() - BMKG_MAX_AGE_DAYS * 24 * 3600_000
  const nearby = candidates
    .filter((q) => q.distanceKm <= BMKG_RADIUS_KM)
    .filter((q) => new Date(q.timeISO).getTime() >= oldest)
    .filter((q) => !seen.has(q.timeISO) && seen.add(q.timeISO))
    .sort((a, b) => b.timeISO.localeCompare(a.timeISO))
    .slice(0, 4)

  return {
    url: latestUrl,
    observedAt: nearby[0]?.timeISO ?? candidates[0].timeISO,
    data: { radiusKm: BMKG_RADIUS_KM, scanned: candidates.length, nearby },
  }
}

/**
 * Level status resmi dari MAGMA Indonesia.
 *
 * Endpoint-nya ada dan terbuka untuk siapa pun yang punya token: tanpa header
 * Authorization ia menjawab 401 {"message":"Token not provided"}. Jadi yang
 * menghalangi bukan ketiadaan API, melainkan kredensial.
 *
 * Tanpa token, sumber ini sengaja dicatat gagal dengan alasannya, supaya app
 * menampilkan sebabnya alih-alih diam — dan level status tetap data contoh.
 */
async function magma() {
  const token = process.env.MAGMA_TOKEN
  if (!token) {
    throw new Error(
      'MAGMA_TOKEN belum disetel — level status resmi butuh token Badan Geologi',
    )
  }
  const url = 'https://magma.esdm.go.id/api/v1/magma-var'
  const raw = await fetchJson(url, 'magma', {
    authorization: `Bearer ${token}`,
  })

  // Bentuk responsnya belum pernah terlihat dari sini. Cuplikan mentahnya ikut
  // terbit sebagai annotation, jadi putaran berikutnya bisa memetakannya dengan
  // tepat. Sampai itu terjadi, jangan mengarang level dari tebakan bentuk.
  throw new Error(
    `token diterima, bentuk respons perlu dipetakan dulu: ${JSON.stringify(raw).slice(0, 200)}`,
  )
}

/**
 * Katalog erupsi Smithsonian GVP — terbuka, tanpa kunci.
 *
 * Ini catatan ilmiah global, bukan level status Indonesia, dan pembaruannya
 * mingguan. Berguna sebagai konteks "erupsi terakhir yang tercatat", bukan
 * sebagai dasar tindakan.
 */
async function gvp() {
  const url =
    'https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows' +
    '?service=WFS&version=2.0.0&request=GetFeature' +
    '&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions' +
    '&outputFormat=application/json&count=1' +
    '&CQL_FILTER=Volcano_Number=262000' +
    '&sortBy=StartDateYear+D'
  const raw = await fetchJson(url, 'gvp')
  const props = raw?.features?.[0]?.properties
  if (!props || typeof props !== 'object') {
    throw new Error('katalog erupsi kosong untuk Krakatau')
  }

  const year = num(props.StartDateYear)
  const month = num(props.StartDateMonth)
  const day = num(props.StartDateDay)
  if (year === null) throw new Error('tahun mulai erupsi kosong')

  return {
    url,
    observedAt: null,
    data: {
      activityType: str(props.Activity_Type),
      area: str(props.ActivityArea),
      vei: num(props.ExplosivityIndexMax),
      startYear: year,
      startMonth: month,
      startDay: day,
      // Catatan tanpa tanggal akhir berarti erupsinya belum dinyatakan selesai.
      ongoing: num(props.EndDateYear) === null,
    },
  }
}

const SOURCES = [
  { id: 'wind', label: 'Open-Meteo — angin permukaan di atas kawah', run: wind },
  { id: 'waves', label: 'Open-Meteo Marine — gelombang Selat Sunda', run: waves },
  {
    id: 'quakes',
    label: `USGS — gempa tektonik dalam ${QUAKE_RADIUS_KM} km, 24 jam terakhir`,
    run: quakes,
  },
  { id: 'bmkg', label: 'BMKG — gempa terkini dan potensi tsunami', run: bmkg },
  {
    id: 'magma',
    label: 'MAGMA Indonesia / PVMBG — level status resmi',
    run: magma,
  },
  { id: 'gvp', label: 'Smithsonian GVP — katalog erupsi', run: gvp },
]

/**
 * Workflow command hanya menerima satu baris; baris baru dan persen harus
 * dikodekan supaya pesannya tidak terpotong.
 */
function encodeAnnotation(text) {
  return text
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

/**
 * Annotation per sumber. Berbeda dengan ringkasan job, annotation bisa dibaca
 * lewat API publik, jadi hasil sungguhannya dapat diperiksa dari luar tanpa
 * membuka log CI.
 */
function emitAnnotations(sources) {
  if (!process.env.GITHUB_ACTIONS) return
  for (const [id, s] of Object.entries(sources)) {
    const detail = s.ok
      ? `parsed=${JSON.stringify(s.data).slice(0, 500)}`
      : `error=${s.error}`
    const sample = rawSamples.get(id)
    const body = [
      `${id}: ${s.ok ? 'ok' : 'GAGAL'}`,
      detail,
      sample ? `raw=${sample.slice(0, 500)}` : 'raw=(tidak ada respons)',
    ].join('\n')
    console.log(
      `::notice title=sumber-${id}::${encodeAnnotation(body)}`,
    )
  }
}

/**
 * Laporan ke ringkasan job Actions: nilai hasil parsing berdampingan dengan
 * cuplikan respons mentah. Tanpa ini, step yang hijau tidak membuktikan apa pun
 * karena sumber yang gagal pun sengaja tidak menjatuhkan build.
 */
async function writeSummary(sources) {
  const path = process.env.GITHUB_STEP_SUMMARY
  if (!path) return

  const rows = Object.entries(sources).map(([id, s]) =>
    `| \`${id}\` | ${s.ok ? 'ok' : 'GAGAL'} | ${
      s.ok ? JSON.stringify(s.data).slice(0, 220) : s.error
    } |`,
  )

  const details = Object.keys(sources).map((id) => {
    const sample = rawSamples.get(id)
    if (!sample) return `**${id}** — tidak ada respons yang terbaca.`
    return [
      `<details><summary>${id} — respons mentah (600 karakter pertama)</summary>`,
      '',
      '```json',
      sample.replace(/```/g, '`​``'),
      '```',
      '</details>',
    ].join('\n')
  })

  const body = [
    '## Hasil pengambilan sumber resmi',
    '',
    '| Sumber | Status | Nilai hasil parsing / error |',
    '| --- | --- | --- |',
    ...rows,
    '',
    ...details,
    '',
  ].join('\n')

  await writeFile(path, body, { flag: 'a' })
}

async function main() {
  const sources = {}
  let okCount = 0

  for (const { id, label, run } of SOURCES) {
    const fetchedAt = new Date().toISOString()
    try {
      const { url, observedAt, data } = await run()
      sources[id] = { ok: true, label, url, fetchedAt, observedAt, data }
      okCount += 1
      console.log(`ok    ${id}  ${label}`)
    } catch (err) {
      sources[id] = {
        ok: false,
        label,
        url: null,
        fetchedAt,
        observedAt: null,
        error: err instanceof Error ? err.message : String(err),
      }
      console.warn(`GAGAL ${id}  ${sources[id].error}`)
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    volcano: VOLCANO,
    sources,
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  await writeSummary(sources)
  emitAnnotations(sources)
  console.log(`\n${okCount}/${SOURCES.length} sumber berhasil → ${OUT}`)

  // Sengaja selalu exit 0: deploy tetap jalan, dan app menandai sendiri sumber
  // mana yang kosong. Build merah hanya akan membuat situs ikut hilang.
}

await main()
