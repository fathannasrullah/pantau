/**
 * Penghitung kunjungan lewat GoatCounter.
 *
 * Situs ini statis di GitHub Pages — tidak ada server yang bisa mencatat
 * apa pun — jadi hitungannya dititipkan ke layanan luar. Yang dipakai di sini
 * endpoint mentahnya, bukan count.js bawaannya: satu berkas skrip pihak ketiga
 * lagi berarti satu lagi yang harus diunduh sebelum app terbaca, dan app ini
 * dibuka orang yang sedang terburu-buru.
 *
 * Bentuk URL dan nama parameternya mengikuti dokumentasi resmi GoatCounter
 * (tpl/help/pixel.md dan tpl/help/visitor-counter.md), yang menyatakan
 * parameter tersebut stabil.
 */

const origin = (code: string) => `https://${code}.goatcounter.com`

/**
 * Menyaring kode situs dari apa pun yang telanjur diisikan.
 *
 * Yang dibutuhkan cuma kodenya — bagian "fathan" dari fathan.goatcounter.com —
 * tapi yang tersedia untuk disalin di halaman GoatCounter adalah seluruh
 * potongan <script>. Sekali itu terisi apa adanya, app menyusun URL omong
 * kosong dan kunjungannya hilang tanpa satu pun tanda: build hijau, deploy
 * terbit, angkanya nol selamanya. Sudah terjadi sekali.
 *
 * Jadi semua bentuk ini diterima:
 *   fathan
 *   fathan.goatcounter.com
 *   https://fathan.goatcounter.com/count
 *   <script data-goatcounter="https://fathan.goatcounter.com/count" ...></script>
 *
 * Yang tidak berbentuk kode sah dikembalikan sebagai kosong — lebih baik
 * penghitungnya mati dan diam daripada app mengirim permintaan ke alamat yang
 * tidak ada.
 */
export function normalizeSiteCode(raw: string): string {
  const teks = raw.trim()
  if (!teks) return ''
  const cocok = /([A-Za-z0-9-]+)\.goatcounter\.com/.exec(teks)
  const calon = cocok ? cocok[1] : teks
  // Satu label nama host: huruf, angka, tanda hubung, maksimal 63 karakter.
  return /^[A-Za-z0-9-]{1,63}$/.test(calon) ? calon.toLowerCase() : ''
}

/**
 * URL pencatat satu kunjungan. Jalur yang dikirim sengaja hanya pathname:
 * app ini menulis pilihan gunung dan mode demo ke query string, dan itu akan
 * memecah satu halaman jadi puluhan baris berbeda di laporan.
 */
export function visitBeaconUrl(
  code: string,
  visit: { path: string; title: string; referrer: string; rnd: string },
): string | null {
  if (!code) return null
  const q = new URLSearchParams({ p: visit.path, t: visit.title })
  // Rujukan kosong tidak perlu dikirim; GoatCounter membacanya dari header.
  if (visit.referrer) q.set('r', visit.referrer)
  // Sebagian peramban dan proxy punya pendapat sendiri soal apa yang boleh
  // di-cache, jadi tiap kunjungan diberi pembeda.
  q.set('rnd', visit.rnd)
  return `${origin(code)}/count?${q.toString()}`
}

/** URL angka total situs. 'TOTAL' huruf besar, tanpa garis miring di depan. */
export function visitTotalUrl(code: string): string | null {
  return code ? `${origin(code)}/counter/TOTAL.json` : null
}

/**
 * GoatCounter mengirim angkanya sebagai teks yang sudah berpemisah ribuan
 * gaya Inggris ("1,234"), jadi dikembalikan ke angka dulu supaya bisa ditulis
 * ulang dengan pemisah Indonesia.
 */
export function parseVisitCount(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null
  const raw = (payload as { count?: unknown }).count
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const digits = String(raw).replace(/[^0-9]/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}
