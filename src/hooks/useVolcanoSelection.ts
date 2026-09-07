import { useCallback, useState } from 'react'
import { DEFAULT_VOLCANO_ID, findVolcano } from '../data/volcanoes'

const STORAGE_KEY = 'pantau:gunung'
const PARAM = 'gunung'

function readInitial(): string {
  const fromUrl = new URLSearchParams(window.location.search).get(PARAM)
  if (fromUrl && findVolcano(fromUrl).id === fromUrl) return fromUrl
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && findVolcano(stored).id === stored) return stored
  } catch {
    // Penyimpanan diblokir; pilihan berlaku untuk sesi ini saja.
  }
  return DEFAULT_VOLCANO_ID
}

/**
 * Gunung yang sedang dipantau.
 *
 * Tertulis ke URL supaya satu tautan bisa dibagikan langsung ke gunung tertentu,
 * dan diingat di perangkat supaya pilihan bertahan antar kunjungan.
 */
export function useVolcanoSelection() {
  const [volcanoId, setId] = useState(readInitial)

  const selectVolcano = useCallback((id: string) => {
    const next = findVolcano(id).id
    setId(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sama seperti di atas: bukan alasan untuk menggagalkan pemilihan.
    }
    const params = new URLSearchParams(window.location.search)
    if (next === DEFAULT_VOLCANO_ID) params.delete(PARAM)
    else params.set(PARAM, next)
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (query ? `?${query}` : ''),
    )
  }, [])

  return { volcano: findVolcano(volcanoId), volcanoId, selectVolcano }
}
