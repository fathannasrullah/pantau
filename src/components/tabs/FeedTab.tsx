import { formatTime } from '../../lib/format'
import { SEVERITY_COLOR } from '../../theme'
import type { VolcanoSnapshot } from '../../types'

interface Props {
  snapshot: VolcanoSnapshot
  onOpenReport: () => void
}

export function FeedTab({ snapshot, onOpenReport }: Props) {
  return (
    <div className="tabview">
      <div className="feedhead">
        <h2 className="feedhead__title">Informasi resmi</h2>
        <button type="button" className="feedhead__action" onClick={onOpenReport}>
          Kirim laporan warga
        </button>
      </div>
      <div className="rows">
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
                {formatTime(item.timeISO)}
              </span>
            </div>
            <h3 className="feeditem__title">{item.title}</h3>
            <p className="feeditem__body">{item.body}</p>
            <div className="feeditem__src">{item.source}</div>
          </article>
        ))}
      </div>
      <p className="feednote">
        Hanya laporan dari Badan Geologi, BMKG, dan BPBD yang tampil di sini.
        Laporan warga masuk setelah diverifikasi petugas.
      </p>
    </div>
  )
}
