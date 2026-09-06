import { useEffect, useId, type ReactNode } from 'react'

interface Props {
  title: string
  note: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ title, note, onClose, children }: Props) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__head">
          <h2 className="sheet__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Tutup
          </button>
        </div>
        <p className="sheet__note">{note}</p>
        {children}
      </div>
    </div>
  )
}
