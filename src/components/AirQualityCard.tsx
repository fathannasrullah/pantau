import { aqiBand } from '../data/aqi'
import type { DataStateView } from '../data/dataState'
import { formatDecimal } from '../lib/format'
import { SEVERITY_COLOR } from '../theme'
import type { AirQuality } from '../types'

interface Props {
  air: AirQuality
  dataState: DataStateView
}

/** Skala penuh batang, dipilih agar seluruh rentang AQI EPA muat. */
const BAR_MAX = 300

/**
 * Kartu kualitas udara v4: satu angka besar, kategorinya, dan satu kalimat
 * saran. Konsentrasi mentah tetap ditampilkan di bawahnya supaya indeks bisa
 * ditelusuri kembali ke angka aslinya.
 */
export function AirQualityCard({ air, dataState }: Props) {
  const band = air.aqi === null ? null : aqiBand(air.aqi)

  return (
    <section className="aqcard dim">
      {band && air.aqi !== null ? (
        <>
          <div className="aqcard__head">
            <div className="aqcard__aqi mono" style={{ color: band.color }}>
              {air.aqi}
            </div>
            <div className="aqcard__id">
              <div className="aqcard__band" style={{ color: band.color }}>
                {band.label}
              </div>
              <div className="aqcard__unit">
                AQI · PM2.5 {formatDecimal(air.pm25 ?? 0)} µg/m³
              </div>
            </div>
          </div>
          <p className="aqcard__advice">{band.advice}</p>
          <div className="aqcard__track">
            <div
              className="aqcard__fill"
              style={{
                width: `${Math.min(100, Math.round((air.aqi / BAR_MAX) * 100))}%`,
                background: band.color,
              }}
            />
          </div>
        </>
      ) : (
        <p className="aqcard__advice">
          Indeks AQI belum bisa dihitung karena PM2.5 tidak ikut terbaca. Angka
          mentah di bawah tetap dari pengambilan yang sama.
        </p>
      )}

      <div className="aqcard__raw">
        <div className="aqcard__cell">
          <div className="aqcard__k">Belerang dioksida</div>
          <div
            className="aqcard__v mono"
            style={{ color: SEVERITY_COLOR[air.so2Severity] }}
          >
            {formatDecimal(air.so2)}
          </div>
          <div className="aqcard__u">µg/m³ · pedoman WHO 40</div>
        </div>
        <div className="aqcard__cell">
          <div className="aqcard__k">Partikel PM10</div>
          <div
            className="aqcard__v mono"
            style={{ color: SEVERITY_COLOR[air.pm10Severity] }}
          >
            {formatDecimal(air.pm10)}
          </div>
          <div className="aqcard__u">µg/m³ · pedoman WHO 45</div>
        </div>
      </div>

      <p className="aqcard__caveat">
        Angka ini keluaran model CAMS (Copernicus) di atas kawah, bukan
        pembacaan stasiun di darat. Indeks AQI dihitung dari PM2.5 memakai
        rumus US EPA, yang aslinya memakai rata-rata 24 jam — di sini
        pembacaan per jam, jadi anggap perkiraan cepat, bukan indeks resmi.
      </p>
      <div className="aqcard__src">
        Sumber: Copernicus CAMS via Open-Meteo · {dataState.sourceTime}
      </div>
    </section>
  )
}
