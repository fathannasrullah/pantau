export type LevelId = 'normal' | 'waspada' | 'siaga' | 'awas'

export type Severity = 'safe' | 'watch' | 'alert' | 'danger' | 'neutral'

/** Satu aksen warna: garis, latar tipis, dan warna teksnya. */
export interface ColorSet {
  color: string
  line: string
  wash: string
}

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
  /**
   * Kapan level ini ditetapkan — hanya PVMBG yang tahu, jadi null selama belum
   * tersambung. Jangan diisi tanggal karangan hanya agar kartunya terlihat penuh.
   */
  sinceISO: string | null
  sincePrecision: 'day' | 'minute'
}

/** Satu gunung dalam registri, koordinatnya dari katalog Smithsonian. */
export interface VolcanoRef {
  id: string
  name: string
  region: string
  lat: number
  lon: number
  elevationM: number
  gvpNumber: number
  /** Nama pos pengamatan bila diketahui; jangan dikarang untuk yang belum. */
  observatory: string | null
  /** Hanya gunung dengan riwayat bahaya pesisir yang menampilkan gelombang. */
  coastalHazard: boolean
  /** Titik perairan untuk pengambilan tinggi gelombang. */
  strait: { lat: number; lon: number } | null
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
  /** Tinggi kolom hanya dimiliki pos pengamatan PVMBG; null selama belum ada. */
  columnHeightM: number | null
  columnDeltaM: number | null
  advice: string
  source: string
}

export interface AirQuality {
  so2: number
  so2Severity: Severity
  pm10: number
  pm10Severity: Severity
  pm25: number | null
  /**
   * Indeks AQI yang dihitung dari pm25 dengan rumus US EPA. Null bila PM2.5
   * tidak ikut terbaca — indeks tanpa dasar konsentrasi tidak boleh muncul.
   */
  aqi: number | null
  aod: number | null
  note: string
}

export interface AshAdvisory {
  fir: string | null
  validFromISO: string | null
  validToISO: string | null
  topFt: number | null
  topM: number | null
  /** Dasar lapisan abu dalam kaki; 0 berarti dari permukaan. */
  baseFt: number | null
  moveDir: string | null
  moveSpeedKt: number | null
  distanceKm: number | null
  /** Bentuk asli area advisory sebagai [lintang, bujur], bila utuh. */
  polygon: [number, number][] | null
  namedHere: boolean
  /** Nama gunung menurut penerbit advisory (medan qualifier), bila ada. */
  qualifier: string | null
  /**
   * Jendela berlakunya dibanding waktu sekarang. Peringatan yang sudah lewat
   * tidak boleh terbaca sama dengan yang sedang berlaku.
   */
  validity: AdvisoryValidity
  /** Arah gerak dalam bahasa Indonesia; kode aslinya tetap di teks resmi. */
  moveDirLabel: string | null
  text: string
}

export type AdvisoryValidity = 'berlaku' | 'akan' | 'lewat' | 'tidak diketahui'

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
  id: 'radius' | 'abu' | 'gempa' | 'pesisir'
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
  /** Aturan yang belum punya sumber: saklarnya mati dan tidak bisa dinyalakan. */
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
  volcano: VolcanoRef
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
  tremorAmplitudeMm: number | null
  feed: FeedItem[]
  shelters: ShelterPoint[]
  emergencyContacts: { name: string; note: string; tel: string }[]
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
  /** Perkiraan penduduk per radius dari kawah, bila sumbernya hidup. */
  population: { year: number; rings: { radiusKm: number; people: number }[] } | null
  /** Peringatan abu penerbangan resmi (SIGMET), bila sumbernya hidup. */
  ashAdvisories: AshAdvisory[] | null
  /** Episentrum gempa BMKG di sekitar gunung, untuk digambar di peta. */
  bmkgEpicentres: Epicentre[]
  /** Angin per lapisan tekanan di atas kawah, bila sumbernya hidup. */
  windAloft: WindLayer[] | null
  /** Bandara berjadwal di sekitar gunung dan hubungannya dengan area abu. */
  airports: AirportNearby[] | null
  /** Peringatan abu aktif di seluruh ruang udara Indonesia. */
  ashNational: { total: number; volcanoes: string[]; firs: string[] } | null
}

/** Satu lapisan angin di ketinggian, sudah diterjemahkan ke arah tujuan abu. */
export interface WindLayer {
  hPa: number
  heightM: number
  /** Ketinggian penerbangan dalam ratusan kaki, seperti ditulis SIGMET. */
  flightLevel: number
  speedKmh: number
  /** Ke mana abu di lapisan ini terbawa, bukan arah asal angin. */
  ashHeadingDeg: number
  ashHeading: string
  /** Lapisan terdekat dengan puncak awan abu menurut peringatan yang berlaku. */
  nearAshTop: boolean
}

/** Bandara acuan; statusnya bukan bagian dari data ini. */
export interface AirportNearby {
  name: string
  city: string | null
  icao: string | null
  iata: string | null
  lat: number
  lon: number
  distanceKm: number
  /**
   * Koordinatnya berada di dalam salah satu poligon peringatan abu yang
   * berlaku. Ini hitungan geometris app atas dua data resmi, bukan pernyataan
   * otoritas bandara tentang operasional.
   */
  insideAshArea: boolean
}

/** Satu episentrum yang punya koordinat, siap digambar. */
export interface Epicentre {
  lat: number
  lon: number
  magnitude: string
  area: string
  timeISO: string
  depth: string | null
  potential: string | null
  distanceKm: number
}
