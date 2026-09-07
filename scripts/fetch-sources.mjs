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
const OUT_DIR = resolve(HERE, '..', 'public', 'data')

/**
 * Registri gunung. Koordinat dan ketinggian berasal dari katalog Holocene
 * Volcanoes Smithsonian, diverifikasi lewat scripts/probe-sources.mjs.
 *
 * Harus tetap sama dengan src/data/volcanoes.ts.
 */
const VOLCANOES = [
  {
    id: 'krakatau',
    name: 'Anak Krakatau',
    lat: -6.1009,
    lon: 105.4233,
    gvp: 262000,
    strait: { lat: -6.0, lon: 105.55 },
  },
  { id: 'semeru', name: 'Semeru', lat: -8.108, lon: 112.922, gvp: 263300, strait: null },
  { id: 'lewotolok', name: 'Ili Lewotolok', lat: -8.274, lon: 123.508, gvp: 264230, strait: null },
  { id: 'lewotobi', name: 'Lewotobi Laki-laki', lat: -8.542, lon: 122.775, gvp: 264180, strait: null },
  { id: 'ibu', name: 'Ibu', lat: 1.4941, lon: 127.6324, gvp: 268030, strait: null },
  { id: 'dukono', name: 'Dukono', lat: 1.6992, lon: 127.8783, gvp: 268010, strait: null },
  { id: 'sinabung', name: 'Sinabung', lat: 3.17, lon: 98.392, gvp: 261080, strait: null },
]
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

/**
 * Kegagalan di tingkat koneksi ("fetch failed", timeout) sering hanya sesaat,
 * apalagi saat banyak permintaan berangkat berbarengan. Dicoba ulang beberapa
 * kali sebelum sumbernya dinyatakan gagal — berbeda dengan jawaban HTTP 4xx,
 * yang memang keputusan server dan tidak akan berubah bila diulang.
 */
async function fetchWithRetry(url, options, attempts = 3) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (err) {
      lastError = err
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)))
      }
    }
  }
  throw lastError
}

async function fetchJson(url, sampleKey, extraHeaders) {
  const res = await fetchWithRetry(url, {
    headers: { accept: 'application/json', ...extraHeaders },
  })
  const text = await res.text()
  if (sampleKey && !rawSamples.has(sampleKey)) {
    rawSamples.set(sampleKey, text.slice(0, 600))
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  // EMSC menjawab dengan badan kosong ketika tidak ada gempa sama sekali dalam
  // jendela yang diminta. Itu jawaban "nol kejadian", bukan kegagalan sumber.
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`respons bukan JSON: ${text.slice(0, 80)}`)
  }
}

let bmkgCache = null

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Angin permukaan di atas kawah — menentukan ke mana abu terbawa. */
async function wind(V) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${V.lat}&longitude=${V.lon}` +
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
async function waves(V) {
  const url =
    'https://marine-api.open-meteo.com/v1/marine' +
    `?latitude=${V.strait.lat}&longitude=${V.strait.lon}` +
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
async function quakes(V) {
  const since = new Date(Date.now() - 24 * 3600_000)
  const url =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    `&latitude=${V.lat}&longitude=${V.lon}` +
    `&maxradiuskm=${QUAKE_RADIUS_KM}` +
    `&starttime=${since.toISOString()}&orderby=time`
  const weekUrl =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    `&latitude=${V.lat}&longitude=${V.lon}` +
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
async function bmkg(V) {
  const base = 'https://data.bmkg.go.id/DataMKG/TEWS/'
  const latestUrl = `${base}autogempa.json`
  const recentUrl = `${base}gempaterkini.json`

  // Satu daftar untuk semua gunung: diambil sekali lalu disaring per gunung,
  // supaya BMKG tidak dipanggil tujuh kali untuk isi yang sama.
  bmkgCache ??= Promise.all([
    fetchJson(latestUrl, 'bmkg'),
    fetchJson(recentUrl).catch(() => null),
  ])
  const [latestRaw, recentRaw] = await bmkgCache

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
      distanceKm: Math.round(distanceKm(V.lat, V.lon, lat, lon)),
      // Episentrum disimpan supaya bisa digambar di peta, bukan hanya dihitung
      // jaraknya lalu dibuang.
      lat,
      lon,
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
 * Kualitas udara di atas gunung — SO2 penanda degassing, PM10 dan AOD penanda abu.
 *
 * Ini keluaran model CAMS (Copernicus), bukan pembacaan stasiun di darat. Cukup
 * untuk menunjukkan kecenderungan, tidak cukup untuk diklaim sebagai pengukuran.
 */
async function air(V) {
  const url =
    'https://air-quality-api.open-meteo.com/v1/air-quality' +
    `?latitude=${V.lat}&longitude=${V.lon}` +
    '&current=sulphur_dioxide,pm10,pm2_5,aerosol_optical_depth&timezone=UTC'
  const raw = await fetchJson(url, 'air')
  const c = raw?.current
  const so2 = num(c?.sulphur_dioxide)
  const pm10 = num(c?.pm10)
  if (so2 === null || pm10 === null) throw new Error('field kualitas udara kosong')
  return {
    url,
    observedAt: str(c?.time) ? `${c.time}Z` : null,
    data: {
      so2,
      pm10,
      pm25: num(c?.pm2_5),
      aod: num(c?.aerosol_optical_depth),
    },
  }
}

/**
 * Katalog gempa EMSC.
 *
 * Dipakai berdampingan dengan USGS karena ambang magnitudonya untuk kawasan ini
 * lebih rendah: pada pengujian, USGS mencatat nol kejadian dalam radius 300 km
 * sementara EMSC memuat beberapa, sebagian di antaranya justru bersumber BMKG.
 */
async function emsc(V) {
  const bucket = (features) => {
    const hourly = new Array(24).fill(0)
    let largest = null
    for (const f of features) {
      const p = f?.properties
      const t = str(p?.time)
      if (!t) continue
      const ms = new Date(t).getTime()
      if (Number.isNaN(ms)) continue
      const hoursAgo = Math.floor((Date.now() - ms) / 3600_000)
      if (hoursAgo >= 0 && hoursAgo < 24) hourly[23 - hoursAgo] += 1
      const mag = num(p?.mag)
      if (mag !== null && (!largest || mag > largest.mag)) {
        largest = {
          mag,
          place: str(p?.flynn_region),
          timeISO: new Date(ms).toISOString(),
        }
      }
    }
    return { hourly, largest }
  }

  const base =
    'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=500' +
    `&lat=${V.lat}&lon=${V.lon}&maxradius=3`
  const dayUrl = `${base}&starttime=${new Date(Date.now() - 24 * 3600_000).toISOString()}`
  const weekUrl = `${base}&starttime=${new Date(Date.now() - 7 * 24 * 3600_000).toISOString()}`

  const [dayRaw, weekRaw] = await Promise.all([
    fetchJson(dayUrl, 'emsc'),
    fetchJson(weekUrl).catch(() => null),
  ])
  const features = Array.isArray(dayRaw?.features) ? dayRaw.features : []
  const { hourly, largest } = bucket(features)

  return {
    url: dayUrl,
    observedAt: new Date().toISOString(),
    data: {
      // 3 derajat busur di lintang ini kira-kira 333 km.
      radiusKm: 333,
      total: features.length,
      total7d: Array.isArray(weekRaw?.features) ? weekRaw.features.length : null,
      hourly,
      largest,
    },
  }
}

/**
 * Peringatan abu vulkanik untuk penerbangan (SIGMET internasional).
 *
 * Ini pernyataan resmi otoritas penerbangan lewat NOAA Aviation Weather Center,
 * bukan inferensi kita. Diverifikasi lewat probe: 127 peringatan aktif dengan 10
 * di antaranya berkode bahaya "VA", lengkap dengan poligon sebaran, ketinggian
 * puncak awan abu, serta arah dan kecepatan geraknya.
 *
 * Catatan penting: kode bahayanya "VA", bukan "ASH". Penyaringan memakai "ASH"
 * akan mengembalikan nol hasil.
 *
 * Feed ini global, jadi harus disaring: peringatan abu di Kolombia tidak boleh
 * muncul saat memantau Krakatau. Disaring dua arah — jarak poligon ke kawah,
 * atau nama gunung yang tersebut di teks resminya.
 */
const SIGMET_RADIUS_KM = 500

async function sigmet(V) {
  const url = 'https://aviationweather.gov/api/data/isigmet?format=geojson'
  const raw = await fetchJson(url, 'sigmet')
  const features = Array.isArray(raw?.features) ? raw.features : []

  const nearby = []
  for (const f of features) {
    const p = f?.properties
    if (!p || p.hazard !== 'VA') continue

    const rings = f.geometry?.coordinates
    const points = []
    // Poligon bisa bersarang satu atau dua tingkat; ratakan yang berbentuk pasangan.
    const walk = (node) => {
      if (!Array.isArray(node)) return
      if (typeof node[0] === 'number' && typeof node[1] === 'number') {
        points.push([node[0], node[1]])
        return
      }
      for (const child of node) walk(child)
    }
    walk(rings)

    let closestKm = Infinity
    for (const [lon, lat] of points) {
      const d = distanceKm(V.lat, V.lon, lat, lon)
      if (d < closestKm) closestKm = d
    }

    const text = str(p.rawSigmet) || ''
    // AWC menyediakan medan `qualifier` berisi nama gunung yang dimaksud —
    // pernyataan terstruktur, lebih kuat daripada mencocokkan teks bebas.
    // Regex atas rawSigmet tetap dipakai sebagai cadangan bila medan itu kosong.
    const stem = V.name.replace(/^(Anak|Ili|Gunung)\s+/i, '').split(' ')[0]
    const qualifier = str(p.qualifier) || ''
    const namedHere = qualifier
      ? new RegExp(stem, 'i').test(qualifier)
      : new RegExp(stem, 'i').test(text)

    if (!namedHere && closestKm > SIGMET_RADIUS_KM) continue

    nearby.push({
      fir: str(p.firName),
      validFrom: str(p.validTimeFrom),
      validTo: str(p.validTimeTo),
      // base dan top dilaporkan dalam kaki di atas permukaan laut.
      baseFt: num(p.base),
      topFt: num(p.top),
      moveDir: str(p.dir),
      moveSpeedKt: num(Number.parseFloat(str(p.spd) ?? '')),
      distanceKm: Number.isFinite(closestKm) ? Math.round(closestKm) : null,
      // Bentuk asli poligon advisory, dibalik ke [lintang, bujur] supaya peta
      // bisa menggambar area sebenarnya, bukan bentuk ilustrasi.
      polygon: points.length >= 3 ? points.map(([lon, lat]) => [lat, lon]) : null,
      namedHere,
      // Nama gunung menurut penerbit advisory, apa adanya.
      qualifier: qualifier || null,
      text,
    })
  }

  nearby.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))

  // Konteks nasional: berapa peringatan abu sedang berlaku di seluruh ruang
  // udara Indonesia, bukan hanya di sekitar gunung yang dipantau. FIR Indonesia
  // berkode WI (Jakarta) dan WA (Ujung Pandang).
  const indonesia = features.filter((f) => {
    const p = f?.properties
    return p?.hazard === 'VA' && /^W[IA]/.test(str(p.firId) || '')
  })

  return {
    url,
    observedAt: null,
    data: {
      radiusKm: SIGMET_RADIUS_KM,
      scanned: features.length,
      nearby,
      nasional: {
        total: indonesia.length,
        gunung: [
          ...new Set(indonesia.map((f) => str(f.properties?.qualifier)).filter(Boolean)),
        ].sort(),
        fir: [
          ...new Set(indonesia.map((f) => str(f.properties?.firName)).filter(Boolean)),
        ].sort(),
      },
    },
  }
}

/** Lingkaran kasar di sekitar kawah, untuk meminta hitungan penduduk. */
function circleGeoJson(lat, lon, km, points = 24) {
  const coords = []
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 2 * Math.PI
    const dLat = (km / 111.32) * Math.cos(angle)
    const dLon = ((km / 111.32) * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180)
    coords.push([lon + dLon, lat + dLat])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

/** Radius yang dihitung: sekitar kawah, jangkauan awan panas, dan sebaran abu. */
const POP_RINGS_KM = [5, 10, 30]
const POP_YEAR = 2020

/**
 * Perkiraan jumlah penduduk di dalam beberapa radius dari kawah, dari WorldPop.
 *
 * Ini keluaran model raster 100 m untuk tahun 2020 — bukan sensus terkini dan
 * bukan hitungan orang yang benar-benar ada di sana hari ini. Tetap berguna
 * karena menjawab "berapa banyak orang tinggal sedekat itu", pertanyaan yang
 * selama ini dijawab dengan angka karangan.
 */
async function population(V) {
  const rings = []
  for (const km of POP_RINGS_KM) {
    const geo = encodeURIComponent(
      JSON.stringify(circleGeoJson(V.lat, V.lon, km)),
    )
    const url =
      'https://api.worldpop.org/v1/services/stats' +
      `?dataset=wpgppop&year=${POP_YEAR}&geojson=${geo}&runasync=false`
    const raw = await fetchJson(url, km === POP_RINGS_KM[0] ? 'population' : null)
    const total = num(raw?.data?.total_population)
    if (total === null) throw new Error(`hitungan radius ${km} km kosong`)
    rings.push({ radiusKm: km, people: Math.round(total) })
  }

  return {
    url: 'https://api.worldpop.org/v1/services/stats',
    observedAt: null,
    data: { dataset: 'wpgppop', year: POP_YEAR, rings },
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
async function magma(V) {
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
async function gvp(V) {
  const url =
    'https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows' +
    '?service=WFS&version=2.0.0&request=GetFeature' +
    '&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions' +
    '&outputFormat=application/json&count=1' +
    `&CQL_FILTER=Volcano_Number=${V.gvp}` +
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

/**
 * Angin per lapisan tekanan di atas kawah.
 *
 * Angin permukaan menentukan ke mana abu tipis jatuh di sekitar gunung; angin
 * di ketinggian menentukan ke mana kolom abu terbawa — dan itulah yang penting
 * bagi penerbangan. Tinggi tiap lapisan diambil apa adanya dari medan
 * geopotential_height, bukan dari tabel perkiraan.
 */
const PRESSURE_LEVELS = [850, 700, 500, 400, 300, 250, 200]

async function windAloft(V) {
  const fields = PRESSURE_LEVELS.flatMap((hPa) => [
    `wind_speed_${hPa}hPa`,
    `wind_direction_${hPa}hPa`,
    `geopotential_height_${hPa}hPa`,
  ]).join(',')
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${V.lat}&longitude=${V.lon}` +
    `&hourly=${fields}` +
    '&forecast_days=1&wind_speed_unit=kmh&timezone=UTC'
  const raw = await fetchJson(url, 'windaloft')
  const h = raw?.hourly
  const times = Array.isArray(h?.time) ? h.time : []
  if (!times.length) throw new Error('deret waktu angin atas kosong')

  // Ambil jam terdekat yang sudah lewat, bukan jam pertama hari itu.
  const nowMs = Date.now()
  let index = 0
  for (let i = 0; i < times.length; i += 1) {
    if (new Date(`${times[i]}Z`).getTime() <= nowMs) index = i
  }

  const levels = []
  for (const hPa of PRESSURE_LEVELS) {
    const speed = num(h[`wind_speed_${hPa}hPa`]?.[index])
    const direction = num(h[`wind_direction_${hPa}hPa`]?.[index])
    const height = num(h[`geopotential_height_${hPa}hPa`]?.[index])
    // Satu lapisan yang tidak lengkap dilewati; jangan ditebak dari tetangganya.
    if (speed === null || direction === null || height === null) continue
    levels.push({ hPa, speedKmh: speed, directionDeg: direction, heightM: height })
  }
  if (!levels.length) throw new Error('tidak ada lapisan tekanan yang utuh')

  return {
    url,
    observedAt: `${times[index]}Z`,
    data: { levels },
  }
}

/**
 * Bandara berjadwal di sekitar gunung, dari katalog terbuka OurAirports.
 *
 * Ini data acuan — nama, kode, dan koordinat — bukan status operasional. Status
 * buka-tutup adalah kewenangan otoritas bandara dan tidak ada di sini. Gunanya:
 * app bisa menghitung sendiri bandara mana yang koordinatnya berada di dalam
 * area peringatan abu yang sedang berlaku.
 */
const AIRPORT_RADIUS_KM = 400
const AIRPORTS_URL =
  'https://davidmegginson.github.io/ourairports-data/airports.csv'

/** Pembaca CSV seadanya yang menghormati tanda kutip dan koma di dalamnya. */
function parseCsvLine(line) {
  const out = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      out.push(field)
      field = ''
    } else field += c
  }
  out.push(field)
  return out
}

let airportsCache = null

async function airports(V) {
  if (!airportsCache) {
    airportsCache = (async () => {
      const res = await fetchWithRetry(AIRPORTS_URL, {
        headers: { accept: 'text/csv' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const text = await res.text()
      const lines = text.split(/\r?\n/)
      const header = parseCsvLine(lines[0] ?? '')
      const col = (name) => header.indexOf(name)
      const iCountry = col('iso_country')
      const iService = col('scheduled_service')
      const iType = col('type')
      const iName = col('name')
      const iLat = col('latitude_deg')
      const iLon = col('longitude_deg')
      const iIcao = col('icao_code')
      const iIata = col('iata_code')
      const iCity = col('municipality')
      if (iCountry < 0 || iLat < 0 || iLon < 0) {
        throw new Error('kolom katalog bandara tidak dikenali')
      }

      const rows = []
      for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i]
        if (!line || !line.includes('"ID"')) continue
        const f = parseCsvLine(line)
        if (f[iCountry] !== 'ID') continue
        if (f[iService] !== 'yes') continue
        // Lapangan terbang kecil tanpa penerbangan berjadwal bukan urusan
        // penumpang; yang ditampilkan hanya bandara yang benar-benar dipakai.
        if (!['large_airport', 'medium_airport'].includes(f[iType])) continue
        const lat = Number.parseFloat(f[iLat])
        const lon = Number.parseFloat(f[iLon])
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
        rows.push({
          name: f[iName] || null,
          city: f[iCity] || null,
          icao: f[iIcao] || null,
          iata: f[iIata] || null,
          lat,
          lon,
        })
      }
      return rows
    })()
  }

  const all = await airportsCache
  const nearby = all
    .map((a) => ({ ...a, distanceKm: Math.round(distanceKm(V.lat, V.lon, a.lat, a.lon)) }))
    .filter((a) => a.distanceKm <= AIRPORT_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8)

  return {
    url: AIRPORTS_URL,
    observedAt: null,
    data: { radiusKm: AIRPORT_RADIUS_KM, scanned: all.length, nearby },
  }
}

const sourcesFor = (V) => [
  { id: 'wind', label: 'Open-Meteo — angin permukaan di atas kawah', run: wind },
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
  {
    id: 'population',
    label: `WorldPop ${POP_YEAR} — perkiraan penduduk per radius`,
    run: population,
  },
  {
    id: 'air',
    label: 'Copernicus CAMS via Open-Meteo — SO2 dan partikel (model)',
    run: air,
  },
  { id: 'emsc', label: 'EMSC — gempa sekitar, ambang lebih rendah', run: emsc },
  {
    id: 'sigmet',
    label: 'NOAA Aviation Weather Center — SIGMET abu vulkanik',
    run: sigmet,
  },
  {
    id: 'windaloft',
    label: 'Open-Meteo — angin per lapisan tekanan di atas kawah',
    run: windAloft,
  },
  {
    id: 'airports',
    label: `OurAirports — bandara berjadwal dalam ${AIRPORT_RADIUS_KM} km`,
    run: airports,
  },
  // Gelombang hanya berarti untuk gunung dengan riwayat bahaya pesisir.
  ...(V.strait
    ? [
        {
          id: 'waves',
          label: 'Open-Meteo Marine — gelombang perairan sekitar',
          run: waves,
        },
      ]
    : []),
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
 * Satu annotation per gunung. Berbeda dengan ringkasan job, annotation bisa
 * dibaca lewat API publik, jadi hasil sungguhannya dapat diperiksa dari luar
 * tanpa membuka log.
 *
 * Cuplikan respons mentah hanya disertakan untuk gunung pertama; tujuh salinan
 * bentuk respons yang sama hanya membuat laporannya sulit dibaca.
 */
function emitAnnotations(V, sources) {
  if (!process.env.GITHUB_ACTIONS) return
  const withRaw = V.id === VOLCANOES[0].id
  const lines = Object.entries(sources).map(([id, s]) => {
    const detail = s.ok
      ? `parsed=${JSON.stringify(s.data).slice(0, 260)}`
      : `error=${s.error}`
    const sample = withRaw ? rawSamples.get(id) : null
    return [`${id}: ${s.ok ? 'ok' : 'GAGAL'}`, `  ${detail}`]
      .concat(sample ? [`  raw=${sample.slice(0, 300)}`] : [])
      .join('\n')
  })
  console.log(
    `::notice title=sumber-${V.id}::${encodeAnnotation(`${V.name}\n${lines.join('\n')}`)}`,
  )
}

/** Ringkasan lintas gunung untuk dibaca manusia di tab Actions. */
async function writeSummary(index) {
  const path = process.env.GITHUB_STEP_SUMMARY
  if (!path) return
  const rows = index.volcanoes.map(
    (v) => `| ${v.name} | \`${v.id}\` | ${v.ok}/${v.of} |`,
  )
  const body = [
    '## Pengambilan sumber per gunung',
    '',
    '| Gunung | Berkas | Sumber berhasil |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
  await writeFile(path, body, { flag: 'a' })
}

async function main() {
  const index = { generatedAt: new Date().toISOString(), volcanoes: [] }
  await mkdir(OUT_DIR, { recursive: true })

  for (const V of VOLCANOES) {
    const defs = sourcesFor(V)
    const sources = {}

    // Sumber satu gunung tidak saling bergantung, jadi diambil berbarengan;
    // antar gunung tetap berurutan agar tidak membanjiri satu penyedia.
    const results = await Promise.all(
      defs.map(async ({ id, label, run }) => {
        const fetchedAt = new Date().toISOString()
        try {
          const { url, observedAt, data } = await run(V)
          return [id, { ok: true, label, url, fetchedAt, observedAt, data }]
        } catch (err) {
          return [
            id,
            {
              ok: false,
              label,
              url: null,
              fetchedAt,
              observedAt: null,
              error: err instanceof Error ? err.message : String(err),
            },
          ]
        }
      }),
    )

    let okCount = 0
    for (const [id, entry] of results) {
      sources[id] = entry
      if (entry.ok) okCount += 1
    }

    const file = resolve(OUT_DIR, `live-${V.id}.json`)
    await writeFile(
      file,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), volcano: V, sources }, null, 2)}\n`,
    )
    index.volcanoes.push({ id: V.id, name: V.name, ok: okCount, of: defs.length })
    emitAnnotations(V, sources)
    console.log(`${V.id}: ${okCount}/${defs.length} sumber berhasil`)
  }

  await writeFile(
    resolve(OUT_DIR, 'index.json'),
    `${JSON.stringify(index, null, 2)}\n`,
  )
  await writeSummary(index)

  // Sengaja selalu exit 0: deploy tetap jalan, dan app menandai sendiri sumber
  // mana yang kosong. Build merah hanya akan membuat situs ikut hilang.
}

await main()
