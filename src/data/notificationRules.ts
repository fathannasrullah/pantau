import type { NotificationRule, NotificationRuleId } from '../types'

/**
 * Damping rules: repeated advisories must not turn into a stream of alerts, or
 * people stop reading them. Only evacuation orders and a change in the ash
 * warning are allowed to interrupt by default.
 */
export const NOTIFICATION_RULES: NotificationRule[] = [
  {
    // Tidak ada sumber perintah evakuasi yang bisa dibaca app ini, jadi
    // saklarnya tidak boleh terlihat menyala seolah kabarnya akan datang.
    id: 'evac',
    label: 'Perintah evakuasi BPBD',
    note: 'Belum tersambung — perintah evakuasi datang lewat sirene, petugas, dan pengumuman resmi, bukan dari app ini.',
    locked: true,
  },
  {
    id: 'level',
    label: 'Perubahan peringatan abu penerbangan',
    note: 'Hanya saat peringatan mulai atau berakhir, bukan setiap advisory.',
    locked: false,
  },
  {
    id: 'ash',
    label: 'Kualitas udara memburuk di wilayah saya',
    note: 'Maksimal satu kali per 3 jam, dari model CAMS.',
    locked: false,
  },
  {
    id: 'quake',
    label: 'Setiap gempa baru di sekitar gunung',
    note: 'Bisa beberapa kali sehari. Untuk pemantau dan relawan.',
    locked: false,
  },
]

export const DEFAULT_RULE_STATE: Record<NotificationRuleId, boolean> = {
  evac: false,
  level: true,
  ash: true,
  quake: false,
}

export const REPORT_TAGS = [
  'Hujan abu',
  'Suara dentuman',
  'Getaran',
  'Air keruh',
  'Gelombang tinggi',
]
