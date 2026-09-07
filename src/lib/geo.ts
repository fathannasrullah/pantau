const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

export interface LatLon {
  lat: number
  lon: number
}

/** Jarak lingkaran besar, cukup akurat untuk jarak puluhan sampai ratusan km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Arah dari `from` ke `to`, 0° = utara, searah jarum jam. */
export function bearingDeg(from: LatLon, to: LatLon): number {
  const dLon = toRad(to.lon - from.lon)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Selisih sudut terpendek, 0–180. */
export function angleDelta(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360) + 360) % 360
  return diff > 180 ? 360 - diff : diff
}

/**
 * Apakah pengguna berada di jalur sebaran abu.
 *
 * Dibandingkan arah pengguna dilihat dari kawah dengan arah tujuan abu. Toleransi
 * 45° mengikuti lebar sebaran abu yang lazim; lebih sempit dari itu memberi rasa
 * aman palsu pada orang tepat di pinggir jalur.
 */
export function isDownwind(
  bearingFromCrater: number,
  ashHeading: number,
  toleranceDeg = 45,
): boolean {
  return angleDelta(bearingFromCrater, ashHeading) <= toleranceDeg
}

export interface NearestPlace<T> {
  place: T
  distanceKm: number
}

export function nearestTo<T extends LatLon>(
  origin: LatLon,
  places: readonly T[],
): NearestPlace<T> | null {
  let best: NearestPlace<T> | null = null
  for (const place of places) {
    const d = distanceKm(origin, place)
    if (!best || d < best.distanceKm) best = { place, distanceKm: d }
  }
  return best
}

/**
 * Ketelitian yang dilaporkan browser sangat bervariasi: GPS memberi belasan
 * meter, penentuan lewat alamat IP bisa meleset puluhan kilometer. Di aplikasi
 * yang menjawab "apakah saya di dalam radius bahaya", bedanya menentukan.
 */
export type FixQuality = 'baik' | 'kasar' | 'sangat kasar'

export function fixQuality(accuracyM: number): FixQuality {
  if (accuracyM <= 100) return 'baik'
  if (accuracyM <= 2000) return 'kasar'
  return 'sangat kasar'
}

/**
 * Ketelitian ikut diperhitungkan saat menyatakan posisi di dalam atau di luar
 * zona: bila lingkaran ketelitian masih memotong batas radius, jawabannya belum
 * pasti dan tidak boleh ditampilkan sebagai kepastian.
 */
export type ZoneVerdict = 'di dalam' | 'di luar' | 'di batas'

export function zoneVerdict(
  distanceKm: number,
  radiusKm: number,
  accuracyM: number,
): ZoneVerdict {
  const margin = accuracyM / 1000
  if (distanceKm + margin <= radiusKm) return 'di dalam'
  if (distanceKm - margin > radiusKm) return 'di luar'
  return 'di batas'
}
