# Aplikasi Pemantau Gunung Berapi

_Started 2026-09-06 17:05 UTC_

---

## User

Design a web app dengan pendekatan mobile first untuk pantau secara real time status gunung berapi, dampak erupsi dan informasi penting lainnya. Tujuan untuk memberikan informasi terupdate ke user dan berdampak positif. Contoh real case saat ini di Indonesia sedang terjadi erupsi gunung anak Krakatau

## Assistant



## Assistant



## Assistant



## Assistant

_[tool: ask_user]_

Form-nya kembali tanpa jawaban, jadi arah visualnya belum ada. Satu putaran singkat soal tampilan saja — sisanya (audiens, fitur, data, skenario Anak Krakatau) saya putuskan sendiri.

_[tool: ask_user]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

## User

Answered — vibe: Layanan publik — jelas, ramah, mudah dipahami orang awam; palette: #0d1117; density: Sedang

## Assistant

Arah "layanan publik" berarti bahasa dan hierarki yang lebih ramah — saya buat versi 2 dengan bahasa awam dan judul non-teknis, dasar #0d1117 tetap gelap.

_[tool: copy_files]_

_[tool: run_script]_

_[tool: ready_for_verification]_

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

Kontras teks kecil dinaikkan dan judul di kartu status kini seragam dengan heading lain.

Versi 2 memakai bahasa awam ("Artinya untuk Anda" per level status) di atas dasar gelap #0d1117; versi pertama yang lebih padat-data tetap ada di `Pantau Gunung.dc.html`. Tweaks: level status (Normal→Awas), mode padat, tampilkan transportasi. Semua angka masih data contoh — kalau ada sumber data resmi yang mau disambung, sebut saja.

## User

coba analisa informasi di aplikasi menurut mu prioritas informasi ter urgent sampe terendah gmn? Apakah informasi di aplikasi memberi dampak positif? Jika semuanya sudah teranalisa dengan baik dan tepat. Apakah selanjutnya bisa diintegrasikan dengan data informasi yang valid?

## Assistant

## Prioritas informasi (paling urgent → terendah)

**Tier 1 — keputusan hidup/mati, harus terlihat tanpa scroll**
1. Level status + waktu perubahannya
2. Perintah tindakan: evakuasi / jangan mendekat / aman
3. Radius bahaya + apakah *lokasi saya* di dalamnya
4. Potensi tsunami/gelombang untuk pesisir Selat Sunda — ini kekhususan Anak Krakatau, bukan sekadar abu

**Tier 2 — keputusan hari ini**
5. Titik kumpul terdekat + rute + nomor darurat
6. Hujan abu: sedang turun di mana, arah angin
7. Tindakan praktis (masker, tutup tandon, air minum)

**Tier 3 — konteks & kepercayaan**
8. Feed resmi/VONA, tinggi kolom abu
9. Dampak per wilayah, status transportasi

**Tier 4 — untuk yang ingin dalam**
10. Kegempaan per jam, jenis gempa, deformasi

Di app sekarang urutannya cukup dekat, dengan tiga koreksi yang saya sarankan:
- **Tsunami/gelombang tinggi masih di Tier 3** (baris "Anyer–Carita" di daftar dampak). Untuk Krakatau, itu bahaya nomor dua setelah status — pantas naik ke kartu status.
- **"Apakah saya di zona bahaya?" belum ada.** Radius 5 km hanya angka; belum menjawab pertanyaan pertama pengguna. Perlu satu baris berbasis lokasi: "Lokasi Anda 38 km dari kawah — di luar zona terlarang."
- **Titik kumpul terkubur di tab Panduan.** Saat status Awas, seharusnya muncul sebagai tombol di layar utama.

## Apakah berdampak positif?

Ya pada tiga hal: menerjemahkan level PVMBG jadi tindakan ("Artinya untuk Anda"), memisahkan info resmi dari isu, dan panduan hujan abu yang jarang tersedia ringkas.

Tiga hal yang justru bisa berdampak negatif kalau dibiarkan:
- **Angka contoh yang terlihat asli.** Disclaimer ada di footer, terlalu jauh. Sebelum data nyata masuk, tandanya harus di header.
- **Notifikasi tanpa peredaman.** Kalau status naik-turun, alert beruntun membuat orang berhenti membaca. Perlu aturan: hanya kirim saat level berubah atau evakuasi diperintahkan.
- **Laporan warga tanpa verifikasi jelas.** Sudah ada label "menunggu verifikasi", tapi alur siapa yang memverifikasi belum dirancang. Ini sumber hoaks kalau salah.

## Integrasi data valid — bisa, dan ini urutannya

Sumber yang relevan:
- **Badan Geologi / PVMBG (MAGMA Indonesia)** — level status, laporan pos pengamatan, VONA. Satu-satunya sumber sah untuk level. Perlu izin/kerja sama; tidak semua endpoint terbuka publik.
- **BMKG / InaTEWS** — gempa, peringatan tsunami, cuaca & angin.
- **VAAC Darwin** — advisory abu untuk penerbangan.
- **OpenAQ / sensor lokal** — kualitas udara.
- **BPBD kabupaten** — titik kumpul, kapasitas posko, nomor darurat (biasanya manual, belum ada API).

Yang perlu disiapkan di sisi desain sebelum menyambung:
- Setiap angka butuh **stempel waktu + sumber** (sudah sebagian), plus **state saat data gagal dimuat** — jangan tampilkan angka lama seolah baru.
- **Aturan siapa yang berhak** menyatakan level: hanya PVMBG. Data lain diberi label jelas agar tidak tercampur.
- **Mode offline/hemat data**, karena sinyal di KRB sering buruk.

Kalau setuju, langkah berikutnya saya kerjakan salah satu: (a) susun ulang layar utama sesuai prioritas di atas + kartu "posisi saya", atau (b) rancang state data (segar / basi / gagal / offline) dan aturan notifikasi. Mana dulu?

## User

Oke lanjutkan ke poin A kemudian poin B

## Assistant

Poin A dan B saya gabung ke versi 3.

_[tool: dc_write]_

_[tool: ready_for_verification]_

