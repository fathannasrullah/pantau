/**
 * Penanda bahwa satu angka belum tersambung ke sumber resmi.
 *
 * Sengaja ditempel di sebelah angkanya, bukan dikumpulkan di catatan kaki:
 * pembaca yang panik hanya melihat angkanya.
 */
export function SampleTag({ title }: { title?: string }) {
  return (
    <span
      className="samptag"
      title={title ?? 'Belum tersambung ke sumber resmi — angka contoh'}
    >
      contoh
    </span>
  )
}
