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
  observedAtISO: string | null
}

export function readWind(bundle: LiveBundle | null): LiveWind | null {
  const data = payload(bundle, 'wind')
  if (!isRecord(data)) return null
  const speedKmh = numOrNull(data.speedKmh)
  const directionDeg = numOrNull(data.directionDeg)
  if (speedKmh === null || directionDeg === null) return null
  return {
    speedKmh: Math.round(speedKmh),
    ashHeading: compassLabel(ashHeadingDeg(directionDeg)),
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
  radiusKm: number
  largest: { mag: number; place: string | null; timeISO: string } | null
}

export function readQuakes(bundle: LiveBundle | null): LiveQuakes | null {
  const data = payload(bundle, 'quakes')
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
}

export interface LiveBmkg {
  latest: LiveQuakeReport
  recent: LiveQuakeReport[]
}

function parseReport(raw: unknown): LiveQuakeReport | null {
  if (!isRecord(raw)) return null
  const timeISO = isoOrNull(raw.timeISO)
  const magnitude = strOrNull(raw.magnitude)
  const area = strOrNull(raw.area)
  if (!timeISO || !magnitude || !area) return null
  return {
    timeISO,
    magnitude,
    area,
    depth: strOrNull(raw.depth),
    potential: strOrNull(raw.potential),
    felt: strOrNull(raw.felt),
  }
}

export function readBmkg(bundle: LiveBundle | null): LiveBmkg | null {
  const data = payload(bundle, 'bmkg')
  if (!isRecord(data)) return null
  const latest = parseReport(data.latest)
  if (!latest) return null
  const recentRaw = Array.isArray(data.recent) ? data.recent : []
  const recent: LiveQuakeReport[] = []
  for (const item of recentRaw) {
    const parsed = parseReport(item)
    if (parsed && parsed.timeISO !== latest.timeISO) recent.push(parsed)
  }
  return { latest, recent }
}

/** Kapan salinan terbaru yang berhasil diambil — dasar label LIVE / BASI. */
export function newestFetchISO(bundle: LiveBundle | null): string | null {
  const times = (bundle?.sources ?? [])
    .filter((s) => s.ok)
    .map((s) => s.fetchedAtISO)
  if (!times.length) return null
  return times.reduce((a, b) => (a > b ? a : b))
}
