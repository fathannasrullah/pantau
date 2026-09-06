import type { DataStateView } from '../data/dataState'
import { formatNumber } from '../lib/format'
import type { Volcano } from '../types'

interface Props {
  volcano: Volcano
  dataState: DataStateView
  onRefresh: () => void
}

export function AppHeader({ volcano, dataState, onRefresh }: Props) {
  return (
    <header className="appbar">
      <div className="appbar__row">
        <div className="appbar__dot" aria-hidden="true" />
        <div className="appbar__id">
          <h1 className="appbar__name">{volcano.name}</h1>
          <div className="appbar__meta">
            {volcano.location} · {formatNumber(volcano.elevationM)} m
          </div>
        </div>
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
