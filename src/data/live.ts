import type { LiveBundle, LiveSourceInfo } from '../types'

/**
 * Pembaca public/data/live.json — berkas yang diisi scripts/fetch-sources.mjs
 * saat CI berjalan.
 *
 * Semua fungsi di sini menolak data yang bentuknya tidak sesuai, bukan menebak.
 * Untuk app kebencanaan, angka yang salah tafsir lebih berbahaya daripada
 * angka yang tidak tampil.
 */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const strOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null

function isoOrNull(v: unknown): string | null {
  const s = strOrNull(v)
  if (!s) return null
  const t = new Date(s)
  return Number.isNaN(t.getTime()) ? null : t.toISOString()
}

function parseSource(id: string, raw: unknown): LiveSourceInfo | null {
  if (!isRecord(raw)) return null
  const label = strOrNull(raw.label)
  const fetchedAtISO = isoOrNull(raw.fetchedAt)
  if (!label || !fetchedAtISO) return null
  return {
    id,
    label,
    ok: raw.ok === true,
    url: strOrNull(raw.url),
    fetchedAtISO,
    observedAtISO: isoOrNull(raw.observedAt),
    error: strOrNull(raw.error),
    data: raw.data,
  }
}

export function parseLiveBundle(raw: unknown): LiveBundle | null {
  if (!isRecord(raw)) return null
  const generatedAtISO = isoOrNull(raw.generatedAt)
  if (!generatedAtISO || !isRecord(raw.sources)) return null

  const sources: LiveSourceInfo[] = []
  for (const [id, value] of Object.entries(raw.sources)) {
    const parsed = parseSource(id, value)
    if (parsed) sources.push(parsed)
  }
  if (!sources.length) return null

  return { generatedAtISO, sources }
}

function payload(bundle: LiveBundle | null, id: string): unknown {
  const source = bundle?.sources.find((s) => s.id === id)
  return source?.ok ? source.data : undefined
}

export function sourceOf(
  bundle: LiveBundle | null,
  id: string,
): LiveSourceInfo | null {
  return bundle?.sources.find((s) => s.id === id) ?? null
}

const COMPASS = [
  'Utara',
  'Timur laut',
  'Timur',
  'Tenggara',
  'Selatan',
  'Barat daya',
  'Barat',
  'Barat laut',
]

export function compassLabel(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return COMPASS[index]
}

/**
 * Arah angin dilaporkan sebagai arah asal (konvensi meteorologi), sedangkan yang
 * dibutuhkan warga adalah ke mana abunya pergi — kebalikannya.
 */
export function ashHeadingDeg(windFromDeg: number): number {
  return (((windFromDeg % 360) + 360) % 360 + 180) % 360
}

export interface LiveWind {
  speedKmh: number
  /** Arah abu terbawa, bukan arah asal angin. */
  ashHeading: string
  ashHeadingDeg: number
  observedAtISO: string | null
}

export function readWind(bundle: LiveBundle | null): LiveWind | null {
  const data = payload(bundle, 'wind')
  if (!isRecord(data)) return null
  const speedKmh = numOrNull(data.speedKmh)
  const directionDeg = numOrNull(data.directionDeg)
  if (speedKmh === null || directionDeg === null) return null
  const heading = ashHeadingDeg(directionDeg)
  return {
    speedKmh: Math.round(speedKmh),
    ashHeading: compassLabel(heading),
    ashHeadingDeg: heading,
    observedAtISO: sourceOf(bundle, 'wind')?.observedAtISO ?? null,
  }
}

export interface LiveWaves {
  waveHeightM: number
  observedAtISO: string | null
}

export function readWaves(bundle: LiveBundle | null): LiveWaves | null {
  const data = payload(bundle, 'waves')
  if (!isRecord(data)) return null
  const waveHeightM = numOrNull(data.waveHeightM)
  if (waveHeightM === null) return null
  return {
    waveHeightM,
    observedAtISO: sourceOf(bundle, 'waves')?.observedAtISO ?? null,
  }
}

export interface LiveQuakes {
  hourly: number[]
  total: number
  /** Hitungan sepekan, konteks saat 24 jam terakhir kebetulan sepi. */
  total7d: number | null
  radiusKm: number
  largest: { mag: number; place: string | null; timeISO: string } | null
}

export function readQuakes(bundle: LiveBundle | null): LiveQuakes | null {
  return readQuakesFrom(bundle, 'quakes')
}

/** Bentuk data USGS dan EMSC disamakan di script pengambil, jadi satu pembaca cukup. */
export function readQuakesFrom(
  bundle: LiveBundle | null,
  id: string,
): LiveQuakes | null {
  const data = payload(bundle, id)
  if (!isRecord(data)) return null
  const hourlyRaw = data.hourly
  if (!Array.isArray(hourlyRaw) || hourlyRaw.length !== 24) return null
  const hourly = hourlyRaw.map((n) => numOrNull(n) ?? 0)

  const largestRaw = data.largest
  let largest: LiveQuakes['largest'] = null
  if (isRecord(largestRaw)) {
    const mag = numOrNull(largestRaw.mag)
    const timeISO = isoOrNull(largestRaw.timeISO)
    if (mag !== null && timeISO) {
      largest = { mag, place: strOrNull(largestRaw.place), timeISO }
    }
  }

  return {
    hourly,
    total: numOrNull(data.total) ?? hourly.reduce((a, b) => a + b, 0),
    total7d: numOrNull(data.total7d),
    radiusKm: numOrNull(data.radiusKm) ?? 300,
    largest,
  }
}

export interface LiveQuakeReport {
  timeISO: string
  magnitude: string
  depth: string | null
  area: string
  potential: string | null
  felt: string | null
  /** Jarak dari kawah — dasar penyaringan agar feed tetap tentang gunung ini. */
  distanceKm: number
}

export interface LiveBmkg {
  radiusKm: number
  nearby: LiveQuakeReport[]
}

function parseReport(raw: unknown): LiveQuakeReport | null {
  if (!isRecord(raw)) return null
  const timeISO = isoOrNull(raw.timeISO)
  const magnitude = strOrNull(raw.magnitude)
  const area = strOrNull(raw.area)
  if (!timeISO || !magnitude || !area) return null
  const distanceKm = numOrNull(raw.distanceKm)
  if (distanceKm === null) return null
  return {
    timeISO,
    magnitude,
    area,
    depth: strOrNull(raw.depth),
    potential: strOrNull(raw.potential),
    felt: strOrNull(raw.felt),
    distanceKm,
  }
}

/**
 * Mengembalikan null saat tidak ada gempa di sekitar gunung. Feed kosong lebih
 * baik daripada feed berisi gempa 2.000 km jauhnya yang dikira berhubungan.
 */
export function readBmkg(bundle: LiveBundle | null): LiveBmkg | null {
  const data = payload(bundle, 'bmkg')
  if (!isRecord(data)) return null
  const rawList = Array.isArray(data.nearby) ? data.nearby : []
  const nearby: LiveQuakeReport[] = []
  for (const item of rawList) {
    const parsed = parseReport(item)
    if (parsed) nearby.push(parsed)
  }
  if (!nearby.length) return null
  return { radiusKm: numOrNull(data.radiusKm) ?? 500, nearby }
}

/** Kapan salinan terbaru yang berhasil diambil — dasar label LIVE / BASI. */
export function newestFetchISO(bundle: LiveBundle | null): string | null {
  const times = (bundle?.sources ?? [])
    .filter((s) => s.ok)
    .map((s) => s.fetchedAtISO)
  if (!times.length) return null
  return times.reduce((a, b) => (a > b ? a : b))
}

export interface LiveEruption {
  activityType: string | null
  area: string | null
  vei: number | null
  startYear: number
  startMonth: number | null
  startDay: number | null
  ongoing: boolean
}

/** Catatan erupsi terakhir dari katalog Smithsonian GVP. */
export function readEruption(bundle: LiveBundle | null): LiveEruption | null {
  const data = payload(bundle, 'gvp')
  if (!isRecord(data)) return null
  const startYear = numOrNull(data.startYear)
  if (startYear === null) return null
  return {
    activityType: strOrNull(data.activityType),
    area: strOrNull(data.area),
    vei: numOrNull(data.vei),
    startYear,
    startMonth: numOrNull(data.startMonth),
    startDay: numOrNull(data.startDay),
    ongoing: data.ongoing === true,
  }
}

export interface LiveAir {
  so2: number
  pm10: number
  pm25: number | null
  aod: number | null
  observedAtISO: string | null
}

export function readAir(bundle: LiveBundle | null): LiveAir | null {
  const data = payload(bundle, 'air')
  if (!isRecord(data)) return null
  const so2 = numOrNull(data.so2)
  const pm10 = numOrNull(data.pm10)
  if (so2 === null || pm10 === null) return null
  return {
    so2,
    pm10,
    pm25: numOrNull(data.pm25),
    aod: numOrNull(data.aod),
    observedAtISO: sourceOf(bundle, 'air')?.observedAtISO ?? null,
  }
}

/**
 * Ambang mengikuti pedoman kualitas udara WHO 2021 (rata-rata 24 jam): SO2 40
 * ug/m3 dan PM10 45 ug/m3. Batas atas memakai nilai antara WHO yang lebih longgar.
 */
export function airSeverity(value: number, guideline: number): 'safe' | 'watch' | 'alert' {
  if (value <= guideline) return 'safe'
  if (value <= guideline * 3) return 'watch'
  return 'alert'
}

export interface PopulationRing {
  radiusKm: number
  people: number
}

export interface LivePopulation {
  year: number
  rings: PopulationRing[]
}

/**
 * Perkiraan penduduk per radius. Ditolak bila salah satu cincinnya rusak —
 * angka setengah lengkap lebih menyesatkan daripada tidak ada angka.
 */
export function readPopulation(bundle: LiveBundle | null): LivePopulation | null {
  const data = payload(bundle, 'population')
  if (!isRecord(data)) return null
  const year = numOrNull(data.year)
  const raw = Array.isArray(data.rings) ? data.rings : []
  if (year === null || !raw.length) return null

  const rings: PopulationRing[] = []
  for (const item of raw) {
    if (!isRecord(item)) return null
    const radiusKm = numOrNull(item.radiusKm)
    const people = numOrNull(item.people)
    if (radiusKm === null || people === null) return null
    rings.push({ radiusKm, people })
  }
  rings.sort((a, b) => a.radiusKm - b.radiusKm)
  return { year, rings }
}

export interface LiveAshAdvisory {
  fir: string | null
  validFromISO: string | null
  validToISO: string | null
  /** Puncak awan abu dalam kaki di atas permukaan laut, apa adanya dari SIGMET. */
  topFt: number | null
  baseFt: number | null
  moveDir: string | null
  moveSpeedKt: number | null
  distanceKm: number | null
  /** Bentuk asli area advisory sebagai [lintang, bujur], bila utuh. */
  polygon: [number, number][] | null
  /** Nama gunung ini benar-benar disebut di teks resminya. */
  namedHere: boolean
  text: string
}

export interface LiveSigmet {
  radiusKm: number
  scanned: number
  advisories: LiveAshAdvisory[]
}

/**
 * Peringatan abu penerbangan. Selalu dikembalikan meski kosong, karena "tidak
 * ada peringatan abu aktif" adalah informasi yang berguna — berbeda dari
 * "sumbernya gagal", yang ditandai lewat status sumber.
 */
/**
 * Titik-titik poligon advisory. Satu titik yang cacat membuat bentuknya salah
 * di peta, jadi seluruh poligon dibuang — bukan ditambal.
 */
function readPolygon(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length < 3) return null
  const points: [number, number][] = []
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) return null
    const [lat, lon] = point
    if (typeof lat !== 'number' || typeof lon !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    points.push([lat, lon])
  }
  return points
}

export function readSigmet(bundle: LiveBundle | null): LiveSigmet | null {
  const data = payload(bundle, 'sigmet')
  if (!isRecord(data)) return null
  const rawList = Array.isArray(data.nearby) ? data.nearby : []

  const advisories: LiveAshAdvisory[] = []
  for (const item of rawList) {
    if (!isRecord(item)) continue
    const text = strOrNull(item.text)
    if (!text) continue
    advisories.push({
      fir: strOrNull(item.fir),
      validFromISO: isoOrNull(item.validFrom),
      validToISO: isoOrNull(item.validTo),
      topFt: numOrNull(item.topFt),
      baseFt: numOrNull(item.baseFt),
      moveDir: strOrNull(item.moveDir),
      moveSpeedKt: numOrNull(item.moveSpeedKt),
      distanceKm: numOrNull(item.distanceKm),
      polygon: readPolygon(item.polygon),
      namedHere: item.namedHere === true,
      text,
    })
  }

  return {
    radiusKm: numOrNull(data.radiusKm) ?? 500,
    scanned: numOrNull(data.scanned) ?? 0,
    advisories,
  }
}

/** Kaki ke meter, untuk pembaca yang tidak terbiasa satuan penerbangan. */
export function feetToMetres(ft: number): number {
  return Math.round(ft * 0.3048)
}
