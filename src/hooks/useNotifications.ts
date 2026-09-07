import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_RULE_STATE } from '../data/notificationRules'
import type { NotificationRuleId } from '../types'

const RULES_KEY = 'pantau:notifikasi'

export type NotifPermission =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied'

export interface NotifyRequest {
  title: string
  body: string
  /**
   * Penanda supaya pemberitahuan yang sama tidak menumpuk: yang baru
   * menggantikan yang lama, bukan berbaris di bawahnya.
   */
  tag: string
  urgent?: boolean
}

export interface NotificationsState {
  permission: NotifPermission
  rules: Record<NotificationRuleId, boolean>
  toggleRule: (id: NotificationRuleId) => void
  request: () => Promise<void>
  /** Kirim satu pemberitahuan; mengembalikan false bila tidak jadi dikirim. */
  notify: (req: NotifyRequest) => Promise<boolean>
  /** Untuk menguji sendiri bahwa pemberitahuan benar-benar sampai. */
  sendTest: () => Promise<boolean>
}

function readPermission(): NotifPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as NotifPermission
}

function readRules(): Record<NotificationRuleId, boolean> {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (!raw) return DEFAULT_RULE_STATE
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_RULE_STATE
    // Kunci yang tidak dikenali diabaikan; yang hilang memakai nilai bawaan.
    const next = { ...DEFAULT_RULE_STATE }
    for (const key of Object.keys(next) as NotificationRuleId[]) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'boolean') next[key] = value
    }
    return next
  } catch {
    return DEFAULT_RULE_STATE
  }
}

/**
 * Pemberitahuan peramban, tanpa server push.
 *
 * Batasnya jujur dan penting: tanpa server push, pemberitahuan hanya bisa
 * terbit saat halaman ini sedang berjalan — terbuka di tab, atau app terpasang
 * dan masih hidup di latar. App ini tidak bisa membangunkan perangkat yang
 * sedang mati, dan tidak boleh dijanjikan begitu. Perintah evakuasi tetap
 * datang dari sirene, petugas, dan pengumuman BPBD.
 */
export function useNotifications(): NotificationsState {
  const [permission, setPermission] = useState<NotifPermission>(readPermission)
  const [rules, setRules] = useState(readRules)

  useEffect(() => {
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules))
    } catch {
      // Penyimpanan bisa ditolak (mode privat); aturannya tetap berlaku
      // selama sesi ini, jadi tidak ada yang perlu digagalkan.
    }
  }, [rules])

  // Izin bisa dicabut lewat setelan peramban tanpa memuat ulang halaman.
  useEffect(() => {
    if (!('permissions' in navigator)) return
    let status: PermissionStatus | null = null
    const onChange = () => setPermission(readPermission())
    navigator.permissions
      .query({ name: 'notifications' as PermissionName })
      .then((s) => {
        status = s
        s.addEventListener('change', onChange)
      })
      .catch(() => {
        // Sebagian peramban tidak mengizinkan kueri ini; bukan kegagalan.
      })
    return () => status?.removeEventListener('change', onChange)
  }, [])

  const toggleRule = useCallback((id: NotificationRuleId) => {
    setRules((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const request = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotifPermission)
    } catch {
      setPermission(readPermission())
    }
  }, [])

  const notify = useCallback(
    async ({ title, body, tag, urgent }: NotifyRequest) => {
      if (!('Notification' in window)) return false
      if (Notification.permission !== 'granted') return false

      const options: NotificationOptions = {
        body,
        tag,
        // Pemberitahuan mendesak tidak boleh hilang sendiri sebelum dibaca.
        requireInteraction: urgent === true,
        icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        badge: `${import.meta.env.BASE_URL}icons/favicon-32.png`,
        lang: 'id',
      }

      // Lewat service worker adalah satu-satunya jalan di Android; konstruktor
      // Notification memang ada di sana, tapi melempar galat saat dipanggil.
      try {
        const reg = await navigator.serviceWorker?.ready
        if (reg) {
          await reg.showNotification(title, options)
          return true
        }
      } catch {
        // Jatuh ke cara langsung di bawah.
      }
      try {
        new Notification(title, options)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const sendTest = useCallback(
    () =>
      notify({
        title: 'Pantau Gunung Berapi',
        body: 'Pemberitahuan aktif. Beginilah tampilannya saat ada perubahan.',
        tag: 'pantau-uji',
      }),
    [notify],
  )

  return { permission, rules, toggleRule, request, notify, sendTest }
}
