import type { DataStateView } from '../../data/dataState'
import { SampleTag } from '../SampleTag'
import { SEVERITY_COLOR } from '../../theme'
import type { VolcanoSnapshot } from '../../types'

interface Props {
  snapshot: VolcanoSnapshot
  dataState: DataStateView
  selectedHour: number
  onSelectHour: (index: number) => void
}

const CHART_HEIGHT = 126

export function SeismicTab({
  snapshot,
  dataState,
  selectedHour,
  onSelectHour,
}: Props) {
  const bars = snapshot.seismicHourly
  // Radius yang sepi menghasilkan semua batang nol; tanpa penjaga ini tinggi
  // batang menjadi NaN dan grafiknya hilang sama sekali.
  const max = Math.max(1, ...bars)
  const selected = Math.min(selectedHour, bars.length - 1)
  const hoursAgo = bars.length - 1 - selected

  return (
    <div className="tabview">
      <h2 className="section section--first">{snapshot.seismicLabel}</h2>
      <section className="seis dim">
        <div className="seis__bars">
          {bars.map((value, index) => {
            const isSelected = index === selected
            const background = isSelected
              ? 'var(--lv)'
              : value > max * 0.66
                ? 'rgba(251,146,60,.55)'
                : 'rgba(148,163,184,.45)'
            return (
              <button
                // Bars are a sliding window over time, so the position is the identity.
                key={index}
                type="button"
                className="seis__bar"
                aria-label={`Jam −${bars.length - 1 - index}: ${value} kejadian gempa`}
                aria-pressed={isSelected}
                onClick={() => onSelectHour(index)}
              >
                <span
                  className="seis__fill"
                  style={{
                    height: `${Math.max(4, Math.round((value / max) * CHART_HEIGHT))}px`,
                    background,
                  }}
                />
              </button>
            )
          })}
        </div>
        <div className="seis__axis mono">
          <span>−24 jam</span>
          <span>−12 jam</span>
          <span>sekarang</span>
        </div>
        <p className="seis__note">
          Jam −{hoursAgo}: {bars[selected]} kejadian gempa. Ketuk batang lain
          untuk melihat jam yang berbeda.
        </p>
        <p className="seis__note">{snapshot.seismicNote}</p>
        <div className="seis__src">
          {snapshot.provenance.seismic === 'live'
            ? 'Katalog USGS'
            : 'Seismograf pos pengamatan (data contoh)'}{' '}
          · {dataState.sourceTime}
        </div>
      </section>

      <h2 className="section">
        Jenis kegempaan vulkanik
        <SampleTag title="Hanya PVMBG yang merekam jenis kegempaan vulkanik" />
      </h2>
      <div className="grid2 dim">
        {snapshot.quakeTypes.map((type) => (
          <div className="quake" key={type.label}>
            <div className="quake__k">{type.label}</div>
            <div className="quake__v mono">{type.value}</div>
            <div className="quake__track">
              <div
                className="quake__fill"
                style={{
                  width: `${Math.round(type.ratio * 100)}%`,
                  background: SEVERITY_COLOR[type.severity],
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="seis__foot">
        Amplitudo tremor dominan {snapshot.tremorAmplitudeMm} mm. Bagian ini
        untuk yang ingin melihat detail; keputusan tetap mengikuti level status.
      </p>
    </div>
  )
}
