import { useCallback, useState } from 'react'
import type { DataStateId, LevelId } from '../types'

const LEVEL_IDS: LevelId[] = ['normal', 'waspada', 'siaga', 'awas']
const DATA_STATE_IDS: DataStateId[] = ['fresh', 'stale', 'failed', 'offline']

export interface DemoState {
  enabled: boolean
  level: LevelId | null
  dataState: DataStateId | null
  showTransport: boolean
}

const DEFAULT: DemoState = {
  enabled: false,
  level: null,
  dataState: null,
  showTransport: true,
}

function readFromUrl(): DemoState {
  const q = new URLSearchParams(window.location.search)
  if (q.get('demo') !== '1') return DEFAULT
  const level = q.get('level') as LevelId | null
  const dataState = q.get('data') as DataStateId | null
  return {
    enabled: true,
    level: level && LEVEL_IDS.includes(level) ? level : null,
    dataState:
      dataState && DATA_STATE_IDS.includes(dataState) ? dataState : null,
    showTransport: q.get('transport') !== '0',
  }
}

function writeToUrl(state: DemoState) {
  const q = new URLSearchParams(window.location.search)
  if (!state.enabled) {
    q.delete('demo')
    q.delete('level')
    q.delete('data')
    q.delete('transport')
  } else {
    q.set('demo', '1')
    state.level ? q.set('level', state.level) : q.delete('level')
    state.dataState ? q.set('data', state.dataState) : q.delete('data')
    state.showTransport ? q.delete('transport') : q.set('transport', '0')
  }
  const search = q.toString()
  window.history.replaceState(
    null,
    '',
    window.location.pathname + (search ? `?${search}` : ''),
  )
}

/**
 * Presentation-only overrides, opened with `?demo=1`, so every status level and
 * data condition can be shown without waiting for one to happen.
 */
export function useDemo() {
  const [state, setState] = useState<DemoState>(readFromUrl)

  const update = useCallback((patch: Partial<DemoState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      writeToUrl(next)
      return next
    })
  }, [])

  return { demo: state, updateDemo: update }
}
