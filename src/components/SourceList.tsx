import { formatDateTime } from '../lib/format'
import type { VolcanoSnapshot } from '../types'

interface CatalogEntry {
  /** Apa yang sebenarnya diambil dari sumber ini. */
  what: string
  /** Seberapa sering nilainya berubah di hulu. */
  rate: string
  color: string
}

/**
 * Keterangan tiap sumber, mengikuti tabel "Dari mana data di app ini" pada
 * prototipe v4. Isinya menyusul apa yang benar-benar diambil scripts/
 * fetch-sources.mjs — bila satu sumber ditambah di sana, tambahkan di sini
 * juga, jangan sebaliknya.
 */
const CATALOG: Record<string, CatalogEntry> = {
  sigmet: {
    what: 'Peringatan abu vulkanik untuk penerbangan, tinggi dan arah geraknya',
    rate: '± 1 JAM',
    color: '#fb923c',
  },
  bmkg: {
    what: 'Gempa terkini Indonesia dan keterangan potensi tsunami',
    rate: 'MENIT',
    color: '#38bdf8',
  },
  emsc: {
    what: 'Katalog gempa sekitar gunung dengan ambang magnitudo lebih rendah',
    rate: 'MENIT',
    color: '#38bdf8',
  },
  quakes: {
    what: 'Katalog gempa USGS sebagai cadangan bila EMSC gagal',
    rate: 'MENIT',
    color: '#94a3b8',
  },
  wind: {
    what: 'Angin permukaan di atas kawah, dipakai menghitung arah sebaran abu',
    rate: 'JAM',
    color: '#4ade80',
  },
  air: {
    what: 'SO2, PM10, dan PM2.5 model CAMS di atas kawah',
    rate: 'JAM',
    color: '#4ade80',
  },
  waves: {
    what: 'Tinggi gelombang perairan sekitar untuk gunung berbahaya pesisir',
    rate: 'JAM',
    color: '#38bdf8',
  },
  gvp: {
    what: 'Katalog erupsi Smithsonian, Region 06 Indonesia',
    rate: 'MINGGUAN',
    color: '#94a3b8',
  },
  population: {
    what: 'Perkiraan penduduk per radius dari kawah, model WorldPop',
    rate: 'TAHUNAN',
    color: '#c084fc',
  },
  magma: {
    what: 'Level resmi Normal–Awas · belum tersambung, perlu izin Badan Geologi',
    rate: 'BELUM',
    color: '#f87171',
  },
}

/**
 * Daftar sumber, termasuk yang sedang gagal diambil.
 *
 * Sumber yang gagal sengaja tetap ditampilkan: pengguna harus tahu ada bagian
 * yang tidak terbarui, bukan cuma melihat sisa yang berhasil.
 */
export function SourceList({ snapshot }: { snapshot: VolcanoSnapshot }) {
  const { sources } = snapshot

  return (
    <section className="srclist">
      <h2 className="section">Dari mana data di app ini</h2>

      {sources.length === 0 ? (
        <p className="emptynote">
          Deploy ini belum membawa snapshot sumber resmi, jadi sebagian besar
          angka di layar belum terisi.
        </p>
      ) : (
        <ul className="srclist__items">
          {sources.map((source) => {
            const entry = CATALOG[source.id]
            return (
              <li className="srcitem" key={source.id}>
                <span className="srcitem__body">
                  <span className="srcitem__label">{source.label}</span>
                  <span className="srcitem__what">
                    {entry?.what ?? 'Keterangan sumber ini belum dicatat.'}
                  </span>
                  <span className="srcitem__meta mono">
                    {source.ok
                      ? `diambil ${formatDateTime(source.fetchedAtISO)}`
                      : `gagal: ${source.error ?? 'tidak diketahui'}`}
                  </span>
                </span>
                <span
                  className={`srcitem__rate mono${source.ok ? '' : ' srcitem__rate--bad'}`}
                  style={source.ok ? { color: entry?.color } : undefined}
                >
                  {source.ok ? (entry?.rate ?? 'BERKALA') : 'GAGAL'}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <p className="srclist__note">
        Level status resmi, radius bahaya, dampak wilayah, dan titik kumpul
        hanya dimiliki Badan Geologi dan BPBD, dan belum ada API terbukanya —
        jadi tidak ditampilkan di sini sama sekali, bukan diisi angka contoh.
        Rujuk pengumuman Badan Geologi sebelum bertindak.
      </p>
    </section>
  )
}
