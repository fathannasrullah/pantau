/**
 * Kapan versi baru app dipasang, dan kapan cukup ditawarkan.
 *
 * Dipisah dari hook-nya supaya bisa diuji tanpa peramban dan tanpa service
 * worker — sama seperti aturan notifikasi di alerts.ts.
 */

/** Sesering apa halaman menanyakan adanya versi baru ke server. */
export const UPDATE_CHECK_MS = 5 * 60_000

export type UpdateAction =
  /** Belum ada apa-apa. */
  | 'idle'
  /** Pasang sekarang: halaman sedang tidak dilihat, jadi muat ulang tak terasa. */
  | 'apply'
  /** Tawarkan tombol: orangnya sedang membaca, jangan tarik isinya. */
  | 'offer'

export function decideUpdateAction(ctx: {
  ready: boolean
  visible: boolean
}): UpdateAction {
  if (!ctx.ready) return 'idle'
  return ctx.visible ? 'offer' : 'apply'
}

/**
 * Memeriksa versi baru hanya masuk akal saat halaman dilihat dan ada jaringan.
 * Tab yang terkubur di latar tidak perlu membangunkan radio ponsel tiap lima
 * menit; begitu kembali dilihat, pemeriksaannya langsung dijalankan.
 */
export function shouldCheckForUpdate(ctx: {
  visible: boolean
  online: boolean
}): boolean {
  return ctx.visible && ctx.online
}
