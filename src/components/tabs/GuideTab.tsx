import type { AviationStatus } from '../../data/aviation'
import type { VolcanoSnapshot } from '../../types'
import { SourceList } from '../SourceList'

interface Props {
  snapshot: VolcanoSnapshot
  aviation: AviationStatus
}

export function GuideTab({ snapshot, aviation }: Props) {
  return (
    <div className="tabview">
      <section className="actioncard">
        <h2 className="actioncard__title">{aviation.action}</h2>
        <p className="actioncard__note">
          {aviation.plain} Perintah evakuasi hanya sah dari BPBD atau Badan
          Geologi. Hubungi 112 bila belum ada arahan.
        </p>
      </section>

      <h2 className="section">Titik kumpul dan nomor penting</h2>
      <div className="rows">
        {snapshot.shelters.length === 0 && (
          <p className="emptynote">
            Daftar titik kumpul untuk {snapshot.volcano.name} belum tersambung
            ke data BPBD kabupaten, jadi tidak ada lokasi yang bisa disebut di
            sini. Nomor di bawah berlaku nasional; untuk lokasi resmi terdekat,
            tanyakan ke BPBD kabupaten setempat.
          </p>
        )}
        {snapshot.emergencyContacts.map((point) => (
          <div className="row row--tall" key={point.tel}>
            <div className="row__body">
              <div className="row__title">{point.name}</div>
              <div className="row__note">{point.note}</div>
            </div>
            <a className="row__tel mono" href={`tel:${point.tel}`}>
              {point.tel}
            </a>
          </div>
        ))}
        {snapshot.shelters.map((point) => (
          <div className="row row--tall" key={point.name}>
            <div className="row__body">
              <div className="row__title">{point.name}</div>
              <div className="row__note">{point.note}</div>
            </div>
            <a className="row__tel mono" href={`tel:${point.tel.replace(/\s/g, '')}`}>
              {point.tel}
            </a>
          </div>
        ))}
      </div>

      <h2 className="section">Yang perlu dilakukan saat hujan abu</h2>
      <ol className="steps steps--guide">
        {snapshot.ashfallSteps.map((step) => (
          <li className="step" key={step.n}>
            <span className="step__n mono">{step.n}</span>
            <span className="step__t">{step.text}</span>
          </li>
        ))}
      </ol>

      <SourceList snapshot={snapshot} />
    </div>
  )
}
