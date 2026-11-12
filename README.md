# EditIn // Fast, Private & 100% Offline PDF Editor & Document Studio

<div align="center">

![License](https://img.shields.io/badge/License-MIT-indigo.svg)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20Offline-emerald.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-violet.svg)

**Aplikasi Desktop Windows untuk Edit, Atur, Tanda Tangan, dan Amankan Dokumen PDF Tanpa Internet.**

*Tidak ada langganan bulanan. Tidak ada upload berkas ke cloud pihak ketiga. Data pribadi Anda 100% tetap di komputer Anda.*

</div>

---

## 💡 Mengapa Menggunakan EditIn?

Banyak web tool online (seperti iLovePDF atau SmallPDF) mewajibkan Anda mengunggah dokumen sensitif—seperti **KTP, CV, slip gaji, surat kontrak, atau berkas rahasia**—ke server internet pihak ketiga. Di sisi lain, software seperti Adobe Acrobat mewajibkan biaya langganan bulanan yang mahal.

**EditIn hadir sebagai solusinya**:
* 🛡️ **100% Offline & Privat**: Seluruh pemrosesan dilakukan langsung di RAM dan hard drive lokal Anda. Bebas risiko kebocoran data.
* ⚡ **Cepat & Ringan**: Ukuran aplikasi super ramping (~45 MB) tanpa beban binary tambahan.
* 🎨 **Desain Modern & Bersahabat**: Mengadopsi antarmuka khas *Ngoods Suite* dengan mode Gelap (*Obsidian Dark*) dan Terang (*Clean Light*).

---

## ✨ Fitur-Fitur Utama

### 1. ✏️ Edit Isi Dokumen (Ubah Teks, Foto & Tipex)
* **Pindai Teks (Bisa Diedit)**: Cukup satu klik, seluruh tulisan yang ada di dokumen Anda dapat langsung diklik dan diubah isinya (memperbaiki typo, mengganti nama, atau mengoreksi angka).
* **+ Tambah Teks Baru**: Klik di mana saja untuk menambahkan catatan, paragraf, atau tulisan tambahan.
* **Tipex / Tutup Teks (Whiteout)**: Tutup bagian atau tulisan yang tidak diinginkan dengan blok warna putih bersih.
* **+ Tempel Gambar & Logo**: Masukkan foto paspor, logo instansi, atau gambar cap ke dalam dokumen.

### 2. 📑 Susun & Putar Halaman
* **Grid Thumbnail Visual**: Lihat seluruh lembaran PDF Anda dalam bentuk kartu thumbnail yang jelas.
* **Putar Halaman (Rotate)**: Perbaiki hasil scan dokumen yang miring atau terbalik (putar 90° ke kiri atau ke kanan).
* **Geser Urutan (Reorder)**: Geser (*drag & drop*) posisi lembaran dokumen dengan mudah.
* **Hapus Halaman**: Hapus halaman kosong atau halaman yang tidak diperlukan dalam 1 klik.

### 3. 🧩 Gabung PDF (Merge)
* Satukan beberapa file PDF terpisah menjadi 1 dokumen rapi.
* Geser urutan prioritas file sebelum digabungkan.
* Menampilkan jumlah lembar dan ukuran masing-masing berkas.

### 4. ✂️ Pisah Halaman (Split & Extract)
* **Ekstrak Rentang**: Ambil halaman tertentu saja menggunakan format santai (contoh: `1-3, 5, 8`).
* **Pilihan Cepat**: Satu klik untuk mengambil hanya cover (halaman 1), halaman terakhir, atau halaman 2 ke akhir.
* **Pecah Tiap N Halaman**: Membagi dokumen tebal secara otomatis menjadi beberapa file kecil (misal: dokumen 20 lembar dipecah per 5 lembar).

### 5. ✍️ Tanda Tangan Digital & Cap Resmi
* **Kanvas Tanda Tangan Halus**: Goreskan tanda tangan langsung dengan mouse, touchpad, atau stylus touchscreen.
* **Pilihan Warna Tinta**: Tersedia tinta **Hitam**, **Biru Resmi**, dan **Merah**.
* **Upload Foto TTD**: Punya foto tanda tangan berlatar transparan? Langsung unggah dan tempelkan.
* **Preset Cap/Stempel Instan**: Tempel cap resmi siap pakai (*APPROVED, LUNAS, CONFIDENTIAL, DRAFT, SALINAN SAH, REJECTED*).

### 6. 🗜️ Kecilkan Ukuran PDF (Kompresi Lokal)
* **3 Opsi Kompresi Praktis**:
  1. **Maksimal Kompres (Ukuran Terkecil)**: Kompresi agresif agar dokumen PDF lolos batas upload ketat (< 1–2 MB).
  2. **Seimbang (Rekomendasi)**: Perpaduan ideal antara ukuran file PDF yang jauh lebih ringan dan ketajaman teks untuk portal/email.
  3. **Maksimal Kualitas**: Mempertahankan ketajaman visual tertinggi sembari membersihkan struktur dan beban gambar berlebih.
* Penamaan file otomatis menambahkan akhiran `_compressed.pdf`.

### 7. 🔒 Kunci Kata Sandi (Keamanan Dokumen 128-bit)
* Pasang kata sandi pembuka dengan enkripsi standar **128-bit RC4 PDF Security Handler**.
* Dokumen yang dikunci memerlukan kata sandi saat dibuka di aplikasi mana pun (Adobe Acrobat, Edge, Chrome) dan otomatis dinamai dengan akhiran `_locked.pdf`.

---

## 🚀 Panduan Menjalankan dari Source Code

### Prasyarat
* Sistem Operasi: **Windows 10 / 11 (64-bit)**
* [Node.js](https://nodejs.org/) (Versi 18 ke atas)

### Langkah Pemasangan:
1. **Clone repository ini**:
   ```bash
   git clone https://github.com/naufalt/editin.git
   cd editin
   ```

2. **Jalankan Aplikasi dalam Mode Pengembang (Development)**:
   ```powershell
   npm.cmd run dev
   ```
   *(Atau cukup klik dua kali file `start-dev.bat`)*

3. **Kompilasi / Build Aplikasi Desktop**:
   ```powershell
   npm.cmd run build
   ```

---

## 🔒 Privasi & Keamanan Data

EditIn dirancang dengan arsitektur **Zero-Network Policy**:
* **Tidak Ada Telemetri**: Aplikasi ini tidak mengumpulkan analitik atau data penggunaan Anda.
* **Tidak Ada Koneksi Internet**: Aplikasi tidak mengirim request data ke server mana pun di internet saat membuka, memproses, atau menyimpan dokumen.
* **Penyimpanan Lokal**: Seluruh file hasil editan langsung tersimpan di folder komputer pilihan Anda.

---

<div align="center">

Dikembangkan dengan dedikasi untuk kebebasan dan privasi dokumen oleh **Ngoods**.

</div>
