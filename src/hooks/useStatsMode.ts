import { useEffect, useState } from 'react'

/** Nama kunci harus sama dengan yang disebut di README. */
const KEY = 'pantau.stats'

function read(): boolean {
  const q = new URLSearchParams(window.location.search)
  const param = q.get('stats')
  if (param === '1' || param === '0') {
    const on = param === '1'
    try {
      on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY)
    } catch {
      // Peramban yang menolak penyimpanan tetap boleh memakai parameternya
      // sekali jalan; cuma tidak diingat.
    }
    return on
  }
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Mode angka kunjungan, dibuka sekali dengan `?stats=1` lalu diingat perangkat;
 * `?stats=0` mematikannya. Mengikuti pola `?demo=1` yang sudah ada.
 *
 * Ini persembunyian, bukan kerahasiaan: repo ini publik dan seluruh kodenya
 * bisa dibaca siapa saja, jadi parameternya bisa ditemukan orang lain. Yang
 * benar-benar terkunci adalah dasbor GoatCounter-nya, yang butuh login. Karena
 * itu yang ditampilkan di sini hanya satu angka total — bukan sesuatu yang
 * merugikan bila terlihat orang.
 */
export function useStatsMode(): boolean {
  const [on] = useState(read)

  useEffect(() => {
    // Parameternya dibuang dari alamat setelah dibaca, supaya tangkapan layar
    // atau tautan yang dibagikan tidak ikut membawanya.
    const q = new URLSearchParams(window.location.search)
    if (!q.has('stats')) return
    q.delete('stats')
    const search = q.toString()
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (search ? `?${search}` : ''),
    )
  }, [])

  return on
}
