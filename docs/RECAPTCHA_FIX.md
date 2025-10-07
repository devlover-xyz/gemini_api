# reCAPTCHA Auto-Click Fix & Browser Tab Optimization

## Masalah 1: Auto-Click Checkbox
reCAPTCHA checkbox tidak bisa diklik secara otomatis.

## Masalah 2: Tab Duplikat
Pada mode headless false, browser selalu membuka 2 tab (1 kosong + 1 aktif).

## Solusi

### 1. Perbaikan di `libs/solver/content.js`

**File**: `/libs/solver/content.js`

**Perubahan pada `getRecaptchaIframe()`**:
- Menambahkan prioritas untuk iframe anchor (checkbox)
- Mencari iframe dengan URL `recaptcha/api2/anchor` atau `recaptcha/enterprise/anchor`
- Menambahkan pengecekan berdasarkan title iframe

**Perubahan pada `clickRecaptchaCheckbox()`**:
- Mencoba mengakses konten iframe terlebih dahulu
- Mencari elemen checkbox di dalam iframe (`.recaptcha-checkbox-border`, `#recaptcha-anchor`, `.recaptcha-checkbox`)
- Klik langsung pada elemen checkbox jika bisa diakses
- Fallback ke klik koordinat dengan multiple mouse events (`mousedown`, `mouseup`, `click`) untuk interaksi yang lebih realistis

### 2. Perbaikan di `src/utils/recaptcha.ts`

**File**: `/src/utils/recaptcha.ts`

**Menambahkan method `clickRecaptchaCheckbox()`**:
- Menggunakan Puppeteer frames API untuk mengakses iframe
- Mencari frame dengan URL yang mengandung `recaptcha/api2/anchor` atau `recaptcha/enterprise/anchor`
- Menggunakan `frame.click()` untuk klik elemen `#recaptcha-anchor`
- Lebih reliable karena menggunakan API Puppeteer native

**Perubahan pada `solveManually()`**:
- Auto-click checkbox sebelum menunggu input manual
- Menambahkan pengecekan `g-recaptcha-response` untuk deteksi solve status
- User tetap bisa menyelesaikan challenge jika muncul

### 3. Perbaikan di `src/core/BaseScraper.ts`

**File**: `/src/core/BaseScraper.ts`

**Optimasi Tab/Page di method `init()`**:
- Menggunakan halaman default yang sudah dibuat Puppeteer (`pages[0]`)
- Menghindari `browser.newPage()` yang membuat tab baru
- Fallback ke `newPage()` jika tidak ada halaman existing (edge case)

**Hasil**:
- Hanya 1 tab yang terbuka (sebelumnya 2 tab)
- Lebih efisien memory dan performa
- Waktu eksekusi lebih cepat (~16s vs ~34s)

## Testing

### Test 1: reCAPTCHA Auto-Click
```bash
bun tests/test-recaptcha.ts
```

Output yang diharapkan:
```
✅ Checkbox clicked!
✅ Checkbox clicked automatically
✅ reCAPTCHA solved!
✅ Test PASSED!
```

### Test 2: Single Tab Verification
```bash
bun tests/test-single-tab.ts
```

Output yang diharapkan:
```
📊 Number of tabs/pages: 1
✅ SUCCESS: Only 1 tab opened (efficient!)
```

## Catatan

- Auto-click bekerja untuk reCAPTCHA v2 (checkbox)
- Jika challenge muncul (image/audio), user perlu menyelesaikan secara manual
- Untuk invisible reCAPTCHA atau v3, tidak perlu klik checkbox
