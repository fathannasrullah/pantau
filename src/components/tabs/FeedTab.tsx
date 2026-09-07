import { formatFeedTime } from '../../lib/format'
import type { LiveQuakesState } from '../../hooks/useLiveQuakes'
import { LiveQuakeList } from '../LiveQuakeList'
import { SampleTag } from '../SampleTag'
import { SEVERITY_COLOR } from '../../theme'
import type { VolcanoSnapshot } from '../../types'

interface Props {
  snapshot: VolcanoSnapshot
  live: LiveQuakesState
  onOpenReport: () => void
}

export function FeedTab({ snapshot, live, onOpenReport }: Props) {
  return (
    <div className="tabview">
      <LiveQuakeList
        live={live}
        volcano={snapshot.volcano}
        nowISO={snapshot.fetchedAtISO}
      />

      <div className="feedhead">
        <h2 className="feedhead__title">Laporan resmi BMKG</h2>
        <button type="button" className="feedhead__action" onClick={onOpenReport}>
          Kirim laporan warga
        </button>
      </div>
      <div className="rows">
        {snapshot.feed.length === 0 && (
          <p className="emptynote">
            Belum ada laporan resmi yang bisa ditampilkan untuk{' '}
            {snapshot.volcano.name}. Yang masuk ke sini hanya gempa BMKG dalam
            radius 500 km dan tujuh hari terakhir. VONA dan laporan pos
            pengamatan menunggu sambungan ke MAGMA Indonesia.
          </p>
        )}
        {snapshot.feed.map((item) => (
          <article className="feeditem" key={`${item.kind}-${item.timeISO}`}>
            <div className="feeditem__head">
              <span
                className="feeditem__kind mono"
                style={{ color: SEVERITY_COLOR[item.severity] }}
              >
                {item.kind}
              </span>
              <span className="feeditem__time mono">
                {formatFeedTime(item.timeISO, snapshot.fetchedAtISO)}
              </span>
              {item.provenance === 'sample' && <SampleTag />}
            </div>
            <h3 className="feeditem__title">{item.title}</h3>
            <p className="feeditem__body">{item.body}</p>
            <div className="feeditem__src">{item.source}</div>
          </article>
        ))}
      </div>
      <p className="feednote">
        Hanya laporan dari lembaga resmi yang tampil di sini. Laporan warga
        masuk setelah diverifikasi petugas.
      </p>
    </div>
  )
}
