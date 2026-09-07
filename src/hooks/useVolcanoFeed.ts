import { useCallback, useEffect, useMemo, useState } from 'react'
import { describeDataState, type DataStateView } from '../data/dataState'
import { LEVELS } from '../data/levels'
import { parseLiveBundle } from '../data/live'
import { getSnapshot, SEISMIC_SEED } from '../data/snapshot'
import { minutesBetween } from '../lib/format'
import type {
  DataStateId,
  FeedStatus,
  LevelId,
  LiveBundle,
  VolcanoLevel,
  VolcanoSnapshot,
} from '../types'
import type { DemoState } from './useDemo'
import type { VolcanoRef } from '../types'

const DEFAULT_LEVEL: LevelId = 'siaga'
const POLL_MS = 30_000
/** Snapshot di server hanya berubah setiap kali CI berjalan, jadi tak perlu rapat. */
const LIVE_POLL_MS = 5 * 60_000
const SEISMIC_TICK_MS = 5_200
/** Satu berkas per gunung: yang diunduh hanya gunung yang sedang dipantau. */
const liveUrl = (volcanoId: string) =>
  `${import.meta.env.BASE_URL}data/live-${volcanoId}.json`

/**
 * 'absent' = deploy ini memang tidak membawa snapshot (404), jadi app jalan
 * dengan data contoh dan itu bukan kegagalan jaringan.
 */
type LiveFetchState = 'loading' | 'ok' | 'absent' | 'failed'

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

export function useVolcanoFeed(
  volcano: VolcanoRef,
  demo: DemoState,
): VolcanoFeed {
  const [nowISO, setNowISO] = useState(() => new Date().toISOString())
  const [lastSyncISO, setLastSyncISO] = useState(nowISO)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [seismicHourly, setSeismicHourly] = useState(SEISMIC_SEED)
  const [live, setLive] = useState<LiveBundle | null>(null)
  const [liveFetch, setLiveFetch] = useState<LiveFetchState>('loading')

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

  /**
   * Snapshot dibaca dari berkas statis yang sudah diisi CI. Salinan lama tetap
   * dipertahankan saat pengambilan gagal — layar menandainya lewat status,
   * bukan dengan mengosongkan angka.
   */
  const loadLive = useCallback(
    async (signal?: AbortSignal) => {
    try {
      const res = await fetch(liveUrl(volcano.id), { cache: 'no-store', signal })
      if (res.status === 404) {
        setLiveFetch('absent')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const parsed = parseLiveBundle(await res.json())
      if (!parsed) throw new Error('bentuk live.json tidak dikenali')
      setLive(parsed)
      setLiveFetch('ok')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLiveFetch((prev) => (prev === 'absent' ? prev : 'failed'))
    }
    },
    [volcano.id],
  )

  useEffect(() => {
    // Ganti gunung berarti data lama tidak berlaku lagi; jangan dibiarkan
    // terlihat sekejap sebagai milik gunung yang baru dipilih.
    setLive(null)
    setLiveFetch('loading')
    const controller = new AbortController()
    loadLive(controller.signal)
    const id = setInterval(() => loadLive(), LIVE_POLL_MS)
    return () => {
      controller.abort()
      clearInterval(id)
    }
  }, [loadLive])

  const sync = useCallback(() => {
    const iso = new Date().toISOString()
    setNowISO(iso)
    if (navigator.onLine) {
      setLastSyncISO(iso)
      loadLive()
    }
  }, [loadLive])

  useEffect(() => {
    const id = setInterval(sync, POLL_MS)
    return () => clearInterval(id)
  }, [sync])

  const liveStatus: FeedStatus = !online
    ? 'offline'
    : liveFetch === 'failed'
      ? 'failed'
      : 'ok'

  // Seismograf contoh hanya bergerak selama belum ada data sungguhan dan
  // bacaan memang sedang mengalir.
  const hasLiveSeismic = liveFetch === 'ok' && live !== null
  useEffect(() => {
    if (hasLiveSeismic) return
    if (demo.dataState ? demo.dataState !== 'fresh' : liveStatus !== 'ok') return
    const id = setInterval(() => {
      setSeismicHourly((bars) =>
        bars
          .slice(1)
          .concat([Math.max(8, Math.round(18 + Math.random() * 14))]),
      )
    }, SEISMIC_TICK_MS)
    return () => clearInterval(id)
  }, [demo.dataState, liveStatus, hasLiveSeismic])

  const condition = demo.dataState
    ? DEMO_CONDITION[demo.dataState]
    : {
        status: liveStatus,
        ageMinutes: Math.max(0, minutesBetween(lastSyncISO, nowISO)),
      }

  const levelId = demo.level ?? DEFAULT_LEVEL
  // Mode demo memaksakan kondisi buatan, jadi data sungguhan dilepas dulu agar
  // keduanya tidak tercampur di layar.
  const liveForSnapshot = demo.dataState ? null : live

  const snapshot = useMemo(
    () =>
      getSnapshot({
        volcano,
        nowISO,
        levelId,
        status: condition.status,
        ageMinutes: condition.ageMinutes,
        seismicHourly,
        live: liveForSnapshot,
      }),
    [
      volcano,
      nowISO,
      levelId,
      condition.status,
      condition.ageMinutes,
      seismicHourly,
      liveForSnapshot,
    ],
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
