import { useEffect, useRef } from 'react'
import { detectAlerts, EMPTY_MEMORY, type AlertMemory } from '../data/alerts'
import type { AviationStatus } from '../data/aviation'
import type { NotificationsState } from './useNotifications'
import type { VolcanoSnapshot } from '../types'

const MEMORY_KEY = 'pantau:kabar'

/** Ingatan disimpan per gunung: berpindah gunung tidak boleh memicu banjir kabar. */
function readMemory(volcanoId: string): AlertMemory {
  try {
    const raw = localStorage.getItem(`${MEMORY_KEY}:${volcanoId}`)
    if (!raw) return EMPTY_MEMORY
    const parsed = JSON.parse(raw) as Partial<AlertMemory>
    return {
      aviation: parsed.aviation ?? null,
      aqiBandMax:
        typeof parsed.aqiBandMax === 'number' ? parsed.aqiBandMax : null,
      newestQuakeISO:
        typeof parsed.newestQuakeISO === 'string' ? parsed.newestQuakeISO : null,
    }
  } catch {
    return EMPTY_MEMORY
  }
}

function writeMemory(volcanoId: string, memory: AlertMemory) {
  try {
    localStorage.setItem(`${MEMORY_KEY}:${volcanoId}`, JSON.stringify(memory))
  } catch {
    // Penyimpanan ditolak (mode privat). Akibatnya kabar bisa terbit ulang
    // setelah muat ulang halaman — mengganggu, tapi tidak berbahaya.
  }
}

/**
 * Mengawasi snapshot, lalu menerbitkan pemberitahuan saat keadaan benar-benar
 * berpindah.
 *
 * Keputusan "layak diberitahukan atau tidak" ada di data/alerts.ts supaya bisa
 * diuji tanpa peramban; yang di sini hanya menyambungkannya ke izin, ingatan,
 * dan pengiriman.
 */
export function useAlertWatcher(params: {
  snapshot: VolcanoSnapshot
  aviation: AviationStatus
  notifications: NotificationsState
  /** Mode demo memaksakan keadaan buatan; jangan dikabarkan sebagai kejadian. */
  paused: boolean
}) {
  const { snapshot, aviation, notifications, paused } = params
  const { permission, rules, notify } = notifications
  const volcanoId = snapshot.volcano.id
  // Ingatan dipegang di ref: perubahannya tidak boleh memicu render ulang.
  const memoryRef = useRef<{ id: string; memory: AlertMemory } | null>(null)

  useEffect(() => {
    if (paused) return
    if (permission !== 'granted') return

    if (memoryRef.current?.id !== volcanoId) {
      memoryRef.current = { id: volcanoId, memory: readMemory(volcanoId) }
    }

    const newest = snapshot.bmkgEpicentres
      .slice()
      .sort((a, b) => (a.timeISO < b.timeISO ? 1 : -1))[0]

    const { alerts, memory } = detectAlerts(
      {
        volcanoName: snapshot.volcano.name,
        aviation: aviation.id,
        aviationHeadline: aviation.headline,
        aqi: snapshot.air?.aqi ?? null,
        newestQuake: newest
          ? {
              timeISO: newest.timeISO,
              magnitude: newest.magnitude,
              area: newest.area,
              distanceKm: newest.distanceKm,
            }
          : null,
      },
      memoryRef.current.memory,
      rules,
    )

    memoryRef.current = { id: volcanoId, memory }
    writeMemory(volcanoId, memory)
    for (const alert of alerts) {
      void notify({
        title: alert.title,
        body: alert.body,
        tag: alert.tag,
        urgent: alert.urgent,
      })
    }
  }, [
    paused,
    permission,
    rules,
    notify,
    volcanoId,
    snapshot.volcano.name,
    snapshot.air,
    snapshot.bmkgEpicentres,
    aviation.id,
    aviation.headline,
  ])
}
