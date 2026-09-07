import type { DataStateView } from '../data/dataState'
import { formatNumber } from '../lib/format'
import type { VolcanoRef } from '../types'

interface Props {
  volcano: VolcanoRef
  dataState: DataStateView
  onRefresh: () => void
  onPickVolcano: () => void
}

export function AppHeader({
  volcano,
  dataState,
  onRefresh,
  onPickVolcano,
}: Props) {
  return (
    <header className="appbar">
      <div className="appbar__row">
        <div className="appbar__dot" aria-hidden="true" />
        <button
          type="button"
          className="appbar__id"
          onClick={onPickVolcano}
          aria-label={`Gunung dipantau: ${volcano.name}. Ketuk untuk memilih gunung lain.`}
        >
          <h1 className="appbar__name">
            {volcano.name}
            <span className="appbar__caret" aria-hidden="true" />
          </h1>
          <div className="appbar__meta">
            {volcano.region} · {formatNumber(volcano.elevationM)} m
          </div>
        </button>
        <button
          type="button"
          className="appbar__sync"
          onClick={onRefresh}
          aria-label={`Kondisi data: ${dataState.label}, ${dataState.sub}. Ketuk untuk memuat ulang.`}
        >
          <span className="chip">
            <span className="chip__dot" aria-hidden="true" />
            <span className="chip__label mono">{dataState.label}</span>
          </span>
          <span className="appbar__syncsub">{dataState.sub}</span>
        </button>
      </div>
    </header>
  )
}
