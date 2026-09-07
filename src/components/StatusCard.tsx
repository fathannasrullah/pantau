import type { DataStateView } from '../data/dataState'
import { formatDate, formatDateTime } from '../lib/format'
import { SEVERITY_COLOR } from '../theme'
import type { SnapshotProvenance, VolcanoLevel } from '../types'

interface Props {
  level: VolcanoLevel
  dataState: DataStateView
  provenance: SnapshotProvenance
  /** Tinggi gelombang terukur, bila sumber pesisir hidup. */
  observedWaveHeightM: number | null
}

export function StatusCard({
  level,
  dataState,
  provenance,
  observedWaveHeightM,
}: Props) {
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
            {observedWaveHeightM !== null && (
              <div className="coastal__live">
                Tinggi gelombang terukur sekarang{' '}
                {observedWaveHeightM.toLocaleString('id-ID', {
                  maximumFractionDigits: 1,
                })}{' '}
                m · Open-Meteo Marine
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pills">
        <span className="pill mono">Radius bahaya {level.radiusKm} km</span>
        <span className="pill mono">Sejak {since}</span>
      </div>
      {provenance.level === 'live' ? (
        <div className="source">
          Sumber: Badan Geologi / PVMBG · {dataState.sourceTime}
        </div>
      ) : (
        <div className="unwired">
          <strong className="unwired__t">Level ini belum resmi</strong>
          <span className="unwired__n">
            Belum ada sambungan ke MAGMA Indonesia (PVMBG), satu-satunya pihak
            yang berhak menetapkan level. Angka di kartu ini contoh — periksa
            magma.esdm.go.id sebelum bertindak.
          </span>
        </div>
      )}
    </section>
  )
}
