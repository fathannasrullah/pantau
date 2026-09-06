import type { VolcanoLevel } from '../types'

export function AlertStrip({ level }: { level: VolcanoLevel }) {
  if (!level.urgent) return null
  return (
    <div className="strip" role="alert">
      <span className="strip__tag mono">PERINGATAN</span>
      <span className="strip__text">{level.strip}</span>
    </div>
  )
}
