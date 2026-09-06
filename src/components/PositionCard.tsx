import type { DataStateView } from '../data/dataState'
import { formatDecimal } from '../lib/format'
import type { UserPosition, VolcanoLevel } from '../types'

interface Props {
  position: UserPosition
  level: VolcanoLevel
  dataState: DataStateView
  enabled: boolean
  onToggle: () => void
  onShowShelters: () => void
  onShowMap: () => void
}

export function PositionCard({
  position,
  level,
  dataState,
  enabled,
  onToggle,
  onShowShelters,
  onShowMap,
}: Props) {
  if (!enabled) {
    return (
      <button type="button" className="poscard poscard--off" onClick={onToggle}>
        <span className="poscard__ontitle">Aktifkan lokasi</span>
        <span className="poscard__onnote">
          Supaya app bisa memberi tahu apakah Anda berada di dalam radius bahaya
          dan titik kumpul mana yang terdekat.
        </span>
      </button>
    )
  }

  const inZone = position.distanceKm <= level.radiusKm
  const color = inZone ? '#f87171' : '#4ade80'

  return (
    <section className="poscard">
      <div className="poscard__head">
        <h2 className="poscard__label">Posisi Anda</h2>
        <button type="button" className="poscard__toggle" onClick={onToggle}>
          matikan lokasi
        </button>
      </div>
      <div className="poscard__distrow">
        <div className="poscard__km mono" style={{ color }}>
          {position.distanceKm} km
        </div>
        <div className="poscard__from">dari kawah</div>
      </div>
      <div className="poscard__verdict" style={{ color }}>
        {inZone
          ? 'Anda di dalam zona terlarang'
          : `Di luar zona terlarang ${level.radiusKm} km`}
      </div>
      <p className="poscard__note">
        {inZone
          ? 'Segera menjauh dari kawah dan ikuti arahan petugas.'
          : `Titik kumpul terdekat: ${position.nearestShelter.name}, ${formatDecimal(
              position.nearestShelter.distanceKm,
            )} km dari posisi Anda. Wilayah Anda terkena abu tipis.`}
      </p>
      <div className="poscard__actions">
        <button
          type="button"
          className="btn-primary"
          style={{
            background: inZone ? '#f87171' : 'rgba(255,255,255,.1)',
            color: inZone ? '#0b0b0b' : '#e9edf2',
          }}
          onClick={onShowShelters}
        >
          {inZone ? 'Rute keluar zona' : 'Lihat titik kumpul terdekat'}
        </button>
        <button type="button" className="btn-ghost" onClick={onShowMap}>
          Peta
        </button>
      </div>
      <div className="poscard__gps">
        {position.label} · GPS akurasi {position.accuracyM} m ·{' '}
        {dataState.sourceTime}
      </div>
    </section>
  )
}
