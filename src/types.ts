export type LevelId = 'normal' | 'waspada' | 'siaga' | 'awas'

export type Severity = 'safe' | 'watch' | 'alert' | 'danger' | 'neutral'

export interface CoastalHazard {
  tag: string
  note: string
  severity: Severity
}

export interface VolcanoLevel {
  id: LevelId
  name: string
  roman: string
  radiusKm: number
  /** Drives the top alert strip; only siaga and awas demand immediate action. */
  urgent: boolean
  strip: string
  headline: string
  plain: string
  coastal: CoastalHazard | null
  action: string
  actionNote: string
  sinceISO: string
  sincePrecision: 'day' | 'minute'
}

export interface Volcano {
  name: string
  location: string
  elevationM: number
  lat: number
  lon: number
  observatory: string
}

/** Outcome of the last attempt to reach the upstream sources. */
export type FeedStatus = 'ok' | 'failed' | 'offline'

export type DataStateId = 'fresh' | 'stale' | 'failed' | 'offline'

export interface AshfallReport {
  /** Ke mana abu terbawa, bukan arah asal angin. */
  windDirection: string
  /** Arah yang sama dalam derajat, untuk menghitung siapa yang searah abu. */
  ashHeadingDeg: number | null
  windSpeedKmh: number
  windProvenance: Provenance
  columnHeightM: number
  columnDeltaM: number
  /** Tinggi kolom hanya dimiliki pos pengamatan PVMBG. */
  columnProvenance: Provenance
  advice: string
  source: string
}

export interface AirQuality {
  so2: number
  so2Severity: Severity
  pm10: number
  pm10Severity: Severity
  aod: number | null
  note: string
}

export interface QuickAction {
  n: string
  text: string
}

export interface Metric {
  label: string
  value: string
  delta: string
  severity: Severity
}

export interface Impact {
  area: string
  note: string
  tag: string
  severity: Severity
}

export interface TransportStatus {
  name: string
  note: string
  state: string
  severity: Severity
}

export interface MapLayer {
  id: 'radius' | 'abu' | 'pesisir'
  label: string
  note: string
}

export interface Village {
  distanceKm: number
  name: string
  note: string
  severity: Severity
}

export interface QuakeType {
  label: string
  value: string
  ratio: number
  severity: Severity
}

export interface FeedItem {
  kind: string
  severity: Severity
  timeISO: string
  title: string
  body: string
  source: string
  provenance: Provenance
}

export interface ShelterPoint {
  name: string
  note: string
  tel: string
  /**
   * Titik perkiraan tingkat desa/kecamatan, bukan koordinat bangunan. Cukup
   * untuk mengurutkan mana yang terdekat, tidak cukup untuk menuntun langkah.
   */
  lat: number
  lon: number
}

export interface GuideStep {
  n: string
  text: string
}

export type NotificationRuleId = 'evac' | 'level' | 'ash' | 'quake'

export interface NotificationRule {
  id: NotificationRuleId
  label: string
  note: string
  /** Evacuation orders can never be muted. */
  locked: boolean
}

/** Apakah sebuah bagian layar berisi angka sungguhan atau masih data contoh. */
export type Provenance = 'live' | 'sample'

/** Satu sumber di public/data/live.json, apa adanya termasuk saat gagal. */
export interface LiveSourceInfo {
  id: string
  label: string
  ok: boolean
  url: string | null
  fetchedAtISO: string
  observedAtISO: string | null
  error: string | null
  data: unknown
}

export interface LiveBundle {
  generatedAtISO: string
  sources: LiveSourceInfo[]
}

/**
 * Asal setiap bagian layar. Level status sengaja dipisah: hanya PVMBG yang
 * berhak menyatakannya, jadi selama belum tersambung nilainya harus ditandai
 * 'sample' dan tidak boleh diturunkan dari sumber lain.
 */
export interface SnapshotProvenance {
  level: Provenance
  ashfall: Provenance
  coastal: Provenance
  seismic: Provenance
  feed: Provenance
  impacts: Provenance
}

/** One snapshot of everything the screens render, as returned by the data source. */
export interface VolcanoSnapshot {
  volcano: Volcano
  levelId: LevelId
  status: FeedStatus
  /** When the upstream data was produced. */
  updatedAtISO: string
  /** When this client last managed to read it. */
  fetchedAtISO: string
  ashfall: AshfallReport
  quickActions: QuickAction[]
  metrics: Metric[]
  impacts: Impact[]
  transport: TransportStatus[]
  mapLayers: MapLayer[]
  villages: Village[]
  seismicHourly: number[]
  quakeTypes: QuakeType[]
  tremorAmplitudeMm: number
  feed: FeedItem[]
  shelters: ShelterPoint[]
  ashfallSteps: GuideStep[]
  provenance: SnapshotProvenance
  /** Daftar sumber untuk ditampilkan apa adanya, termasuk yang gagal diambil. */
  sources: LiveSourceInfo[]
  /** Tinggi gelombang terukur di Selat Sunda, bila sumbernya hidup. */
  observedWaveHeightM: number | null
  /** Keterangan seismik: kegempaan vulkanik PVMBG atau gempa tektonik USGS. */
  seismicLabel: string
  seismicNote: string
  /** Katalog mana yang benar-benar dipakai grafik kegempaan. */
  seismicSource: string
  /** Erupsi terakhir menurut katalog Smithsonian GVP, bila sumbernya hidup. */
  lastEruptionNote: string | null
  /** Kualitas udara model CAMS di atas kawah, bila sumbernya hidup. */
  air: AirQuality | null
}
