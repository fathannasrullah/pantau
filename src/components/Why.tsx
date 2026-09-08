import type { ReactNode } from 'react'

interface Props {
  /** Pertanyaan yang dijawab, ditulis sebagai pertanyaan pembaca. */
  label?: string
  children: ReactNode
}

/**
 * Catatan panjang yang dilipat.
 *
 * Setiap angka di app ini membawa batasannya — dari model, bukan pengukuran;
 * perkiraan, bukan sensus; dihitung app, bukan pernyataan otoritas. Semua itu
 * harus tetap ada. Tapi bila semuanya tercetak sekaligus, angkanya tenggelam
 * dan tidak ada yang terbaca sama sekali.
 *
 * Jadi catatannya tidak dihapus, hanya dilipat: satu ketukan, tanpa JavaScript,
 * dan tetap terbaca pembaca layar karena ini elemen <details> biasa.
 */
export function Why({ label = 'Kenapa angkanya begini?', children }: Props) {
  return (
    <details className="why">
      <summary className="why__q">{label}</summary>
      <div className="why__a">{children}</div>
    </details>
  )
}
