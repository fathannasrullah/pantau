# Pantau Gunung Berapi — Anak Krakatau

Aplikasi web mobile-first untuk memantau status gunung berapi, dampak erupsi, dan
panduan tindakan. Dibangun dari prototipe desain di `project/Pantau Gunung v3.dc.html`.

Bisa dipasang lewat browser (PWA): ada manifest, ikon, dan service worker, sehingga
layar terakhir tetap terbuka saat sinyal hilang.

**Live demo: <https://fathannasrullah.github.io/pantau/>**

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build produksi ke dist/
npm run preview    # jalankan hasil build (service worker aktif di sini)
```

Service worker hanya aktif pada hasil build, jadi uji perilaku offline lewat
`npm run preview`, bukan `npm run dev`.

## Live demo di GitHub Pages

Setiap push ke `main` mem-build dan menerbitkan app lewat
`.github/workflows/deploy-pages.yml` ke
<https://fathannasrullah.github.io/pantau/>. Bisa juga dijalankan manual dari
tab Actions (`workflow_dispatch`).

Setelan sekali saja di GitHub:

1. Repositori harus **public** (Pages untuk repo private butuh paket berbayar).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Environments → `github-pages` → Deployment branches and tags**
   harus mengizinkan `main`. Aturan ini menyimpan nama branch secara eksplisit
   saat Pages pertama diaktifkan; kalau waktu itu default branch-nya lain,
   mengganti default branch belakangan tidak memperbaruinya, dan job `deploy`
   gagal dengan _"Branch main is not allowed to deploy to github-pages due to
   environment protection rules"_ meskipun job `build` sukses.

Karena Pages menyajikan project site di sub-path `/pantau/`, base Vite diisi
lewat `VITE_BASE` di CI (`actions/configure-pages` yang menghitungnya). Build
lokal tetap memakai `/`. Semua jalur aset, manifest, dan `navigateFallback`
service worker ikut base tersebut, jadi app tetap bisa dipasang dan dibuka
offline dari URL Pages.

## Sumber data

Sebagian layar sudah tersambung ke sumber publik, sebagian belum. Yang belum
ditandai **contoh** tepat di sebelah angkanya, bukan hanya di catatan kaki.

| Bagian | Sumber | Status |
| --- | --- | --- |
| Posisi pengguna & jarak ke kawah | Geolocation API perangkat | hidup |
| Arah abu & kecepatan angin | Open-Meteo | hidup |
| Tinggi gelombang Selat Sunda | Open-Meteo Marine | hidup |
| Grafik kegempaan per jam | USGS FDSN, radius 300 km | hidup |
| Feed gempa & potensi tsunami | BMKG (`data.bmkg.go.id`), disaring 500 km | hidup |
| **Level status, radius bahaya** | MAGMA Indonesia / PVMBG | **belum** |
| Kegempaan vulkanik, tinggi kolom abu | Pos pengamatan PVMBG | belum |
| Dampak wilayah, titik kumpul, transportasi | BPBD kabupaten | belum |

Dua hal yang dijaga ketat:

- **Level status tidak pernah diturunkan dari sumber lain.** Hanya PVMBG yang
  berhak menetapkannya, jadi selama belum tersambung kartu status memuat
  peringatan eksplisit bahwa levelnya belum resmi.
- **Feed BMKG disaring per jarak.** `autogempa.json` melaporkan gempa terbaru
  se-Indonesia; pada pengambilan pertama yang masuk adalah gempa Banggai,
  Sulawesi, 2.065 km dari Anak Krakatau. Hanya gempa dalam radius 500 km dan
  tujuh hari terakhir yang ditampilkan, lengkap dengan jaraknya di judul.
- **Gempa USGS bukan kegempaan vulkanik.** Itu gempa tektonik regional; label di
  layar menyebutkannya, karena letusan/embusan/tremor hanya terekam seismograf
  pos pengamatan.

### Kenapa lewat CI, bukan fetch dari browser

BMKG dan MAGMA tidak mengirim header CORS, jadi panggilan langsung dari halaman
statis akan diblokir browser. `scripts/fetch-sources.mjs` berjalan di runner
GitHub tiap 30 menit, menulis `public/data/live.json`, dan berkas itu ikut
ter-deploy. App membacanya sebagai berkas statis satu origin.

Efek sampingnya bagus: tiap sumber membawa stempel waktunya sendiri, sumber yang
gagal tetap ditulis apa adanya (`ok:false`) dan tampil merah di daftar "Sumber
data", dan umur data itulah yang menyalakan label LIVE / BASI / GAGAL — bukan
simulasi.

```bash
npm run fetch:data   # ambil sekali secara lokal (butuh akses internet)
npm test             # uji parser: satuan, bentuk data rusak, arah angin
```

Tiap kali berjalan di CI, script menuliskan hasilnya sebagai annotation pada run
Actions: status tiap sumber, nilai hasil parsing, dan 600 karakter pertama
respons mentah. Step yang hijau tidak membuktikan datanya masuk — sumber yang
gagal sengaja tidak menjatuhkan build — jadi annotation itulah tempat memeriksa
apakah sumbernya benar-benar menjawab.

Satu sumber gagal tidak menjatuhkan yang lain, dan tidak menjatuhkan build —
situs yang hilang lebih berbahaya daripada satu kartu yang kosong.

### Menyambungkan MAGMA Indonesia

Ini langkah berikutnya yang paling berdampak, dan butuh kredensial: endpoint
level status MAGMA tidak terbuka bebas. Perlu izin/kerja sama dengan Badan
Geologi, lalu tokennya disimpan sebagai repository secret dan dibaca
`scripts/fetch-sources.mjs` sebagai sumber tambahan. Sampai itu ada, jangan
mengisi level status dari sumber mana pun.

## Mode demo

Semua level status dan kondisi data bisa ditampilkan tanpa menunggu kejadian nyata:

```
/?demo=1                       panel demo muncul di atas navigasi bawah
/?demo=1&level=awas&data=failed
```

- `level`: `normal` · `waspada` · `siaga` (default) · `awas`
- `data`: `fresh` · `stale` · `failed` · `offline` (tanpa parameter = mengikuti kondisi asli)
- `transport=0`: sembunyikan bagian transportasi

Pilihan di panel ikut tertulis ke URL, jadi satu tautan bisa dibagikan untuk demo.

## Struktur

```
src/
  data/          sumber data — satu-satunya tempat yang perlu diganti saat menyambung API
    levels.ts            teks per level status (I–IV), radius, sejak kapan
    snapshot.ts          getSnapshot(): seluruh isi layar dalam satu objek bertipe
    dataState.ts         segar / basi / gagal / offline + salinan teks bannernya
    notificationRules.ts aturan peredaman notifikasi dan tag laporan warga
  hooks/
    useVolcanoFeed.ts    polling, umur data, deteksi offline, seismograf berjalan
    useGeolocation.ts    izin lokasi, watchPosition, dan tiap keadaan gagalnya
    useDemo.ts           override level/kondisi data lewat query string
  components/    tampilan; tidak ada angka yang ditulis langsung di sini
  theme.ts       warna per level status dan per kondisi data
  lib/format.ts  format waktu WIB, tanggal, durasi, dan angka Indonesia
  lib/geo.ts     jarak, arah, vonis zona, dan titik kumpul terdekat
```

## Prioritas informasi

Urutan layar Status mengikuti hasil analisis di `chats/chat1.md`:

1. Level status + apa artinya untuk pengguna, termasuk bahaya pesisir Selat Sunda
   (tsunami/gelombang) yang khas Anak Krakatau
2. Posisi pengguna terhadap radius bahaya + jalan ke titik kumpul terdekat
3. Hujan abu dan arah angin hari ini
4. Tiga tindakan praktis
5. Pengamatan, dampak per wilayah, transportasi
6. Detail kegempaan ada di tab terpisah, bukan di layar utama

Setiap angka membawa stempel waktu dan sumber. Saat data basi, gagal dimuat, atau
perangkat offline, bagian yang lama diredupkan dan diberi banner — angka lama tidak
pernah ditampilkan seolah baru.

## Sumber yang belum tersambung

Apa yang sudah hidup ada di bagian [Sumber data](#sumber-data). Sisanya:

| Data | Sumber | Kendala |
| --- | --- | --- |
| Level status, laporan pos pengamatan, VONA | Badan Geologi / PVMBG (MAGMA Indonesia) | endpoint tidak terbuka bebas, perlu izin |
| Advisory abu penerbangan | VAAC Darwin | terbit sebagai teks/HTML, bukan API |
| Kualitas udara | OpenAQ / sensor lokal | OpenAQ v3 menuntut API key |
| Titik kumpul, kapasitas posko, nomor darurat | BPBD kabupaten | umumnya manual, belum ada API |

Menambah sumber baru: tulis satu fungsi di `scripts/fetch-sources.mjs`, daftarkan
di `SOURCES`, lalu buat pembacanya di `src/data/live.ts` dan pakai di
`getSnapshot()`. Beri provenance `'live'` hanya untuk bagian yang benar-benar
berasal dari sumber itu.

Yang belum dikerjakan dan perlu diputuskan sebelum dipakai publik:

- **Titik kumpul masih perkiraan.** Jaraknya dihitung sungguhan dari GPS, tapi
  koordinat titik kumpulnya setingkat desa/kecamatan, bukan koordinat bangunan,
  dan belum berasal dari BPBD. Cukup untuk mengurutkan mana yang terdekat, tidak
  cukup untuk menuntun langkah.
- **Notifikasi belum dikirim.** Aturan peredaman sudah ada di UI dan datanya, tapi
  belum ada Push API maupun jalur SMS.
- **Laporan warga belum terkirim ke mana pun** dan alur verifikasi petugas belum dirancang.

Selama angkanya masih contoh, catatan kaki "Prototipe — data contoh" di setiap
halaman jangan dihapus.

## Catatan implementasi terhadap desain

Satu koreksi yang sengaja dibuat terhadap prototipe: pada peta skematik, gumpalan
abu digambar mengarah ke barat laut (kiri atas) agar sesuai dengan keterangannya —
di prototipe arahnya ke kanan atas.

## Berkas desain asal

`project/` berisi prototipe HTML dari Claude Design dan `chats/` berisi transkrip
percakapan desainnya. Keduanya rujukan, tidak ikut dibuild.
