// @ts-nocheck

let dalam = (s) => s;
export function pasangDalamRust(fn) {
  dalam = fn;
}

function dalamTanpaTitik(e) {
  const t = dalam(e);
  if (t !== e) return t;
  const u = dalam(`${e}.`);
  return u === `${e}.` ? e : u.replace(/\.$/, "");
}

const MASALAH = String.raw`(disconnected(?: \(.+?\))?|closed unexpectedly|stopped responding|can't sign in: .+?)`;
function masalah(m) {
  let x;
  if ((x = /^disconnected \((.+)\)$/.exec(m))) return `terputus (${x[1]})`;
  if (m === "disconnected") return "terputus";
  if (m === "closed unexpectedly") return "tertutup tiba-tiba";
  if (m === "stopped responding") return "berhenti merespons";
  if ((x = /^can't sign in: (.+)$/.exec(m))) return `tidak bisa masuk: ${dalam(x[1])}`;
  return m;
}
const rej = (ekor) => new RegExp(`^(.+?) ${MASALAH}\\. ${ekor}$`);

const ALASAN_BATAL = {
  "it was launched again meanwhile": "akun itu sudah diluncurkan lagi sementara itu",
  "the player left the game": "pemain keluar dari game",
  "it reconnected by itself": "kliennya tersambung lagi sendiri",
  "it is responding again": "kliennya merespons lagi",
  "it is running again": "kliennya berjalan lagi",
};

function bagianHemat(b) {
  let x;
  if ((x = /^RAM limit was not applied \(error (.+?)(, privilege unavailable)?\)$/.exec(b)))
    return `batas RAM tidak diterapkan (galat ${x[1]}${x[2] ? ", hak akses tidak tersedia" : ""})`;
  if ((x = /^not applied: (.+)$/.exec(b))) {
    const isi = x[1].split(", ").map((y) => {
      const t = dalam(y);
      return t === y ? null : t;
    });
    return isi.every((y) => y != null) ? `tidak diterapkan: ${isi.join(", ")}` : null;
  }
  return null;
}
function peringatanHemat(w) {
  const bagian = w.split("; ").map(bagianHemat);
  return bagian.every((b) => b != null) ? bagian.join("; ") : null;
}

export const KAMUS_RUST = {
  "The client stopped responding and was closed. The end of its log shows what it was doing.":
    "Klien berhenti merespons dan ditutup. Akhir log-nya menunjukkan apa yang sedang dikerjakannya.",
  "The client itself crashed (see the crash dump / Windows' record).": "Kliennya sendiri crash (lihat crash dump / catatan Windows).",
  "It ended before writing a log, with no crash recorded: it didn't start properly (antivirus, a damaged Roblox install or its version).":
    "Klien berakhir sebelum menulis log, tanpa catatan crash: tidak mulai dengan benar (antivirus, instalasi Roblox yang rusak, atau versinya).",
  "It ended early by itself with no crash recorded: something closed it, or it closed itself (an update or the anti-cheat).":
    "Klien berakhir sendiri lebih awal tanpa catatan crash: ada yang menutupnya, atau ia menutup dirinya sendiri (update atau anti-cheat).",
  "It ended with no crash recorded: closed by hand, by another program or by itself.":
    "Klien berakhir tanpa catatan crash: ditutup manual, oleh program lain, atau oleh dirinya sendiri.",
  "Roblox returned an unexpected address for the 3D avatar.": "Roblox memberikan alamat yang tidak terduga untuk avatar 3D.",
  "Roblox sent an unreadable 3D avatar description.": "Roblox mengirim deskripsi avatar 3D yang tidak terbaca.",
  "The 3D avatar description has no size.": "Deskripsi avatar 3D tidak punya ukuran.",
  "The 3D avatar has no model file.": "Avatar 3D tidak punya berkas model.",
  "The 3D avatar has no material file.": "Avatar 3D tidak punya berkas material.",
  "The 3D avatar model is not text.": "Model avatar 3D bukan teks.",
  "Roblox is still preparing this 3D avatar. Try again in a minute.": "Roblox masih menyiapkan avatar 3D ini. Coba lagi semenit lagi.",
  "A 3D avatar file is larger than expected.": "Sebuah berkas avatar 3D lebih besar dari perkiraan.",
  "This isn't a Chudai Account Manager backup (.cambak), or the file is damaged.": "Ini bukan cadangan Chudai Account Manager (.cambak), atau berkasnya rusak.",
  "Wrong password, or the backup file was changed.": "Sandi salah, atau berkas cadangan telah diubah.",
  "Could not encode the backup.": "Cadangan tidak bisa dikodekan.",
  "Could not encrypt the backup.": "Cadangan tidak bisa dienkripsi.",
  "This isn't a Chudai folder profile (.camprofile), or the file is damaged.": "Ini bukan profil folder Chudai (.camprofile), atau berkasnya rusak.",
  "This profile was made by a newer version of Chudai Account Manager. Update the app first.":
    "Profil ini dibuat oleh versi Chudai Account Manager yang lebih baru. Perbarui aplikasinya dulu.",
  "There are no accounts to back up.": "Tidak ada akun untuk dicadangkan.",
  "Ctrl+Alt+End is already used by another program, so the emergency hotkey couldn't be turned on.":
    "Ctrl+Alt+End sudah dipakai program lain, jadi hotkey darurat tidak bisa dinyalakan.",
  "The emergency hotkey isn't available.": "Hotkey darurat tidak tersedia.",
  "The emergency hotkey didn't answer.": "Hotkey darurat tidak menjawab.",
  "Discord didn't answer in time": "Discord tidak menjawab tepat waktu",
  "Discord refused the webhook (it was deleted or the URL is wrong)": "Discord menolak webhook (sudah dihapus atau URL-nya salah)",
  "Discord kept asking to slow down": "Discord terus meminta untuk memperlambat",
  "Discord sent an oversized frame": "Discord mengirim bingkai yang terlalu besar",
  "Discord did not answer": "Discord tidak menjawab",
  "Paste a webhook URL first.": "Tempel URL webhook dulu.",
  "Roblox client version folder not found. Is Roblox installed?": "Folder versi klien Roblox tidak ditemukan. Apakah Roblox terpasang?",
  "Roblox's settings file is read-only": "Berkas pengaturan Roblox hanya-baca",
  "FramerateCap is missing from Roblox settings": "FramerateCap tidak ada di pengaturan Roblox",
  "Roblox settings file not found or incomplete": "Berkas pengaturan Roblox tidak ditemukan atau tidak lengkap",
  "This PC has no Windows Hello device (face, fingerprint or PIN).": "PC ini tidak punya perangkat Windows Hello (wajah, sidik jari, atau PIN).",
  "Windows Hello isn't set up for your Windows account. Set it up in Windows Settings → Accounts → Sign-in options.":
    "Windows Hello belum disiapkan untuk akun Windows Anda. Siapkan di Pengaturan Windows → Akun → Opsi masuk.",
  "Windows Hello is turned off by a policy on this PC.": "Windows Hello dimatikan oleh kebijakan di PC ini.",
  "The Windows Hello device is busy. Try again in a moment.": "Perangkat Windows Hello sedang sibuk. Coba lagi sebentar lagi.",
  "Too many failed attempts. Windows Hello is locked for now.": "Terlalu banyak percobaan gagal. Windows Hello dikunci untuk sementara.",
  "This PC has no Windows Hello device.": "PC ini tidak punya perangkat Windows Hello.",
  "Windows Hello isn't set up for your Windows account.": "Windows Hello belum disiapkan untuk akun Windows Anda.",
  "Windows Hello didn't confirm it's you.": "Windows Hello tidak mengonfirmasi bahwa ini Anda.",
  "That isn't a Roblox Account Manager AccountData.json.": "Itu bukan AccountData.json dari Roblox Account Manager.",
  "No cookie saved for this account in Roblox Account Manager.": "Tidak ada cookie tersimpan untuk akun ini di Roblox Account Manager.",
  "Same cookie as an earlier account in the file.": "Cookie sama dengan akun sebelumnya di berkas ini.",
  "This file is locked with a Roblox Account Manager password. Remove the password in Roblox Account Manager, then import again.":
    "Berkas ini dikunci dengan sandi Roblox Account Manager. Hapus sandinya di Roblox Account Manager, lalu impor lagi.",
  "This file couldn't be decrypted. It must come from Roblox Account Manager on this PC, used by the same Windows user.":
    "Berkas ini tidak bisa didekripsi. Berkasnya harus berasal dari Roblox Account Manager di PC ini, dipakai oleh pengguna Windows yang sama.",
  "Cookie is empty.": "Cookie kosong.",
  "That's too much text to import at once.": "Teksnya terlalu banyak untuk diimpor sekaligus.",
  "That file is too big to be an AccountData.json.": "Berkas itu terlalu besar untuk sebuah AccountData.json.",
  "That AccountData.json has no accounts.": "AccountData.json itu tidak berisi akun.",
  "The import list changed; start the import again.": "Daftar impor berubah; mulai impornya lagi.",
  "Windows refused to move that window.": "Windows menolak memindahkan jendela itu.",
  "Windows refused to close that window.": "Windows menolak menutup jendela itu.",
  "That client's window has closed.": "Jendela klien itu sudah tertutup.",
  "That client isn't responding.": "Klien itu tidak merespons.",
  "That client has already closed.": "Klien itu sudah tertutup.",
  "Only versions in Roblox's own Versions folder can be deleted here.": "Hanya versi di folder Versions milik Roblox yang bisa dihapus di sini.",
  "That folder is not a Roblox version folder.": "Folder itu bukan folder versi Roblox.",
  "Roblox's Versions folder was not found.": "Folder Versions Roblox tidak ditemukan.",
  "Invalid version path.": "Jalur versi tidak valid.",
  "That folder has no RobloxPlayerBeta.exe; it was left alone.": "Folder itu tidak berisi RobloxPlayerBeta.exe; dibiarkan.",
  "That version is already in the list.": "Versi itu sudah ada di daftar.",
  "That version is running. Close its Roblox client first.": "Versi itu sedang berjalan. Tutup klien Roblox-nya dulu.",
  "A version looks like version-0123456789abcdef (16 hexadecimal characters).": "Versi berbentuk version-0123456789abcdef (16 karakter heksadesimal).",
  "That is not a valid version hash.": "Itu bukan hash versi yang valid.",
  "Multi-instance did not start in time.": "Multi-instance tidak mulai tepat waktu.",
  "Launch arguments can't contain line breaks or control characters.": "Argumen peluncuran tidak boleh berisi baris baru atau karakter kontrol.",
  "Launch arguments can't contain another roblox-player: link.": "Argumen peluncuran tidak boleh berisi tautan roblox-player: lain.",
  "Launch arguments need RobloxPlayerBeta.exe, and no installed Roblox version was found. Install Roblox, or clear the launch arguments.":
    "Argumen peluncuran butuh RobloxPlayerBeta.exe, dan tidak ada versi Roblox terpasang yang ditemukan. Pasang Roblox, atau kosongkan argumen peluncuran.",
  "Couldn't take over: no running Roblox client would hand over its lock. Close Roblox, then turn multi-instance on.":
    "Tidak bisa mengambil alih: tidak ada klien Roblox berjalan yang mau melepas kuncinya. Tutup Roblox, lalu nyalakan multi-instance.",
  "Roblox wants a human check (captcha) for this account": "Roblox meminta cek manusia (captcha) untuk akun ini",
  "Roblox refused the sign-in (error 403)": "Roblox menolak sign-in (galat 403)",
  "The clipboard is in use by another app. Try again.": "Papan klip sedang dipakai aplikasi lain. Coba lagi.",
  "Could not clear the clipboard.": "Papan klip tidak bisa dikosongkan.",
  "Out of memory.": "Memori habis.",
  "Could not write to the clipboard.": "Tidak bisa menulis ke papan klip.",
  "The window closed before it was ready.": "Jendela tertutup sebelum siap.",
  "Pick a time from 1 minute to 7 days from now.": "Pilih waktu antara 1 menit sampai 7 hari dari sekarang.",
  "Too many ticket requests; wait a moment and try again.": "Terlalu banyak permintaan tiket; tunggu sebentar lalu coba lagi.",
  "Roblox now requires a bound session for this account. Sign in to it again (Add Account → Log in with browser).":
    "Roblox sekarang mewajibkan sesi terikat untuk akun ini. Masuk lagi ke akun itu (Tambah akun → Masuk lewat browser).",
  "Roblox rejected this cookie: it was signed out or expired. Sign in to the account again.":
    "Roblox menolak cookie ini: sudah keluar atau kedaluwarsa. Masuk lagi ke akun itu.",
  "Roblox wants a human check (captcha) for this account. Sign in to it again with Log in with browser.":
    "Roblox meminta cek manusia (captcha) untuk akun ini. Masuk lagi ke akun itu lewat Masuk lewat browser.",
  "Roblox is limiting requests right now; the account wasn't checked.": "Roblox sedang membatasi permintaan; akun tidak diperiksa.",
  "Roblox's restriction details were unreadable.": "Rincian pembatasan dari Roblox tidak terbaca.",
  "Roblox's answer was unreadable; the account wasn't checked.": "Jawaban Roblox tidak terbaca; akun tidak diperiksa.",
  "Roblox rejected this cookie (no user id returned).": "Roblox menolak cookie ini (tidak ada user ID yang dikembalikan).",
  "Roblox is limiting server list requests right now. Try again in a minute.": "Roblox sedang membatasi permintaan daftar server. Coba lagi semenit lagi.",
  "User reply had no id.": "Jawaban pengguna tidak berisi ID.",
  "CAM could not read its accounts file, so nothing is saved yet. Choose Start fresh in the banner at the top, or restore the file and restart CAM.":
    "CAM tidak bisa membaca berkas akunnya, jadi belum ada yang disimpan. Pilih Mulai baru di banner atas, atau pulihkan berkasnya lalu mulai ulang CAM.",
  "Folder not found.": "Folder tidak ditemukan.",
  "Account not found.": "Akun tidak ditemukan.",
  "That launch target is not valid.": "Target peluncuran itu tidak sah.",
  "This game does not allow private servers.": "Game ini tidak mengizinkan server pribadi.",
  "Roblox did not say what a private server costs in this game, so none was created.": "Roblox tidak memberi tahu harga server pribadi di game ini, jadi tidak ada yang dibuat.",
  "Roblox says this account cannot create another private server in this game.": "Roblox menyatakan akun ini tidak bisa membuat server pribadi lagi di game ini.",
  "Roblox gave no way to join this private server.": "Roblox tidak memberi cara untuk masuk ke server pribadi ini.",
  "Roblox did not say which game that place belongs to.": "Roblox tidak memberi tahu place itu milik game apa.",
  "Could not read any private server list.": "Tidak ada daftar server pribadi yang bisa dibaca.",
  "A private server name needs 1 to 50 characters.": "Nama server pribadi harus 1 sampai 50 karakter.",
  "Could not reach Roblox.": "Tidak bisa menghubungi Roblox.",
  "Roblox: no server was created": "Roblox: tidak ada server yang dibuat",
  "no server was created": "tidak ada server yang dibuat",
  "Roblox did not say what this private server costs, so it was not turned on.": "Roblox tidak memberi tahu harga server pribadi ini, jadi server tidak dinyalakan.",
  "Give the folder a name.": "Beri nama folder.",
  "Roblox did not report a current version.": "Roblox tidak melaporkan versi terkini.",
  "Roblox has an update, so this launch went through the Roblox launcher to install it first (an older client would not match what Roblox and script tools expect).":
    "Roblox punya update, jadi peluncuran ini lewat peluncur Roblox untuk memasangnya dulu (klien lama tidak akan cocok dengan yang diharapkan Roblox dan alat skrip).",
  "Resource saver limits and launch arguments apply again from the next launch.": "Batas penghemat sumber daya dan argumen peluncuran berlaku lagi mulai peluncuran berikutnya.",
  "Roblox has an update, and starting a client now would install it and close every running client. Close your clients (or let Roblox update) first, then launch.":
    "Roblox punya update, dan memulai klien sekarang akan memasangnya lalu menutup semua klien yang berjalan. Tutup klien Anda (atau biarkan Roblox memperbarui) dulu, lalu luncurkan.",
  "The package manifest has an unknown format.": "Format manifest paket tidak dikenal.",
  "The package manifest lists no packages.": "Manifest paket tidak berisi paket apa pun.",
  "Reading the package manifest": "Membaca manifest paket",
  "The download finished but RobloxPlayerBeta.exe is missing.": "Unduhan selesai tetapi RobloxPlayerBeta.exe tidak ada.",
  "Pick a game or paste a private server link first.": "Pilih game atau tempel tautan server pribadi dulu.",
  "Name cannot be empty.": "Nama tidak boleh kosong.",
  "Saved server not found.": "Server tersimpan tidak ditemukan.",
  "Roblox did not answer; history repair will retry next time.": "Roblox tidak menjawab; perbaikan riwayat akan dicoba lagi lain kali.",
  "This account is being deleted, so it can't be launched.": "Akun ini sedang dihapus, jadi tidak bisa diluncurkan.",
  "No game selected.": "Tidak ada game yang dipilih.",
  "Followed a player": "Mengikuti pemain",
  "Display name must be at least 3 characters.": "Nama tampilan minimal 3 karakter.",
  "Enter a username or profile link.": "Masukkan username atau tautan profil.",
  "No usable account selected.": "Tidak ada akun terpilih yang bisa dipakai.",
  "That server no longer exists.": "Server itu sudah tidak ada.",
  "That server is full.": "Server itu penuh.",
  "Could not reach Roblox to check the server.": "Roblox tidak bisa dihubungi untuk memeriksa server.",
  "No usable account: every account is signed out or restricted by Roblox.": "Tidak ada akun yang bisa dipakai: semua akun sudah keluar atau dibatasi Roblox.",

  ...ALASAN_BATAL,
  "the client signed in as another account": "klien masuk sebagai akun lain",
  "less than 1 GB free on the drive": "sisa ruang di drive kurang dari 1 GB",
  "account is not an object": "akun bukan objek",
  "could not create the HTTP client": "klien HTTP tidak bisa dibuat",
  "could not reach Discord": "Discord tidak bisa dihubungi",
  "checksum mismatch (MD5 differs from the manifest)": "checksum tidak cocok (MD5 berbeda dari manifest)",
  "client log not found": "log klien tidak ditemukan",
  "the backup copy could not be written": "salinan cadangan tidak bisa ditulis",
  "not an accounts file": "bukan berkas akun",
};

export const POLA_RUST = [
  [/^This private server's paid period has ended; turning it on could renew it for (\d+) Robux, and CAM never buys\.$/, "Masa berbayar server pribadi ini sudah habis; menyalakannya bisa memperpanjang dengan $1 Robux, dan CAM tidak pernah membeli."],
  [/^Private servers in this game cost (\d+) Robux; CAM never buys them\.$/, "Server pribadi di game ini harganya $1 Robux; CAM tidak pernah membelinya."],
  [/^Roblox: (.+)$/, "Roblox: $1"],
  [/^(.+?): ((?:Note|Warning): .+)$/, (a, c) => `${a}: ${c.split(/(?<=\.) (?=(?:Note|Warning): )/).map((x) => dalam(x)).join(" ")}`],
  [/^Note: (.+)$/, (c) => `Catatan: ${dalam(c)}`],
  [/^Warning: FPS limit not applied \((.+)\)\.$/, (e) => `Peringatan: batas FPS tidak diterapkan (${dalamTanpaTitik(e)}).`],
  [/^Warning: sign-in protection locked only (\d+) of (\d+) Roblox sign-in files \(another program is using them\)\.$/,
    "Peringatan: proteksi sign-in hanya mengunci $1 dari $2 berkas sign-in Roblox (program lain sedang memakainya)."],
  [/^Warning: (.+)\.$/, (w) => {
    const t = peringatanHemat(w);
    return t == null ? null : `Peringatan: ${t}.`;
  }],
  [/^CPU limit job \(error (.+)\)$/, "job batas CPU (galat $1)"],
  [/^CPU limit \(error (.+)\)$/, "batas CPU (galat $1)"],
  [/^CPU limit assign \(error (.+)\)$/, "pemasangan batas CPU (galat $1)"],
  [/^efficiency mode \(error (.+)\)$/, "mode efisiensi (galat $1)"],
  [/^memory priority \(error (.+)\)$/, "prioritas memori (galat $1)"],
  [/^core limit \(error (.+)\)$/, "batas core (galat $1)"],
  [/^RAM limit was not applied \(error (.+?)(, privilege unavailable)?\)$/, (e, h) => `Batas RAM tidak diterapkan (galat ${e}${h ? ", hak akses tidak tersedia" : ""})`],

  [rej(String.raw`Not rejoined: a new client would hit the same problem\. Sign in to (.+) again \(Add Account → Log in with browser\) or check the account on roblox\.com\.`),
    (a, m, b) => `${a} ${masalah(m)}. Tidak digabung ulang: klien baru akan mengalami masalah yang sama. Masuk lagi ke ${b} (Tambah akun → Masuk lewat browser) atau periksa akunnya di roblox.com.`],
  [rej(String.raw`Auto-rejoin is off for this account\.`), (a, m) => `${a} ${masalah(m)}. Gabung ulang otomatis mati untuk akun ini.`],
  [rej(String.raw`Auto-rejoin stopped: it relaunched (.+) times in 15 minutes\. Check the account or the game, then launch it again\.`),
    (a, m, n) => `${a} ${masalah(m)}. Gabung ulang otomatis berhenti: sudah diluncurkan ulang ${n} kali dalam 15 menit. Periksa akun atau game-nya, lalu luncurkan lagi.`],
  [rej(String.raw`Rejoining in (.+) s\.`), (a, m, n) => `${a} ${masalah(m)}. Gabung ulang dalam ${n} dtk.`],
  [/^(.+) did not finish joining within 2 minutes after the rejoin\.$/, "$1 tidak selesai masuk dalam 2 menit setelah gabung ulang."],
  [/^(.+): rejoin cancelled, (.+)\.$/, (a, r) => (ALASAN_BATAL[r] ? `${a}: gabung ulang dibatalkan, ${ALASAN_BATAL[r]}.` : null)],
  [/^Auto-rejoin skipped for (.+): multi-instance is off and other Roblox clients are open, so a new client would close them\. Turn multi-instance on, then launch (.+) again\.$/,
    "Gabung ulang otomatis dilewati untuk $1: multi-instance mati dan ada klien Roblox lain yang terbuka, jadi klien baru akan menutupnya. Nyalakan multi-instance, lalu luncurkan $2 lagi."],
  [/^Auto-rejoin stopped for (.+): it relaunched (.+) times in 15 minutes\. Check the account or the game, then launch it again\.$/,
    "Gabung ulang otomatis berhenti untuk $1: sudah diluncurkan ulang $2 kali dalam 15 menit. Periksa akun atau game-nya, lalu luncurkan lagi."],
  [/^Rejoining (.+) is waiting for RAM: clients use about (.+) GB of the (.+) GB budget and this one needs about (.+) GB\. CAM rejoins it when there is room\.$/,
    "Gabung ulang $1 menunggu RAM: klien memakai sekitar $2 GB dari anggaran $3 GB dan klien ini butuh sekitar $4 GB. CAM menggabungkannya ulang saat ada ruang."],
  [/^Auto-rejoin gave up on (.+) after an hour of failed tries: (.+)$/, (a, e) => `Gabung ulang otomatis menyerah untuk ${a} setelah satu jam mencoba tanpa hasil: ${dalam(e)}`],
  [/^Rejoining (.+) is waiting: (.+)\. CAM keeps trying for up to an hour \(next try in (.+) s\)\.$/,
    (a, e, j) => `Gabung ulang ${a} menunggu: ${dalamTanpaTitik(e)}. CAM terus mencoba hingga satu jam (percobaan berikutnya dalam ${j} dtk).`],
  [/^Auto-rejoin stopped for (.+): (.+)$/, (a, e) => `Gabung ulang otomatis berhenti untuk ${a}: ${dalam(e)}`],
  [/^Cancelled (.+) pending rejoins?\.$/, "$1 gabung ulang yang tertunda dibatalkan."],

  [/^(Closed|Ended) (.+) Roblox clients?; pending rejoins cancelled\.$/,
    (k, n) => `${n} klien Roblox ${k === "Ended" ? "diakhiri" : "ditutup"}; gabung ulang yang menunggu dibatalkan.`],
  [/^Tray: (closed|ended) (.+) Roblox clients?; pending rejoins cancelled\.$/,
    (k, n) => `Tray: ${n} klien Roblox ${k === "ended" ? "diakhiri" : "ditutup"}; gabung ulang yang menunggu dibatalkan.`],
  [/^Emergency hotkey: ended (.+) Roblox clients?\.$/, "Hotkey darurat: $1 klien Roblox diakhiri."],
  [/^Shutdown in 30 s: closed (.+) Roblox clients?\.$/, "Mematikan PC dalam 30 dtk: $1 klien Roblox ditutup."],
  [/^Windows wouldn't schedule the shutdown \((.+?)\): (.+)$/, "Windows tidak mau menjadwalkan pematian PC ($1): $2"],
  [/^Windows wouldn't call off the shutdown \((.+?)\): (.+)$/, "Windows tidak mau membatalkan pematian PC ($1): $2"],
  [/^(.+): the game was closed but its Roblox process stayed in memory without a window \(PID (\d+)\), so it was ended\.$/,
    (a, pid) => `${a === "A Roblox client" ? "Sebuah klien Roblox" : a}: game-nya sudah ditutup tetapi proses Roblox-nya tetap di memori tanpa jendela (PID ${pid}), jadi diakhiri.`],

  [/^(.+) already has a Roblox client open\. A second one would sign it out of the first; close that client first\.$/,
    "$1 sudah punya klien Roblox yang terbuka. Klien kedua akan mengeluarkannya dari klien pertama; tutup klien itu dulu."],
  [/^(.+) was deleted while it was launching, so its new client was closed\.$/, "$1 dihapus saat sedang diluncurkan, jadi klien barunya ditutup."],
  [/^Anti-AFK is keeping (.+) active \(one F13 key press every (.+) minutes while you're away\)\.$/,
    "Anti-AFK menjaga $1 tetap aktif (satu tekanan tombol F13 setiap $2 menit selama Anda pergi)."],
  [/^This private server link is not usable \((.+)\)\. It may have been revoked, or the account may not have access\.$/,
    (e) => `Tautan server pribadi ini tidak bisa dipakai (${dalamTanpaTitik(e)}). Mungkin sudah dicabut, atau akun ini tidak punya akses.`],
  [/^Roblox refused the join \(status (.+)\)\.$/, "Roblox menolak join (status $1)."],
  [/^Roblox restarted (.+)'s client in another installed version \((.+)\), so resource saver's RAM limit and low priority did not apply this time\. Next launches start that version directly\.$/,
    "Roblox memulai ulang klien $1 di versi terpasang lain ($2), jadi batas RAM dan prioritas rendah penghemat tidak berlaku kali ini. Peluncuran berikutnya langsung memulai versi itu."],
  [/^Roblox restarted (.+)'s client, so resource saver's RAM limit and low priority did not apply this time\. Relaunch the account to apply them\.$/,
    "Roblox memulai ulang klien $1, jadi batas RAM dan prioritas rendah penghemat tidak berlaku kali ini. Luncurkan ulang akunnya untuk menerapkannya."],
  [/^Could not start multi-instance: (.+)$/, (e) => `Multi-instance tidak bisa dimulai: ${dalam(e)}`],
  [/^Launch arguments can be at most (.+) characters\.$/, "Argumen peluncuran paling banyak $1 karakter."],
  [/^Launch arguments can be at most (.+) words\.$/, "Argumen peluncuran paling banyak $1 kata."],
  [/^Launch arguments can't contain (.+)$/, "Argumen peluncuran tidak boleh berisi $1"],
  [/^Roblox client not found at: (.+) That version may have been deleted by a Roblox update\. Pick another version on the Client versions page\.$/,
    "Klien Roblox tidak ditemukan di: $1 Versi itu mungkin terhapus oleh update Roblox. Pilih versi lain di halaman Versi klien."],
  [/^Windows refused to open the roblox-player: protocol \(code (.+)\)\. That usually means the Roblox client is not installed, or its protocol registration is broken\.$/,
    "Windows menolak membuka protokol roblox-player: (kode $1). Biasanya itu berarti klien Roblox belum terpasang, atau pendaftaran protokolnya rusak."],

  [/^(.+) is already in the list \(alias "(.+)"\)\. Remove it first to update its cookie, or use Log in with browser\.$/,
    '$1 sudah ada di daftar (alias "$2"). Hapus dulu untuk memperbarui cookie-nya, atau pakai Masuk lewat browser.'],
  [/^(.+): cookie renewed from the Roblox login\. Settings kept\.$/, "$1: cookie diperbarui dari login Roblox. Pengaturan dipertahankan."],
  [/^(.+) added from the Roblox login\.$/, "$1 ditambahkan dari login Roblox."],
  [/^No \.ROBLOSECURITY cookies found\. Each starts with (.+)$/, "Tidak ada cookie .ROBLOSECURITY yang ditemukan. Masing-masing diawali $1"],
  [/^Already in the list as (.+): cookie renewed\.$/, "Sudah ada di daftar sebagai $1: cookie diperbarui."],
  [/^Added as (.+)\.$/, "Ditambahkan sebagai $1."],
  [/^No cookie on this line \(a cookie starts with (.+)\)\.$/, "Tidak ada cookie di baris ini (cookie diawali $1)."],
  [/^Same cookie as line (\d+)\.$/, "Cookie sama dengan baris $1."],
  [/^Account (\d+) \((.+)\)$/, "Akun $1 ($2)"],
  [/^Account (\d+)$/, "Akun $1"],
  [/^Use at least (.+) characters for the backup password\.$/, "Gunakan minimal $1 karakter untuk sandi cadangan."],
  [/^A folder named "(.+)" already exists\.$/, 'Folder bernama "$1" sudah ada.'],
  [/^(.+): a flag value must be text, a number or true\/false\.$/, "$1: nilai flag harus teks, angka, atau true/false."],

  [/^That folder has no RobloxPlayerBeta\.exe: (.+) Pick the downloaded version folder that contains RobloxPlayerBeta\.exe\.$/,
    "Folder itu tidak berisi RobloxPlayerBeta.exe: $1 Pilih folder versi hasil unduhan yang berisi RobloxPlayerBeta.exe."],
  [/^(.+): pinned for launching$/, "$1: disematkan untuk peluncuran"],
  [/^Windows is still using files in that version \((.+)\)\. Close Roblox and try again\.$/, "Windows masih memakai berkas di versi itu ($1). Tutup Roblox lalu coba lagi."],
  [/^The version was removed from the list, but some files could not be deleted yet \((.+)\)\. CAM retries on the next delete\.$/,
    "Versi itu sudah dihapus dari daftar, tetapi beberapa berkas belum bisa dihapus ($1). CAM mencoba lagi pada penghapusan berikutnya."],
  [/^Roblox has no client called (.+)\. Check the version hash\.$/, "Roblox tidak punya klien bernama $1. Periksa hash versinya."],
  [/^The Roblox CDN answered HTTP (.+) for (.+)\.$/, "CDN Roblox menjawab HTTP $1 untuk $2."],
  [/^(.+): unpacking crashed: (.+)$/, "$1: pembongkaran crash: $2"],
  [/^(\S+) is still downloading\.$/, "$1 masih diunduh."],

  [/^Roblox rejected this cookie \(HTTP (.+)\)\. It was revoked or expired -- grab a fresh one and paste it again\.$/,
    "Roblox menolak cookie ini (HTTP $1). Cookie-nya dicabut atau kedaluwarsa -- ambil yang baru lalu tempel lagi."],
  [/^The ticket request was rejected for its shape \(HTTP (.+)\)\. That is a bug in this app, not your cookie\.$/,
    "Permintaan tiket ditolak karena bentuknya (HTTP $1). Itu bug di aplikasi ini, bukan cookie Anda."],
  [/^Roblox returned no authentication ticket \(HTTP (.+)\)\.$/, "Roblox tidak memberikan tiket autentikasi (HTTP $1)."],
  [/^Roblox returned no new cookie \(HTTP (.+?); (.+)\)\. Keeping the old one\.$/, "Roblox tidak memberikan cookie baru (HTTP $1; $2). Cookie lama dipertahankan."],
  [/^Roblox answered HTTP (.+); the account wasn't checked\.$/, "Roblox menjawab HTTP $1; akun tidak diperiksa."],
  [/^Network error; the restriction wasn't read \((.+)\)\.$/, "Galat jaringan; pembatasan tidak terbaca ($1)."],
  [/^Network error; the account wasn't checked \((.+)\)\.$/, "Galat jaringan; akun tidak diperiksa ($1)."],
  [/^Roblox answered HTTP (.+) for (the restriction details|the server list|the blocked list|the friends list|friends' status|the private servers)\.$/,
    (n, apa) => `Roblox menjawab HTTP ${n} untuk ${{ "the restriction details": "rincian pembatasan", "the server list": "daftar server", "the blocked list": "daftar blokir", "the friends list": "daftar teman", "friends' status": "status teman", "the private servers": "server pribadi" }[apa]}.`],
  [/^Roblox answered (.+) for the 3D avatar\.$/, "Roblox menjawab $1 untuk avatar 3D."],
  [/^The 3D avatar file answered (.+)\.$/, "Berkas avatar 3D menjawab $1."],
  [/^Couldn't reach Roblox for the 3D avatar: (.+)$/, "Roblox tidak bisa dihubungi untuk avatar 3D: $1"],
  [/^Couldn't download the 3D avatar: (.+)$/, "Avatar 3D tidak bisa diunduh: $1"],
  [/^No Roblox user named (.+)\.$/, "Tidak ada pengguna Roblox bernama $1."],
  [/^Roblox answered HTTP (.+)\.$/, "Roblox menjawab HTTP $1."],
  [/^Roblox answered (\d+)$/, "Roblox menjawab $1"],

  [/^Couldn't reach Roblox process (.+) \(error (.+)\)\.$/, "Proses Roblox $1 tidak bisa dijangkau (galat $2)."],
  [/^Roblox process (.+) is no longer the same client\.$/, "Proses Roblox $1 bukan lagi klien yang sama."],
  [/^Couldn't trim Roblox process (.+) \(error (.+)\)\.$/, "Proses Roblox $1 tidak bisa dipangkas (galat $2)."],
  [/^Couldn't change the memory priority of Roblox process (.+) \(error (.+)\)\.$/, "Prioritas memori proses Roblox $1 tidak bisa diubah (galat $2)."],
  [/^Couldn't read the memory priority of Roblox process (.+) \(error (.+)\)\.$/, "Prioritas memori proses Roblox $1 tidak bisa dibaca (galat $2)."],
  [/^Couldn't read the working set limit of process (.+) \(error (.+)\)\.$/, "Batas working set proses $1 tidak bisa dibaca (galat $2)."],
  [/^Windows couldn't show that client's preview \(0x(.+)\)\.$/, "Windows tidak bisa menampilkan pratinjau klien itu (0x$1)."],
  [/^Windows couldn't place that preview \(0x(.+)\)\.$/, "Windows tidak bisa menempatkan pratinjau itu (0x$1)."],
  [/^The sign-in window was redirected to another browser profile \((.+)\) by a WebView2 policy on this PC, so it was closed to keep accounts apart\.$/,
    "Jendela masuk dialihkan ke profil browser lain ($1) oleh kebijakan WebView2 di PC ini, jadi ditutup supaya akun tetap terpisah."],
  [/^CryptUnprotectData failed \(code (.+)\)\. The accounts file was likely created by another Windows user or on another machine -- DPAPI deliberately cannot open it\.$/,
    "CryptUnprotectData gagal (kode $1). Berkas akun kemungkinan dibuat oleh pengguna Windows lain atau di komputer lain -- DPAPI memang tidak bisa membukanya."],
  [/^CryptProtectData failed \(code (.+)\)$/, "CryptProtectData gagal (kode $1)"],
  [/^DPAPI failed \(code (.+)\)$/, "DPAPI gagal (kode $1)"],
  [/^Windows Hello couldn't be checked \((.+)\)\.$/, "Windows Hello tidak bisa diperiksa ($1)."],
  [/^Windows Hello couldn't start \((.+)\)\.$/, "Windows Hello tidak bisa dimulai ($1)."],
  [/^Windows Hello failed \((.+)\)\.$/, "Windows Hello gagal ($1)."],
  [/^Discord answered HTTP (.+)$/, "Discord menjawab HTTP $1"],
  [/^Discord closed the connection: (.+)$/, "Discord menutup koneksi: $1"],
  [/^Windows: exception (.+) in (.+) \(client (.+)\)\.?$/, "Windows: exception $1 di $2 (klien $3)"],
  [/^Crash dump: (.+)$/, "Crash dump: $1"],

  [/^can't sign in: (.+)$/, (a) => `tidak bisa masuk: ${dalam(a)}`],
  [/^could not write the backup: (.+)$/, "cadangan tidak bisa ditulis: $1"],
  [/^could not remove ClientAppSettings\.json: (.+)$/, "ClientAppSettings.json tidak bisa dihapus: $1"],
  [/^could not create the ClientSettings folder: (.+)$/, "folder ClientSettings tidak bisa dibuat: $1"],
  [/^could not build ClientAppSettings\.json: (.+)$/, "ClientAppSettings.json tidak bisa disusun: $1"],
  [/^could not write ClientAppSettings\.json: (.+)$/, "ClientAppSettings.json tidak bisa ditulis: $1"],
  [/^eco partly refused \((.+)\)$/, "mode hemat sebagian ditolak ($1)"],
  [/^query CPU limit \(error (.+)\)$/, "membaca batas CPU (galat $1)"],
  [/^query CPU limit: (.+) bytes returned$/, "membaca batas CPU: $1 byte dikembalikan"],
  [/^set CPU limit \(error (.+)\)$/, "memasang batas CPU (galat $1)"],
  [/^query working set \(error (.+)\)$/, "membaca working set (galat $1)"],
  [/^could not start the Roblox client \(error (.+)\)$/, "klien Roblox tidak bisa dimulai (galat $1)"],
  [/^could not start the Roblox client: (.+)$/, "klien Roblox tidak bisa dimulai: $1"],
  [/^could not open the login window: (.+)$/, "jendela login tidak bisa dibuka: $1"],
  [/^could not open the Roblox window: (.+)$/, "jendela Roblox tidak bisa dibuka: $1"],
  [/^couldn't read that file: (.+)$/, "berkas itu tidak bisa dibaca: $1"],
  [/^could not read the file: (.+)$/, "berkas tidak bisa dibaca: $1"],
  [/^could not save the report: (.+)$/, "laporan tidak bisa disimpan: $1"],
  [/^the new cookie was rejected, keeping the old one: (.+)$/, (e) => `cookie baru ditolak, cookie lama dipertahankan: ${dalam(e)}`],
  [/^could not delete the downloaded version: (.+)$/, "versi unduhan tidak bisa dihapus: $1"],
  [/^unknown window action: (.+)$/, "aksi jendela tidak dikenal: $1"],
  [/^couldn't run shutdown\.exe: (.+)$/, "shutdown.exe tidak bisa dijalankan: $1"],
  [/^could not create the HTTP client: (.+)$/, "klien HTTP tidak bisa dibuat: $1"],
  [/^cookie present but only (\d+) characters long$/, "cookie ada tetapi hanya $1 karakter"],
  [/^search results were unreadable: (.+)$/, "hasil pencarian tidak terbaca: $1"],
  [/^share link HTTP (\d+): (.+)$/, "tautan berbagi HTTP $1: $2"],
  [/^share link reply unreadable: (.+)$/, "jawaban tautan berbagi tidak terbaca: $1"],
  [/^could not fetch servers: (.+)$/, "daftar server tidak bisa diambil: $1"],
  [/^server list unreadable: (.+)$/, "daftar server tidak terbaca: $1"],
  [/^lookup reply unreadable: (.+)$/, "jawaban pencarian pengguna tidak terbaca: $1"],
  [/^could not write Roblox settings: (.+)$/, "pengaturan Roblox tidak bisa ditulis: $1"],
  [/^could not encrypt a private server code: (.+)$/, "kode server pribadi tidak bisa dienkripsi: $1"],
  [/^not valid JSON \((.+)\)$/, "bukan JSON yang valid ($1)"],
  [/^could not open it \((.+)\)$/, "tidak bisa dibuka ($1)"],
  [/^could not create the data folder: (.+)$/, "folder data tidak bisa dibuat: $1"],
  [/^could not build the JSON: (.+)$/, "JSON tidak bisa disusun: $1"],
  [/^could not replace the file: (.+)$/, "berkas tidak bisa diganti: $1"],
  [/^could not reach Roblox: (.+)$/, "Roblox tidak bisa dihubungi: $1"],
  [/^unreadable version reply: (.+)$/, "jawaban versi tidak terbaca: $1"],
  [/^could not reach the Roblox CDN: (.+)$/, "CDN Roblox tidak bisa dihubungi: $1"],
  [/^size mismatch \((.+) of (.+) bytes\)$/, "ukuran tidak cocok ($1 dari $2 byte)"],
  [/^not a valid zip: (.+)$/, "bukan zip yang valid: $1"],
  [/^damaged zip entry: (.+)$/, "entri zip rusak: $1"],
  [/^refused unsafe path in package: (.+)$/, "jalur tidak aman di dalam paket ditolak: $1"],
  [/^could not create a folder: (.+)$/, "folder tidak bisa dibuat: $1"],
  [/^could not unpack (.+): (.+)$/, "$1 tidak bisa dibongkar: $2"],
  [/^could not write (.+): (.+)$/, "$1 tidak bisa ditulis: $2"],
  [/^could not create the version folder: (.+)$/, "folder versi tidak bisa dibuat: $1"],
  [/^could not finish the install: (.+)$/, "pemasangan tidak bisa diselesaikan: $1"],
];
