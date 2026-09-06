import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pantau-gunung:install-dismissed'

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!event || hidden) return null

  const install = async () => {
    await event.prompt()
    await event.userChoice
    setEvent(null)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setHidden(true)
  }

  return (
    <div className="install">
      <div className="install__body">
        <div className="install__title">Pasang di layar utama</div>
        <div className="install__note">
          Terbuka lebih cepat dan tetap bisa dibuka saat sinyal hilang.
        </div>
      </div>
      <button type="button" className="install__btn" onClick={install}>
        Pasang
      </button>
      <button
        type="button"
        className="install__dismiss"
        onClick={dismiss}
        aria-label="Sembunyikan ajakan pasang aplikasi"
      >
        Nanti
      </button>
    </div>
  )
}
