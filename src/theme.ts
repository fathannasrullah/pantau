import type { DataStateId, LevelId, Severity } from './types'

export interface ColorSet {
  color: string
  line: string
  wash: string
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  safe: '#4ade80',
  watch: '#facc15',
  alert: '#fb923c',
  danger: '#f87171',
  neutral: '#94a3b8',
}

export const LEVEL_COLORS: Record<LevelId, ColorSet> = {
  normal: {
    color: '#4ade80',
    line: 'rgba(74,222,128,.3)',
    wash: 'rgba(74,222,128,.06)',
  },
  waspada: {
    color: '#facc15',
    line: 'rgba(250,204,21,.3)',
    wash: 'rgba(250,204,21,.06)',
  },
  siaga: {
    color: '#fb923c',
    line: 'rgba(251,146,60,.32)',
    wash: 'rgba(251,146,60,.07)',
  },
  awas: {
    color: '#f87171',
    line: 'rgba(248,113,113,.35)',
    wash: 'rgba(248,113,113,.08)',
  },
}

export const DATA_STATE_COLORS: Record<DataStateId, ColorSet> = {
  fresh: {
    color: '#4ade80',
    line: 'rgba(74,222,128,.35)',
    wash: 'rgba(74,222,128,.08)',
  },
  stale: {
    color: '#facc15',
    line: 'rgba(250,204,21,.35)',
    wash: 'rgba(250,204,21,.08)',
  },
  failed: {
    color: '#f87171',
    line: 'rgba(248,113,113,.35)',
    wash: 'rgba(248,113,113,.08)',
  },
  offline: {
    color: '#94a3b8',
    line: 'rgba(148,163,184,.3)',
    wash: 'rgba(148,163,184,.08)',
  },
}

/** How far the body of stale/failed data is faded out. */
export const DATA_STATE_DIM: Record<DataStateId, number> = {
  fresh: 1,
  stale: 0.72,
  failed: 0.55,
  offline: 0.8,
}
