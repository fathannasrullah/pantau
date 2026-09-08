export type TabId = 'status' | 'wilayah' | 'udara' | 'laporan' | 'panduan'

interface NavItem {
  id: TabId
  label: string
}

/**
 * Lima bagian. Prototipe hanya memuat empat — tab Udara tidak ada di sana —
 * tapi bagian itu membawa peringatan abu SIGMET, profil angin per ketinggian,
 * rekap nasional, dan bandara terdekat, semuanya sudah tersambung ke sumbernya.
 * Menghapusnya berarti membuang integrasi yang sudah bekerja.
 */
const NAV: NavItem[] = [
  { id: 'status', label: 'Status' },
  { id: 'wilayah', label: 'Wilayah' },
  { id: 'udara', label: 'Udara' },
  { id: 'laporan', label: 'Laporan' },
  { id: 'panduan', label: 'Panduan' },
]

interface Props {
  tab: TabId
  onChange: (tab: TabId) => void
}

export function SheetNav({ tab, onChange }: Props) {
  return (
    <nav className="snav" aria-label="Bagian aplikasi">
      {NAV.map((item) => {
        const active = item.id === tab
        return (
          <button
            key={item.id}
            type="button"
            className={`snav__btn${active ? ' snav__btn--on' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
