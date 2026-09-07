import { LEVELS } from './levels'
import {
  airSeverity,
  newestFetchISO,
  readAir,
  readBmkg,
  readEruption,
  readQuakesFrom,
  readWaves,
  readWind,
} from './live'
import type {
  FeedItem,
  FeedStatus,
  LevelId,
  LiveBundle,
  Severity,
  VolcanoRef,
  VolcanoSnapshot,
} from '../types'
import { REGION_SAMPLES, EMPTY_REGION } from './regions'

/** Minutes before the snapshot timestamp that each official report was issued. */
const FEED_OFFSETS_MIN = [22, 55, 157, 192]

const QUICK_ACTIONS = [
  { n: '01', text: 'Pakai masker saat di luar ruangan dan tutup tandon air.' },
  {
    n: '02',
    text: 'Siapkan satu tas berisi dokumen, obat, air minum, dan senter.',
  },
  { n: '03', text: 'Simpan nomor BPBD 112 dan sepakati titik temu keluarga.' },
]

const ASHFALL_STEPS = [
  {
    n: '01',
    text: 'Pakai masker N95 atau kain lembap; abu vulkanik merusak saluran napas.',
  },
  {
    n: '02',
    text: 'Tutup jendela, ventilasi, dan tandon air. Matikan pendingin yang menarik udara luar.',
  },
  {
    n: '03',
    text: 'Gunakan kacamata pelindung. Jangan mengucek mata yang terkena abu.',
  },
  {
    n: '04',
    text: 'Jangan menyapu abu dalam keadaan kering — basahi lebih dulu agar tidak beterbangan.',
  },
  {
    n: '05',
    text: 'Simpan dokumen, obat, dan air minum dalam satu tas siap bawa.',
  },
]

export const SEISMIC_SEED = [
  2, 3, 2, 4, 6, 5, 7, 9, 8, 12, 14, 11, 16, 19, 17, 22, 26, 31, 28, 24, 21, 19,
  23, 27,
]

function shiftISO(baseISO: string, minutes: number): string {
  return new Date(new Date(baseISO).getTime() - minutes * 60_000).toISOString()
}

export interface SnapshotRequest {
  volcano: VolcanoRef
  nowISO: string
  levelId: LevelId
  status: FeedStatus
  /** How old the newest reading is, in minutes. */
  ageMinutes: number
  seismicHourly?: number[]
  /** Hasil pengambilan sumber resmi; null berarti app jalan dengan data contoh. */
  live?: LiveBundle | null
}

/**
 * Radius ini sering benar-benar sepi selama 24 jam. Grafik rata harus terbaca
 * sebagai "tidak ada gempa", bukan sebagai data yang gagal dimuat.
 */
function describeQuakes(
  total: number,
  total7d: number | null,
  radiusKm: number,
  catalog: string,
): string {
  const week =
    total7d === null
      ? ''
      : ` Dalam tujuh hari terakhir: ${total7d} kejadian.`
  const head =
    total === 0
      ? `Tidak ada gempa tercatat dalam 24 jam terakhir pada radius ${radiusKm} km.`
      : `${total} gempa tercatat dalam radius ${radiusKm} km, 24 jam terakhir.`
  return `${head}${week} Ini gempa tektonik regional dari katalog ${catalog}, bukan kegempaan vulkanik yang hanya terekam seismograf pos pengamatan.`
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

/** Katalog GVP menyimpan tanggal sebagai angka terpisah, sebagiannya bisa kosong. */
function describeEruption(e: ReturnType<typeof readEruption> & object): string {
  const date = [
    e.startDay ? `${e.startDay}` : null,
    e.startMonth ? MONTHS[e.startMonth - 1] : null,
    `${e.startYear}`,
  ]
    .filter(Boolean)
    .join(' ')
  const vei = e.vei === null ? '' : `, VEI ${e.vei}`
  const where = e.area ? ` di ${e.area.toLowerCase()}` : ''
  const state = e.ongoing ? 'belum dinyatakan selesai' : 'sudah berakhir'
  return `Erupsi terakhir yang tercatat katalog Smithsonian GVP mulai ${date}${vei}${where} — ${state}. Katalog ilmiah global, pembaruannya mingguan, bukan dasar tindakan.`
}

/** BMKG menulis potensi tsunami sebagai kalimat, bukan kode. */
function quakeSeverity(potential: string | null): Severity {
  if (!potential) return 'watch'
  const text = potential.toLowerCase()
  if (text.includes('tidak berpotensi')) return 'neutral'
  if (text.includes('tsunami')) return 'danger'
  return 'watch'
}

/**
 * Satu-satunya batas antara layar dan dunia luar.
 *
 * Yang sudah tersambung ke sumber resmi: angin (Open-Meteo), gelombang Selat
 * Sunda (Open-Meteo Marine), gempa tektonik sekitar (USGS), dan gempa terkini
 * BMKG. Yang masih data contoh: level status, radius, dampak wilayah, titik
 * kumpul, dan kegempaan vulkanik — semuanya hanya dimiliki PVMBG dan BPBD.
 *
 * Setiap bagian membawa provenance-nya sendiri supaya layar bisa membedakan
 * keduanya, bukan mencampurnya diam-diam.
 */
export function getSnapshot(req: SnapshotRequest): VolcanoSnapshot {
  const { volcano, nowISO, levelId, status, ageMinutes } = req
  // Dampak wilayah, titik kumpul, dan transportasi selalu khas satu gunung.
  // Menampilkan posko Kalianda saat memantau Semeru bukan sekadar salah, itu
  // menyesatkan orang yang sedang mencari tempat mengungsi.
  const region = REGION_SAMPLES[volcano.id] ?? EMPTY_REGION
  const live = req.live ?? null
  const level = LEVELS[levelId]

  const wind = readWind(live)
  const waves = readWaves(live)
  // EMSC lebih rapat untuk kawasan ini; USGS jadi cadangan bila EMSC gagal.
  const emsc = readQuakesFrom(live, 'emsc')
  const usgs = readQuakesFrom(live, 'quakes')
  const quakes = emsc ?? usgs
  const quakeCatalog = emsc ? 'EMSC' : 'USGS'
  const air = readAir(live)
  const bmkg = readBmkg(live)
  const eruption = readEruption(live)

  // Selama ada sumber yang hidup, umur data dihitung dari pengambilan terakhir
  // yang berhasil — bukan dari jam simulasi.
  const updatedAtISO = newestFetchISO(live) ?? shiftISO(nowISO, ageMinutes)

  const liveFeed: FeedItem[] = (bmkg?.nearby ?? []).map((report) => ({
    kind: 'GEMPA',
    severity: quakeSeverity(report.potential),
    timeISO: report.timeISO,
    title: `Gempa M ${report.magnitude} · ${report.distanceKm} km dari kawah`,
    body: [
      report.area,
      report.depth ? `Kedalaman ${report.depth}.` : null,
      report.potential,
      report.felt ? `Dirasakan: ${report.felt}` : null,
    ]
      .filter(Boolean)
      .join(' '),
    source: 'BMKG · data.bmkg.go.id',
    provenance: 'live',
  }))

  return {
    volcano,
    levelId,
    status,
    updatedAtISO,
    fetchedAtISO: nowISO,

    ashfall: {
      windDirection: wind?.ashHeading ?? 'Barat laut',
      ashHeadingDeg: wind?.ashHeadingDeg ?? null,
      windSpeedKmh: wind?.speedKmh ?? 11,
      windProvenance: wind ? 'live' : 'sample',
      columnHeightM: 1200,
      columnDeltaM: 300,
      columnProvenance: 'sample',
      advice: wind
        ? `Angin membawa abu ke arah ${wind.ashHeading.toLowerCase()}. Pakai masker di luar ruangan dan tutup tandon air.`
        : 'Abu tipis terpantau di Kalianda dan Rajabasa. Pakai masker di luar ruangan, tutup tandon air.',
      source: wind
        ? 'Open-Meteo (angin) · tinggi kolom abu masih data contoh'
        : 'data contoh',
    },

    quickActions: QUICK_ACTIONS,

    metrics: [
      {
        label: 'Gempa erupsi',
        value: '27',
        delta: 'tertinggi 6 hari terakhir',
        severity: 'alert',
      },
      {
        label: 'Amplitudo maksimum',
        value: '55 mm',
        delta: 'durasi 3 menit 12 detik',
        severity: 'neutral',
      },
      {
        label: 'Deformasi',
        value: '+2,4 cm',
        delta: 'inflasi melambat',
        severity: 'safe',
      },
      {
        label: 'Suhu titik panas',
        value: '318 °C',
        delta: 'stabil sejak kemarin',
        severity: 'neutral',
      },
    ],

    impacts: region.impacts,

    transport: region.transport,

    mapLayers: [
      {
        id: 'radius',
        label: 'Radius bahaya',
        note: `Zona terlarang ${level.radiusKm} km dari kawah. ${region.mapNotes.radius}`,
      },
      {
        id: 'abu',
        label: 'Sebaran abu',
        note: wind
          ? `Abu terbawa angin ke ${wind.ashHeading.toLowerCase()}, ${wind.speedKmh} km/jam. ${region.mapNotes.abu}`
          : region.mapNotes.abu,
      },
      // Lapisan pesisir hanya berarti untuk gunung dengan riwayat bahaya laut.
      ...(volcano.coastalHazard && region.mapNotes.pesisir
        ? [
            {
              id: 'pesisir' as const,
              label: 'Pesisir',
              note: region.mapNotes.pesisir,
            },
          ]
        : []),
    ],

    villages: region.villages,

    seismicHourly: quakes?.hourly ?? req.seismicHourly ?? SEISMIC_SEED,

    quakeTypes: [
      { label: 'Letusan', value: '27', ratio: 0.86, severity: 'alert' },
      { label: 'Embusan', value: '41', ratio: 0.64, severity: 'watch' },
      {
        label: 'Vulkanik dangkal',
        value: '12',
        ratio: 0.34,
        severity: 'neutral',
      },
      { label: 'Tremor menerus', value: '6 jam', ratio: 0.52, severity: 'danger' },
    ],

    tremorAmplitudeMm: 24,

    feed: [
      ...liveFeed,
      {
        kind: 'VONA',
        severity: 'alert',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[0]),
        title: 'VONA warna ORANGE dikeluarkan',
        body: 'Kolom abu teramati 1.200 m di atas puncak, bergerak ke barat laut. Ketinggian abu FL 120.',
        source: 'Badan Geologi · Pos Pengamatan Anak Krakatau',
        provenance: 'sample',
      },
      {
        kind: 'ERUPSI',
        severity: 'danger',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[1]),
        title: 'Erupsi dengan amplitudo maksimum 55 mm',
        body: 'Durasi 3 menit 12 detik. Lontaran material teramati sejauh 800 m dari pusat kawah.',
        source: 'Badan Geologi · rekaman seismograf tersedia',
        provenance: 'sample',
      },
      {
        kind: 'HIMBAUAN',
        severity: 'watch',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[2]),
        title: 'Nelayan diminta menjauhi radius 5 km',
        body: 'Kegiatan penangkapan ikan di sekitar tubuh gunung dihentikan sampai status diturunkan.',
        source: 'BPBD Lampung Selatan',
        provenance: 'sample',
      },
      {
        kind: 'CUACA',
        severity: 'neutral',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[3]),
        title: 'Angin permukaan ke barat laut, 11 km/jam',
        body: 'Abu tipis berpotensi mencapai Kalianda dan Rajabasa hingga sore. Tinggi gelombang 1,5–2,5 m.',
        source: 'BMKG · pembaruan tiap 6 jam',
        provenance: 'sample',
      },
    ],

    shelters: region.shelters,

    ashfallSteps: ASHFALL_STEPS,

    provenance: {
      // Hanya PVMBG yang berhak menyatakan level; belum ada sambungan resmi.
      level: 'sample',
      ashfall: wind ? 'live' : 'sample',
      coastal: waves ? 'live' : 'sample',
      seismic: quakes ? 'live' : 'sample',
      feed: liveFeed.length ? 'live' : 'sample',
      impacts: 'sample',
    },
    sources: live?.sources ?? [],
    observedWaveHeightM: waves?.waveHeightM ?? null,
    seismicSource: quakes
      ? `Katalog ${quakeCatalog}`
      : 'Seismograf pos pengamatan (data contoh)',
    seismicLabel: quakes
      ? 'Gempa tektonik tiap jam, 24 jam terakhir'
      : 'Kegempaan tiap jam, 24 jam terakhir',
    lastEruptionNote: eruption ? describeEruption(eruption) : null,
    air: air
      ? {
          so2: air.so2,
          so2Severity: airSeverity(air.so2, 40),
          pm10: air.pm10,
          pm10Severity: airSeverity(air.pm10, 45),
          aod: air.aod,
          note:
            'Keluaran model CAMS (Copernicus), bukan pembacaan stasiun di darat. Ambang mengikuti pedoman WHO 2021.',
        }
      : null,
    seismicNote: quakes
      ? describeQuakes(quakes.total, quakes.total7d, quakes.radiusKm, quakeCatalog)
      : 'Angka contoh. Kegempaan vulkanik hanya tersedia dari seismograf pos pengamatan PVMBG.',
  }
}
