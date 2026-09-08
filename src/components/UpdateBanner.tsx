interface Props {
  onApply: () => void
}

/**
 * Kabar versi baru sengaja tidak memakai warna keadaan: ini urusan app, bukan
 * urusan gunung. Warna bahaya di layar ini harus tetap berarti bahaya.
 */
export function UpdateBanner({ onApply }: Props) {
  return (
    <div className="banner banner--app" role="status">
      <div className="banner__body">
        <div className="banner__title">Versi baru tersedia</div>
        <div className="banner__note">
          Sudah terunduh dan akan terpasang sendiri begitu Anda meninggalkan
          halaman ini.
        </div>
      </div>
      <button type="button" className="banner__retry" onClick={onApply}>
        Pakai sekarang
      </button>
    </div>
  )
}
