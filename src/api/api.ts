import { invoke } from './runtime'
import type * as T from './types'

export { adaRuntime, pakaiMock, RuntimeTidakAda } from './runtime'

export const BATAL = '__BATAL__'
export const dibatalkan = (e: unknown) => String(e).includes(BATAL)

export function samarkanRahasia(teks: unknown): string {
  return String(teks ?? '')
    .replace(/_\|WARNING[^\s"'`]*/g, '[redacted cookie]')
    .replace(/\.ROBLOSECURITY=[^\s;"'`]+/gi, '.ROBLOSECURITY=[redacted]')
    .replace(/[A-Za-z0-9+/=_-]{120,}/g, '[redacted token]')
}

export const api = {
  daftarAkun: () => invoke<T.Akun[]>('daftar_akun'),
  tambahAkun: (cookie: string, alias: string, folderId?: string | null) => invoke<T.Akun>('tambah_akun', { cookie, alias, folderId: folderId || null }),
  loginBrowser: (alias: string, folderId: string | null, tanpaGpu: boolean) => invoke<string>('login_browser', { alias, folderId: folderId || null, tanpaGpu: !!tanpaGpu }),
  loginTerputus: () => invoke<boolean>('login_terputus'),
  diagnosa: () => invoke<string>('diagnosa'),
  simpanDiagnosa: () => invoke<string>('simpan_diagnosa'),
  tutupLoginBrowser: () => invoke<void>('tutup_login_browser'),
  hapusAkunBanyak: (ids: string[], keluarRoblox: boolean) => invoke<T.HasilHapus>('hapus_akun_banyak', { ids, keluarRoblox }),
  ubahAlias: (id: string, alias: string) => invoke<void>('ubah_alias', { id, alias }),
  segarkanAkun: (id: string) => invoke<T.HasilCek>('segarkan_akun', { id }),
  avatar3d: (id: string, segar = false) => invoke<T.Avatar3d>('avatar_3d', { id, segar }),
  avatarBadan: (userId: number) => invoke<string>('avatar_badan', { userId }),
  avatar3dPeriksa: (ids: string[]) => invoke<T.HasilPeriksa3d[]>('avatar_3d_periksa', { ids }),
  perbaruiCookie: (id: string) => invoke<T.Akun>('perbarui_cookie', { id }),
  autoRefreshStatus: () => invoke<boolean>('auto_refresh_status'),
  setAutoRefresh: (aktif: boolean) => invoke<boolean>('set_auto_refresh', { aktif }),
  salinCookie: (id: string) => invoke<number>('salin_cookie', { id }),
  helloStatus: () => invoke<T.StatusHello>('hello_status'),
  bukaSitus: (id: string, halaman?: string | null) => invoke<void>('buka_situs', { id, halaman: halaman || null }),
  salinTeks: (teks: string) => invoke<void>('salin_teks', { teks }),
  imporSiapkanTeks: (teks: string) => invoke<T.BarisImpor[]>('impor_siapkan_teks', { teks }),
  imporSiapkanRam: () => invoke<T.BarisImpor[]>('impor_siapkan_ram'),
  imporJalankan: (i: number, folderId: string | null) => invoke<T.HasilImpor>('impor_jalankan', { i, folderId }),
  imporSelesai: () => invoke<void>('impor_selesai'),
  jendelaKecil: (hwnd: number, lebar: number) => invoke<[number, number]>('jendela_kecil', { hwnd, lebar }),
  jendelaNormal: (hwnd: number) => invoke<[number, number]>('jendela_normal', { hwnd }),
  susunKecil: (lebar: number) => invoke<number>('susun_kecil', { lebar }),
  semuaJendela: (aksi: 'minimize' | 'restore') => invoke<number>('semua_jendela', { aksi }),
  pratinjauTampil: (hwnd: number, x: number, y: number, w: number, h: number) => invoke<void>('pratinjau_tampil', { hwnd, x, y, w, h }),
  pratinjauTutup: () => invoke<void>('pratinjau_tutup'),
  setKecilAkun: (ids: string[], lebar: number) => invoke<number>('set_kecil_akun', { ids, lebar }),
  daftarMasalah: () => invoke<T.CatatanMasalah[]>('daftar_masalah'),
  hapusMasalah: () => invoke<void>('hapus_masalah'),
  tutupSemuaKlien: (paksa: boolean) => invoke<number>('tutup_semua_klien', { paksa }),
  tutupSatuKlien: (pid: number) => invoke<void>('tutup_satu_klien', { pid }),
  tutupKeTray: () => invoke<boolean>('tutup_ke_tray'),
  masalahMasuk: (id: string, sejak: number) => invoke<string | null>('masalah_masuk', { id, sejak }),
  infoLogRoblox: () => invoke<T.InfoLog>('info_log_roblox'),
  bersihkanLogRoblox: () => invoke<[number, number]>('bersihkan_log_roblox'),
  jadwalMatikan: (menit: number, tutupKlien: boolean) => invoke<number>('jadwal_matikan', { menit, tutupKlien }),
  batalMatikan: () => invoke<void>('batal_matikan'),
  statusMatikan: () => invoke<number | null>('status_matikan'),
  setTutupKeTray: (aktif: boolean) => invoke<boolean>('set_tutup_ke_tray', { aktif }),
  hotkeyDarurat: () => invoke<boolean>('hotkey_darurat'),
  setHotkeyDarurat: (aktif: boolean) => invoke<boolean>('set_hotkey_darurat', { aktif }),
  taruhAkun: (ids: string[], sasaran: string, setelah: boolean) => invoke<number>('taruh_akun', { ids, sasaran, setelah }),
  cadanganBuat: (sandi: string) => invoke<[string, number]>('cadangan_buat', { sandi }),
  cadanganPilih: () => invoke<string>('cadangan_pilih'),
  cadanganPulihkan: (jalur: string, sandi: string, ganti: boolean) => invoke<T.HasilPulihkan>('cadangan_pulihkan', { jalur, sandi, ganti }),
  setHelloSalin: (aktif: boolean) => invoke<boolean>('set_hello_salin', { aktif }),
  lokasiPenyimpanan: () => invoke<string>('lokasi_penyimpanan'),

  multiInstanceStatus: () => invoke<boolean>('multi_instance_status'),
  setMultiInstance: (aktif: boolean) => invoke<boolean>('set_multi_instance', { aktif }),
  statusProteksi: () => invoke<T.ProteksiView>('status_proteksi'),
  statusMuat: () => invoke<T.StatusMuat>('status_muat'),
  ambilAlihMulti: () => invoke<boolean>('ambil_alih_multi'),
  akuiStatusMuat: () => invoke<T.StatusMuat>('akui_status_muat'),
  setProteksiSesi: (aktif: boolean) => invoke<T.ProteksiView>('set_proteksi_sesi', { aktif }),
  periksaAkunJoin: (id: string, sejak: number) => invoke<string | null>('periksa_akun_join', { id, sejak }),
  setRejoinAkun: (ids: string[], aktif: boolean) => invoke<number>('set_rejoin_akun', { ids, aktif }),
  setAfkAkun: (ids: string[], aktif: boolean) => invoke<number>('set_afk_akun', { ids, aktif }),
  setCatatan: (id: string, teks: string) => invoke<string>('set_catatan', { id, teks }),
  setAkunUtama: (id: string, aktif: boolean) => invoke<void>('set_akun_utama', { id, aktif }),
  setKualitasPenuh: (id: string, aktif: boolean) => invoke<void>('set_kualitas_penuh', { id, aktif }),
  argumenLuncur: () => invoke<string>('argumen_luncur'),
  eksporProfil: (ids: string[]) => invoke<string>('ekspor_profil', { ids }),
  discordStatus: () => invoke<T.StatusDiscord>('discord_status'),
  setDiscordWebhook: (url: string) => invoke<T.StatusDiscord>('set_discord_webhook', { url }),
  hapusDiscordWebhook: () => invoke<T.StatusDiscord>('hapus_discord_webhook'),
  setDiscordAcara: (acara: T.AcaraDiscord) => invoke<T.StatusDiscord>('set_discord_acara', { acara }),
  ujiDiscord: () => invoke<void>('uji_discord'),
  setDiscordKehadiran: (aktif: boolean) => invoke<T.StatusDiscord>('set_discord_kehadiran', { aktif }),
  kehadiranHalaman: (nama: string) => invoke<void>('kehadiran_halaman', { nama }),
  aturBahasa: (kode: string) => invoke<void>('atur_bahasa', { kode }),
  kabariBatch: (total: number, masuk: number, gagal: number, dihentikan: boolean) => invoke<void>('kabari_batch', { total, masuk, gagal, dihentikan }),
  imporProfilPilih: () => invoke<T.PratinjauProfil>('impor_profil_pilih'),
  imporProfilTerapkan: (teks: string) => invoke<T.HasilImporProfil>('impor_profil_terapkan', { teks }),
  setArgumenLuncur: (teks: string) => invoke<string>('set_argumen_luncur', { teks }),
  setArgumenAkun: (id: string, teks: string) => invoke<string | null>('set_argumen_akun', { id, teks }),
  setFavorit: (ids: string[], aktif: boolean) => invoke<number>('set_favorit', { ids, aktif }),
  afkMenit: () => invoke<number>('afk_menit'),
  setAfkMenit: (menit: number) => invoke<number>('set_afk_menit', { menit }),
  grafisRingan: () => invoke<boolean>('grafis_ringan'),
  setGrafisRingan: (aktif: boolean) => invoke<boolean>('set_grafis_ringan', { aktif }),
  trimLatar: () => invoke<T.StatusTrim>('trim_latar'),
  setTrimLatar: (aktif: boolean) => invoke<T.StatusTrim>('set_trim_latar', { aktif }),
  statusKebijakan: () => invoke<T.StatusPerforma>('performance_policy_status'),
  setAnggaranRam: (mb: number) => invoke<number>('set_anggaran_ram', { mb }),
  cekAnggaran: (ids: string[]) => invoke<T.CekAnggaran>('cek_anggaran', { ids }),
  setAntreanLuncur: (aktif: boolean) => invoke<void>('set_antrean_luncur', { aktif }),

  jumlahKlien: () => invoke<number>('jumlah_klien_roblox'),
  jumlahJoinSejak: (sejak: number) => invoke<number>('jumlah_join_sejak', { sejak }),
  cariGame: (query: string) => invoke<T.GameHasil[]>('cari_game', { query }),
  jelajahGame: (perangkat: string, negara: string, token: string) => invoke<T.HalamanJelajah>('jelajah_game', { perangkat, negara, token }),
  detailGame: (universeId: number) => invoke<T.DetailGame>('detail_game', { universeId }),
  setFpsAkun: (id: string, fps: number) => invoke<void>('set_fps_akun', { id, fps }),
  setHematAkun: (id: string, hemat: boolean, minimize: boolean, ramMb: number, fps: number) => invoke<void>('set_hemat_akun', { id, hemat, minimize, ramMb, fps }),
  jendelaHemat: (id: string) => invoke<boolean>('jendela_hemat', { id }),
  daftarFolder: () => invoke<T.Folder[]>('daftar_folder'),
  buatFolder: (nama: string, warna: string, ikon: string) => invoke<T.Folder>('buat_folder', { nama, warna, ikon }),
  ubahFolder: (folder: T.Folder) => invoke<number>('ubah_folder', { folder }),
  hapusFolder: (id: string) => invoke<number>('hapus_folder', { id }),
  urutkanFolder: (ids: string[]) => invoke<void>('urutkan_folder', { ids }),
  pindahAkun: (ids: string[], folderId: string | null) => invoke<number>('pindah_akun', { ids, folderId: folderId || null }),
  terapkanPresetFolder: (id: string) => invoke<number>('terapkan_preset_folder', { id }),
  cekUpdate: () => invoke<T.InfoUpdate | null>('cek_update'),
  pasangUpdate: () => invoke<void>('pasang_update'),
  statusUpdate: () => invoke<T.KemajuanUpdate>('status_update'),
  bukaRepo: () => invoke<void>('buka_repo'),
  periksaVersiHemat: (id: string) => invoke<string | null>('periksa_versi_hemat', { id }),
  fpsTerpasang: () => invoke<unknown>('fps_terpasang'),
  daftarVersiRoblox: () => invoke<T.Klien[]>('daftar_versi_roblox'),
  hapusVersiRoblox: (path: string) => invoke<T.HasilHapusVersi>('hapus_versi_roblox', { path }),
  hapusVersiRobloxLama: () => invoke<T.HasilHapusVersi>('hapus_versi_roblox_lama'),
  klienPath: () => invoke<string>('klien_path'),
  klienAkun: () => invoke<T.KlienAkun[]>('klien_akun'),
  targetTerakhir: () => invoke<T.TargetLuncur | null>('target_terakhir'),
  simpanTargetTerakhir: (target: T.TargetLuncur) => invoke<void>('simpan_target_terakhir', { target }),
  daftarServerTersimpan: () => invoke<T.ServerTersimpan[]>('daftar_server_tersimpan'),
  simpanServerTersimpan: (server: T.ServerTersimpan) => invoke<[T.ServerTersimpan[], string]>('simpan_server_tersimpan', { server }),
  ubahNamaServerTersimpan: (id: string, nama: string) => invoke<T.ServerTersimpan[]>('ubah_nama_server_tersimpan', { id, nama }),
  hapusServerTersimpan: (id: string) => invoke<T.ServerTersimpan[]>('hapus_server_tersimpan', { id }),
  sumberKlien: () => invoke<T.LaporanSumber>('sumber_klien'),
  statusPantau: () => invoke<T.StatusMonitor[]>('status_pantau'),
  setKlienPath: (path: string) => invoke<void>('set_klien_path', { path }),
  tambahKlienKustom: () => invoke<string>('tambah_klien_kustom'),
  hapusKlienKustom: (path: string) => invoke<void>('hapus_klien_kustom', { path }),
  sembunyikanUsernameStatus: () => invoke<boolean>('sembunyikan_username_status'),
  setSembunyikanUsername: (aktif: boolean) => invoke<boolean>('set_sembunyikan_username', { aktif }),
  daftarRiwayat: () => invoke<T.Riwayat[]>('daftar_riwayat'),
  hapusRiwayat: () => invoke<void>('hapus_riwayat'),
  perbaikiRiwayat: () => invoke<boolean>('perbaiki_riwayat'),
  luncurkan: (id: string, p: T.ParamLuncur) =>
    invoke<string>('luncurkan', {
      id,
      placeId: p.placeId,
      jobId: p.jobId,
      linkCode: p.linkCode,
      accessCode: p.accessCode || '',
      shareCode: p.shareCode || '',
      gameName: p.gameName || '',
      iconUrl: p.gameIcon || '',
      followUserId: p.followUserId || 0,
      fpsSekali: p.fpsSekali || null,
    }),

  daftarServer: (placeId: number, cursor: string, penuhDulu = false, tanpaPenuh = false) =>
    invoke<T.HalamanServer>('daftar_server', { placeId, cursor: cursor || '', penuhDulu, tanpaPenuh }),
  pilihServerBersama: (id: string, placeId: number, n: number) => invoke<string | null>('pilih_server_bersama', { id, placeId, n }),
  serverSepi: (placeId: number, n: number) => invoke<string[]>('server_sepi', { placeId, n }),
  serverJoinAkun: (id: string, sejak: number) => invoke<T.ServerJoin | null>('server_join_akun', { id, sejak }),
  calonIkuti: (id: string) => invoke<T.CalonIkuti[]>('calon_ikuti', { id }),
  daftarServerPribadiSemua: (placeId: number) => invoke<T.PribadiSemua>('daftar_server_pribadi_semua', { placeId }),
  wilayahServerBanyak: (akunId: string, placeId: number, jobIds: string[]) => invoke<T.WilayahServer[]>('wilayah_server_banyak', { akunId, placeId, jobIds }),
  periksaServer: (akunId: string, placeId: number, jobId: string) => invoke<T.PeriksaServer>('periksa_server', { akunId, placeId, jobId }),
  siapkanPribadiSendiri: (placeId: number, akunIds: string[]) => invoke<T.SiapPribadi>('siapkan_pribadi_sendiri', { placeId, akunIds }),
  buatServerGratis: (akunId: string, universeId: number, placeId: number, nama: string) => invoke<T.PribadiAkun>('buat_server_gratis', { akunId, universeId, placeId, nama }),
  daftarPribadiMilikSemua: () => invoke<T.MilikSemua>('daftar_pribadi_milik_semua'),
  detailServerPribadi: (akunId: string, vipId: number) => invoke<T.DetailVip>('detail_server_pribadi', { akunId, vipId }),
  ubahServerPribadi: (akunId: string, vipId: number, ubah: T.PerubahanVip) => invoke<T.DetailVip>('ubah_server_pribadi', { akunId, vipId, ubah }),
  aturTargetAkun: (ids: string[], target: T.TargetLuncur | null) => invoke<T.Akun[]>('atur_target_akun', { ids, target }),
  versiPlaceTerbaru: (akunId: string, placeId: number) => invoke<number>('versi_place_terbaru', { akunId, placeId }),
  infoServerPribadi: (universeId: number, placeId: number) => invoke<T.InfoPribadi>('info_server_pribadi', { universeId, placeId }),

  cariUser: (teks: string, akunId: string) => invoke<T.HasilCariUser>('cari_user', { teks, akunId }),

  blokirUser: (akunIds: string[], userId: number, buka: boolean) => invoke<T.HasilMassal>('blokir_user', { akunIds, userId, buka }),
  tambahTeman: (akunIds: string[], userId: number) => invoke<T.HasilMassal>('tambah_teman', { akunIds, userId }),
  ubahDisplayName: (akunIds: string[], nama: string) => invoke<T.HasilMassal>('ubah_display_name', { akunIds, nama }),
  daftarBlokir: (akunId: string) => invoke<T.UserDiblokir[]>('daftar_blokir', { akunId }),
  bukaBlokirSemua: (akunId: string) => invoke<number>('buka_blokir_semua', { akunId }),

  daftarJendela: () => invoke<T.JendelaView[]>('daftar_jendela'),
  susunJendela: (mode: 'kisi' | 'bertumpuk', kolom?: number) => invoke<number>('susun_jendela', { mode, kolom: kolom || 0 }),
  pindahJendela: (hwnd: number, x: number, y: number, w: number, h: number) => invoke<void>('pindah_jendela', { hwnd, x, y, w, h }),
  fokusJendela: (hwnd: number) => invoke<void>('fokus_jendela', { hwnd }),

  fflagDaftar: () => invoke<T.FflagView>('fflag_daftar'),
  fflagSimpan: (flags: Record<string, T.NilaiFlag>) => invoke<T.FflagView>('fflag_simpan', { flags }),

  versiRobloxTerbaru: () => invoke<T.VersiRoblox>('versi_roblox_terbaru'),
  periksaVersiRoblox: (hash: string) => invoke<T.VersiRoblox>('periksa_versi_roblox', { hash }),
  unduhVersiRoblox: (hash: string) => invoke<void>('unduh_versi_roblox', { hash }),
  statusUnduhRoblox: () => invoke<T.KemajuanUnduh>('status_unduh_roblox'),
  batalUnduhRoblox: () => invoke<void>('batal_unduh_roblox'),

  jendelaAksi: (aksi: 'seret' | 'kecilkan' | 'maks' | 'tutup' | 'layar_penuh' | 'terlihat' | 'bayangan') => invoke<boolean>('jendela_aksi', { aksi }),
  jendelaPenuh: () => invoke<boolean>('jendela_penuh'),
  jendelaMaks: () => invoke<boolean>('jendela_maks'),

  tema: () => invoke<T.Tema>('tema'),
  setTema: (tema: T.Tema) => invoke<void>('set_tema', { tema }),

  refreshTerjadwal: () => invoke<T.LaporanJadwal>('refresh_terjadwal'),
  jadwalRefresh: (id: string) => invoke<number>('jadwal_refresh', { id }),
}

export const FPS_SAVER = [3, 5, 10, 15, 20, 30, 60]

export const PROFIL_HEMAT = [
  { nama: 'Balanced AFK', fps: 10, ram: 512 },
  { nama: 'Deep AFK', fps: 3, ram: 256 },
]

export function namaProfilHemat(a: Pick<T.Akun, 'hemat' | 'hemat_fps' | 'hemat_ram_mb'>): string | null {
  if (!a.hemat) return null
  if ((a.hemat_fps || 10) === 3 && a.hemat_ram_mb === 512) return 'Deep AFK'
  return PROFIL_HEMAT.find((p) => p.fps === (a.hemat_fps || 10) && p.ram === a.hemat_ram_mb)?.nama || null
}

export const tidur = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const angka = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-US')

export function samarkan(teks: string | null | undefined): string {
  const t = String(teks || '')
  if (t.length <= 1) return '•••'
  return t[0] + '•'.repeat(Math.min(t.length - 1, 9))
}

export function waktuRelatif(detikUnix: number): string | null {
  if (!detikUnix) return null
  const lalu = Math.floor(Date.now() / 1000) - detikUnix
  if (lalu < 60) return 'just now'
  const n = (x: number) => Math.floor(lalu / x)
  if (lalu < 3600) return `${n(60)} min ago`
  if (lalu < 86400) return `${n(3600)}h ago`
  if (lalu < 2592000) return `${n(86400)}d ago`
  return new Date(detikUnix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export { ambilAccessCode, ambilLinkCode, ambilPlaceIdDariUrl, ambilShareCode } from '../lib/tautan'
