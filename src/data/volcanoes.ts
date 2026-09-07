import type { VolcanoRef } from '../types'

/**
 * Tujuh gunung yang bisa dipilih.
 *
 * Koordinat, ketinggian, dan nomor gunung diambil dari katalog Holocene
 * Volcanoes Smithsonian (GVP), diverifikasi lewat `scripts/probe-sources.mjs` —
 * bukan dari ingatan. Angka-angka ini menentukan jarak pengguna ke kawah dan
 * titik pengambilan cuaca, jadi kesalahan di sini merambat ke semua layar.
 *
 * Catatan: prototipe desain menulis ketinggian Anak Krakatau 2.667 m. Katalog
 * mencatat 285 m; angka katalog yang dipakai.
 */
export const VOLCANOES: VolcanoRef[] = [
  {
    id: 'krakatau',
    name: 'Anak Krakatau',
    region: 'Selat Sunda · Lampung Selatan',
    lat: -6.1009,
    lon: 105.4233,
    elevationM: 285,
    gvpNumber: 262000,
    observatory: 'Pos Pengamatan Anak Krakatau, Pasauran',
    // Longsoran tubuh gunung ke laut pernah memicu tsunami Selat Sunda 2018.
    coastalHazard: true,
    strait: { lat: -6.0, lon: 105.55 },
  },
  {
    id: 'semeru',
    name: 'Semeru',
    region: 'Jawa Timur',
    lat: -8.108,
    lon: 112.922,
    elevationM: 3657,
    gvpNumber: 263300,
    observatory: null,
    coastalHazard: false,
    strait: null,
  },
  {
    id: 'lewotolok',
    name: 'Ili Lewotolok',
    region: 'Lembata · Nusa Tenggara Timur',
    lat: -8.274,
    lon: 123.508,
    elevationM: 1431,
    gvpNumber: 264230,
    observatory: null,
    coastalHazard: false,
    strait: null,
  },
  {
    id: 'lewotobi',
    name: 'Lewotobi Laki-laki',
    region: 'Flores Timur · Nusa Tenggara Timur',
    lat: -8.542,
    lon: 122.775,
    elevationM: 1703,
    // Katalog mencatatnya sebagai gunung kembar "Lewotobi"; angka ini mewakili
    // kompleksnya, bukan puncak Laki-laki saja.
    gvpNumber: 264180,
    observatory: null,
    coastalHazard: false,
    strait: null,
  },
  {
    id: 'ibu',
    name: 'Ibu',
    region: 'Halmahera Barat · Maluku Utara',
    lat: 1.4941,
    lon: 127.6324,
    elevationM: 1357,
    gvpNumber: 268030,
    observatory: null,
    coastalHazard: false,
    strait: null,
  },
  {
    id: 'dukono',
    name: 'Dukono',
    region: 'Halmahera Utara · Maluku Utara',
    lat: 1.6992,
    lon: 127.8783,
    elevationM: 1273,
    gvpNumber: 268010,
    observatory: null,
    coastalHazard: false,
    strait: null,
  },
  {
    id: 'sinabung',
    name: 'Sinabung',
    region: 'Karo · Sumatera Utara',
    lat: 3.17,
    lon: 98.392,
    elevationM: 2460,
    gvpNumber: 261080,
    observatory: null,
    coastalHazard: false,
    strait: null,
  },
]

export const DEFAULT_VOLCANO_ID = 'krakatau'

export function findVolcano(id: string | null | undefined): VolcanoRef {
  return (
    VOLCANOES.find((v) => v.id === id) ??
    VOLCANOES.find((v) => v.id === DEFAULT_VOLCANO_ID) ??
    VOLCANOES[0]
  )
}
