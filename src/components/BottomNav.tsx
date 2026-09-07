export type TabId = 'status' | 'peta' | 'udara' | 'laporan' | 'panduan'

interface NavItem {
  id: TabId
  label: string
  /** Each tab carries a distinct silhouette so it stays recognisable without icons. */
  radius: string
}

const NAV: NavItem[] = [
  { id: 'status', label: 'Status', radius: '50%' },
  { id: 'peta', label: 'Peta', radius: '3px' },
  { id: 'udara', label: 'Udara', radius: '2px 9px 2px 9px' },
  { id: 'laporan', label: 'Laporan', radius: '9px 2px 9px 2px' },
  { id: 'panduan', label: 'Panduan', radius: '50% 50% 4px 4px' },
]

interface Props {
  tab: TabId
  onChange: (tab: TabId) => void
}

export function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="bottomnav" aria-label="Bagian aplikasi">
      {NAV.map((item) => {
        const active = item.id === tab
        return (
          <button
            key={item.id}
            type="button"
            className={`navbtn${active ? ' navbtn--on' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <span
              className="navbtn__icon"
              style={{ borderRadius: item.radius }}
              aria-hidden="true"
            />
            <span className="navbtn__label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
