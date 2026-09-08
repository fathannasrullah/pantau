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
