import type { AviationStatus } from '../data/aviation'

/**
 * Pita peringatan di atas layar. Hanya terbit dari keadaan yang benar-benar
 * terbaca dari sumber — bukan dari level status yang belum tersambung.
 */
export function AlertStrip({ status }: { status: AviationStatus }) {
  if (!status.urgent || !status.strip) return null
  return (
    <div className="strip" role="alert">
      <span className="strip__tag mono">PERINGATAN</span>
      <span className="strip__text">{status.strip}</span>
    </div>
  )
}
