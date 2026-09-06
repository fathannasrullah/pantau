import { formatAge, formatDuration, formatTime, minutesBetween } from '../lib/format'
import type { DataStateId, FeedStatus } from '../types'

/** Past this age a successful read is still shown, but marked as no longer live. */
export const STALE_AFTER_MINUTES = 15

export interface DataStateView {
  id: DataStateId
  /** Chip in the header: LIVE / BASI / GAGAL / OFFLINE */
  label: string
  sub: string
  /** Stamp printed under every number on screen. */
  sourceTime: string
  /** Body opacity — old numbers must not look as solid as live ones. */
  dim: number
  banner: { title: string; note: string } | null
  /** Ashfall card gets an extra "do not act on this" warning when true. */
  isFailed: boolean
  ageMinutes: number
}

export function resolveDataStateId(
  status: FeedStatus,
  ageMinutes: number,
): DataStateId {
  if (status === 'offline') return 'offline'
  if (status === 'failed') return 'failed'
  return ageMinutes >= STALE_AFTER_MINUTES ? 'stale' : 'fresh'
}

export function describeDataState(params: {
  status: FeedStatus
  updatedAtISO: string
  nowISO: string
}): DataStateView {
  const { status, updatedAtISO, nowISO } = params
  const ageMinutes = Math.max(0, minutesBetween(updatedAtISO, nowISO))
  const id = resolveDataStateId(status, ageMinutes)
  const age = formatAge(ageMinutes)
  const clock = formatTime(updatedAtISO)

  switch (id) {
    case 'stale':
      return {
        id,
        label: 'BASI',
        sub: age,
        sourceTime: `terakhir diketahui ${clock}`,
        dim: 0.72,
        isFailed: false,
        ageMinutes,
        banner: {
          title: `Data belum diperbarui ${formatDuration(ageMinutes)}`,
          note: 'Angka di bawah adalah yang terakhir diketahui. Perubahan status tetap dikirim lewat notifikasi.',
        },
      }
    case 'failed':
      return {
        id,
        label: 'GAGAL',
        sub: 'tidak tersambung',
        sourceTime: 'gagal dimuat',
        dim: 0.55,
        isFailed: true,
        ageMinutes,
        banner: {
          title: 'Tidak bisa menghubungi server',
          note: `Yang tampil adalah data tersimpan ${age}. Untuk keputusan mendesak, hubungi 112.`,
        },
      }
    case 'offline':
      return {
        id,
        label: 'OFFLINE',
        sub: 'mode hemat data',
        sourceTime: `dari penyimpanan ${clock}`,
        dim: 0.8,
        isFailed: false,
        ageMinutes,
        banner: {
          title: 'Mode offline aktif',
          note: 'Menampilkan salinan terakhir. Perintah evakuasi tetap masuk lewat SMS tanpa internet.',
        },
      }
    default:
      return {
        id: 'fresh',
        label: 'LIVE',
        sub: age,
        sourceTime: `diperbarui ${clock}`,
        dim: 1,
        isFailed: false,
        ageMinutes,
        banner: null,
      }
  }
}
