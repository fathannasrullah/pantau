import type { DataStateView } from '../../data/dataState'
import { SampleTag } from '../SampleTag'
import { formatAge, formatDecimal, formatNumber, formatTime } from '../../lib/format'
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
            <div className="ash__k">Tinggi kolom abu</div>
            <div className="ash__v ash__v--none">belum tersambung</div>
            <div className="ash__d">hanya dari pos pengamatan PVMBG</div>
          </div>
        </div>
        <p className="ash__advice">{ashfall.advice}</p>
        <div className="ash__src">
          Sumber: {ashfall.source} · {dataState.sourceTime}
        </div>
      </section>

      {snapshot.air && (
        <>
          <h2 className="section">Peringatan abu untuk penerbangan</h2>
      {snapshot.ashAdvisories === null && (
        <p className="emptynote">
          Peringatan SIGMET belum bisa dimuat.
        </p>
      )}
      {snapshot.ashAdvisories?.length === 0 && (
        <p className="emptynote">
          Tidak ada peringatan abu vulkanik aktif untuk wilayah{' '}
          {snapshot.volcano.name} saat ini. Peringatan ini dikeluarkan otoritas
          penerbangan saat abu mencapai jalur terbang — ketiadaannya bukan
          berarti tidak ada erupsi.
        </p>
      )}
      {snapshot.ashAdvisories?.map((a) => (
        <section className="sigmet" key={a.text.slice(0, 60)}>
          <div className="sigmet__head">
            <span className="sigmet__tag mono">SIGMET · ABU VULKANIK</span>
            {a.namedHere && (
              <span className="sigmet__named">menyebut gunung ini</span>
            )}
          </div>
          <div className="sigmet__rows">
            {a.topM !== null && (
              <div className="sigmet__cell">
                <div className="sigmet__k">Puncak awan abu</div>
                <div className="sigmet__v mono">
                  {formatNumber(a.topM)} m
                </div>
                <div className="sigmet__u">
                  di atas permukaan laut · FL{Math.round((a.topFt ?? 0) / 100)}
                </div>
              </div>
            )}
            {a.moveDir && (
              <div className="sigmet__cell">
                <div className="sigmet__k">Bergerak ke</div>
                <div className="sigmet__v">{a.moveDir}</div>
                <div className="sigmet__u">
                  {a.moveSpeedKt !== null
                    ? `${a.moveSpeedKt} knot`
                    : 'kecepatan tidak disebut'}
                </div>
              </div>
            )}
          </div>
          <pre className="sigmet__raw">{a.text}</pre>
          <div className="sigmet__src">
            {a.fir ?? 'FIR tidak disebut'}
            {a.distanceKm !== null && ` · poligon terdekat ${formatNumber(a.distanceKm)} km dari kawah`}
            {a.validToISO && ` · berlaku sampai ${formatTime(a.validToISO)}`}
            {' · '}NOAA Aviation Weather Center
          </div>
        </section>
      ))}

      <h2 className="section">Udara di atas kawah</h2>
          <section className="airq dim">
            <div className="airq__row">
              <div className="airq__cell">
                <div className="airq__k">Belerang dioksida</div>
                <div
                  className="airq__v mono"
                  style={{ color: SEVERITY_COLOR[snapshot.air.so2Severity] }}
                >
                  {formatDecimal(snapshot.air.so2)}
                </div>
                <div className="airq__u">µg/m³ · pedoman WHO 40</div>
              </div>
              <div className="airq__cell">
                <div className="airq__k">Partikel PM10</div>
                <div
                  className="airq__v mono"
                  style={{ color: SEVERITY_COLOR[snapshot.air.pm10Severity] }}
                >
                  {formatDecimal(snapshot.air.pm10)}
                </div>
                <div className="airq__u">µg/m³ · pedoman WHO 45</div>
              </div>
            </div>
            <p className="airq__note">{snapshot.air.note}</p>
            <div className="airq__src">
              Sumber: Copernicus CAMS via Open-Meteo · {dataState.sourceTime}
            </div>
          </section>
        </>
      )}

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
      {snapshot.metrics.length === 0 && (
        <p className="emptynote">
          Kegempaan erupsi, amplitudo, deformasi, dan suhu titik panas hanya
          terekam alat pos pengamatan PVMBG, dan belum tersambung. Angka
          kegempaan tektonik di sekitar gunung ada di tab Seismik.
        </p>
      )}
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
      {snapshot.impacts.length === 0 && (
        <p className="emptynote">
          Laporan dampak di lapangan — hujan abu per desa, warga yang mengungsi,
          gangguan air bersih — hanya dimiliki BPBD kabupaten dan belum ada
          API-nya. Yang bisa ditampilkan di sini baru perkiraan jumlah penduduk
          di atas dan status transportasi bila nanti tersambung.
        </p>
      )}
      {snapshot.impacts.length > 0 && (
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
      )}

      {showTransport && snapshot.transport.length > 0 && (
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
