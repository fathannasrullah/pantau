import type { LevelId, VolcanoLevel } from '../types'

/**
 * Arti tiap level menurut tingkatan resmi PVMBG.
 *
 * Teks di sini sengaja hanya menjelaskan APA ARTI sebuah level dan apa yang
 * perlu dilakukan — bukan mengklaim pengamatan yang sedang terjadi. Versi
 * sebelumnya menuliskan hal seperti "kolom abu hingga 1.200 m" dan nama desa
 * tertentu; kalimat begitu terbaca sebagai laporan sungguhan padahal karangan.
 *
 * Radius dan waktu perubahan level hanya boleh datang dari PVMBG. Selama belum
 * tersambung, radius di sini adalah angka lazim per level, dan ditandai contoh
 * di layar.
 */
export const LEVELS: Record<LevelId, VolcanoLevel> = {
  normal: {
    id: 'normal',
    name: 'NORMAL',
    roman: 'I',
    radiusKm: 1,
    urgent: false,
    strip: '',
    headline:
      'Tingkat dasar: gunung tidak menunjukkan tanda peningkatan aktivitas.',
    plain:
      'Aman untuk aktivitas biasa. Anda tidak perlu melakukan apa pun selain mengikuti kabar resmi.',
    coastal: null,
    action: 'Tidak ada pembatasan khusus',
    actionNote: 'Tetap ikuti pengumuman resmi sebelum mendekati kawah.',
    sinceISO: null,
    sincePrecision: 'day',
  },
  waspada: {
    id: 'waspada',
    name: 'WASPADA',
    roman: 'II',
    radiusKm: 2,
    urgent: false,
    strip: '',
    headline:
      'Ada peningkatan aktivitas di atas tingkat dasar. Erupsi kecil mungkin terjadi.',
    plain:
      'Belum perlu mengungsi. Siapkan masker di rumah dan jangan mendekati kawah.',
    coastal: {
      tag: 'belum ada peringatan',
      note: 'Belum ada peringatan gelombang. Pemantauan pesisir tetap berjalan.',
      severity: 'watch',
    },
    action: 'Jauhi kawah dalam radius 2 km',
    actionNote:
      'Siapkan masker dan pelindung mata bila terjadi hujan abu tipis.',
    sinceISO: null,
    sincePrecision: 'day',
  },
  siaga: {
    id: 'siaga',
    name: 'SIAGA',
    roman: 'III',
    radiusKm: 5,
    urgent: true,
    strip: 'Dilarang beraktivitas dalam radius bahaya dari kawah.',
    headline:
      'Aktivitas meningkat nyata dan erupsi berpeluang terjadi sewaktu-waktu.',
    plain:
      'Jangan mendekat ke gunung. Siapkan masker dan satu tas berisi dokumen, obat, serta air minum.',
    coastal: {
      tag: 'waspada gelombang',
      note: 'Untuk gunung pesisir, longsoran tubuh gunung bisa memicu gelombang tinggi tanpa didahului gempa. Ikuti peringatan BMKG.',
      severity: 'watch',
    },
    action: 'Kosongkan radius 5 km dari kawah',
    actionNote:
      'Nelayan dan wisatawan dilarang mendekat. Warga di sekitar bersiap mengungsi bila status naik.',
    sinceISO: null,
    sincePrecision: 'day',
  },
  awas: {
    id: 'awas',
    name: 'AWAS',
    roman: 'IV',
    radiusKm: 7,
    urgent: true,
    strip: 'Evakuasi segera mengikuti arahan petugas.',
    headline:
      'Erupsi besar berpeluang terjadi atau sedang berlangsung. Wilayah bahaya harus dikosongkan.',
    plain:
      'Berangkat ke titik kumpul sekarang, jangan menunggu. Bawa dokumen, obat, dan air; jauhi pesisir.',
    coastal: {
      tag: 'peringatan tsunami',
      note: 'Pada level ini gunung pesisir berpotensi memicu tsunami akibat longsoran tubuh gunung. Menjauh dari pantai dan cari tempat tinggi bila BMKG mengeluarkan peringatan.',
      severity: 'danger',
    },
    action: 'Evakuasi ke titik kumpul sekarang',
    actionNote:
      'Ikuti arahan petugas. Hindari pesisir dan bawa dokumen penting serta obat.',
    sinceISO: null,
    sincePrecision: 'day',
  },
}

export const LEVEL_ORDER: LevelId[] = ['normal', 'waspada', 'siaga', 'awas']
