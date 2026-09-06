import { useState } from 'react'
import type { DemoState } from '../hooks/useDemo'
import type { DataStateId, LevelId } from '../types'

const LEVEL_OPTIONS: { id: LevelId; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'waspada', label: 'Waspada' },
  { id: 'siaga', label: 'Siaga' },
  { id: 'awas', label: 'Awas' },
]

const DATA_OPTIONS: { id: DataStateId | null; label: string }[] = [
  { id: null, label: 'Otomatis' },
  { id: 'fresh', label: 'Live' },
  { id: 'stale', label: 'Basi' },
  { id: 'failed', label: 'Gagal' },
  { id: 'offline', label: 'Offline' },
]

interface Props {
  demo: DemoState
  onChange: (patch: Partial<DemoState>) => void
}

export function DemoPanel({ demo, onChange }: Props) {
  const [open, setOpen] = useState(true)

  if (!demo.enabled) return null

  if (!open) {
    return (
      <button
        type="button"
        className="demo__collapsed"
        onClick={() => setOpen(true)}
      >
        Demo
      </button>
    )
  }

  return (
    <div className="demo">
      <div className="demo__head">
        <div className="demo__title">Mode demo</div>
        <button
          type="button"
          className="demo__close"
          onClick={() => setOpen(false)}
        >
          Sembunyikan
        </button>
      </div>

      <div className="demo__group">
        <div className="demo__label">Level status</div>
        <div className="demo__opts">
          {LEVEL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`demo__opt${
                (demo.level ?? 'siaga') === option.id ? ' demo__opt--on' : ''
              }`}
              onClick={() => onChange({ level: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo__group">
        <div className="demo__label">Kondisi data</div>
        <div className="demo__opts">
          {DATA_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`demo__opt${
                demo.dataState === option.id ? ' demo__opt--on' : ''
              }`}
              onClick={() => onChange({ dataState: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo__group">
        <div className="demo__label">Bagian transportasi</div>
        <div className="demo__opts">
          <button
            type="button"
            className={`demo__opt${demo.showTransport ? ' demo__opt--on' : ''}`}
            onClick={() => onChange({ showTransport: true })}
          >
            Tampil
          </button>
          <button
            type="button"
            className={`demo__opt${!demo.showTransport ? ' demo__opt--on' : ''}`}
            onClick={() => onChange({ showTransport: false })}
          >
            Sembunyi
          </button>
        </div>
      </div>
    </div>
  )
}
