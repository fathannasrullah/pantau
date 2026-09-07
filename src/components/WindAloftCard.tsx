import type { DataStateView } from '../data/dataState'
import { formatNumber } from '../lib/format'
import type { WindLayer } from '../types'

interface Props {
  layers: WindLayer[]
  dataState: DataStateView
  /** Arah dan kecepatan angin permukaan, sebagai pembanding paling bawah. */
  surfaceHeading: string
  surfaceSpeedKmh: number
}

/** Panjang panah mengikuti kecepatan, dibatasi supaya tetap sebaris. */
function arrowScale(speedKmh: number): number {
  return Math.max(0.45, Math.min(1, speedKmh / 90))
}

/**
 * Profil angin dari bawah ke atas.
 *
 * Angin permukaan menentukan ke mana abu tipis jatuh di sekitar gunung; angin
 * di ketinggian menentukan ke mana kolom abu terbawa — dan itulah yang menjadi
 * urusan penerbangan. Keduanya bisa berlawanan arah, dan justru itu yang perlu
 * terlihat, bukan satu angka angin saja seperti sebelumnya.
 */
export function WindAloftCard({
  layers,
  dataState,
  surfaceHeading,
  surfaceSpeedKmh,
}: Props) {
  // Dari atas ke bawah, seperti membaca penampang udara.
  const top = [...layers].reverse()

  return (
    <section className="waloft dim">
      <ul className="waloft__list">
        {top.map((l) => (
          <li
            className={`waloft__row${l.nearAshTop ? ' waloft__row--hit' : ''}`}
            key={l.hPa}
          >
            <div className="waloft__lvl">
              <span className="waloft__fl mono">FL{l.flightLevel}</span>
              <span className="waloft__m mono">{formatNumber(l.heightM)} m</span>
            </div>
            <div className="waloft__dir">
              <span
                className="waloft__arrow"
                style={{
                  transform: `rotate(${l.ashHeadingDeg}deg) scale(${arrowScale(l.speedKmh)})`,
                }}
                aria-hidden="true"
              />
              <span className="waloft__to">{l.ashHeading}</span>
            </div>
            <div className="waloft__spd mono">{l.speedKmh} km/j</div>
            {l.nearAshTop && (
              <div className="waloft__hit mono">≈ puncak abu</div>
            )}
          </li>
        ))}
        <li className="waloft__row waloft__row--surface">
          <div className="waloft__lvl">
            <span className="waloft__fl mono">PERMUKAAN</span>
            <span className="waloft__m mono">10 m</span>
          </div>
          <div className="waloft__dir">
            <span className="waloft__to">{surfaceHeading}</span>
          </div>
          <div className="waloft__spd mono">{surfaceSpeedKmh} km/j</div>
        </li>
      </ul>

      <p className="waloft__note">
        Panah menunjuk ke mana abu di lapisan itu terbawa — kebalikan arah asal
        angin. Baris yang disorot adalah lapisan terdekat dengan puncak awan abu
        menurut peringatan yang sedang berlaku, jadi itu yang paling menentukan
        arah sebarannya.
      </p>
      <div className="waloft__src">
        Sumber: Open-Meteo, angin per lapisan tekanan · tinggi tiap lapisan dari
        medan geopotential height, bukan tabel perkiraan · {dataState.sourceTime}
      </div>
    </section>
  )
}
