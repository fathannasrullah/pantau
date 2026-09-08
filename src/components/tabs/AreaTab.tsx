import type { DataStateView } from '../../data/dataState'
import { formatNumber } from '../../lib/format'
import { SEVERITY_COLOR } from '../../theme'
import type { MapLayer, VolcanoLevel, VolcanoSnapshot } from '../../types'
import { Why } from '../Why'

interface Props {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
  dataState: DataStateView
  layer: MapLayer['id']
  showTransport: boolean
}

/**
 * Tab Wilayah: apa yang ada di sekitar gunung.
 *
 * Dulu ini separuh bawah tab Peta. Petanya sendiri naik jadi latar penuh layar,
 * jadi yang tersisa di sini adalah keterangan lapisan yang sedang tergambar,
 * lalu daftar wilayah, penduduk, penyeberangan, dan dampak.
 */
export function AreaTab({
  snapshot,
  level,
  dataState,
  layer,
  showTransport,
}: Props) {
  const active =
    snapshot.mapLayers.find((l) => l.id === layer) ?? snapshot.mapLayers[0]

  return (
    <div className="tabview">
      <div className="layercard">
        <div className="layercard__k">Lapisan peta: {active.label}</div>
        <p className="layercard__n">{active.note}</p>
      </div>

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
          <Why>
            Perkiraan jumlah penduduk yang tinggal dalam radius tersebut dari
            kawah. Ini keluaran model sebaran penduduk beresolusi 100 m untuk
            tahun {snapshot.population.year}, bukan sensus terkini dan bukan
            hitungan orang yang sedang berada di sana hari ini.
          </Why>
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

      <h2 className="section">Dampak yang sudah terasa</h2>
      <p className="emptynote">
        Laporan dampak di lapangan — hujan abu per desa, warga yang mengungsi,
        gangguan air bersih — hanya dimiliki BPBD kabupaten dan belum ada
        API-nya. Yang bisa ditampilkan di sini baru perkiraan jumlah penduduk di
        atas.
      </p>

      <Why label="Bentuk-bentuk di peta itu dari mana?">
        Peta dasar OpenStreetMap, tampilan relief OpenTopoMap. Setiap bentuk di
        atasnya punya sumber: kawah dari katalog Smithsonian GVP, cincin
        penduduk dari WorldPop, area peringatan abu dari poligon SIGMET,
        episentrum dari BMKG dan USGS, arah angin dari Open-Meteo, posisi Anda
        dari GPS perangkat. Radius {level.radiusKm} km hanya pembanding — zona
        terlarang resmi ditetapkan Badan Geologi dan belum tersambung. Ketuk
        bentuk mana pun di peta untuk melihat sumbernya · {dataState.sourceTime}
      </Why>
    </div>
  )
}
