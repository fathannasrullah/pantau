import type { DataStateView } from '../../data/dataState'
import { SampleTag } from '../SampleTag'
import { formatAge, formatNumber } from '../../lib/format'
import { SEVERITY_COLOR } from '../../theme'
import type { GeolocationState } from '../../hooks/useGeolocation'
import type { VolcanoLevel, VolcanoSnapshot } from '../../types'
import { InstallPrompt } from '../InstallPrompt'
import { PositionCard } from '../PositionCard'
import { StatusCard } from '../StatusCard'

interface Props {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
  dataState: DataStateView
  geo: GeolocationState
  showTransport: boolean
  notifSummary: string
  onGoGuide: () => void
  onGoMap: () => void
  onOpenNotifications: () => void
}

export function StatusTab({
  snapshot,
  level,
  dataState,
  geo,
  showTransport,
  notifSummary,
  onGoGuide,
  onGoMap,
  onOpenNotifications,
}: Props) {
  const { ashfall } = snapshot
  const rising = ashfall.columnDeltaM >= 0

  return (
    <div className="tabview">
      <StatusCard
        level={level}
        dataState={dataState}
        provenance={snapshot.provenance}
        observedWaveHeightM={snapshot.observedWaveHeightM}
      />

      <PositionCard
        geo={geo}
        volcano={snapshot.volcano}
        level={level}
        ashfall={snapshot.ashfall}
        shelters={snapshot.shelters}
        provenance={snapshot.provenance}
        onShowShelters={onGoGuide}
        onShowMap={onGoMap}
      />

      <h2 className="section">Hujan abu hari ini</h2>
      {dataState.isFailed && (
        <div className="failnote">
          <div className="failnote__t">Data terbaru gagal dimuat</div>
          <div className="failnote__n">
            Yang tampil di bawah adalah catatan terakhir yang tersimpan,{' '}
            {formatAge(dataState.ageMinutes)}. Jangan dijadikan dasar keputusan.
          </div>
        </div>
      )}
      <section className="ash dim">
        <div className="ash__split">
          <div className="ash__cell ash__cell--left">
            <div className="ash__k">
              Arah abu
              {ashfall.windProvenance === 'sample' && <SampleTag />}
            </div>
            <div className="ash__v">{ashfall.windDirection}</div>
            <div className="ash__d">angin {ashfall.windSpeedKmh} km/jam</div>
          </div>
          <div className="ash__cell">
            <div className="ash__k">
              Tinggi kolom abu
              {ashfall.columnProvenance === 'sample' && <SampleTag />}
            </div>
            <div className="ash__v ash__v--mono mono">
              {formatNumber(ashfall.columnHeightM)} m
            </div>
            <div className={`ash__d${rising ? ' ash__d--up' : ''}`}>
              {rising ? 'naik' : 'turun'}{' '}
              {formatNumber(Math.abs(ashfall.columnDeltaM))} m
            </div>
          </div>
        </div>
        <p className="ash__advice">{ashfall.advice}</p>
        <div className="ash__src">
          Sumber: {ashfall.source} · {dataState.sourceTime}
        </div>
      </section>

      <h2 className="section">Tiga hal yang bisa dilakukan sekarang</h2>
      <ol className="steps">
        {snapshot.quickActions.map((item) => (
          <li className="step" key={item.n}>
            <span className="step__n mono">{item.n}</span>
            <span className="step__t">{item.text}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="linkrow" onClick={onGoGuide}>
        Panduan lengkap dan titik kumpul →
      </button>

      <h2 className="section">Pengamatan 24 jam terakhir</h2>
      <div className="grid2 dim">
        {snapshot.metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <div className="metric__k">{metric.label}</div>
            <div className="metric__v mono">{metric.value}</div>
            <div
              className="metric__d"
              style={{ color: SEVERITY_COLOR[metric.severity] }}
            >
              {metric.delta}
            </div>
          </div>
        ))}
      </div>

      <h2 className="section">Dampak yang sudah terasa</h2>
      <section className="impacts dim">
        {snapshot.impacts.map((impact) => (
          <div
            className="impact"
            key={impact.area}
            style={{ color: SEVERITY_COLOR[impact.severity] }}
          >
            <div className="impact__dot" aria-hidden="true" />
            <div className="impact__body">
              <div className="impact__area">{impact.area}</div>
              <div className="impact__note">{impact.note}</div>
            </div>
            <div className="impact__tag mono">{impact.tag}</div>
          </div>
        ))}
        <div className="impacts__src">
          Laporan BPBD kabupaten · {dataState.sourceTime}
        </div>
      </section>

      {showTransport && (
        <>
          <h2 className="section">Perjalanan dan transportasi</h2>
          <div className="rows dim">
            {snapshot.transport.map((item) => (
              <div className="row" key={item.name}>
                <div className="row__body">
                  <div className="row__title">{item.name}</div>
                  <div className="row__note">{item.note}</div>
                </div>
                <div
                  className="row__state mono"
                  style={{ color: SEVERITY_COLOR[item.severity] }}
                >
                  {item.state}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" className="notifrow" onClick={onOpenNotifications}>
        <span className="notifrow__body">
          <span className="notifrow__title">Notifikasi perubahan status</span>
          <span className="notifrow__note">{notifSummary}</span>
        </span>
        <span className="notifrow__action">Atur</span>
      </button>

      <InstallPrompt />
    </div>
  )
}
