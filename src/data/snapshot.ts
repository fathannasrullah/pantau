import { LEVELS } from './levels'
import type { FeedStatus, LevelId, VolcanoSnapshot } from '../types'

export const VOLCANO = {
  name: 'Anak Krakatau',
  location: 'Selat Sunda · Lampung Selatan',
  elevationM: 2667,
  lat: -6.102,
  lon: 105.423,
  observatory: 'Pos Pengamatan Anak Krakatau, Pasauran',
}

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
  nowISO: string
  levelId: LevelId
  status: FeedStatus
  /** How old the newest reading is, in minutes. */
  ageMinutes: number
  seismicHourly?: number[]
}

/**
 * The single seam between the UI and the outside world. Everything below is
 * sample data; wiring MAGMA Indonesia / BMKG / BPBD means replacing the body of
 * this function (and making it async) without touching the screens.
 */
export function getSnapshot(req: SnapshotRequest): VolcanoSnapshot {
  const { nowISO, levelId, status, ageMinutes } = req
  const updatedAtISO = shiftISO(nowISO, ageMinutes)
  const level = LEVELS[levelId]

  return {
    volcano: VOLCANO,
    levelId,
    status,
    updatedAtISO,
    fetchedAtISO: nowISO,

    position: {
      label: 'Kalianda, Lampung Selatan',
      accuracyM: 12,
      distanceKm: 38,
      nearestShelter: { name: 'Lapangan Kalianda', distanceKm: 3.1 },
    },

    ashfall: {
      windDirection: 'Barat laut',
      windSpeedKmh: 11,
      columnHeightM: 1200,
      columnDeltaM: 300,
      advice:
        'Abu tipis terpantau di Kalianda dan Rajabasa. Pakai masker di luar ruangan, tutup tandon air.',
      source: 'pos pengamatan + BMKG (angin)',
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

    impacts: [
      {
        area: 'Kalianda & Rajabasa',
        note: 'Hujan abu tipis, jarak pandang 4 km. Masker dibagikan di 6 titik.',
        tag: 'ABU',
        severity: 'alert',
      },
      {
        area: 'Pulau Sebesi',
        note: '42 warga dievakuasi sementara ke Kalianda pada 5 Sep.',
        tag: 'EVAKUASI',
        severity: 'danger',
      },
      {
        area: 'Air bersih',
        note: 'Tandon terbuka berpotensi tercampur abu. Rebus air sebelum diminum.',
        tag: 'SANITASI',
        severity: 'neutral',
      },
    ],

    transport: [
      {
        name: 'Bandara Radin Inten II',
        note: 'Rute penerbangan dialihkan menjauhi kolom abu',
        state: 'NORMAL',
        severity: 'safe',
      },
      {
        name: 'Pelabuhan Bakauheni',
        note: 'Penyeberangan lanjut dengan pemantauan gelombang',
        state: 'TERBATAS',
        severity: 'watch',
      },
      {
        name: 'Wisata Anak Krakatau',
        note: 'Semua trip dibatalkan sejak 3 Sep',
        state: 'TUTUP',
        severity: 'danger',
      },
    ],

    mapLayers: [
      {
        id: 'radius',
        label: 'Radius bahaya',
        note: `Zona terlarang ${level.radiusKm} km dari kawah. Pos pengamatan berada di Pasauran, 42 km ke timur.`,
      },
      {
        id: 'abu',
        label: 'Sebaran abu',
        note: 'Abu terbawa angin ke barat laut, 11 km/jam. Perkiraan jangkauan abu tipis 38 km.',
      },
      {
        id: 'pesisir',
        label: 'Pesisir',
        note: 'Enam desa pesisir Selat Sunda masuk zona pemantauan gelombang. Sirene pantai diuji tiap Jumat 10.00.',
      },
    ],

    villages: [
      {
        distanceKm: 12,
        name: 'Pulau Sebesi',
        note: 'Terdekat berpenghuni · 42 jiwa dievakuasi',
        severity: 'danger',
      },
      {
        distanceKm: 38,
        name: 'Rajabasa, Lampung Selatan',
        note: 'Hujan abu tipis · 4 posko',
        severity: 'alert',
      },
      {
        distanceKm: 42,
        name: 'Pasauran, Serang',
        note: 'Pos pengamatan · sirene aktif',
        severity: 'watch',
      },
      {
        distanceKm: 51,
        name: 'Anyer, Serang',
        note: 'Zona pemantauan gelombang',
        severity: 'neutral',
      },
    ],

    seismicHourly: req.seismicHourly ?? SEISMIC_SEED,

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
      {
        kind: 'VONA',
        severity: 'alert',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[0]),
        title: 'VONA warna ORANGE dikeluarkan',
        body: 'Kolom abu teramati 1.200 m di atas puncak, bergerak ke barat laut. Ketinggian abu FL 120.',
        source: 'Badan Geologi · Pos Pengamatan Anak Krakatau',
      },
      {
        kind: 'ERUPSI',
        severity: 'danger',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[1]),
        title: 'Erupsi dengan amplitudo maksimum 55 mm',
        body: 'Durasi 3 menit 12 detik. Lontaran material teramati sejauh 800 m dari pusat kawah.',
        source: 'Badan Geologi · rekaman seismograf tersedia',
      },
      {
        kind: 'HIMBAUAN',
        severity: 'watch',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[2]),
        title: 'Nelayan diminta menjauhi radius 5 km',
        body: 'Kegiatan penangkapan ikan di sekitar tubuh gunung dihentikan sampai status diturunkan.',
        source: 'BPBD Lampung Selatan',
      },
      {
        kind: 'CUACA',
        severity: 'neutral',
        timeISO: shiftISO(updatedAtISO, FEED_OFFSETS_MIN[3]),
        title: 'Angin permukaan ke barat laut, 11 km/jam',
        body: 'Abu tipis berpotensi mencapai Kalianda dan Rajabasa hingga sore. Tinggi gelombang 1,5–2,5 m.',
        source: 'BMKG · pembaruan tiap 6 jam',
      },
    ],

    shelters: [
      {
        name: 'Lapangan Kalianda',
        note: '3,1 km dari Anda · kapasitas 1.200 jiwa · dapur umum',
        tel: '0727 322xxx',
      },
      {
        name: 'SDN 2 Rajabasa',
        note: '7,4 km · kapasitas 400 jiwa · posko kesehatan',
        tel: '0727 331xxx',
      },
      { name: 'BPBD Lampung Selatan', note: 'Siaga 24 jam', tel: '112' },
    ],

    ashfallSteps: ASHFALL_STEPS,
  }
}
