import type { VolcanoLevel, VolcanoSnapshot } from '../../types'

interface Props {
  snapshot: VolcanoSnapshot
  level: VolcanoLevel
}

export function GuideTab({ snapshot, level }: Props) {
  return (
    <div className="tabview">
      <section className="actioncard">
        <h2 className="actioncard__title">{level.action}</h2>
        <p className="actioncard__note">{level.actionNote}</p>
      </section>

      <h2 className="section">Titik kumpul dan nomor penting</h2>
      <div className="rows">
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
    </div>
  )
}
