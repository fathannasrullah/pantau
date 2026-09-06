import type { DataStateView } from '../data/dataState'
import { formatDate, formatDateTime } from '../lib/format'
import { SEVERITY_COLOR } from '../theme'
import type { VolcanoLevel } from '../types'

interface Props {
  level: VolcanoLevel
  dataState: DataStateView
}

export function StatusCard({ level, dataState }: Props) {
  const since =
    level.sincePrecision === 'minute'
      ? formatDateTime(level.sinceISO)
      : formatDate(level.sinceISO)

  return (
    <section className="statuscard">
      <div className="statuscard__glow" aria-hidden="true" />
      <h2 className="statuscard__label">Status gunung saat ini</h2>
      <div className="statuscard__row">
        <div className="statuscard__name">{level.name}</div>
        <div className="statuscard__roman mono">LEVEL {level.roman}</div>
      </div>
      <p className="statuscard__headline">{level.headline}</p>

      <div className="statuscard__plainbox">
        <div className="statuscard__plainlabel">Artinya untuk Anda</div>
        <p className="statuscard__plain">{level.plain}</p>
      </div>

      {level.coastal && (
        <div
          className="coastal"
          style={{ color: SEVERITY_COLOR[level.coastal.severity] }}
        >
          <div className="coastal__dot" aria-hidden="true" />
          <div className="coastal__body">
            <div className="coastal__title">
              Pesisir Selat Sunda: {level.coastal.tag}
            </div>
            <div className="coastal__note">{level.coastal.note}</div>
          </div>
        </div>
      )}

      <div className="pills">
        <span className="pill mono">Radius bahaya {level.radiusKm} km</span>
        <span className="pill mono">Sejak {since}</span>
      </div>
      <div className="source">
        Sumber: Badan Geologi / PVMBG · {dataState.sourceTime}
      </div>
    </section>
  )
}
