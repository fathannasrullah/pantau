import { formatNumber } from '../lib/format'
import type { VisitCount } from '../hooks/useVisitCount'

interface Props {
  visits: VisitCount
  showVisits: boolean
}

/**
 * Kaki halaman: satu tautan pembuat, tidak lebih.
 *
 * Sempat ada kalimat "bukan sumber resmi" di sini, tapi keterangan itu sudah
 * dibawa di tempat yang benar — kartu "Level resmi Indonesia" di layar Status,
 * daftar sumber di Panduan, dan catatan di tiap kartu yang angkanya turunan.
 * Di kaki halaman ia hanya jadi pengulangan yang terbaca sebagai penyangkalan
 * umum, jenis kalimat yang justru dilewati orang.
 *
 * Angka kunjungan hanya muncul dalam mode tersembunyi (`?stats=1`), dan tidak
 * pernah untuk pengunjung biasa.
 */
export function AppFooter({ visits, showVisits }: Props) {
  return (
    <footer className="foot">
      <a
        className="foot__link"
        href="https://www.instagram.com/nfathan/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram nfathan, terbuka di tab baru"
      >
        <svg
          className="foot__icon"
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        <span className="foot__name">nfathan</span>
      </a>

      {showVisits && visits.state !== 'off' && (
        <span className="foot__visits" title="Total kunjungan, tertunda sampai 4 jam">
          {visits.state === 'ok' && visits.total !== null
            ? `${formatNumber(visits.total)} kunjungan`
            : visits.state === 'loading'
              ? '…'
              : 'kunjungan tak terbaca'}
        </span>
      )}
    </footer>
  )
}
