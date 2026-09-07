import type { Impact, ShelterPoint, TransportStatus, Village } from '../types'

/**
 * Isi yang khas satu wilayah: dampak, desa terdekat, titik kumpul, transportasi.
 *
 * Semuanya kosong, dan itu disengaja. Versi sebelumnya memuat contoh yang
 * terbaca seperti laporan sungguhan — "42 warga dievakuasi dari Pulau Sebesi",
 * "Pelabuhan Bakauheni terbatas", nomor telepon posko yang tidak ada. Isi
 * seperti itu tidak bisa dipertanggungjawabkan, dan di aplikasi kebencanaan
 * angka karangan yang terlihat asli lebih berbahaya daripada layar kosong.
 *
 * Data ini hanya boleh datang dari BPBD kabupaten. Sampai tersambung, layar
 * menampilkan keterangan yang menyebut siapa pemiliknya dan apa yang kurang.
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
    pesisir:
      'Gunung pesisir berpotensi memicu gelombang tinggi akibat longsoran tubuh gunung. Peringatan resmi datang dari BMKG.',
  },
}

export const REGION_SAMPLES: Record<string, RegionSample> = {}

export interface EmergencyContact {
  name: string
  note: string
  tel: string
}

/**
 * Hanya nomor yang benar-benar berlaku secara nasional. Nomor posko per
 * kabupaten sengaja tidak dicantumkan selama belum ada sumber resminya —
 * nomor yang salah saat keadaan darurat lebih buruk daripada tidak ada nomor.
 */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    name: 'Panggilan darurat nasional',
    note: 'Berlaku di seluruh Indonesia, bebas pulsa, 24 jam',
    tel: '112',
  },
]
