/**
 * Kaki halaman. Satu tautan pembuat, dan satu kalimat yang harus terbaca di
 * setiap layar: app ini bukan penerbit status resmi.
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
          width="16"
          height="16"
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
      <p className="foot__note">
        Bukan sumber resmi. Level status gunung api ditetapkan Badan Geologi;
        perintah evakuasi datang dari BPBD.
      </p>
    </footer>
  )
}
