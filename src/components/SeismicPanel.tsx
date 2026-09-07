import type { DataStateView } from '../data/dataState'
import type { VolcanoSnapshot } from '../types'

interface Props {
  snapshot: VolcanoSnapshot
  dataState: DataStateView
  selectedHour: number
  onSelectHour: (index: number) => void
}

const CHART_HEIGHT = 126

/**
 * Grafik kegempaan per jam. Dulu satu tab sendiri; v4 memindahkan navigasi
 * kelima ke tab Udara, jadi grafiknya turun ke layar Status bersama daftar
 * gempa yang dirasakan.
 */
export function SeismicPanel({
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
        Jam −{hoursAgo}: {bars[selected]} kejadian gempa. Ketuk batang lain untuk
        melihat jam yang berbeda.
      </p>
      <p className="seis__note">{snapshot.seismicNote}</p>
      {snapshot.lastEruptionNote && (
        <p className="seis__note">{snapshot.lastEruptionNote}</p>
      )}
      <p className="seis__note">
        Ini gempa tektonik di sekitar gunung, bukan kegempaan vulkanik. Letusan,
        embusan, dan tremor hanya terekam seismograf pos pengamatan PVMBG dan
        belum tersambung.
      </p>
      <div className="seis__src">
        {snapshot.seismicSource} · {dataState.sourceTime}
      </div>
    </section>
  )
}
