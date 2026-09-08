/**
 * Kaki halaman: satu tautan pembuat, tidak lebih.
 *
 * Sempat ada kalimat "bukan sumber resmi" di sini, tapi keterangan itu sudah
 * dibawa di tempat yang benar — kartu "Level resmi Indonesia" di layar Status,
 * daftar sumber di Panduan, dan catatan di tiap kartu yang angkanya turunan.
 * Di kaki halaman ia hanya jadi pengulangan yang terbaca sebagai penyangkalan
 * umum, jenis kalimat yang justru dilewati orang.
 */
export function AppFooter() {
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
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
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
    </footer>
  )
}
