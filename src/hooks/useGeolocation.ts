import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Setiap keadaan dibedakan karena jalan keluarnya berbeda: izin ditolak butuh
 * setelan browser, sinyal hilang cukup dicoba lagi, dan konteks tidak aman tidak
 * bisa diperbaiki dari dalam app.
 */
export type GeoStatus =
  | 'idle'
  | 'unsupported'
  | 'insecure'
  | 'prompting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'timeout'

export interface GeoFix {
  lat: number
  lon: number
  accuracyM: number
  atISO: string
}

export interface GeolocationState {
  status: GeoStatus
  /** Fix terakhir yang berhasil; dipertahankan saat pembaruan berikutnya gagal. */
  fix: GeoFix | null
  request: () => void
  stop: () => void
}

const CONSENT_KEY = 'pantau:lokasi'

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  // Fix berumur setengah menit masih layak dipakai; menahan permintaan baru
  // menghemat baterai di daerah yang sinyalnya buruk.
  maximumAge: 30_000,
}

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

function writeConsent(on: boolean) {
  try {
    if (on) localStorage.setItem(CONSENT_KEY, '1')
    else localStorage.removeItem(CONSENT_KEY)
  } catch {
    // Mode penyamaran memblokir penyimpanan; lokasi tetap bisa dipakai sesi ini.
  }
}

/**
 * Membaca posisi pengguna lewat Geolocation API.
 *
 * Pilihan pengguna diingat, tapi pemantauan hanya dilanjutkan otomatis bila
 * browser memastikan izinnya masih 'granted' — supaya app tidak memunculkan
 * dialog izin sendiri setiap kali dibuka.
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [fix, setFix] = useState<GeoFix | null>(null)
  const watchId = useRef<number | null>(null)

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return
    }
    if (!window.isSecureContext) {
      setStatus('insecure')
      return
    }

    setStatus((prev) => (prev === 'active' ? prev : 'prompting'))
    clearWatch()
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          atISO: new Date(pos.timestamp).toISOString(),
        })
        setStatus('active')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // Izin yang dicabut tidak boleh terus dicoba: browser akan menolak
          // diam-diam dan pengguna melihat app menggantung.
          clearWatch()
          writeConsent(false)
          setStatus('denied')
          return
        }
        setStatus(err.code === err.TIMEOUT ? 'timeout' : 'unavailable')
      },
      OPTIONS,
    )
  }, [clearWatch])

  const request = useCallback(() => {
    writeConsent(true)
    start()
  }, [start])

  const stop = useCallback(() => {
    clearWatch()
    writeConsent(false)
    setFix(null)
    setStatus('idle')
  }, [clearWatch])

  useEffect(() => {
    let cancelled = false
    if (!readConsent()) return

    // Tanpa Permissions API, memulai sendiri berisiko memunculkan dialog izin
    // tanpa pengguna menyentuh apa pun — biarkan mereka menekan tombolnya.
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return
        if (result.state === 'granted') start()
        else if (result.state === 'denied') {
          writeConsent(false)
          setStatus('denied')
        }
      })
      .catch(() => {
        // Safari lama menolak query ini; pengguna cukup menekan tombolnya.
      })

    return () => {
      cancelled = true
    }
  }, [start])

  useEffect(() => clearWatch, [clearWatch])

  return { status, fix, request, stop }
}
