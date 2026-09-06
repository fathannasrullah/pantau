import { useCallback, useEffect, useMemo, useState } from 'react'
import { describeDataState, type DataStateView } from '../data/dataState'
import { LEVELS } from '../data/levels'
import { getSnapshot, SEISMIC_SEED } from '../data/snapshot'
import { minutesBetween } from '../lib/format'
import type {
  DataStateId,
  FeedStatus,
  LevelId,
  VolcanoLevel,
  VolcanoSnapshot,
} from '../types'
import type { DemoState } from './useDemo'

const DEFAULT_LEVEL: LevelId = 'siaga'
const POLL_MS = 30_000
const SEISMIC_TICK_MS = 5_200

/** Ages picked so each demo state reads like a plausible real one. */
const DEMO_CONDITION: Record<
  DataStateId,
  { status: FeedStatus; ageMinutes: number }
> = {
  fresh: { status: 'ok', ageMinutes: 1 },
  stale: { status: 'ok', ageMinutes: 47 },
  failed: { status: 'failed', ageMinutes: 80 },
  offline: { status: 'offline', ageMinutes: 30 },
}

export interface VolcanoFeed {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
  dataState: DataStateView
  refresh: () => void
}

export function useVolcanoFeed(demo: DemoState): VolcanoFeed {
  const [nowISO, setNowISO] = useState(() => new Date().toISOString())
  const [lastSyncISO, setLastSyncISO] = useState(nowISO)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [seismicHourly, setSeismicHourly] = useState(SEISMIC_SEED)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const sync = useCallback(() => {
    const iso = new Date().toISOString()
    setNowISO(iso)
    if (navigator.onLine) setLastSyncISO(iso)
  }, [])

  useEffect(() => {
    const id = setInterval(sync, POLL_MS)
    return () => clearInterval(id)
  }, [sync])

  const liveStatus: FeedStatus = online ? 'ok' : 'offline'

  // The seismograph only advances while readings are actually arriving.
  useEffect(() => {
    if (demo.dataState ? demo.dataState !== 'fresh' : liveStatus !== 'ok') return
    const id = setInterval(() => {
      setSeismicHourly((bars) =>
        bars
          .slice(1)
          .concat([Math.max(8, Math.round(18 + Math.random() * 14))]),
      )
    }, SEISMIC_TICK_MS)
    return () => clearInterval(id)
  }, [demo.dataState, liveStatus])

  const condition = demo.dataState
    ? DEMO_CONDITION[demo.dataState]
    : {
        status: liveStatus,
        ageMinutes: Math.max(0, minutesBetween(lastSyncISO, nowISO)),
      }

  const levelId = demo.level ?? DEFAULT_LEVEL

  const snapshot = useMemo(
    () =>
      getSnapshot({
        nowISO,
        levelId,
        status: condition.status,
        ageMinutes: condition.ageMinutes,
        seismicHourly,
      }),
    [nowISO, levelId, condition.status, condition.ageMinutes, seismicHourly],
  )

  const dataState = useMemo(
    () =>
      describeDataState({
        status: snapshot.status,
        updatedAtISO: snapshot.updatedAtISO,
        nowISO,
      }),
    [snapshot.status, snapshot.updatedAtISO, nowISO],
  )

  return { snapshot, level: LEVELS[levelId], dataState, refresh: sync }
}
