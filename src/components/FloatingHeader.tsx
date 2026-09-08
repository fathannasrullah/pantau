import type { DataStateView } from '../data/dataState'
import { formatNumber } from '../lib/format'
import type { VolcanoRef } from '../types'

interface Props {
  volcano: VolcanoRef
  dataState: DataStateView
  onRefresh: () => void
  onPickVolcano: () => void
}

/**
 * Kepala halaman yang mengapung di atas peta.
 *
 * Pembungkusnya tidak menerima ketukan supaya peta di sekitarnya tetap bisa
 * digeser; hanya kartunya sendiri yang menerima.
 */
export function FloatingHeader({
  volcano,
  dataState,
  onRefresh,
  onPickVolcano,
}: Props) {
  return (
    <header className="fhead">
      <div className="fhead__card">
        <span className="fhead__dot" aria-hidden="true" />
        <button
          type="button"
          className="fhead__id"
          onClick={onPickVolcano}
          aria-label={`Gunung dipantau: ${volcano.name}. Ketuk untuk memilih gunung lain.`}
        >
          <span className="fhead__name">
            {volcano.name}
            <span className="fhead__caret" aria-hidden="true" />
          </span>
          <span className="fhead__meta">
            {volcano.region} · {formatNumber(volcano.elevationM)} m ·{' '}
            {dataState.sub}
          </span>
        </button>
        <button
          type="button"
          className="fhead__sync"
          onClick={onRefresh}
          aria-label={`Kondisi data: ${dataState.label}. Ketuk untuk memuat ulang.`}
        >
          <span className="chip">
            <span className="chip__dot" aria-hidden="true" />
            <span className="chip__label mono">{dataState.label}</span>
          </span>
        </button>
      </div>
    </header>
  )
}
