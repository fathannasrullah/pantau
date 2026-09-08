# Pantau Gunung Berapi

Aplikasi web untuk memantau status gunung berapi Indonesia: peringatan abu
penerbangan, gempa di sekitar, kualitas udara, arah angin, dan jarak Anda
sendiri ke kawah — semuanya dari sumber resmi yang bisa ditelusuri.

**Demo: <https://gunungfire.github.io/>**

Tujuh gunung: Anak Krakatau, Semeru, Ili Lewotolok, Lewotobi Laki-laki, Ibu,
Dukono, Sinabung. Pilihan tertulis ke URL (`?gunung=semeru`) supaya bisa
dibagikan, dan diingat di perangkat.

Aturan yang memandu seluruh keputusan di repo ini: **tidak ada satu angka pun
yang dikarang.** Bagian yang belum punya sumber dibiarkan kosong dengan
keterangan siapa pemiliknya. Di aplikasi kebencanaan, angka palsu yang terlihat
meyakinkan lebih berbahaya daripada layar kosong.

---

## Tech stack

| Lapisan | Pilihan | Alasannya |
| --- | --- | --- |
| Bahasa | TypeScript 5.9, mode ketat | `tsc --noEmit` jadi gerbang di `npm run build`; build gagal sebelum tipe yang salah sempat terbit |
| UI | React 19.2 | tanpa pustaka state — seluruh keadaan app muat di `useState` dan beberapa hook sendiri |
| Build | Vite 8.2 + `@vitejs/plugin-react` | |
| PWA | `vite-plugin-pwa` 1.3 (Workbox, `generateSW`) | manifest, ikon, service worker, dan cache petak peta |
| Peta | Leaflet 1.9.4 sebagai dependensi npm | bukan dari CDN: app harus tetap terpasang dan terbuka saat jaringan mati |
| Petak peta | OpenStreetMap (jalan) dan OpenTopoMap (relief) | keduanya terbuka; relief dipakai karena bentuk lereng menentukan ke mana aliran dan lahar turun |
| Gaya | CSS tulis tangan, satu berkas, 57 token (34 di antaranya ditimpa tema terang) | tanpa Tailwind, tanpa CSS-in-JS. Tema terang/gelap butuh satu daftar nama warna, bukan kelas yang tersebar |
| Huruf | IBM Plex Sans dan Mono | |
| Tes | `node --test` bawaan Node 22 dengan `--experimental-strip-types` | tanpa Jest maupun Vitest; TypeScript dijalankan apa adanya |
| Pengambilan data | skrip Node di GitHub Actions | lihat [Kenapa data diambil di CI](#kenapa-data-diambil-di-ci) |
| Deploy | GitHub Actions → GitHub Pages | statis penuh, tanpa server |

Tidak ada backend, tidak ada basis data, tidak ada kunci API di sisi klien.

Ukuran: 62 berkas TypeScript (~8.200 baris) dan satu berkas CSS (~3.700 baris).
Bundel terbit 134 KB JavaScript dan 14 KB CSS setelah gzip.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build ke dist/
npm run preview    # jalankan hasil build — service worker hanya aktif di sini
npm test           # 79 tes
npm run fetch:data # ambil sumber resmi sekali secara lokal
```

---

## Cara kerjanya

### Kenapa data diambil di CI

Sebagian besar sumber resmi tidak mengirim header CORS, jadi halaman statis tidak
boleh memanggilnya langsung. `scripts/fetch-sources.mjs` berjalan di runner
GitHub tiap 30 menit, menulis `public/data/live-<id-gunung>.json`, dan berkas itu
ikut ter-deploy. App membacanya sebagai berkas statis satu origin.

Efek sampingnya justru bagus:

- Tiap sumber membawa stempel waktunya sendiri.
- Sumber yang gagal tetap ditulis apa adanya (`ok:false`) dan tampil merah di
  daftar "Sumber data" — tidak menghilang diam-diam.
- Umur data itulah yang menyalakan label LIVE / BASI / GAGAL, bukan simulasi.
- Satu sumber gagal tidak menjatuhkan yang lain, dan tidak menjatuhkan build.
  Situs yang hilang lebih berbahaya daripada satu kartu yang kosong.

Tiap kali berjalan, skrip menuliskan hasilnya sebagai annotation pada run
Actions: status tiap sumber, nilai hasil parsing, dan 600 karakter pertama
respons mentah. Step hijau tidak membuktikan datanya masuk — annotation itulah
tempat memeriksanya.

Satu pengecualian: summary feed USGS mengirim `Access-Control-Allow-Origin: *`,
jadi dipanggil langsung dari peramban. Itu satu-satunya bagian yang tidak
menunggu siklus 30 menit.

### Antarmuka

Peta bukan salah satu tab, melainkan **latar seluruh app**. Isi lain duduk di
lembar geser dengan tiga posisi: rendah untuk melihat peta, setengah untuk
membaca sambil melihat, penuh untuk membaca saja. Di laptop lembar itu jadi
panel kiri dan peta memakai sisa ruangnya.

Lima bagian di dalam lembar: **Status**, **Wilayah**, **Udara**, **Laporan**,
**Panduan**.

Peta hanya menggambar geometri sungguhan:

| Bentuk | Sumbernya |
| --- | --- |
| Kawah | koordinat katalog Smithsonian GVP |
| Cincin 5/10/30 km | radius perkiraan penduduk WorldPop, jumlahnya di popup |
| Area berarsir | poligon SIGMET apa adanya dari otoritas penerbangan |
| Garis putus-putus | arah angin permukaan terukur, panjang = jarak tempuh satu jam |
| Titik biru / kuning | episentrum BMKG dan USGS, besarnya mengikuti magnitudo |
| Titik hijau + garis | posisi GPS Anda dan jaraknya ke kawah |

Lingkaran radius diberi label **pembanding**, bukan zona terlarang — zona resmi
hanya ditetapkan Badan Geologi. Setiap bentuk bisa diketuk untuk melihat
sumbernya. Petak yang pernah dilihat disimpan service worker dua minggu supaya
peta tetap terbaca saat sinyal hilang.

### Tema terang dan gelap

Bawaannya mengikuti setelan sistem; tombol di kepala halaman menukarnya, dan
pilihan itu diingat serta menang atas setelan sistem sesudahnya. Temanya dipasang
sebelum gambar pertama, jadi tidak ada kedipan.

Seluruh warna lewat token CSS — tidak ada nilai warna yang ditulis langsung di
aturan CSS mana pun. Warna keparahan tidak bisa dipakai ulang di dua tema: hijau
`#4ade80` yang jelas di atas latar gelap hanya 1,7:1 di atas putih, dan kuning
`#facc15` jatuh ke 1,3:1. Warna itu membawa arti di sini, jadi tema terang punya
deretnya sendiri. Kedua tema diaudit di peramban: 324 potong teks per tema,
semuanya lolos WCAG AA.

### Notifikasi

Notification API peramban lewat service worker, **tanpa server push**. Batas itu
ditulis apa adanya di layar: pemberitahuan hanya terbit selama halaman berjalan.

Yang memicu adalah **perpindahan keadaan**, bukan keadaan itu sendiri;
keputusannya di `src/data/alerts.ts` supaya bisa diuji tanpa peramban.

| Aturan | Terbit saat |
| --- | --- |
| Peringatan abu penerbangan | keadaan SIGMET berpindah, misal tidak ada → aktif |
| Kualitas udara | kategori AQI **memburuk** (yang membaik tidak mengganggu) |
| Gempa baru | ada gempa BMKG lebih baru daripada yang terakhir dikabarkan |

Kunjungan pertama tidak menerbitkan apa pun, keadaan yang sama tidak
diberitahukan dua kali, dan "sumber gagal dibaca" bukan kabar. Aturan evakuasi
sengaja terkunci mati: app ini tidak menerima perintah evakuasi dari BPBD.

### Mengikuti deploy terbaru

Deploy berjalan tiap 30 menit, dan app ini dibuat untuk dibiarkan terbuka —
dua sifat yang bertabrakan. Service worker dulu hanya didaftarkan sekali saat
halaman dibuka, jadi tab yang sudah terbuka tidak pernah tahu ada versi baru
dan tetap memegang JS serta CSS lama sampai seseorang memuat ulang sendiri.

Sekarang halaman menanyakan versi baru tiap lima menit, setiap kali kembali
dilihat, dan setiap kali jaringan tersambung lagi — tapi tidak saat tab
terkubur di latar, karena tak ada gunanya membangunkan radio ponsel untuk layar
yang tidak dilihat. Kapan versinya dipasang diputuskan `src/data/appUpdate.ts`:

| Keadaan halaman | Yang terjadi |
| --- | --- |
| Sedang dibaca | banner netral menawarkan, isinya tidak ditarik paksa |
| Ditinggalkan | dipasang saat itu juga, orangnya kembali ke versi terbaru |

Pemuatan ulangnya dikerjakan sendiri, bukan diserahkan ke plugin: bawaannya
menunggu `event.isUpdate` dari workbox, dan tanda itu bernilai salah pada
halaman yang baru memasang service worker di kunjungan yang sama — terukur di
peramban, versi barunya aktif sementara layar masih memakai berkas lama.

Karena itu `registerType` di `vite.config.ts` adalah `prompt`, bukan
`autoUpdate`, dengan `clientsClaim` dinyalakan kembali secara eksplisit supaya
kemampuan offline tetap menyala sejak kunjungan pertama.

Angka di layar tidak menunggu semua itu: snapshot diambil ulang tiap lima menit
dan langsung disegarkan begitu layar kembali dilihat.

---

## Sumber data

### Sudah hidup

| Bagian | Sumber |
| --- | --- |
| Posisi Anda & jarak ke kawah | Geolocation API perangkat |
| **Peringatan abu penerbangan** | NOAA Aviation Weather Center (SIGMET) |
| Arah abu & kecepatan angin | Open-Meteo |
| Angin per ketinggian terbang | Open-Meteo, lapisan tekanan 850–200 hPa |
| Tinggi gelombang Selat Sunda | Open-Meteo Marine |
| Gempa terkini di sekitar | USGS summary feed, langsung dari peramban |
| Grafik kegempaan per jam | EMSC, dengan USGS FDSN sebagai cadangan |
| Feed gempa & potensi tsunami | BMKG `data.bmkg.go.id`, disaring 500 km |
| Erupsi terakhir tercatat | Smithsonian GVP (katalog mingguan) |
| SO2 dan partikel di atas kawah | Copernicus CAMS via Open-Meteo (model) |
| Indeks AQI | dihitung dari PM2.5 CAMS, rumus US EPA |
| Perkiraan penduduk per radius | WorldPop 2020 (model 100 m) |
| Bandara acuan di sekitar gunung | katalog terbuka OurAirports |
| Peta dasar | OpenStreetMap dan OpenTopoMap lewat Leaflet |

### Belum tersambung

| Data | Sumber | Kendala |
| --- | --- | --- |
| **Level status, radius bahaya, VONA** | MAGMA Indonesia / PVMBG | butuh token dari Badan Geologi |
| Kegempaan vulkanik | Pos pengamatan PVMBG | idem |
| Dampak wilayah, titik kumpul, transportasi | BPBD kabupaten | belum ada API |
| Lalu lintas pesawat | OpenSky Network | CORS terkunci ke domainnya sendiri |
| NOTAM & status bandara | FAA / ICAO | perlu kredensial |

### Yang dijaga ketat

- **Level status tidak pernah diturunkan dari sumber lain.** Hanya PVMBG yang
  berhak menetapkannya. Selama belum tersambung, kartunya memuat peringatan
  eksplisit bahwa levelnya belum resmi.
- **Kata besar di kartu utama bukan GREEN/YELLOW/ORANGE/RED.** Aviation colour
  code adalah pernyataan resmi observatorium; menuliskannya dari turunan sendiri
  membuat tebakan terlihat resmi. Dikunci lewat `src/data/aviation.test.ts`.
- **Feed BMKG disaring per jarak.** `autogempa.json` melaporkan gempa se-Indonesia;
  pengambilan pertama menghasilkan gempa Banggai, 2.065 km dari Anak Krakatau.
  Hanya radius 500 km dan tujuh hari terakhir yang tampil, dengan jaraknya
  tertulis.
- **SIGMET disaring dua arah.** Feed-nya global — contoh pertama yang terambil
  adalah abu di Bogota. Penyaringannya: poligon dalam 500 km, atau nama gunung
  disebut di teks resminya. Kalau teksnya tidak menyebut gunung yang dipantau,
  kartunya bertanda "periksa teks — bisa untuk gunung lain".
- **Kualitas udara adalah keluaran model, bukan pengukuran.** Angka SO2 dan PM10
  dari model CAMS, bukan stasiun darat, dan kartunya menyebutkan itu. Ambang
  warnanya mengikuti WHO 2021.
- **Gempa EMSC dan USGS bukan kegempaan vulkanik.** Itu tektonik regional; label
  di layar menyebutkannya.
- **Satu-satunya nomor yang ditampilkan adalah 112.** Nomor posko per kabupaten
  tidak dicantumkan selama belum ada sumber resminya — nomor yang salah saat
  darurat lebih buruk daripada tidak ada nomor.

### Catatan pengujian sumber

Semua di bawah ini hasil `scripts/probe-sources.mjs`, bukan dugaan.

- **MAGMA** `/api/v1/magma-var` dan `/api/v1/vona` menjawab
  `401 {"message":"Token not provided"}` — endpointnya ada dan menunggu
  `Authorization`. Simpan token sebagai repository secret `MAGMA_TOKEN`; sumber
  `magma` di `fetch-sources.mjs` sudah membacanya. Bentuk responsnya belum pernah
  terlihat, jadi pemetaan field-nya sengaja belum ditulis — pengambilan pertama
  dengan token akan menerbitkan cuplikannya sebagai annotation.
- **SIGMET: kode bahayanya `VA`, bukan `ASH`.** Menyaring dengan `hazard === 'ASH'`
  mengembalikan nol hasil dari 127 peringatan aktif.
- **USGS `volcanoApi/volcanoesGVP`** mengembalikan 1.470 gunung tapi **tanpa medan
  status atau alert sama sekali** — itu direktori, bukan status.
- **VAAC Darwin** menjawab `403` dengan pesan tegas menolak scraping.
- **InaRISK `Arah_jalur_evakuasi`** berisi layer `arahJ`, `arahI`, `arahH` — simbol
  panah pada peta, bukan daftar titik kumpul bernama.
- **BNPB** `Bencana_Harian` `499 Token Required`; **OpenAQ v3** `401`;
  **ReliefWeb v2** `403`; **GDACS** melewati batas 25 detik.

Menambah sumber baru: tulis satu fungsi di `scripts/fetch-sources.mjs`, daftarkan
di `SOURCES`, buat pembacanya di `src/data/live.ts`, lalu pakai di
`getSnapshot()`. Beri provenance `'live'` hanya untuk bagian yang benar-benar
berasal dari sumber itu.

---

## Struktur

```
src/
  data/          satu-satunya tempat yang perlu diganti saat menyambung API
    volcanoes.ts         registri tujuh gunung; koordinat dari Smithsonian
    regions.ts           isi khas wilayah per gunung, tidak boleh bocor antar gunung
    levels.ts            teks per level status (I–IV), radius, sejak kapan
    snapshot.ts          getSnapshot(): seluruh isi layar dalam satu objek
    dataState.ts         segar / basi / gagal / offline + salinan teks bannernya
    live.ts              parser berkas snapshot dari CI
    aviation.ts          keadaan peringatan abu; warna aksen seluruh layar
    aqi.ts               AQI dari PM2.5, tabel breakpoint US EPA
    alerts.ts            aturan kapan notifikasi terbit
  hooks/
    useVolcanoFeed.ts    polling, umur data, deteksi offline
    useGeolocation.ts    izin lokasi, watchPosition, tiap keadaan gagalnya
    useVolcanoSelection.ts  gunung terpilih, tertulis ke URL
    useTheme.ts          tema terang/gelap, bawaan ikut sistem
    useDemo.ts           override level/kondisi data lewat query string
  components/    tampilan; tidak ada angka yang ditulis langsung di sini
  lib/geo.ts     jarak, arah, vonis zona, titik kumpul terdekat
  lib/format.ts  waktu WIB, tanggal, durasi, angka Indonesia
  theme.ts       warna per tingkat bahaya dan kondisi data, sebagai token
scripts/
  fetch-sources.mjs  pengambil sumber resmi, jalan di CI
  probe-sources.mjs  alat ukur endpoint kandidat
```

---

## Mode demo

Semua level status dan kondisi data bisa ditampilkan tanpa menunggu kejadian:

```
/?demo=1
/?demo=1&level=awas&data=failed
```

- `level`: `normal` · `waspada` · `siaga` (bawaan) · `awas`
- `data`: `fresh` · `stale` · `failed` · `offline` (kosong = kondisi asli)
- `transport=0`: sembunyikan bagian transportasi

Pilihan ikut tertulis ke URL, jadi satu tautan bisa dibagikan. Mode demo tidak
pernah mengirim notifikasi.

---

## Deploy

Setiap push ke `main` — dan tiap 30 menit lewat cron — mem-build dan menerbitkan
app lewat `.github/workflows/deploy-pages.yml`. Bisa juga dijalankan manual dari
tab Actions.

Setelan sekali saja di GitHub:

1. Repositori harus **public** (Pages untuk repo private butuh paket berbayar).
2. **Settings → Pages → Source: GitHub Actions.**
3. **Settings → Environments → `github-pages` → Deployment branches** harus
   mengizinkan `main`. Aturan ini menyimpan nama branch saat Pages pertama
   diaktifkan; mengganti default branch belakangan tidak memperbaruinya, dan job
   `deploy` gagal dengan _"Branch main is not allowed to deploy to github-pages"_
   meskipun `build` sukses.

Base Vite diisi dari `actions/configure-pages`: kosong untuk user site seperti
`gunungfire.github.io`, `/nama-repo/` untuk project site. Semua jalur aset,
manifest, dan `navigateFallback` service worker ikut base tersebut.

---

## Yang belum selesai

- **Titik kumpul masih perkiraan.** Jaraknya dihitung sungguhan dari GPS, tapi
  koordinatnya setingkat desa, bukan bangunan, dan belum dari BPBD. Cukup untuk
  mengurutkan mana yang terdekat, tidak cukup untuk menuntun langkah.
- **Laporan warga belum terkirim ke mana pun**, dan alur verifikasi petugas belum
  dirancang.
- **Notifikasi belum punya Push API**, jadi tidak sampai ke perangkat yang mati.

`project/` berisi prototipe HTML dari Claude Design dan `chats/` transkrip
percakapan desainnya. Keduanya rujukan, tidak ikut dibuild.
