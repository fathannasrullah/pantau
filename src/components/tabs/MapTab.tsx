import type { DataStateView } from '../../data/dataState'
import type { GeolocationState } from '../../hooks/useGeolocation'
import { formatNumber } from '../../lib/format'
import { SEVERITY_COLOR } from '../../theme'
import type { MapLayer, VolcanoLevel, VolcanoSnapshot } from '../../types'
import { VolcanoMap } from '../VolcanoMap'

interface Props {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
  dataState: DataStateView
  layer: MapLayer['id']
  accent: string
  geo: GeolocationState
  onLayerChange: (id: MapLayer['id']) => void
}

export function MapTab({
  snapshot,
  level,
  dataState,
  layer,
  accent,
  geo,
  onLayerChange,
}: Props) {
  const active =
    snapshot.mapLayers.find((l) => l.id === layer) ?? snapshot.mapLayers[0]

  return (
    <div className="tabview">
      <h2 className="section section--first">Radius bahaya dan arah abu</h2>
      <div className="mapbox">
        <VolcanoMap
          volcano={snapshot.volcano}
          radiusKm={level.radiusKm}
          layer={layer}
          accent={accent}
          geo={geo}
          ashHeadingDeg={snapshot.ashfall.ashHeadingDeg}
          windSpeedKmh={snapshot.ashfall.windSpeedKmh}
          advisories={snapshot.ashAdvisories}
        />
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
      <p className="mapsrc">
        Peta dasar © kontributor OpenStreetMap. Kawah dari katalog Smithsonian
        GVP; area peringatan abu digambar apa adanya dari poligon SIGMET;
        posisi Anda dari GPS perangkat. Radius {level.radiusKm} km hanya
        pembanding — zona terlarang resmi ditetapkan Badan Geologi dan belum
        tersambung. Ketuk bentuk mana pun untuk melihat sumbernya ·{' '}
        {dataState.sourceTime}
      </p>

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

      <h2 className="section">Orang di sekitar gunung</h2>
      {snapshot.population ? (
        <section className="popcard dim">
          <div className="popcard__rows">
            {snapshot.population.rings.map((ring) => (
              <div className="popring" key={ring.radiusKm}>
                <div className="popring__r mono">{ring.radiusKm} km</div>
                <div className="popring__n mono">
                  {formatNumber(ring.people)}
                </div>
                <div className="popring__u">jiwa</div>
              </div>
            ))}
          </div>
          <p className="popcard__note">
            Perkiraan jumlah penduduk yang tinggal dalam radius tersebut dari
            kawah. Ini keluaran model sebaran penduduk beresolusi 100 m untuk
            tahun {snapshot.population.year}, bukan sensus terkini dan bukan
            hitungan orang yang sedang berada di sana hari ini.
          </p>
          <div className="popcard__src">
            Sumber: WorldPop · dataset wpgppop {snapshot.population.year}
          </div>
        </section>
      ) : (
        <p className="emptynote">
          Perkiraan jumlah penduduk di sekitar {snapshot.volcano.name} belum bisa
          dimuat.
        </p>
      )}

      <h2 className="section">Dampak yang sudah terasa</h2>
      <p className="emptynote">
        Laporan dampak di lapangan — hujan abu per desa, warga yang mengungsi,
        gangguan air bersih — hanya dimiliki BPBD kabupaten dan belum ada
        API-nya. Yang bisa ditampilkan di sini baru perkiraan jumlah penduduk di
        atas.
      </p>
    </div>
  )
}
