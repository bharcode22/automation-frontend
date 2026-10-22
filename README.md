# SSH Web Client (Frontend Service)

Frontend mandiri modern berbasis **React 19 + Vite + React Router DOM + Tailwind CSS + React Icons** yang mencakup **Terminal PTY Interaktif**, **Manajemen Kredensial Multi-Server SSH**, dan **Smart Media File Uploader via SFTP** yang otomatis mengarahkan berkas audio, video, dan gambar ke direktori remote POD yang sesuai.

---

## 🚀 Fitur Utama Frontend

1. **💻 Terminal PTY Interaktif (`/`)**:
   - Shell interaktif real-time berbasis `@xterm/xterm` & WebSocket PTY.
   - Dynamic viewport sizing (`@xterm/addon-fit`), full ANSI color support, tab completion, dan shortcut keyboard.
   - Status indikator koneksi real-time, tombol *Bersihkan*, *Sambungkan Ulang*, dan **Server Switcher** langsung di toolbar terminal.
2. **⚙️ Manajemen Kredensial SSH Multi-Server (`/config`)**:
   - Tampilan multi-kartu untuk melihat semua server di `backend/credential-ssh.json`.
   - Tombol **Jadikan Target Aktif** untuk menentukan server aktif default.
   - Tombol **Uji Koneksi SSH (Handshake)** untuk mengukur latensi (ms) dan diagnosa sistem server target.
   - Tombol **+ Tambah Server SSH Baru**, **Edit**, dan **Hapus**.
3. **☁️ Smart Media File Uploader via SFTP (`/upload`)**:
   - Drag & Drop berkas audio, video, dan gambar dengan deteksi kategori otomatis.
   - Alokasi otomatis:
     - 🎵 Audio ➔ `/home/pod/sounds`
     - 🎬 Video ➔ `/home/pod/videos`
     - 🖼️ Image ➔ `/home/pod/images`
   - Opsi upload ke POD aktif atau **Broadcast ke Semua POD Sekaligus**.
   - Indikator progres upload (0% – 100%) dan explorer berkas media remote.

---

## 🛠️ Panduan Menjalankan

### 1. Jalankan Backend:
```bash
cd /Users/bhar/Documents/automation/backend
npm run dev
# Server aktif di http://localhost:5050
```

### 2. Jalankan Frontend:
```bash
cd /Users/bhar/Documents/automation/frontend
npm run dev
```

Buka browser di:
👉 **`http://localhost:3000`**

---

## 📁 Struktur Direktori Frontend

```text
frontend/
├── package.json          # react-router-dom, tailwindcss, @tailwindcss/vite, react-icons
├── vite.config.js        # Konfigurasi Tailwind & dev proxy ke :5050
├── index.html
└── src/
    ├── main.jsx          # Entry point dengan BrowserRouter
    ├── App.jsx           # Routing (/ , /config , /upload)
    ├── index.css         # Tailwind v4 import & custom styling
    ├── components/
    │   └── Navbar.jsx    # Header navigasi NavLink, server selector & health badge
    ├── pages/
    │   ├── TerminalPage.jsx # Full interactive PTY terminal (@xterm/xterm)
    │   ├── ConfigPage.jsx   # Form manajemen backend/credential-ssh.json (Multi-server)
    │   └── UploadPage.jsx   # Smart Media File Uploader via SFTP
    └── services/
        ├── api.js        # HTTP client (upload, config, test, media list, health)
        └── socket.js     # Socket.io connection manager
```
# automation-frontend
