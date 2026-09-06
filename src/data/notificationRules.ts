import type { NotificationRule, NotificationRuleId } from '../types'

/**
 * Damping rules: repeated small eruptions must not turn into a stream of alerts,
 * or people stop reading them. Only level changes and evacuation orders are
 * allowed to interrupt by default.
 */
export const NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'evac',
    label: 'Perintah evakuasi',
    note: 'Selalu aktif. Dikirim juga lewat SMS.',
    locked: true,
  },
  {
    id: 'level',
    label: 'Perubahan level status',
    note: 'Hanya saat level naik atau turun, bukan setiap erupsi.',
    locked: false,
  },
  {
    id: 'ash',
    label: 'Hujan abu di wilayah saya',
    note: 'Maksimal satu kali per 3 jam.',
    locked: false,
  },
  {
    id: 'quake',
    label: 'Setiap kejadian erupsi',
    note: 'Bisa puluhan per hari. Untuk pemantau dan relawan.',
    locked: false,
  },
]

export const DEFAULT_RULE_STATE: Record<NotificationRuleId, boolean> = {
  evac: true,
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
