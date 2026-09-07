import type { AviationStatus } from '../../data/aviation'
import type { DataStateView } from '../../data/dataState'
import { formatNumber, formatTime } from '../../lib/format'
import { SEVERITY_COLOR } from '../../theme'
import type { AdvisoryValidity, VolcanoSnapshot } from '../../types'
import { WindAloftCard } from '../WindAloftCard'

interface Props {
  snapshot: VolcanoSnapshot
  status: AviationStatus
  dataState: DataStateView
  showTransport: boolean
}

const VALIDITY_LABEL: Record<AdvisoryValidity, string> = {
  berlaku: 'BERLAKU',
  akan: 'BELUM MULAI',
  lewat: 'SUDAH LEWAT',
  'tidak diketahui': 'JENDELA TIDAK DISEBUT',
}

const VALIDITY_COLOR: Record<AdvisoryValidity, string> = {
  berlaku: SEVERITY_COLOR.alert,
  akan: SEVERITY_COLOR.watch,
  lewat: SEVERITY_COLOR.neutral,
  'tidak diketahui': SEVERITY_COLOR.neutral,
}

/**
 * Tab Udara: sisi penerbangan dan perjalanan.
 *
 * Isinya disusun dari yang paling resmi ke yang paling turunan: teks SIGMET apa
 * adanya, lalu konteks nasional dari feed yang sama, lalu angin per lapisan
 * yang menjelaskan ke mana abu di ketinggian terbawa, lalu bandara acuan —
 * yang statusnya sengaja tidak diklaim.
 */
export function AviationTab({
  snapshot,
  status,
  dataState,
  showTransport,
}: Props) {
  const advisories = snapshot.ashAdvisories
  const national = snapshot.ashNational
  const airports = snapshot.airports
  const affected = (airports ?? []).filter((a) => a.insideAshArea)
  // Yang sedang berlaku dibaca lebih dulu; yang sudah lewat turun ke bawah.
  const sorted = [...(advisories ?? [])].sort(
    (a, b) => Number(a.validity === 'lewat') - Number(b.validity === 'lewat'),
  )

  return (
    <div className="tabview">
      <h2 className="section section--first">Peringatan abu vulkanik (SIGMET)</h2>

      <p className="layernote">{status.headline}</p>

      {advisories === null && (
        <p className="emptynote">
          Peringatan SIGMET belum bisa dimuat, jadi app ini tidak tahu apakah
          sedang ada abu di jalur terbang sekitar {snapshot.volcano.name}.
        </p>
      )}

      {advisories?.length === 0 && (
        <p className="emptynote">
          Tidak ada peringatan abu vulkanik aktif untuk wilayah{' '}
          {snapshot.volcano.name} saat ini. Peringatan ini dikeluarkan otoritas
          penerbangan hanya saat abu mencapai jalur terbang — ketiadaannya bukan
          berarti tidak ada erupsi.
        </p>
      )}

      {sorted.map((a) => {
        const validity = a.validity
        return (
          <section
            className={`sigmet${validity === 'lewat' ? ' sigmet--past' : ''}`}
            key={a.text.slice(0, 60)}
          >
            <div className="sigmet__head">
              <span className="sigmet__tag mono">SIGMET · ABU VULKANIK</span>
              <span
                className="sigmet__validity mono"
                style={{ color: VALIDITY_COLOR[validity] }}
              >
                {VALIDITY_LABEL[validity]}
              </span>
            </div>

            <div className="sigmet__who">
              <span
                className={`sigmet__named${a.namedHere ? '' : ' sigmet__named--other'}`}
              >
                {a.namedHere
                  ? 'menyebut gunung ini'
                  : 'periksa teks — bisa untuk gunung lain'}
              </span>
              {a.qualifier && (
                <span className="sigmet__qual mono">
                  gunung disebut: {a.qualifier}
                </span>
              )}
            </div>

            <div className="sigmet__rows">
              {(a.topM !== null || a.baseFt !== null) && (
                <div className="sigmet__cell">
                  <div className="sigmet__k">Lapisan awan abu</div>
                  <div className="sigmet__v mono">
                    {a.baseFt === null || a.baseFt === 0
                      ? 'permukaan'
                      : `FL${Math.round(a.baseFt / 100)}`}
                    {' – '}
                    {a.topFt === null
                      ? '?'
                      : `FL${Math.round(a.topFt / 100)}`}
                  </div>
                  <div className="sigmet__u">
                    {a.topM === null
                      ? 'puncak tidak disebut'
                      : `puncak ± ${formatNumber(a.topM)} m dpl`}
                  </div>
                </div>
              )}
              {a.moveDir && (
                <div className="sigmet__cell">
                  <div className="sigmet__k">Bergerak ke</div>
                  <div className="sigmet__v">{a.moveDirLabel ?? a.moveDir}</div>
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
              {a.distanceKm !== null &&
                ` · poligon terdekat ${formatNumber(a.distanceKm)} km dari kawah`}
              {a.validFromISO &&
                a.validToISO &&
                ` · berlaku ${formatTime(a.validFromISO)}–${formatTime(a.validToISO)}`}
              {' · '}NOAA Aviation Weather Center
            </div>
          </section>
        )
      })}

      <h2 className="section">Peringatan abu di seluruh Indonesia</h2>
      {national === null ? (
        <p className="emptynote">
          Rekap nasional belum bisa dihitung karena feed SIGMET tidak terbaca.
        </p>
      ) : national.total === 0 ? (
        <p className="emptynote">
          Tidak ada peringatan abu vulkanik yang sedang berlaku di ruang udara
          Indonesia (FIR Jakarta dan Ujung Pandang) saat feed ini diambil.
        </p>
      ) : (
        <section className="natash">
          <div className="natash__head">
            <div className="natash__n mono">{national.total}</div>
            <div className="natash__t">
              peringatan abu aktif di ruang udara Indonesia
            </div>
          </div>
          {national.volcanoes.length > 0 && (
            <div className="natash__chips">
              {national.volcanoes.map((v) => (
                <span
                  key={v}
                  className={`natash__chip mono${
                    v.toUpperCase().includes(
                      snapshot.volcano.name
                        .replace(/^(Anak|Ili|Gunung)\s+/i, '')
                        .split(' ')[0]
                        .toUpperCase(),
                    )
                      ? ' natash__chip--here'
                      : ''
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          )}
          <p className="natash__note">
            Nama gunung diambil dari medan resmi tiap peringatan, bukan dibaca
            dari teksnya. {national.firs.join(' · ')}
          </p>
        </section>
      )}

      <h2 className="section">Angin per ketinggian di atas kawah</h2>
      {snapshot.windAloft === null ? (
        <p className="emptynote">
          Profil angin per lapisan tekanan belum bisa dimuat, jadi arah sebaran
          abu di ketinggian penerbangan tidak bisa ditampilkan.
        </p>
      ) : (
        <WindAloftCard
          layers={snapshot.windAloft}
          dataState={dataState}
          surfaceHeading={snapshot.ashfall.windDirection}
          surfaceSpeedKmh={snapshot.ashfall.windSpeedKmh}
        />
      )}

      <h2 className="section">Bandara di sekitar gunung</h2>
      {airports === null ? (
        <p className="emptynote">
          Katalog bandara belum bisa dimuat.
        </p>
      ) : airports.length === 0 ? (
        <p className="emptynote">
          Tidak ada bandara berjadwal dalam radius 400 km dari{' '}
          {snapshot.volcano.name}.
        </p>
      ) : (
        <>
          {affected.length > 0 && (
            <div className="airhit" role="status">
              <strong className="airhit__t">
                {affected.length === 1
                  ? 'Satu bandara berada di dalam area peringatan abu'
                  : `${affected.length} bandara berada di dalam area peringatan abu`}
              </strong>
              <span className="airhit__n">
                Ini hitungan geometris app: koordinat bandara berada di dalam
                poligon SIGMET yang berlaku. Bukan pernyataan otoritas bandara,
                dan bukan berarti penerbangan dibatalkan. Untuk status
                sebenarnya, tanyakan ke maskapai atau otoritas bandara.
              </span>
            </div>
          )}
          <div className="rows">
            {airports.map((a) => (
              <div
                className={`row${a.insideAshArea ? ' row--flag' : ''}`}
                key={`${a.icao ?? a.name}-${a.distanceKm}`}
              >
                <div className="row__km mono">{a.distanceKm} km</div>
                <div className="row__body">
                  <div className="row__title">{a.name}</div>
                  <div className="row__note">
                    {[a.city, a.icao, a.iata].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {a.insideAshArea && (
                  <div
                    className="row__state mono"
                    style={{ color: SEVERITY_COLOR.alert }}
                  >
                    DI AREA ABU
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="tabfoot">
            Daftar acuan dari katalog terbuka OurAirports: nama, kode, dan
            koordinat bandara berjadwal. Katalog ini tidak memuat status
            operasional, dan app ini tidak mengarangnya.
          </p>
        </>
      )}

      <h2 className="section">Lalu lintas pesawat</h2>
      <p className="emptynote">
        Posisi pesawat dari OpenSky Network memang terbuka, tetapi hanya bisa
        dibaca dari servernya sendiri — peramban ditolak karena aturan CORS.
        Menghitung sendiri pesawat mana yang "memutar karena abu" juga bukan
        pernyataan resmi siapa pun, jadi angka itu sengaja tidak ditampilkan.
      </p>

      <h2 className="section">NOTAM dan status bandara</h2>
      <p className="emptynote">
        Penutupan ruang udara dan prosedur bandara diumumkan lewat NOTAM. Sumber
        resminya (FAA/ICAO) menuntut kredensial dan tidak boleh diambil ulang
        oleh pihak ketiga, jadi belum tersambung. Untuk status penerbangan,
        tanyakan langsung ke maskapai atau otoritas bandara.
      </p>

      {showTransport && (
        <>
          <h2 className="section">Penyeberangan dan pelayaran</h2>
          {snapshot.transport.length === 0 ? (
            <p className="emptynote">
              Status pelabuhan dan penyeberangan ditetapkan ASDP, KSOP, dan
              Dinas Perhubungan setempat. Belum ada API terbuka yang menerbitkan
              status itu, jadi tidak ada yang bisa ditampilkan di sini tanpa
              mengarang.
              {snapshot.volcano.coastalHazard &&
                snapshot.observedWaveHeightM !== null && (
                  <>
                    {' '}
                    Yang terukur hanya tinggi gelombang{' '}
                    {snapshot.observedWaveHeightM.toLocaleString('id-ID', {
                      maximumFractionDigits: 1,
                    })}{' '}
                    m dari Open-Meteo Marine — itu kondisi laut, bukan keputusan
                    buka-tutup pelabuhan.
                  </>
                )}
            </p>
          ) : (
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
          )}
        </>
      )}

      <p className="tabfoot">
        Bagian ini untuk operator dan calon penumpang. Warga di radius bahaya
        cukup melihat tab Status · {dataState.sourceTime}
      </p>
    </div>
  )
}
