import type { ColorSet, DataStateId, LevelId, Severity } from './types'

export type { ColorSet }

/*
 * Warna di sini menunjuk ke token CSS, bukan ke nilai warna langsung.
 *
 * Alasannya tema terang. Hijau #4ade80 yang enak dibaca di atas latar gelap
 * hanya 1,7:1 di atas putih, dan kuning #facc15 jatuh ke 1,3:1 — di app
 * kebencanaan warna-warna itu membawa arti, jadi keduanya tidak boleh
 * dipakai apa adanya di dua tema. Dengan menunjuk token, nilai yang terpakai
 * ikut berganti saat tema berganti, tanpa satu pun komponen perlu tahu tema
 * apa yang sedang berlaku.
 *
 * Semua nilai ini akhirnya masuk ke properti CSS (color, atau custom property
 * yang dipakai CSS), jadi var() memang bisa dipakai di sini.
 */

export const SEVERITY_COLOR: Record<Severity, string> = {
  safe: 'var(--c-safe)',
  watch: 'var(--c-watch)',
  alert: 'var(--c-alert)',
  danger: 'var(--c-danger)',
  neutral: 'var(--c-neutral)',
}

/** Garis dan latar tipis seragam untuk semua warna keadaan. */
function set(token: string, linePct: number, washPct: number): ColorSet {
  return {
    color: `var(${token})`,
    line: `color-mix(in srgb, var(${token}) ${linePct}%, transparent)`,
    wash: `color-mix(in srgb, var(${token}) ${washPct}%, transparent)`,
  }
}

export const LEVEL_COLORS: Record<LevelId, ColorSet> = {
  normal: set('--c-safe', 30, 6),
  waspada: set('--c-watch', 30, 6),
  siaga: set('--c-alert', 32, 7),
  awas: set('--c-danger', 35, 8),
}

export const DATA_STATE_COLORS: Record<DataStateId, ColorSet> = {
  fresh: set('--c-safe', 35, 8),
  stale: set('--c-watch', 35, 8),
  failed: set('--c-danger', 35, 8),
  offline: set('--c-neutral', 30, 8),
}

/**
 * Seberapa jauh badan data yang tidak segar diredupkan.
 *
 * Dulu ada empat tingkat: 1 / 0,72 / 0,55 / 0,8. Dua hal salah dengannya.
 *
 * Pertama, tidak ada yang bisa membaca selisih 0,72 dan 0,55 sebagai
 * keterangan — tanpa pembanding berdampingan, pudar sekian persen tidak
 * memberi tahu apa pun. Yang benar-benar menyampaikan keadaan data adalah
 * banner di atas layar, label sumber, dan kata "gagal dimuat".
 *
 * Kedua, dan lebih serius: 0,55 menjatuhkan teksnya ke 2,67:1 di tema gelap,
 * jauh di bawah ambang WCAG AA. Persis salah sasaran — saat data gagal dimuat
 * justru keterangannya yang paling perlu terbaca, karena di situlah tertulis
 * angka mana yang tidak bisa dipercaya dan harus menghubungi siapa.
 *
 * Jadi tinggal dua keadaan: segar, dan tidak. Pudarnya cukup terasa sebagai
 * isyarat, dan bacaannya tetap lolos AA di kedua tema.
 */
export const DATA_STATE_DIM: Record<DataStateId, number> = {
  fresh: 1,
  stale: 0.9,
  failed: 0.9,
  offline: 0.9,
}
