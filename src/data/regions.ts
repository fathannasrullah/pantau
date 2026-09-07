import type { Impact, ShelterPoint, TransportStatus, Village } from '../types'

/**
 * Isi yang khas satu wilayah: dampak, desa terdekat, titik kumpul, transportasi.
 *
 * Semuanya masih data contoh dan menunggu BPBD kabupaten. Yang penting di sini:
 * isi ini TIDAK BOLEH bocor antar gunung. Menampilkan posko Kalianda saat
 * pengguna memantau Semeru bukan sekadar salah — itu menyesatkan orang yang
 * sedang mencari tempat mengungsi.
 *
 * Karena itu hanya gunung yang benar-benar punya isinya yang terdaftar; sisanya
 * memakai EMPTY_REGION dan layarnya menampilkan keadaan kosong yang jujur.
 */
export interface RegionSample {
  impacts: Impact[]
  transport: TransportStatus[]
  villages: Village[]
  shelters: ShelterPoint[]
  mapNotes: { radius: string; abu: string; pesisir: string | null }
}

export const EMPTY_REGION: RegionSample = {
  impacts: [],
  transport: [],
  villages: [],
  shelters: [],
  mapNotes: {
    radius: 'Radius bahaya mengikuti level status resmi, yang belum tersambung.',
    abu: 'Arah sebaran mengikuti angin permukaan terkini di atas kawah.',
    pesisir: null,
  },
}

export const REGION_SAMPLES: Record<string, RegionSample> = {
  krakatau: {
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
    shelters: [
      {
        name: 'Lapangan Kalianda',
        note: 'Kapasitas 1.200 jiwa · dapur umum',
        tel: '0727 322xxx',
        lat: -5.7486,
        lon: 105.5905,
      },
      {
        name: 'SDN 2 Rajabasa',
        note: 'Kapasitas 400 jiwa · posko kesehatan',
        tel: '0727 331xxx',
        lat: -5.7975,
        lon: 105.6289,
      },
      {
        name: 'BPBD Lampung Selatan',
        note: 'Siaga 24 jam',
        tel: '112',
        lat: -5.753,
        lon: 105.579,
      },
    ],
    mapNotes: {
      radius:
        'Pos pengamatan berada di Pasauran, 42 km ke timur dari kawah.',
      abu: 'Perkiraan jangkauan abu tipis 38 km mengikuti arah angin.',
      pesisir:
        'Enam desa pesisir Selat Sunda masuk zona pemantauan gelombang. Sirene pantai diuji tiap Jumat 10.00.',
    },
  },
}
