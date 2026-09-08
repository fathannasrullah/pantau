import { useCallback, useEffect, useRef, useState } from 'react'

export type ThemeId = 'terang' | 'gelap'
/** null = ikut setelan sistem, belum pernah dipilih sendiri. */
export type ThemeChoice = ThemeId | null

/** Harus sama dengan kunci di skrip pra-gambar di index.html. */
const KEY = 'pantau.tema'

/** Warna bilah status peramban, mengikuti warna cangkang app. */
const BAR: Record<ThemeId, string> = {
  gelap: '#0d1117',
  terang: '#f6f8fb',
}

function bacaPilihan(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'terang' || v === 'gelap' ? v : null
  } catch {
    // Mode penyamaran memblokir localStorage; app tetap harus jalan.
    return null
  }
}

function temaSistem(): ThemeId {
  if (typeof window === 'undefined' || !window.matchMedia) return 'gelap'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'terang'
    : 'gelap'
}

/**
 * Memasang tema ke DOM.
 *
 * Dipanggil langsung saat tema berubah, bukan hanya dari useEffect, karena
 * urutan efek React justru terbalik dari yang dibutuhkan di sini: efek anak
 * jalan lebih dulu daripada efek induknya, sehingga peta sempat membaca warna
 * token dari tema yang lama dan bentuk-bentuknya tidak ikut berganti.
 */
function terapkan(tema: ThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', tema)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR[tema])
}

export interface ThemeState {
  /** Tema yang sedang benar-benar tampil. */
  tema: ThemeId
  /** Pilihan tegas pengguna, null bila masih mengikuti sistem. */
  pilihan: ThemeChoice
  /** Bertukar antara terang dan gelap, dan menyimpannya sebagai pilihan. */
  toggle: () => void
  /** Melepas pilihan dan kembali mengikuti setelan sistem. */
  ikutSistem: () => void
}

/**
 * Tema tampilan.
 *
 * Bawaannya mengikuti setelan sistem — orang yang sudah menyetel ponselnya ke
 * mode terang tidak perlu menyetel ulang di sini. Begitu ia memilih sendiri,
 * pilihan itu yang dipakai dan disimpan, dan setelan sistem tidak lagi
 * menimpanya.
 *
 * Yang dipasang ke DOM selalu tema yang sudah diputuskan, bukan "ikut sistem",
 * supaya CSS cukup punya satu blok tema terang tanpa menduplikasinya di dalam
 * @media.
 */
export function useTheme(): ThemeState {
  const [pilihan, setPilihan] = useState<ThemeChoice>(bacaPilihan)
  const [sistem, setSistem] = useState<ThemeId>(temaSistem)
  const pilihanRef = useRef(pilihan)
  pilihanRef.current = pilihan

  // Selama belum memilih sendiri, mengubah setelan sistem ikut mengubah app.
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      const next: ThemeId = mq.matches ? 'terang' : 'gelap'
      if (pilihanRef.current === null) terapkan(next)
      setSistem(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const tema: ThemeId = pilihan ?? sistem

  // Penjaga: menyamakan DOM dengan keadaan React, misalnya pada gambar pertama
  // saat skrip di index.html tidak sempat jalan.
  useEffect(() => {
    terapkan(tema)
  }, [tema])

  const toggle = useCallback(() => {
    const next: ThemeId = tema === 'gelap' ? 'terang' : 'gelap'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Tidak bisa disimpan berarti pilihannya hanya berlaku sesi ini.
    }
    terapkan(next)
    setPilihan(next)
  }, [tema])

  const ikutSistem = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Sama seperti di atas: gagal menyimpan bukan alasan untuk gagal total.
    }
    const next = temaSistem()
    terapkan(next)
    setSistem(next)
    setPilihan(null)
  }, [])

  return { tema, pilihan, toggle, ikutSistem }
}
