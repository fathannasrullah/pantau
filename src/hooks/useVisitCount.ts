import { useEffect, useState } from 'react'
import { parseVisitCount, visitBeaconUrl, visitTotalUrl } from '../data/visits'

/**
 * Kode situs GoatCounter, diisi saat build lewat VITE_GOATCOUNTER.
 * Kosong berarti fitur ini mati total: tidak ada permintaan keluar sama sekali.
 */
const SITE_CODE = String(import.meta.env.VITE_GOATCOUNTER ?? '').trim()

export interface VisitCount {
  /** null selama belum terjawab, atau saat angkanya memang tidak bisa dibaca. */
  total: number | null
  state: 'off' | 'loading' | 'ok' | 'failed'
}

/**
 * Mencatat satu kunjungan, lalu — hanya kalau diminta — membaca angka totalnya.
 *
 * Pencatatannya berjalan untuk semua orang; pembacaan angkanya tidak. Angka itu
 * cuma untuk pemilik situs, dan menariknya untuk setiap pengunjung berarti satu
 * permintaan jaringan tambahan yang tidak dipakai siapa pun.
 */
export function useVisitCount(show: boolean): VisitCount {
  const [total, setTotal] = useState<number | null>(null)
  const [state, setState] = useState<VisitCount['state']>(
    SITE_CODE ? 'loading' : 'off',
  )

  useEffect(() => {
    const url = visitBeaconUrl(SITE_CODE, {
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
      rnd: String(Math.random()).slice(2),
    })
    if (!url) return
    // Gambar 1×1, bukan fetch: tidak butuh CORS, dan kegagalannya tidak
    // meninggalkan galat di konsol orang yang sedang memakai app.
    const pixel = new Image()
    pixel.src = url
  }, [])

  useEffect(() => {
    if (!show) return
    const url = visitTotalUrl(SITE_CODE)
    if (!url) {
      setState('off')
      return
    }
    const controller = new AbortController()
    setState('loading')
    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('HTTP'))))
      .then((body) => {
        const n = parseVisitCount(body)
        // Angka yang tidak terbaca bukan nol. Layar menandainya sebagai gagal,
        // bukan memajang "0 kunjungan" yang salah.
        setTotal(n)
        setState(n === null ? 'failed' : 'ok')
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState('failed')
      })
    return () => controller.abort()
  }, [show])

  return { total, state }
}
