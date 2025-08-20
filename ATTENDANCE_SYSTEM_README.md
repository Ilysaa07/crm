# Sistem Manajemen Kehadiran dan Cuti Karyawan Terintegrasi

## Deskripsi Sistem

Sistem ini adalah modul komprehensif yang menggabungkan fitur pencatatan kehadiran (absensi) dan pengajuan cuti dalam satu alur kerja yang mulus. Sistem mendukung mode kerja hibrida (WFH/WFO) dengan mekanisme validasi yang kuat, serta mudah dikelola oleh admin.

## Fitur Utama

### 1. Modul Kehadiran (Absensi)

#### Clock-in & Clock-out
- Karyawan dapat melakukan absensi masuk dan pulang
- Validasi otomatis untuk mencegah double check-in
- Tracking waktu check-in dan check-out yang akurat

#### Pemilihan Mode Kerja
- **Work From Office (WFO)**: Mode kerja di kantor
- **Work From Home (WFH)**: Mode kerja dari rumah
- Validasi mode kerja berdasarkan konfigurasi admin

#### Validasi Kehadiran WFO
- Sistem melakukan validasi otomatis menggunakan Geofencing
- Clock-in/out hanya bisa dilakukan jika koordinat GPS karyawan berada dalam radius yang ditentukan
- Konfigurasi lokasi kantor dan radius geofence yang fleksibel

#### Validasi Kehadiran WFH
- Logging GPS otomatis untuk transparansi lokasi
- Bukti Kerja (Proof of Work): Karyawan wajib mengunggah screenshot layar yang menunjukkan tugas yang sedang dikerjakan
- Validasi file upload (format dan ukuran)

#### Riwayat & Laporan Kehadiran
- Karyawan dapat melihat riwayat absensinya sendiri
- Admin dapat melihat, memfilter, dan mengekspor data kehadiran semua karyawan
- Statistik kehadiran dengan breakdown berdasarkan status dan mode kerja

### 2. Modul Cuti

#### Pengajuan Cuti
- Form pengajuan cuti yang lengkap (jenis cuti, tanggal mulai & selesai, alasan)
- Validasi tanggal dan alasan cuti
- Tracking status pengajuan

#### Alur Persetujuan
- Permohonan cuti masuk ke Admin/HR untuk disetujui atau ditolak
- Notifikasi real-time untuk status perubahan
- Riwayat keputusan dengan timestamp

#### Informasi Saldo Cuti
- Karyawan dapat melihat sisa saldo cuti tahunan
- Tracking penggunaan cuti berdasarkan jenis

#### Kalender Tim
- Menampilkan jadwal cuti karyawan dalam satu tim/departemen
- Memudahkan koordinasi dan perencanaan

### 3. Pengaturan Admin

#### Manajemen Lokasi Kantor
- Admin dapat menambah atau mengubah lokasi kantor
- Input koordinat Lintang (Latitude) dan Bujur (Longitude)
- Pengaturan radius geofence yang fleksibel

#### Manajemen Karyawan
- Mengelola data master karyawan
- Pengaturan role dan permission

#### Konfigurasi Kebijakan
- Jam kerja standar (jam mulai dan selesai)
- Pengaturan geofencing (aktif/nonaktif, wajib/opsional)
- Konfigurasi WFH (diizinkan/tidak, wajib bukti kerja)

## Arsitektur Teknis

### Database Schema

#### Model Attendance
```prisma
model Attendance {
  id                String            @id @default(cuid())
  userId            String
  checkInAt         DateTime?
  checkOutAt        DateTime?
  workMode          WorkMode          @default(WFO)
  method            AttendanceMethod
  ipAddress         String?
  
  // GPS coordinates for check-in
  latitudeIn        Float?
  longitudeIn       Float?
  
  // GPS coordinates for check-out
  latitudeOut       Float?
  longitudeOut      Float?
  
  // Proof of work for WFH
  proofOfWorkUrl    String?
  proofOfWorkName   String?
  
  status            AttendanceStatus
  notes             String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Model AttendanceConfig
```prisma
model AttendanceConfig {
  id               String   @id @default(cuid())
  workStartHour    Int      @default(9)
  workEndHour      Int      @default(17)
  
  // Office location coordinates
  officeLat        Float?
  officeLng        Float?
  radiusMeters     Int      @default(200)
  
  // Geofencing settings
  useGeofence      Boolean  @default(false)
  enforceGeofence  Boolean  @default(false)
  
  // WFH settings
  requireProofOfWork Boolean @default(true)
  allowWFH          Boolean  @default(true)
}
```

### API Endpoints

#### Attendance Management
- `POST /api/attendance/check-in` - Check-in dengan validasi mode kerja
- `POST /api/attendance/check-out` - Check-out dengan validasi lokasi
- `POST /api/attendance/upload-proof` - Upload bukti kerja untuk WFH
- `GET /api/attendance/history` - Riwayat kehadiran dengan filter
- `GET /api/attendance/export` - Export data kehadiran ke CSV

#### Admin Configuration
- `GET /api/admin/attendance-config` - Ambil konfigurasi kehadiran
- `POST /api/admin/attendance-config` - Update konfigurasi kehadiran

### Utility Functions

#### Geofencing
- `calculateDistance()` - Menghitung jarak antara dua koordinat menggunakan formula Haversine
- `isWithinGeofence()` - Validasi apakah koordinat berada dalam radius geofence
- `validateWorkMode()` - Validasi mode kerja berdasarkan lokasi dan konfigurasi

#### Time Management
- `isWithinWorkingHours()` - Validasi jam kerja
- `formatTime()` - Format waktu ke format Indonesia
- `formatDate()` - Format tanggal ke format Indonesia

#### File Validation
- `validateImageFile()` - Validasi file gambar untuk proof of work

## Implementasi Frontend

### Halaman Karyawan

#### Attendance Page (`/employee/attendance`)
- Pemilihan mode kerja (WFO/WFH)
- Check-in dan check-out dengan validasi
- Upload bukti kerja untuk mode WFH
- Tampilan status kehadiran saat ini
- Peta lokasi kantor dengan radius geofence

#### Attendance History (`/employee/attendance/history`)
- Riwayat kehadiran pribadi
- Filter berdasarkan tanggal, mode kerja, dan status
- Statistik kehadiran
- Export data ke CSV

### Halaman Admin

#### Attendance Configuration (`/admin/attendance`)
- Konfigurasi jam kerja
- Pengaturan lokasi kantor dan geofencing
- Konfigurasi mode WFH
- Preview peta lokasi

#### Attendance History (`/admin/attendance/history`)
- Riwayat kehadiran semua karyawan
- Filter dan pencarian advanced
- Statistik kehadiran per karyawan
- Export data untuk reporting

## Fitur Keamanan

### Validasi Lokasi
- Geofencing dengan radius yang dapat dikonfigurasi
- Validasi koordinat GPS menggunakan formula Haversine
- Enforcement geofencing yang dapat diaktifkan/nonaktifkan

### Validasi File
- Restriksi format file (JPEG, PNG, WebP)
- Batasan ukuran file (maksimal 5MB)
- Validasi file sebelum upload

### Role-based Access Control
- Karyawan hanya dapat melihat data kehadiran sendiri
- Admin dapat melihat dan mengelola semua data
- Validasi session untuk setiap request

## Konfigurasi Sistem

### Environment Variables
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/database"

# Working Hours (default)
WORK_START_HOUR=9
WORK_END_HOUR=17
```

### Default Configuration
- Jam kerja: 09:00 - 17:00
- Radius geofence: 200 meter
- Geofencing: nonaktif (opsional)
- Mode WFH: diizinkan
- Bukti kerja: wajib untuk WFH

## Cara Penggunaan

### Untuk Karyawan

1. **Check-in**
   - Pilih mode kerja (WFO/WFH)
   - Sistem akan memvalidasi lokasi berdasarkan mode yang dipilih
   - Untuk WFO: validasi geofencing (jika diaktifkan)
   - Untuk WFH: lokasi akan dicatat untuk transparansi

2. **Check-out**
   - Sistem akan memvalidasi lokasi
   - Untuk WFH: wajib upload bukti kerja (jika diaktifkan)
   - Sistem akan menghitung jam kerja dan status kehadiran

3. **Lihat Riwayat**
   - Akses halaman riwayat kehadiran
   - Filter berdasarkan tanggal, mode kerja, dan status
   - Export data untuk keperluan pribadi

### Untuk Admin

1. **Konfigurasi Sistem**
   - Set jam kerja standar
   - Konfigurasi lokasi kantor dan radius geofence
   - Aktifkan/nonaktifkan fitur geofencing
   - Konfigurasi mode WFH dan bukti kerja

2. **Monitoring Kehadiran**
   - Lihat riwayat kehadiran semua karyawan
   - Filter dan analisis data kehadiran
   - Export data untuk reporting dan analisis

3. **Validasi dan Approval**
   - Review bukti kerja karyawan WFH
   - Validasi kehadiran berdasarkan lokasi
   - Monitoring compliance dengan kebijakan perusahaan

## Troubleshooting

### Masalah Umum

1. **GPS tidak terdeteksi**
   - Pastikan browser mengizinkan akses lokasi
   - Refresh halaman dan coba lagi
   - Gunakan mode IP address sebagai alternatif

2. **Upload bukti kerja gagal**
   - Pastikan format file sesuai (JPEG, PNG, WebP)
   - Ukuran file maksimal 5MB
   - Refresh halaman dan coba lagi

3. **Validasi geofencing gagal**
   - Periksa konfigurasi lokasi kantor
   - Pastikan radius geofence sudah diset
   - Gunakan mode WFH jika berada di luar area kantor

### Log dan Monitoring

- Semua aktivitas kehadiran dicatat dengan timestamp
- Log error tersimpan untuk troubleshooting
- Real-time notification untuk admin
- Export data untuk analisis dan audit

## Pengembangan Selanjutnya

### Fitur yang Direncanakan
1. **Mobile App** - Aplikasi mobile untuk check-in/out
2. **Biometric Integration** - Integrasi dengan sistem fingerprint
3. **Advanced Analytics** - Dashboard analitik kehadiran
4. **Leave Management** - Sistem pengajuan dan approval cuti
5. **Team Calendar** - Kalender tim untuk koordinasi cuti
6. **Notification System** - Notifikasi real-time untuk reminder dan approval

### Integrasi
1. **HRIS System** - Integrasi dengan sistem HR yang ada
2. **Payroll System** - Integrasi dengan sistem penggajian
3. **Project Management** - Tracking kehadiran berdasarkan project
4. **Reporting Tools** - Integrasi dengan tools reporting eksternal

## Kesimpulan

Sistem Manajemen Kehadiran dan Cuti Karyawan ini memberikan solusi komprehensif untuk mengelola kehadiran karyawan dengan fitur hibrida WFH/WFO. Dengan validasi geofencing yang kuat, tracking lokasi yang transparan, dan manajemen admin yang fleksibel, sistem ini dapat membantu perusahaan mengoptimalkan produktivitas karyawan sambil memastikan compliance dengan kebijakan perusahaan.

Sistem ini dirancang dengan arsitektur yang scalable dan dapat dikembangkan lebih lanjut sesuai kebutuhan bisnis yang berkembang.
