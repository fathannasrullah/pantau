# Pantau Gunung Berapi — Anak Krakatau

Aplikasi web mobile-first untuk memantau status gunung berapi, dampak erupsi, dan
panduan tindakan. Dibangun dari prototipe desain di `project/Pantau Gunung v3.dc.html`.

Bisa dipasang lewat browser (PWA): ada manifest, ikon, dan service worker, sehingga
layar terakhir tetap terbuka saat sinyal hilang.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build produksi ke dist/
npm run preview    # jalankan hasil build (service worker aktif di sini)
```

Service worker hanya aktif pada hasil build, jadi uji perilaku offline lewat
`npm run preview`, bukan `npm run dev`.

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
    useDemo.ts           override level/kondisi data lewat query string
  components/    tampilan; tidak ada angka yang ditulis langsung di sini
  theme.ts       warna per level status dan per kondisi data
  lib/format.ts  format waktu WIB, tanggal, durasi, dan angka Indonesia
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

## Menyambung data resmi

`src/data/snapshot.ts` adalah satu-satunya batas ke dunia luar. Ganti isi
`getSnapshot()` (dan jadikan async) tanpa menyentuh komponen. Sumber yang relevan:

| Data | Sumber |
| --- | --- |
| Level status, laporan pos pengamatan, VONA | Badan Geologi / PVMBG (MAGMA Indonesia) — satu-satunya sumber sah untuk level |
| Gempa, peringatan tsunami, cuaca dan angin | BMKG / InaTEWS |
| Advisory abu penerbangan | VAAC Darwin |
| Kualitas udara | OpenAQ / sensor lokal |
| Titik kumpul, kapasitas posko, nomor darurat | BPBD kabupaten (umumnya manual, belum ada API) |

Yang belum dikerjakan dan perlu diputuskan sebelum dipakai publik:

- **Lokasi masih data contoh.** Kartu "Posisi Anda" belum memakai Geolocation API;
  jaraknya diambil dari `snapshot.position`. Sengaja belum disambung supaya tidak
  ada campuran jarak asli dengan angka contoh.
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
