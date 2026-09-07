import { useCallback, useEffect, useState } from 'react'
import { distanceKm } from '../lib/geo.ts'
import type { VolcanoRef } from '../types'

/**
 * Gempa terkini langsung dari summary feed USGS.
 *
 * Berbeda dengan sumber lain yang harus lewat CI: feed ini mengirim header
 * `Access-Control-Allow-Origin: *`, jadi browser boleh memanggilnya sendiri.
 * Artinya data gempa tidak perlu menunggu siklus CI 30 menit — ini satu-satunya
 * bagian app yang benar-benar mendekati waktu nyata.
 *
 * Feed 2.5+ dipilih karena cukup kecil untuk sambungan seluler (sekitar 30 KB)
 * dan tetap memuat kejadian yang dicatat USGS untuk kawasan Indonesia. Perlu
 * diingat USGS mencatat Indonesia sekitar M4,5 ke atas, jadi daftar ini bisa
 * kosong meski ada gempa kecil — katalog EMSC di tab Seismik lebih rapat.
 */
const FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'

const RADIUS_KM = 600
const POLL_MS = 5 * 60_000

export interface LiveQuake {
  id: string
  mag: number
  place: string
  timeISO: string
  depthKm: number | null
  distanceKm: number
  /** Level PAGER USGS: green, yellow, orange, red. Null bila belum dinilai. */
  alert: string | null
  tsunami: boolean
  /** Berapa orang melaporkan merasakannya lewat "Did You Feel It?". */
  felt: number | null
  url: string
}

export type LiveQuakeStatus = 'loading' | 'ok' | 'failed'

export interface LiveQuakesState {
  quakes: LiveQuake[]
  status: LiveQuakeStatus
  fetchedAtISO: string | null
  refresh: () => void
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/**
 * Menyaring feed global menjadi kejadian di sekitar gunung yang dipantau.
 * Dipisah dari hook supaya bisa diuji tanpa jaringan maupun React.
 */
export function selectNearbyQuakes(
  raw: unknown,
  volcano: { lat: number; lon: number },
  radiusKm = RADIUS_KM,
): LiveQuake[] {
  const features =
    typeof raw === 'object' && raw !== null && Array.isArray((raw as { features?: unknown[] }).features)
      ? ((raw as { features: unknown[] }).features as Record<string, unknown>[])
      : []

  const out: LiveQuake[] = []
  for (const feature of features) {
    const props = feature?.properties as Record<string, unknown> | undefined
    const geom = feature?.geometry as { coordinates?: unknown[] } | undefined
    const coords = Array.isArray(geom?.coordinates) ? geom.coordinates : []

    const lon = num(coords[0])
    const lat = num(coords[1])
    const mag = num(props?.mag)
    const ms = num(props?.time)
    const id = typeof feature?.id === 'string' ? feature.id : null
    const url = typeof props?.url === 'string' ? props.url : null
    if (lat === null || lon === null || mag === null || ms === null || !id || !url) {
      continue
    }

    const km = distanceKm({ lat, lon }, volcano)
    if (km > radiusKm) continue

    out.push({
      id,
      mag,
      place: typeof props?.place === 'string' ? props.place : 'Lokasi tidak disebut',
      timeISO: new Date(ms).toISOString(),
      depthKm: num(coords[2]),
      distanceKm: Math.round(km),
      alert: typeof props?.alert === 'string' ? props.alert : null,
      tsunami: props?.tsunami === 1,
      felt: num(props?.felt),
      url,
    })
  }

  out.sort((a, b) => b.timeISO.localeCompare(a.timeISO))
  return out
}

export function useLiveQuakes(volcano: VolcanoRef): LiveQuakesState {
  const [quakes, setQuakes] = useState<LiveQuake[]>([])
  const [status, setStatus] = useState<LiveQuakeStatus>('loading')
  const [fetchedAtISO, setFetchedAtISO] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(FEED_URL, { signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setQuakes(selectNearbyQuakes(await res.json(), volcano))
        setFetchedAtISO(new Date().toISOString())
        setStatus('ok')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Salinan lama dipertahankan; layar menandainya lewat status.
        setStatus('failed')
      }
    },
    [volcano],
  )

  useEffect(() => {
    setStatus('loading')
    const controller = new AbortController()
    load(controller.signal)
    const id = setInterval(() => load(), POLL_MS)
    return () => {
      controller.abort()
      clearInterval(id)
    }
  }, [load])

  return { quakes, status, fetchedAtISO, refresh: () => load() }
}
