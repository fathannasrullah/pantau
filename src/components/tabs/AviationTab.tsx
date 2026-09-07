import type { AviationStatus } from '../../data/aviation'
import type { DataStateView } from '../../data/dataState'
import { formatNumber, formatTime } from '../../lib/format'
import { SEVERITY_COLOR } from '../../theme'
import type { VolcanoSnapshot } from '../../types'

interface Props {
  snapshot: VolcanoSnapshot
  status: AviationStatus
  dataState: DataStateView
  showTransport: boolean
}

/**
 * Tab Udara: sisi penerbangan dan perjalanan. Prototipe v4 menaruh tiga blok di
 * sini — lalu lintas pesawat, NOTAM, dan penyeberangan. Dua di antaranya belum
 * punya sumber yang bisa dipakai dari peramban, jadi yang tampil adalah
 * keterangan kenapa, bukan angka contoh.
 */
export function AviationTab({
  snapshot,
  status,
  dataState,
  showTransport,
}: Props) {
  const advisories = snapshot.ashAdvisories

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

      {advisories?.map((a) => (
        <section className="sigmet" key={a.text.slice(0, 60)}>
          <div className="sigmet__head">
            <span className="sigmet__tag mono">SIGMET · ABU VULKANIK</span>
            <span
              className={`sigmet__named${a.namedHere ? '' : ' sigmet__named--other'}`}
            >
              {a.namedHere
                ? 'menyebut gunung ini'
                : 'periksa teks — bisa untuk gunung lain'}
            </span>
          </div>
          <div className="sigmet__rows">
            {a.topM !== null && (
              <div className="sigmet__cell">
                <div className="sigmet__k">Puncak awan abu</div>
                <div className="sigmet__v mono">{formatNumber(a.topM)} m</div>
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
            {a.distanceKm !== null &&
              ` · poligon terdekat ${formatNumber(a.distanceKm)} km dari kawah`}
            {a.validToISO && ` · berlaku sampai ${formatTime(a.validToISO)}`}
            {' · '}NOAA Aviation Weather Center
          </div>
        </section>
      ))}

      <h2 className="section">Lalu lintas pesawat di zona abu</h2>
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
