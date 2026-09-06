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

export interface UserPosition {
  label: string
  accuracyM: number
  distanceKm: number
  nearestShelter: { name: string; distanceKm: number }
}

export interface AshfallReport {
  windDirection: string
  windSpeedKmh: number
  columnHeightM: number
  columnDeltaM: number
  advice: string
  source: string
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
}

export interface ShelterPoint {
  name: string
  note: string
  tel: string
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

/** One snapshot of everything the screens render, as returned by the data source. */
export interface VolcanoSnapshot {
  volcano: Volcano
  levelId: LevelId
  status: FeedStatus
  /** When the upstream data was produced. */
  updatedAtISO: string
  /** When this client last managed to read it. */
  fetchedAtISO: string
  position: UserPosition
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
}
