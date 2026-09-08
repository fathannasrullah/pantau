import { useCallback, useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  decideUpdateAction,
  shouldCheckForUpdate,
  UPDATE_CHECK_MS,
} from '../data/appUpdate'

export interface AppUpdate {
  /** Versi baru sudah terunduh penuh dan tinggal dipakai. */
  ready: boolean
  /** Pasang sekarang juga; halaman akan memuat ulang. */
  apply: () => void
}

/**
 * Menjaga app tetap ikut deploy terbaru tanpa orangnya perlu memuat ulang
 * sendiri.
 *
 * Sebelumnya service worker hanya didaftarkan sekali saat halaman dibuka, jadi
 * tab yang dibiarkan terbuka — dan app ini memang dibuat untuk dibiarkan
 * terbuka — tidak pernah tahu ada versi baru. Deploy berjalan tiap 30 menit,
 * dan pembaruannya baru terlihat kalau seseorang menekan muat ulang.
 *
 * Sekarang: halaman menanyakan versi baru secara berkala dan setiap kali
 * kembali dilihat; begitu versi baru siap, ia dipasang saat halaman
 * ditinggalkan sehingga orangnya kembali ke versi terbaru tanpa pernah
 * melihat proses apa pun.
 */
export function useAppUpdate(): AppUpdate {
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, r) {
      registration.current = r ?? null
    },
  })

  const reloading = useRef(false)

  /**
   * Memuat ulang dikerjakan sendiri, tidak diserahkan ke plugin.
   *
   * vite-plugin-pwa memasang pemuat ulangnya pada event 'controlling', tapi
   * hanya menjalankannya bila workbox menandai peristiwa itu sebagai
   * pembaruan — dan tanda itu ditentukan dari ada tidaknya service worker yang
   * mengendalikan halaman saat pendaftaran. Pada halaman yang baru memasang
   * service worker di kunjungan yang sama, tandanya bernilai salah, service
   * worker barunya aktif, dan halaman tetap memegang JS dan CSS lama tanpa
   * pernah memuat ulang. Terukur di peramban: versi baru terpasang, layar
   * masih versi lama.
   */
  const apply = useCallback(() => {
    if (reloading.current) return
    reloading.current = true
    navigator.serviceWorker?.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true },
    )
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  useEffect(() => {
    const check = () => {
      const r = registration.current
      if (!r) return
      if (
        !shouldCheckForUpdate({
          visible: document.visibilityState === 'visible',
          online: navigator.onLine,
        })
      )
        return
      // Gagal menanyakan versi bukan kabar untuk pengguna: app yang sedang
      // berjalan tetap utuh, dan pemeriksaan berikutnya lima menit lagi.
      void r.update().catch(() => {})
    }
    const id = setInterval(check, UPDATE_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [])

  useEffect(() => {
    const act = () =>
      decideUpdateAction({
        ready: needRefresh,
        visible: document.visibilityState === 'visible',
      })
    if (act() === 'apply') {
      apply()
      return
    }
    if (!needRefresh) return
    // Ditawarkan lewat banner, tapi tidak menunggu tombol ditekan: begitu
    // halaman ditinggalkan, versinya dipasang sendiri.
    const onLeave = () => {
      if (act() === 'apply') apply()
    }
    document.addEventListener('visibilitychange', onLeave)
    return () => document.removeEventListener('visibilitychange', onLeave)
  }, [needRefresh, apply])

  return { ready: needRefresh, apply }
}
