import { useState } from 'react'
import { REPORT_TAGS } from '../../data/notificationRules'
import type { UserPosition } from '../../types'
import { Sheet } from '../Sheet'

interface Props {
  position: UserPosition
  onClose: () => void
}

export function ReportSheet({ position, onClose }: Props) {
  const [tag, setTag] = useState(REPORT_TAGS[0])
  const [sent, setSent] = useState(false)

  return (
    <Sheet
      title="Laporan warga"
      note="Diperiksa petugas BPBD sebelum tampil di feed publik. Laporan Anda tidak mengubah level status."
      onClose={onClose}
    >
      <div className="sheet__sublabel">Apa yang Anda alami?</div>
      <div className="tags">
        {REPORT_TAGS.map((item) => (
          <button
            key={item}
            type="button"
            className={`tag${item === tag ? ' tag--on' : ''}`}
            aria-pressed={item === tag}
            onClick={() => {
              setTag(item)
              setSent(false)
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="attach">
        <span>
          Lampirkan foto · lokasi otomatis dari GPS
          <br />
          {position.label} · akurasi {position.accuracyM} m
        </span>
      </div>
      <button
        type="button"
        className={`submit${sent ? ' submit--sent' : ''}`}
        onClick={() => setSent(true)}
      >
        {sent ? 'Terkirim — menunggu verifikasi petugas' : 'Kirim laporan'}
      </button>
    </Sheet>
  )
}
