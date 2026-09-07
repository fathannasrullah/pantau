import type { DataStateView } from '../../data/dataState'
import { SEVERITY_COLOR } from '../../theme'
import type { MapLayer, VolcanoLevel, VolcanoSnapshot } from '../../types'

interface Props {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
  dataState: DataStateView
  layer: MapLayer['id']
  onLayerChange: (id: MapLayer['id']) => void
}

function formatCoords(lat: number, lon: number) {
  const ns = lat < 0 ? 'S' : 'N'
  const ew = lon < 0 ? 'W' : 'E'
  return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lon).toFixed(3)}°${ew}`
}

export function MapTab({
  snapshot,
  level,
  dataState,
  layer,
  onLayerChange,
}: Props) {
  const active =
    snapshot.mapLayers.find((l) => l.id === layer) ?? snapshot.mapLayers[0]

  return (
    <div className="tabview">
      <h2 className="section section--first">Radius bahaya dan arah abu</h2>
      <div className="map dim">
        <div className="map__grid" aria-hidden="true" />
        <div className="map__ring map__ring--outer" aria-hidden="true" />
        <div className="map__ring map__ring--inner" aria-hidden="true" />
        <div className="map__pulse" aria-hidden="true" />
        <div className="map__core" aria-hidden="true" />
        <div className="map__plume" aria-hidden="true" />
        <div className="map__legend">
          <div>Peta skematik, bukan skala sebenarnya</div>
          <div className="map__legend-danger">
            Radius {level.radiusKm} km — dilarang
          </div>
          <div className="map__legend-ash">Sebaran abu ke barat laut</div>
        </div>
        <div className="map__coords mono">
          {formatCoords(snapshot.volcano.lat, snapshot.volcano.lon)}
        </div>
        <div className="map__time">{dataState.sourceTime}</div>
      </div>

      <div className="layers">
        {snapshot.mapLayers.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`layer${item.id === layer ? ' layer--on' : ''}`}
            aria-pressed={item.id === layer}
            onClick={() => onLayerChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="layernote">{active.note}</p>

      <h2 className="section">Wilayah terdekat dari kawah</h2>
      <div className="rows">
        {snapshot.villages.length === 0 && (
          <p className="emptynote">
            Daftar wilayah terdekat untuk {snapshot.volcano.name} belum
            tersedia. Jarak Anda sendiri ke kawah tetap dihitung di kartu Posisi.
          </p>
        )}
        {snapshot.villages.map((village) => (
          <div className="row" key={village.name}>
            <div
              className="row__km mono"
              style={{ color: SEVERITY_COLOR[village.severity] }}
            >
              {village.distanceKm} km
            </div>
            <div className="row__body">
              <div className="row__title">{village.name}</div>
              <div className="row__note">{village.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
