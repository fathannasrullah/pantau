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
const TIMEOUT_MS = 20_000

async function fetchJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.json()
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
  const raw = await fetchJson(url)
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
  const raw = await fetchJson(url)
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
  const raw = await fetchJson(url)
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
    fetchJson(latestUrl),
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
    return {
      timeISO: parsed.toISOString(),
      magnitude,
      depth: str(g.Kedalaman),
      area: wilayah,
      potential: str(g.Potensi),
      felt: str(g.Dirasakan),
    }
  }

  const latest = one(latestRaw?.Infogempa?.gempa)
  if (!latest) throw new Error('bentuk autogempa.json tidak dikenali')

  const listRaw = recentRaw?.Infogempa?.gempa
  const recent = (Array.isArray(listRaw) ? listRaw : [])
    .map(one)
    .filter(Boolean)
    .slice(0, 5)

  return {
    url: latestUrl,
    observedAt: latest.timeISO,
    data: { latest, recent },
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
]

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
  console.log(`\n${okCount}/${SOURCES.length} sumber berhasil → ${OUT}`)

  // Sengaja selalu exit 0: deploy tetap jalan, dan app menandai sendiri sumber
  // mana yang kosong. Build merah hanya akan membuat situs ikut hilang.
}

await main()
