import type { VolcanoLevel } from '../types'

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
      <h2 className="offlevel__title">Level resmi Indonesia: belum tersambung</h2>
      <p className="offlevel__note">
        Penetapan Normal, Waspada, Siaga, dan Awas adalah kewenangan Badan
        Geologi. App ini menyusun gambaran dari sumber terbuka dan tidak
        menetapkan level. Untuk keputusan resmi, rujuk pengumuman Badan Geologi
        di magma.esdm.go.id atau hubungi 112.
      </p>
      <div className="pills">
        <span className="pill pill--muted mono">
          MAGMA Indonesia — perlu izin akses
        </span>
        <span className="pill pill--muted mono">
          Radius bahaya resmi hanya dari Badan Geologi
        </span>
      </div>
      <p className="offlevel__radius">
        Jarak Anda ke kawah tetap dihitung dari koordinat katalog Smithsonian.
        Radius {level.radiusKm} km yang dipakai kartu Posisi adalah pembanding
        sementara, bukan zona resmi.
      </p>
    </section>
  )
}
