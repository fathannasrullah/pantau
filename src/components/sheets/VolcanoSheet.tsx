import { VOLCANOES } from '../../data/volcanoes'
import { formatNumber } from '../../lib/format'
import { Sheet } from '../Sheet'

interface Props {
  activeId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function VolcanoSheet({ activeId, onSelect, onClose }: Props) {
  return (
    <Sheet
      title="Pilih gunung"
      note="Angin, kualitas udara, kegempaan sekitar, dan katalog erupsi diambil per gunung. Level status belum tersambung untuk gunung mana pun."
      onClose={onClose}
    >
      <ul className="vlist">
        {VOLCANOES.map((v) => {
          const active = v.id === activeId
          return (
            <li key={v.id}>
              <button
                type="button"
                className={`vitem${active ? ' vitem--active' : ''}`}
                onClick={() => onSelect(v.id)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="vitem__body">
                  <span className="vitem__name">{v.name}</span>
                  <span className="vitem__region">{v.region}</span>
                </span>
                <span className="vitem__elev mono">
                  {formatNumber(v.elevationM)} m
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
