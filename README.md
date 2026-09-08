# Pantau Gunung Berapi

Aplikasi web mobile-first untuk memantau status gunung berapi, dampak erupsi, dan
panduan tindakan. Dibangun dari prototipe desain di `project/Pantau Gunung v3.dc.html`.

Tujuh gunung bisa dipilih lewat judul di header: **Anak Krakatau, Semeru, Ili
Lewotolok, Lewotobi Laki-laki, Ibu, Dukono, dan Sinabung.** Pilihan tertulis ke
URL (`?gunung=semeru`) supaya bisa dibagikan, dan diingat di perangkat.

Bisa dipasang lewat browser (PWA): ada manifest, ikon, dan service worker, sehingga
layar terakhir tetap terbuka saat sinyal hilang. Tata letaknya menyesuaikan tiga
ukuran layar: satu kolom dengan navigasi bawah di ponsel, kolom lebih lega di
tablet, dan navigasi pindah ke sisi kiri di laptop.

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
| Gempa terkini di sekitar | USGS summary feed, **langsung dari browser** | hidup |
| Grafik kegempaan per jam | EMSC (utama) dengan USGS FDSN sebagai cadangan | hidup |
| Feed gempa & potensi tsunami | BMKG (`data.bmkg.go.id`), disaring 500 km | hidup |
| Erupsi terakhir tercatat | Smithsonian GVP (katalog, mingguan) | hidup |
| **Peringatan abu penerbangan** | NOAA Aviation Weather Center (SIGMET) | hidup |
| SO2 dan partikel di atas kawah | Copernicus CAMS via Open-Meteo (model) | hidup |
| Indeks AQI | dihitung dari PM2.5 CAMS dengan rumus US EPA | hidup |
| Peta dasar | petak raster OpenStreetMap dan OpenTopoMap lewat Leaflet | hidup |
| Bentuk area peringatan abu | poligon SIGMET apa adanya | hidup |
| Episentrum di peta | BMKG dan USGS, keduanya dengan koordinat aslinya | hidup |
| Angin per ketinggian terbang | Open-Meteo, lapisan tekanan 850–200 hPa | hidup |
| Bandara acuan di sekitar gunung | katalog terbuka OurAirports | hidup |
| Perkiraan penduduk per radius | WorldPop 2020 (model 100 m) | hidup |
| **Level status, radius bahaya, aviation colour code** | MAGMA Indonesia / PVMBG (VONA) | **butuh token** |
| Kegempaan vulkanik | Pos pengamatan PVMBG (lewat MAGMA) | butuh token |
| Dampak wilayah, titik kumpul, transportasi | BPBD kabupaten | **belum ada sumber** |
| Lalu lintas pesawat | OpenSky Network | CORS terkunci ke domainnya sendiri |
| NOTAM dan status operasional bandara | FAA / ICAO | perlu kredensial, tidak boleh diambil ulang |

Dua hal yang dijaga ketat:

- **Tidak ada angka atau laporan karangan di layar mana pun.** Versi awal memuat
  contoh yang terbaca seperti pengamatan sungguhan — "42 warga dievakuasi dari
  Pulau Sebesi", "Pelabuhan Bakauheni terbatas", kolom abu 1.200 m, nomor posko
  `0727 322xxx`. Semuanya dihapus. Bagian yang belum bersumber kini kosong
  dengan keterangan yang menyebut siapa pemilik datanya. Sifat ini dikunci lewat
  tes, termasuk larangan menyebut nama tempat tertentu di teks level status.
- **Level status tidak pernah diturunkan dari sumber lain.** Hanya PVMBG yang
  berhak menetapkannya, jadi selama belum tersambung kartu status memuat
  peringatan eksplisit bahwa levelnya belum resmi.
- **Feed BMKG disaring per jarak.** `autogempa.json` melaporkan gempa terbaru
  se-Indonesia; pada pengambilan pertama yang masuk adalah gempa Banggai,
  Sulawesi, 2.065 km dari Anak Krakatau. Hanya gempa dalam radius 500 km dan
  tujuh hari terakhir yang ditampilkan, lengkap dengan jaraknya di judul.
- **Kualitas udara adalah keluaran model, bukan pengukuran.** Angka SO2 dan PM10
  berasal dari model CAMS Copernicus, bukan stasiun di darat, dan kartunya
  menyebutkan itu. Ambang warnanya mengikuti pedoman WHO 2021 (SO2 40 µg/m³,
  PM10 45 µg/m³ rata-rata 24 jam).
- **Gempa EMSC dan USGS bukan kegempaan vulkanik.** Itu gempa tektonik regional; label di
  layar menyebutkannya, karena letusan/embusan/tremor hanya terekam seismograf
  pos pengamatan.

### Satu sumber yang justru tidak lewat CI

Summary feed USGS (`summary/2.5_day.geojson`) mengirim `Access-Control-Allow-Origin: *`,
jadi browser boleh memanggilnya sendiri. Itu satu-satunya bagian app yang benar-benar
mendekati waktu nyata — tidak menunggu siklus CI 30 menit. Diukur lewat probe:
32 KB, 13 ms, dan membawa medan yang tidak ada di endpoint `fdsnws/event/1/query`
yang dipakai untuk grafik: `alert` (level PAGER), `tsunami`, `felt`, dan `url` ke
halaman resmi tiap kejadian.

Cakupannya tipis untuk Indonesia — USGS mencatat kawasan ini sekitar M 4,5 ke
atas — jadi daftar ini pelengkap, bukan pengganti katalog EMSC yang lebih rapat.
Keterangan itu ikut tampil di layar saat daftarnya kosong.

### Kenapa sumber lain lewat CI, bukan fetch dari browser

BMKG dan MAGMA tidak mengirim header CORS, jadi panggilan langsung dari halaman
statis akan diblokir browser. `scripts/fetch-sources.mjs` berjalan di runner
GitHub tiap 30 menit, menulis `public/data/live.json`, dan berkas itu ikut
ter-deploy. App membacanya sebagai berkas statis satu origin.

Efek sampingnya bagus: tiap sumber membawa stempel waktunya sendiri, sumber yang
gagal tetap ditulis apa adanya (`ok:false`) dan tampil merah di daftar "Sumber
data", dan umur data itulah yang menyalakan label LIVE / BASI / GAGAL — bukan
simulasi.

Sumber diambil per gunung dan ditulis ke `public/data/live-<id>.json`, jadi app
hanya mengunduh gunung yang sedang dipantau. BMKG diambil sekali lalu disaring
per gunung.

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

Yang menghalangi bukan ketiadaan API, melainkan kredensial. Ini hasil pengujian
`scripts/probe-sources.mjs`, bukan dugaan:

| Endpoint | Jawaban |
| --- | --- |
| `/api/v1/magma-var` | `401 {"message":"Token not provided"}` |
| `/api/v1/vona` | `401 {"message":"Token not provided"}` |
| `/api/v1/home`, `/api/v1/laporan`, `/api/v1/gunung-api` | `404 { "message": "" }` — jalur tidak ada |
| `/v1/gunung-api/tingkat-aktivitas` | `200`, tapi HTML halaman web, bukan API |

Jadi endpoint level status dan VONA memang ada dan menunggu `Authorization`.
Setelah token dari Badan Geologi didapat, simpan sebagai repository secret
bernama `MAGMA_TOKEN`; sumber `magma` di `scripts/fetch-sources.mjs` sudah
membacanya. Tanpa token, sumber itu tercatat gagal dengan alasannya sehingga
tampil di daftar "Sumber data", bukan menghilang diam-diam.

Satu hal yang belum selesai: bentuk responsnya belum pernah terlihat, jadi
pemetaan field-nya sengaja belum ditulis. Pengambilan pertama dengan token akan
menerbitkan cuplikan responsnya sebagai annotation; pemetaan dikerjakan dari
situ. Sampai saat itu, jangan mengisi level status dari sumber mana pun.

Tidak ada header CORS di MAGMA, jadi meski token sudah ada, pemanggilannya tetap
harus lewat CI seperti sumber lain.

### SIGMET abu vulkanik: pernyataan resmi, bukan inferensi

`aviationweather.gov/api/data/isigmet` menyajikan SIGMET internasional dari NOAA
Aviation Weather Center. Diukur lewat probe: 127 peringatan aktif, **10 di
antaranya berkode bahaya `VA`** (abu vulkanik), lengkap dengan poligon sebaran,
ketinggian puncak awan abu, serta arah dan kecepatan geraknya.

Ini mengisi sebagian baris "tinggi kolom abu" yang selama ini kosong — dan dari
otoritas penerbangan, bukan dari perhitungan kita sendiri. Yang ditampilkan
adalah puncak awan abu **di atas permukaan laut** menurut SIGMET, bukan tinggi
kolom di atas puncak yang hanya diukur pos pengamatan PVMBG; keduanya berbeda dan
kartunya menyebutkan itu. Teks resmi SIGMET ikut ditampilkan apa adanya.

Dua hal yang menentukan benar-salahnya:

- **Kode bahayanya `VA`, bukan `ASH`.** Menyaring dengan `hazard === 'ASH'`
  mengembalikan nol hasil dari 127 peringatan.
- **Feed-nya global.** Contoh pertama yang terambil adalah SIGMET abu di Bogota,
  Kolombia. Tanpa penyaringan, peringatan itu akan muncul saat memantau
  Krakatau — persis masalah gempa Banggai yang sudah diperbaiki. Penyaringannya
  dua arah: jarak poligon ke kawah dalam 500 km, atau nama gunung tersebut di
  teks resminya.

Karena penyaringan jarak bisa ikut menangkap peringatan milik gunung tetangga di
FIR yang sama, tiap kartu menyebutkan apakah teks resminya benar-benar menyebut
gunung yang sedang dipantau. Bila tidak, kartunya bertanda "periksa teks — bisa
untuk gunung lain", dan teks SIGMET-nya ditampilkan lengkap supaya bisa dinilai
sendiri.

Tidak ada header CORS, jadi pengambilannya lewat CI seperti sumber lain.

### Sumber tingkat nasional yang diuji

| Calon | Hasil |
| --- | --- |
| **WorldPop** `services/stats` | `200`, terbuka, ber-CORS. Menghitung penduduk di dalam poligon — dipakai untuk perkiraan jiwa dalam radius 5, 10, dan 30 km |
| BMKG `api.bmkg.go.id/publik/prakiraan-cuaca` | endpoint ada (`404 Data not found` tanpa parameter), tapi butuh kode wilayah adm yang belum terverifikasi per gunung |
| BMKG `DigitalForecast-*.xml` | `200` tapi mengembalikan halaman 22 KB yang sama untuk dua provinsi berbeda — bukan XML-nya lagi |
| BMKG `lasttsunami.json` | `404` |
| `data.go.id` API CKAN | `404` |
| BNPB `Bencana_Harian/MapServer` | `499 Token Required` |
| USGS `volcanoApi/volcanoesGVP` | `200`, 1.470 gunung (129 Indonesia) — tapi **tidak ada medan status atau alert sama sekali**; ini direktori, bukan status |
| USGS `volcanoApi/elevatedVolcanoes` | `404 Resource not found in API` |
| OpenSky `states/all` tanpa kredensial | `200` — akses anonim ternyata masih jalan, tapi CORS-nya dibatasi ke domain sendiri |
| OpenAQ v3 `countries` | `401 Unauthorized` tanpa API key |

### Dampak wilayah dan titik kumpul: belum ada sumber sah

Diuji dan tidak menghasilkan data yang bisa dipertanggungjawabkan:

| Calon | Hasil |
| --- | --- |
| InaRISK `Arah_jalur_evakuasi` | `200`, tapi layernya bernama `arahJ`, `arahI`, `arahH` — simbol panah arah pada satu peta, bukan daftar titik kumpul bernama |
| BNPB `Bencana_Harian`, `Bencana_Mingguan`, `POI` | `200` tapi kosong, tanpa service |
| GDACS | melewati batas 25 detik pada dua percobaan terpisah |
| ReliefWeb v2 | `403`, butuh appname yang disetujui |

Karena itu dampak wilayah, transportasi, daftar desa terdekat, dan titik kumpul
dibiarkan kosong dengan keterangan. Satu-satunya nomor yang ditampilkan adalah
**112**, panggilan darurat nasional — nomor posko per kabupaten tidak dicantumkan
selama belum ada sumber resminya, karena nomor yang salah saat keadaan darurat
lebih buruk daripada tidak ada nomor.

### Yang sengaja tidak dipakai

- **VAAC Darwin (BOM Australia)** menjawab `403` dengan pesan tegas bahwa situs
  mereka tidak mendukung web scraping. Tinggi kolom abu untuk penerbangan
  karenanya tidak diambil dari sana.
- **RSS mingguan GVP** juga `403` karena proteksi bot; yang dipakai adalah
  layanan WFS mereka yang memang disediakan untuk diakses program.
- **GDACS** terbuka dan memuat Krakatau, tapi lambat (17 detik untuk daftar,
  dan endpoint rinciannya melewati batas 25 detik), jadi belum dipakai.

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
    volcanoes.ts         registri tujuh gunung; koordinat dari katalog Smithsonian
    regions.ts           isi khas wilayah per gunung — sengaja tidak boleh bocor antar gunung
    levels.ts            teks per level status (I–IV), radius, sejak kapan
    snapshot.ts          getSnapshot(): seluruh isi layar dalam satu objek bertipe
    dataState.ts         segar / basi / gagal / offline + salinan teks bannernya
    notificationRules.ts aturan peredaman notifikasi dan tag laporan warga
  hooks/
    useVolcanoFeed.ts    polling, umur data, deteksi offline, seismograf berjalan
    useGeolocation.ts    izin lokasi, watchPosition, dan tiap keadaan gagalnya
    useVolcanoSelection.ts  gunung terpilih, tertulis ke URL dan diingat perangkat
    useDemo.ts           override level/kondisi data lewat query string
    useTheme.ts          tema terang/gelap: bawaan ikut sistem, pilihan diingat
  components/    tampilan; tidak ada angka yang ditulis langsung di sini
  theme.ts       warna per tingkat bahaya dan per kondisi data, sebagai token
  data/aviation.ts  keadaan peringatan abu; warna aksen seluruh layar
  data/aqi.ts       AQI dari PM2.5 dengan tabel breakpoint US EPA
  lib/format.ts  format waktu WIB, tanggal, durasi, dan angka Indonesia
  lib/geo.ts     jarak, arah, vonis zona, dan titik kumpul terdekat
```

## Prioritas informasi

Urutan layar Status mengikuti prototipe v4:

1. Peringatan abu untuk penerbangan — satu-satunya penilaian bahaya di app ini
   yang benar-benar datang dari otoritas resmi (SIGMET), sekaligus warna aksen
   seluruh layar
2. Kartu kewenangan: level resmi Indonesia belum tersambung, dan siapa yang
   berhak menetapkannya
3. Posisi pengguna terhadap kawah + jalan ke titik kumpul terdekat
4. Kualitas udara (AQI) di sekitar kawah
5. Abu vulkanik dan arah angin
6. Gempa terkini dan grafik kegempaan per jam
7. Tiga tindakan praktis

Petanya bukan salah satu tab, melainkan **latar seluruh app**. Isi lain duduk
di lembar geser yang bisa ditarik ke tiga posisi — rendah untuk melihat peta,
setengah untuk membaca sambil melihat, penuh untuk membaca saja. Di layar
laptop lembar itu berubah jadi panel kiri dan peta memakai sisa ruangnya.

Lima bagian di dalam lembar: **Status**, **Wilayah** (wilayah terdekat,
penduduk, penyeberangan, dampak), **Udara** (peringatan abu, angin per
ketinggian, bandara), **Laporan** (feed resmi), **Panduan** (tindakan, nomor
penting, dan daftar sumber). Prototipe hanya memuat empat — tab Udara tidak ada
di sana — tapi bagian itu membawa integrasi yang sudah bekerja, jadi
dipertahankan.

Peta menerima ukuran antarmuka yang mengapung di atasnya (kepala halaman,
banner, lembar geser) supaya `fitBounds` tidak menaruh bentuk di balik apa pun.

Peta memakai Leaflet dengan dua petak dasar terbuka — OpenStreetMap (jalan) dan
OpenTopoMap (relief; bentuk lereng menentukan ke mana aliran turun) — dan
**hanya menggambar geometri sungguhan**:

| Bentuk | Sumbernya |
| --- | --- |
| Kawah | koordinat katalog Smithsonian GVP |
| Cincin ungu 5/10/30 km | radius perkiraan penduduk WorldPop, jumlahnya di popup |
| Area berarsir | poligon SIGMET apa adanya dari otoritas penerbangan |
| Garis putus-putus oranye | arah angin permukaan terukur, panjang = jarak tempuh satu jam |
| Titik biru / kuning | episentrum BMKG dan USGS, besar titik mengikuti magnitudo |
| Titik hijau + garis | posisi GPS pengguna dan jaraknya ke kawah |

Poligon abu ilustratif dan enam penanda desa yang ditulis tangan di prototipe
tidak dipakai — bentuk karangan di peta lebih menyesatkan daripada angka
karangan, karena peta terbaca sebagai hasil pengukuran. Lingkaran radius diberi
label **pembanding**, bukan zona terlarang, karena zona resmi hanya ditetapkan
Badan Geologi.

Setiap bentuk bisa diketuk untuk melihat sumbernya, ada skala metrik dan
keterangan warna yang hanya memuat lapisan yang sedang tergambar, dan pandangan
peta menyesuaikan diri agar seluruh bentuk lapisan itu muat. Petak yang pernah
dilihat disimpan service worker dua minggu supaya peta tetap terbaca saat sinyal
hilang; kalau petak gagal dimuat, petanya mengatakan itu alih-alih menyisakan
layar kosong.

Kata besar di kartu utama sengaja **bukan** GREEN/YELLOW/ORANGE/RED. Aviation
colour code adalah pernyataan resmi observatorium gunung api; menuliskannya dari
hasil turunan sendiri akan membuat tebakan terlihat resmi. Yang ditampilkan
adalah ada tidaknya peringatan abu di jalur terbang, dan itu dikunci lewat uji
di `src/data/aviation.test.ts`.

Setiap angka membawa stempel waktu dan sumber. Saat data basi, gagal dimuat, atau
perangkat offline, bagian yang lama diredupkan dan diberi banner — angka lama tidak
pernah ditampilkan seolah baru.

## Notifikasi

Notifikasi memakai Notification API peramban lewat service worker — tanpa server
push. Batas itu ditulis apa adanya di layar: pemberitahuan hanya terbit selama
halaman berjalan (terbuka di tab, atau app terpasang dan masih hidup di latar),
dan app tidak bisa membangunkan perangkat yang sedang mati.

Yang memicu pemberitahuan adalah **perpindahan keadaan**, bukan keadaan itu
sendiri, dan keputusannya ada di `src/data/alerts.ts` supaya bisa diuji tanpa
peramban:

| Aturan | Terbit saat |
| --- | --- |
| Peringatan abu penerbangan | keadaan SIGMET berpindah, misal tidak ada → aktif |
| Kualitas udara | kategori AQI **memburuk** (yang membaik tidak mengganggu) |
| Gempa baru | ada gempa BMKG yang lebih baru daripada yang terakhir dikabarkan |

Tiga hal yang dijaga: kunjungan pertama tidak menerbitkan apa pun (tanpa
pembanding semua terlihat seperti perubahan), keadaan yang sama tidak
diberitahukan dua kali, dan "sumber gagal dibaca" bukan kabar. Ingatannya
disimpan per gunung di `localStorage`, jadi berpindah gunung tidak memicu banjir
kabar. Mode demo tidak pernah mengirim apa pun.

Aturan `evac` sengaja terkunci mati: app ini tidak menerima perintah evakuasi
dari BPBD, dan saklarnya tidak boleh terlihat menyala seolah kabarnya akan
datang. Versi awal bahkan menjanjikan pengiriman lewat SMS — janji yang tidak
punya saluran apa pun di belakangnya, dan sudah dihapus.

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

## Tema terang dan gelap

Bawaannya mengikuti setelan sistem; tombol di kepala halaman menukarnya, dan
pilihan itu diingat serta menang atas setelan sistem sesudahnya.

Seluruh warna app lewat token CSS — tidak ada nilai warna yang ditulis langsung
di aturan CSS mana pun, dan `theme.ts` maupun `data/aviation.ts` menunjuk token,
bukan kode warna. Warna keparahan tidak bisa dipakai ulang di dua tema: hijau
`#4ade80` yang enak dibaca di atas latar gelap hanya 1,7:1 di atas putih, dan
kuning `#facc15` jatuh ke 1,3:1. Di app kebencanaan warna itu membawa arti, jadi
tema terang punya deretnya sendiri.

Kedua tema diaudit rasio kontrasnya di peramban: 324 potong teks per tema di
lima tab dan lembar pemilih gunung, semuanya lolos ambang WCAG AA.

## Catatan implementasi terhadap desain

Satu koreksi yang sengaja dibuat terhadap prototipe: pada peta skematik, gumpalan
abu digambar mengarah ke barat laut (kiri atas) agar sesuai dengan keterangannya —
di prototipe arahnya ke kanan atas.

## Berkas desain asal

`project/` berisi prototipe HTML dari Claude Design dan `chats/` berisi transkrip
percakapan desainnya. Keduanya rujukan, tidak ikut dibuild.
