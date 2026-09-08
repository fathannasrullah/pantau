import type { AviationStatus } from '../../data/aviation'
import type { DataStateView } from '../../data/dataState'
import { SampleTag } from '../SampleTag'
import { formatAge } from '../../lib/format'
import type { GeolocationState } from '../../hooks/useGeolocation'
import type { LiveQuakesState } from '../../hooks/useLiveQuakes'
import type { VolcanoLevel, VolcanoSnapshot } from '../../types'
import { AirQualityCard } from '../AirQualityCard'
import { AviationCard } from '../AviationCard'
import { InstallPrompt } from '../InstallPrompt'
import { LiveQuakeList } from '../LiveQuakeList'
import { OfficialLevelCard } from '../OfficialLevelCard'
import { PositionCard } from '../PositionCard'
import { SeismicPanel } from '../SeismicPanel'
import { SummaryStrip } from '../SummaryStrip'

interface Props {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
  dataState: DataStateView
  aviation: AviationStatus
  geo: GeolocationState
  liveQuakes: LiveQuakesState
  selectedHour: number
  notifSummary: string
  onSelectHour: (index: number) => void
  onGoGuide: () => void
  onGoMap: () => void
  onGoAviation: () => void
  onOpenNotifications: () => void
}

export function StatusTab({
  snapshot,
  level,
  dataState,
  aviation,
  geo,
  liveQuakes,
  selectedHour,
  notifSummary,
  onSelectHour,
  onGoGuide,
  onGoMap,
  onGoAviation,
  onOpenNotifications,
}: Props) {
  const { ashfall } = snapshot

  return (
    <div className="tabview">
      <SummaryStrip
        snapshot={snapshot}
        aviation={aviation}
        geo={geo}
        onGoMap={onGoMap}
        onGoAviation={onGoAviation}
      />

      <AviationCard
        status={aviation}
        dataState={dataState}
        advisoryCount={snapshot.ashAdvisories?.length ?? null}
        onOpenAviation={onGoAviation}
      />

      <OfficialLevelCard level={level} />

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

      {dataState.isFailed && (
        <div className="failnote">
          <div className="failnote__t">Data terbaru gagal dimuat</div>
          <div className="failnote__n">
            Yang tampil di bawah adalah catatan terakhir yang tersimpan,{' '}
            {formatAge(dataState.ageMinutes)}. Jangan dijadikan dasar keputusan.
          </div>
        </div>
      )}

      <h2 className="section">Kualitas udara di sekitar kawah</h2>
      {snapshot.air ? (
        <AirQualityCard air={snapshot.air} dataState={dataState} />
      ) : (
        <p className="emptynote">
          Data kualitas udara untuk {snapshot.volcano.name} belum bisa dimuat.
        </p>
      )}

      <h2 className="section">Abu vulkanik dan arah angin</h2>
      <section className="ash dim">
        <div className="ash__split">
          <div className="ash__cell ash__cell--left">
            <div className="ash__k">
              Arah sebaran
              {ashfall.windProvenance === 'sample' && <SampleTag />}
            </div>
            <div className="ash__v">{ashfall.windDirection}</div>
            <div className="ash__d">angin {ashfall.windSpeedKmh} km/jam</div>
          </div>
          <div className="ash__cell">
            <div className="ash__k">Puncak kolom abu</div>
            <div className="ash__v ash__v--none">belum tersambung</div>
            <div className="ash__d">hanya dari pos pengamatan PVMBG</div>
          </div>
        </div>
        <p className="ash__advice">{ashfall.advice}</p>
        <div className="ash__src">
          Sumber: {ashfall.source} · {dataState.sourceTime}
        </div>
      </section>

      <LiveQuakeList
        live={liveQuakes}
        volcano={snapshot.volcano}
        nowISO={snapshot.fetchedAtISO}
      />

      <h2 className="section">Kegempaan tiap jam, 24 jam terakhir</h2>
      <SeismicPanel
        snapshot={snapshot}
        dataState={dataState}
        selectedHour={selectedHour}
        onSelectHour={onSelectHour}
      />

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
