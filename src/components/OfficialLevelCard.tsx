import type { VolcanoLevel } from '../types'
import { Why } from './Why'

/**
 * Kartu "Level resmi Indonesia: belum tersambung" dari prototipe v4.
 *
 * Kartu ini menggantikan kartu level yang dulu memajang Normal/Waspada/Siaga/
 * Awas dengan angka contoh. Penetapan level adalah kewenangan Badan Geologi;
 * selama MAGMA belum tersambung, yang jujur ditampilkan adalah keterangan itu
 * sendiri — bukan level tebakan.
 */
export function OfficialLevelCard({ level }: { level: VolcanoLevel }) {
  return (
    <section className="offlevel">
      <div className="offlevel__row">
        <h2 className="offlevel__title">Level resmi Indonesia</h2>
        <span className="offlevel__tag mono">BELUM TERSAMBUNG</span>
      </div>
      <p className="offlevel__note">
        Normal, Waspada, Siaga, dan Awas adalah kewenangan Badan Geologi. App
        ini tidak menetapkan level — rujuk magma.esdm.go.id atau hubungi 112.
      </p>
      <Why label="Apa saja yang belum tersambung?">
        <p>
          Sambungan ke MAGMA Indonesia butuh izin akses Badan Geologi, jadi
          level status resmi, radius bahaya resmi, dan laporan pos pengamatan
          belum bisa dibaca app ini.
        </p>
        <p>
          Jarak Anda ke kawah tetap dihitung dari koordinat katalog Smithsonian.
          Radius {level.radiusKm} km yang dipakai kartu Posisi dan peta adalah
          pembanding sementara, bukan zona resmi.
        </p>
      </Why>
    </section>
  )
}
