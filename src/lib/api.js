export function adaRuntime() {
  return typeof window !== "undefined" && typeof window.__TAURI__?.core?.invoke === "function";
}

export class RuntimeTidakAda extends Error {
  constructor(cmd) {
    super(`Desktop runtime unavailable (command "${cmd}" needs the Tauri app).`);
    this.name = "RuntimeTidakAda";
  }
}

const invoke = (cmd, args) =>
  adaRuntime()
    ? window.__TAURI__.core.invoke(cmd, args)
    : Promise.reject(new RuntimeTidakAda(cmd));

export function samarkanRahasia(teks) {
  return String(teks ?? "")
    .replace(/_\|WARNING[^\s"'`]*/g, "[redacted cookie]")
    .replace(/\.ROBLOSECURITY=[^\s;"'`]+/gi, ".ROBLOSECURITY=[redacted]")
    .replace(/[A-Za-z0-9+/=_-]{120,}/g, "[redacted token]");
}

export const api = {
  daftarAkun: () => invoke("daftar_akun"),
  tambahAkun: (cookie, alias) => invoke("tambah_akun", { cookie, alias }),
  loginBrowser: (alias) => invoke("login_browser", { alias }),
  tutupLoginBrowser: () => invoke("tutup_login_browser"),
  hapusAkun: (id) => invoke("hapus_akun", { id }),
  ubahAlias: (id, alias) => invoke("ubah_alias", { id, alias }),
  segarkanAkun: (id) => invoke("segarkan_akun", { id }),
  perbaruiCookie: (id) => invoke("perbarui_cookie", { id }),
  autoRefreshStatus: () => invoke("auto_refresh_status"),
  setAutoRefresh: (aktif) => invoke("set_auto_refresh", { aktif }),
  ambilCookie: (id) => invoke("ambil_cookie", { id }),
  lokasiPenyimpanan: () => invoke("lokasi_penyimpanan"),

  multiInstanceStatus: () => invoke("multi_instance_status"),
  setMultiInstance: (aktif) => invoke("set_multi_instance", { aktif }),

  jumlahKlien: () => invoke("jumlah_klien_roblox"),
  jumlahJoinSejak: (sejak) => invoke("jumlah_join_sejak", { sejak }),
  cariGame: (query) => invoke("cari_game", { query }),
  setFpsAkun: (id, fps) => invoke("set_fps_akun", { id, fps }),
  setHematAkun: (id, hemat, minimize, ramMb, fps) =>
    invoke("set_hemat_akun", { id, hemat, minimize, ramMb, fps }),
  jendelaHemat: (id) => invoke("jendela_hemat", { id }),
  periksaVersiHemat: (id) => invoke("periksa_versi_hemat", { id }),
  fpsTerpasang: () => invoke("fps_terpasang"),
  daftarVersiRoblox: () => invoke("daftar_versi_roblox"),
  klienPath: () => invoke("klien_path"),
  klienAkun: () => invoke("klien_akun"),
  targetTerakhir: () => invoke("target_terakhir"),
  simpanTargetTerakhir: (target) => invoke("simpan_target_terakhir", { target }),
  daftarServerTersimpan: () => invoke("daftar_server_tersimpan"),
  simpanServerTersimpan: (server) => invoke("simpan_server_tersimpan", { server }),
  ubahNamaServerTersimpan: (id, nama) => invoke("ubah_nama_server_tersimpan", { id, nama }),
  hapusServerTersimpan: (id) => invoke("hapus_server_tersimpan", { id }),
  sumberKlien: () => invoke("sumber_klien"),
  setKlienPath: (path) => invoke("set_klien_path", { path }),
  tambahKlienKustom: () => invoke("tambah_klien_kustom"),
  hapusKlienKustom: (path) => invoke("hapus_klien_kustom", { path }),
  sembunyikanUsernameStatus: () => invoke("sembunyikan_username_status"),
  setSembunyikanUsername: (aktif) =>
    invoke("set_sembunyikan_username", { aktif }),
  daftarRiwayat: () => invoke("daftar_riwayat"),
  hapusRiwayat: () => invoke("hapus_riwayat"),
  perbaikiRiwayat: () => invoke("perbaiki_riwayat"),
  luncurkan: (id, p) =>
    invoke("luncurkan", {
      id,
      placeId: p.placeId,
      jobId: p.jobId,
      linkCode: p.linkCode,
      accessCode: p.accessCode || "",
      shareCode: p.shareCode || "",
      gameName: p.gameName || "",
      iconUrl: p.gameIcon || "",
      followUserId: p.followUserId || 0,
    }),

  daftarServer: (placeId, cursor) =>
    invoke("daftar_server", { placeId, cursor: cursor || "" }),
  wilayahServerBanyak: (akunId, placeId, jobIds) =>
    invoke("wilayah_server_banyak", { akunId, placeId, jobIds }),
  periksaServer: (akunId, placeId, jobId) =>
    invoke("periksa_server", { akunId, placeId, jobId }),

  cariUser: (teks, akunId) => invoke("cari_user", { teks, akunId }),

  blokirUser: (akunIds, userId, buka) =>
    invoke("blokir_user", { akunIds, userId, buka }),
  tambahTeman: (akunIds, userId) => invoke("tambah_teman", { akunIds, userId }),
  ubahDisplayName: (akunIds, nama) =>
    invoke("ubah_display_name", { akunIds, nama }),
  daftarBlokir: (akunId) => invoke("daftar_blokir", { akunId }),
  bukaBlokirSemua: (akunId) => invoke("buka_blokir_semua", { akunId }),

  daftarJendela: () => invoke("daftar_jendela"),
  susunJendela: (mode, kolom) => invoke("susun_jendela", { mode, kolom: kolom || 0 }),
  pindahJendela: (hwnd, x, y, w, h) =>
    invoke("pindah_jendela", { hwnd, x, y, w, h }),
  fokusJendela: (hwnd) => invoke("fokus_jendela", { hwnd }),

  fflagDaftar: () => invoke("fflag_daftar"),
  fflagSimpan: (flags) => invoke("fflag_simpan", { flags }),

  versiRobloxTerbaru: () => invoke("versi_roblox_terbaru"),
  periksaVersiRoblox: (hash) => invoke("periksa_versi_roblox", { hash }),
  unduhVersiRoblox: (hash) => invoke("unduh_versi_roblox", { hash }),
  statusUnduhRoblox: () => invoke("status_unduh_roblox"),
  batalUnduhRoblox: () => invoke("batal_unduh_roblox"),

  jendelaAksi: (aksi) => invoke("jendela_aksi", { aksi }),
  jendelaMaks: () => invoke("jendela_maks"),

  tema: () => invoke("tema"),
  setTema: (tema) => invoke("set_tema", { tema }),

  refreshTerjadwal: () => invoke("refresh_terjadwal"),
  jadwalRefresh: (id) => invoke("jadwal_refresh", { id }),
};

export const FPS_SAVER = [3, 5, 10, 15, 20, 30, 60];

export const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

export const angka = (n) => (n ?? 0).toLocaleString("en-US");

export function samarkan(teks) {
  const t = String(teks || "");
  if (t.length <= 1) return "•••";
  return t[0] + "•".repeat(Math.min(t.length - 1, 9));
}

export function waktuRelatif(detikUnix) {
  if (!detikUnix) return null;
  const lalu = Math.floor(Date.now() / 1000) - detikUnix;
  if (lalu < 60) return "just now";
  const n = (x) => Math.floor(lalu / x);
  if (lalu < 3600) return `${n(60)} min ago`;
  if (lalu < 86400) return `${n(3600)}h ago`;
  if (lalu < 2592000) return `${n(86400)}d ago`;
  return new Date(detikUnix * 1000).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function ambilPlaceIdDariUrl(teks) {
  const t = (teks || "").trim();
  if (!/roblox\.com|ro\.blox\.com/i.test(t)) return null;
  const m = t.match(/\/games\/(\d+)/i) || t.match(/[?&]placeId=(\d+)/i);
  return m ? m[1] : null;
}

export function ambilShareCode(nilai) {
  const v = (nilai || "").trim();
  if (!/[/]share([?/]|$)/i.test(v) && !/[?&]type=Server/i.test(v)) return "";
  const m = v.match(/[?&]code=([\w-]+)/i);
  return m ? m[1] : "";
}

export function ambilAccessCode(nilai) {
  const v = (nilai || "").trim();
  const m = v.match(/(?:^|[?&])accessCode=([\w-]+)/i);
  return m ? m[1] : "";
}

export function ambilLinkCode(nilai) {
  const v = (nilai || "").trim();
  const m = v.match(/privateServerLinkCode=([\w-]+)/i);
  return m ? m[1] : v;
}
