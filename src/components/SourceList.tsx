import { formatDateTime } from '../lib/format'
import type { VolcanoSnapshot } from '../types'

/**
 * Daftar sumber di kaki setiap layar, termasuk yang sedang gagal diambil.
 *
 * Sumber yang gagal sengaja tetap ditampilkan: pengguna harus tahu ada bagian
 * yang tidak terbarui, bukan cuma melihat sisa yang berhasil.
 */
export function SourceList({ snapshot }: { snapshot: VolcanoSnapshot }) {
  const { sources } = snapshot

  return (
    <section className="srclist">
      <h2 className="srclist__title">Sumber data</h2>

      {sources.length === 0 ? (
        <p className="srclist__empty">
          Deploy ini belum membawa snapshot sumber resmi, jadi seluruh angka di
          layar adalah data contoh.
        </p>
      ) : (
        <ul className="srclist__items">
          {sources.map((source) => (
            <li className="srcitem" key={source.id}>
              <span
                className={`srcitem__dot${source.ok ? '' : ' srcitem__dot--bad'}`}
                aria-hidden="true"
              />
              <span className="srcitem__body">
                <span className="srcitem__label">{source.label}</span>
                <span className="srcitem__meta mono">
                  {source.ok
                    ? `diambil ${formatDateTime(source.fetchedAtISO)}`
                    : `gagal: ${source.error ?? 'tidak diketahui'}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="srclist__note">
        Level status, radius bahaya, dampak wilayah, dan titik kumpul belum
        tersambung — semuanya hanya dimiliki PVMBG dan BPBD, dan ditandai{' '}
        <span className="samptag">contoh</span> di layar. Rujuk pengumuman Badan
        Geologi sebelum bertindak.
      </p>
    </section>
  )
}
