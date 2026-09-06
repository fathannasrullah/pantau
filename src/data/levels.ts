import type { LevelId, VolcanoLevel } from '../types'

/**
 * Only Badan Geologi / PVMBG may declare these levels — when a real feed is wired
 * in, the copy per level stays here and only `sinceISO` comes from upstream.
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
      'Aktivitas pada tingkat dasar. Tidak ada erupsi teramati dalam 24 jam terakhir.',
    plain:
      'Aman untuk aktivitas biasa. Anda tidak perlu melakukan apa pun selain mengikuti kabar resmi.',
    coastal: null,
    action: 'Tidak ada pembatasan khusus',
    actionNote: 'Tetap ikuti pengumuman resmi sebelum mendekati kawah.',
    sinceISO: '2026-03-12T00:00:00+07:00',
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
      'Peningkatan kegempaan dan embusan asap tebal. Erupsi kecil mungkin terjadi.',
    plain:
      'Belum perlu mengungsi. Siapkan masker di rumah dan jangan mendekati kawah.',
    coastal: {
      tag: 'belum ada peringatan',
      note: 'Tidak ada potensi gelombang tidak wajar. Aktivitas pesisir berjalan normal dengan pemantauan.',
      severity: 'watch',
    },
    action: 'Jauhi kawah dalam radius 2 km',
    actionNote:
      'Siapkan masker dan pelindung mata bila terjadi hujan abu tipis.',
    sinceISO: '2026-08-28T00:00:00+07:00',
    sincePrecision: 'day',
  },
  siaga: {
    id: 'siaga',
    name: 'SIAGA',
    roman: 'III',
    radiusKm: 5,
    urgent: true,
    strip: 'Erupsi berlanjut. Dilarang beraktivitas dalam radius 5 km dari kawah.',
    headline:
      'Erupsi menerus dengan kolom abu hingga 1.200 m. Lontaran material teramati di sekitar kawah.',
    plain:
      'Jangan mendekat ke gunung. Bila Anda di Kalianda atau Rajabasa, siapkan masker dan tas berisi dokumen serta obat.',
    coastal: {
      tag: 'waspada gelombang',
      note: 'Gelombang 1,5–2,5 m di Anyer–Carita. Wisata pantai ditutup. Belum ada peringatan tsunami dari BMKG.',
      severity: 'watch',
    },
    action: 'Kosongkan radius 5 km dari kawah',
    actionNote:
      'Nelayan dan wisatawan dilarang mendekat. Warga pesisir siap mengungsi bila status naik.',
    sinceISO: '2026-09-03T09:20:00+07:00',
    sincePrecision: 'minute',
  },
  awas: {
    id: 'awas',
    name: 'AWAS',
    roman: 'IV',
    radiusKm: 7,
    urgent: true,
    strip:
      'Evakuasi segera. Potensi erupsi besar dan gelombang tinggi di pesisir Selat Sunda.',
    headline:
      'Erupsi besar berlangsung. Potensi longsoran tubuh gunung dan gelombang tinggi di pesisir.',
    plain:
      'Berangkat ke titik kumpul sekarang, jangan menunggu. Bawa dokumen, obat, dan air; jauhi pesisir.',
    coastal: {
      tag: 'peringatan tsunami',
      note: 'BMKG memperingatkan potensi tsunami akibat longsoran tubuh gunung. Menjauh dari pantai, cari tempat tinggi.',
      severity: 'danger',
    },
    action: 'Evakuasi ke titik kumpul sekarang',
    actionNote:
      'Ikuti arahan petugas. Hindari pesisir dan bawa dokumen penting serta obat.',
    sinceISO: '2026-09-07T04:05:00+07:00',
    sincePrecision: 'minute',
  },
}

export const LEVEL_ORDER: LevelId[] = ['normal', 'waspada', 'siaga', 'awas']
