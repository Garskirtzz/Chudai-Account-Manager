export type JenisPembatasan = 'ban' | 'warn' | 'terminated' | 'lock' | 'deactivated' | 'other'

export interface Pembatasan {
  jenis: JenisPembatasan
  label: string
  mulai: string
  berakhir: string
  sumber: number
}

export interface ServerTerakhir {
  place_id: number
  job_id: string
  game_name: string
  pribadi: boolean
  at: number
}

export interface Akun {
  id: string
  alias: string
  username: string
  display_name: string
  user_id: number
  robux: number
  premium: boolean
  plus: boolean
  avatar_url: string
  last_launched: number
  last_refreshed: number
  fps_cap: number
  last_error: string
  hemat: boolean
  hemat_minimize: boolean
  hemat_ram_mb: number
  hemat_fps: number
  folder_id: string | null
  auto_rejoin: boolean
  anti_afk: boolean
  catatan: string
  favorit: boolean
  server_terakhir: ServerTerakhir | null
  mulai_kecil: number
  banned: boolean | null
  email_ok: boolean | null
  dua_langkah: string[] | null
  argumen_luncur: string | null
  utama: boolean
  kualitas_penuh: boolean
  pembatasan: Pembatasan | null
}

export interface PresetHemat {
  hemat: boolean
  fps: number
  ram_mb: number
  minimize: boolean
  auto_rejoin: boolean
  anti_afk: boolean
  mulai_kecil: number
}

export interface Folder {
  id: string
  nama: string
  warna: string
  ikon: string
  preset: PresetHemat | null
}

export type CekHasil = 'ok' | 'mati' | 'terikat' | 'verifikasi' | 'dibatasi' | 'sementara'
export interface HasilCek {
  cek: CekHasil
  pesan: string
}

export type StatusMuat =
  | { jenis: 'baik' }
  | { jenis: 'dipulihkan'; cadangan: string; hilang: string[] }
  | { jenis: 'tak_terbaca'; cadangan: string; sebab: string }

export interface ProteksiView {
  setelan: boolean
  aktif: boolean
  berkas: number
  total: number
  catatan: { teks: string; jenis: 'info' | 'salah' | 'benar' }[]
}

export interface BarisImpor {
  label: string
  lewati: string | null
}
export interface HasilImpor {
  status: 'ditambah' | 'diperbarui' | 'gagal' | 'dilewati'
  pesan: string
}

export interface TimpaProfil {
  nama: string
  akun: number
  preset_lama: PresetHemat | null
  preset_baru: PresetHemat | null
  tampilan_berubah: boolean
}
export interface PratinjauProfil {
  teks: string
  timpa: TimpaProfil[]
}
export interface HasilImporProfil {
  baru: number
  diperbarui: number
  akun_berubah: number
  nama: string[]
}

export interface HasilMassal {
  berhasil: number
  gagal: string[]
}
export interface HasilCariUser {
  user_id: number
  username: string
  place_id: number
  game_name: string
}
export interface UserDiblokir {
  user_id: number
  nama: string
}
export interface CalonIkuti {
  user_id: number
  username: string
  display_name: string
  status: string
  lokasi: string
  place_id: number
  job_id: string
  akun_cam: boolean
}

export interface TargetLuncur {
  place_id: string
  game_name: string
  game_icon: string
  job_id: string
  link_code: string
  ikuti: string
  jeda: string
  sama: '' | 'pilih' | 'ikuti' | 'sepi'
  fps: string
}

export interface ServerTersimpan {
  id: string
  nama: string
  place_id: string
  game_name: string
  game_icon: string
  job_id: string
  link_code: string
  dibuat: number
}

export interface Riwayat {
  place_id: number
  game_name: string
  icon_url: string
  account_id: string
  alias: string
  avatar_url: string
  at: number
}

export type JenisMasalah = 'putus' | 'crash' | 'macet' | 'login'
export interface CatatanMasalah {
  akun_id: string
  alias: string
  at: number
  jenis: JenisMasalah
  teks: string
  place_id: number
  game_name: string
  umur_dtk: number
  rincian: string
}

export interface GameHasil {
  place_id: number
  universe_id: number
  name: string
  players: number
  icon_url: string
}

export interface GameJelajah {
  universe_id: number
  place_id: number
  name: string
  players: number
  suka: number
  tak_suka: number
  genre: string
  icon_url: string
}
export interface KategoriJelajah {
  id: string
  nama: string
  info: string
  catatan: string
  games: GameJelajah[]
}
export interface OpsiFilter {
  id: string
  nama: string
  tag: string
}
export interface HalamanJelajah {
  kategori: KategoriJelajah[]
  perangkat: OpsiFilter[]
  negara: OpsiFilter[]
  perangkat_terpilih: string
  negara_terpilih: string
  token: string
}
export interface DetailGame {
  universe_id: number
  place_id: number
  name: string
  deskripsi: string
  pembuat: string
  pembuat_grup: boolean
  pembuat_terverifikasi: boolean
  playing: number
  visits: number
  favorit: number
  max_players: number
  dibuat: string
  diperbarui: string
  genre: string
  subgenre: string
  harga: number
  server_pribadi: boolean
  gambar: string[]
}

export interface ServerInfo {
  job_id: string
  playing: number
  max_players: number
  fps: number
  ping: number
}
export interface HalamanServer {
  servers: ServerInfo[]
  cursor: string
}
export interface ServerPribadi {
  vip_id: number
  nama: string
  pemilik: string
  playing: number
  max_players: number
  job_id: string
  access_code: string
}
export interface ServerPribadiGabungan extends ServerPribadi {
  akses: string[]
  terlihat: string[]
}
export interface PribadiSemua {
  servers: ServerPribadiGabungan[]
  diperiksa: number
  gagal: string[]
}
export interface WilayahServer {
  job_id: string
  wilayah: string
}
export interface PeriksaServer {
  bisa: boolean
  pesan: string
}
export interface CekAnggaran {
  lewat: boolean
  anggaran_mb: number | null
  dipakai_mb: number
  tambahan_mb: number
}
export interface ServerJoin {
  place_id: number
  job_id: string
}
export interface LaporanJadwal {
  diperiksa: number
  diperbarui: number
  dilewati: number
  gagal: string[]
}

export interface HasilPeriksa3d {
  id: string
  versi: string
  usang: boolean
  galat: string | null
}

export interface Avatar3d {
  obj: string
  mtl: string
  tekstur: string[]
  aabb_min: [number, number, number]
  aabb_max: [number, number, number]
  dari_cache: boolean
  usang: boolean
  versi: string
}

export interface SumberKlien {
  pid: number
  cpu: number
  ram_mb: number
  privat_mb: number
  ram_privat_mb: number
  di_luar_ram_mb: number
  hard_fault: number
  page_fault: number
  io_byte: number
  gpu: number | null
  vram_mb: number | null
  bersama_mb: number | null
  baca_bps: number | null
  tulis_bps: number | null
  mulai_unix: number
  ram_bersama_mb: number
  kompresi_perkiraan_mb: number
  fisik_perkiraan_mb: number
}
export interface MemoriSistem {
  total_mb: number | null
  tersedia_mb: number | null
  beban_persen: number | null
  commit_terpakai_mb: number | null
  commit_batas_mb: number | null
  kompresi_mb: number | null
}
export interface LaporanSumber {
  klien: SumberKlien[]
  kompresi_mb: number
  inti: number
  cpu_sistem: number | null
  memori: MemoriSistem
  fisik_semua_perkiraan_mb: number
}

export type StatusPantauJenis = 'memulai' | 'menyambung' | 'di_game' | 'teleport' | 'putus' | 'verifikasi' | 'ditolak' | 'macet'
export interface StatusMonitor {
  akun_id: string
  pid: number | null
  status: StatusPantauJenis
  alasan: string
  sejak: number
  masuk_at: number | null
  place_id: number | null
  game_name: string
  rejoin: number
}

export interface KlienAkun {
  pid: number
  exe: string
  akun_id: string
  alias: string
}

export type StatusKolom = 'diminta' | 'terpasang' | 'gagal' | 'hilang' | 'tidak_berlaku' | 'tidak_diketahui'
export type SumberKebijakan = 'akun' | 'game' | 'folder' | 'global' | 'bawaan'
export interface KebijakanEfektif {
  profil: 'normal' | 'balanced_afk' | 'deep_afk' | 'custom'
  fps: { nilai: number | null; sumber: SumberKebijakan }
  grafis_rendah: { nilai: boolean; sumber: SumberKebijakan }
  ws_mb: { nilai: number | null; sumber: SumberKebijakan }
  prioritas_rendah: { nilai: boolean; sumber: SumberKebijakan }
  jendela: { nilai: 'normal' | 'minimize' | { mungil: { lebar: number } }; sumber: SumberKebijakan }
}
export interface StatusKlienKebijakan {
  akun_id: string
  pid: number
  mulai_proses: number
  diminta: KebijakanEfektif
  ws: StatusKolom
  prioritas: StatusKolom
  fps: StatusKolom
  ws_aktual_mb: number
}
export interface Muat {
  per_klien_mb: number
  jumlah: number | null
}
export interface Kapasitas {
  anggaran_mb: number | null
  dipakai_mb: number
  jumlah_klien: number
  tersedia_mb: number | null
  normal: Muat
  balanced_afk: Muat
  deep_afk: Muat
}
export interface StatusPerforma {
  sistem: MemoriSistem
  klien: StatusKlienKebijakan[]
  kapasitas: Kapasitas
  diukur_pada: number
}

export interface JendelaView {
  hwnd: number
  pid: number
  judul: string
  x: number
  y: number
  w: number
  h: number
  alias: string
  klien_w: number
  klien_h: number
  kecil: boolean
  minimize: boolean
}

export interface Klien {
  folder: string
  path: string
  versi: string
  bawaan: boolean
  diunduh: boolean
  ada: boolean
  ukuran_mb: number
  protokol: boolean
}
export interface HasilHapusVersi {
  dihapus: number
  mb: number
  dilewati: string[]
}
export interface InfoLog {
  berkas: number
  mb: number
  usang_berkas: number
  usang_mb: number
}
export interface VersiRoblox {
  hash: string
  versi: string
  paket: number
  ukuran: number
  terpasang: boolean
}
export interface KemajuanUnduh {
  aktif: boolean
  versi: string
  tahap: string
  paket_ke: number
  jumlah_paket: number
  byte_selesai: number
  byte_total: number
  galat: string
  hasil: string
  dilewati: string[]
}
export type NilaiFlag = string | number | boolean
export interface FflagView {
  kelola: Record<string, NilaiFlag>
  berkas: string
  di_berkas: Record<string, NilaiFlag>
}

export interface Tema {
  mode: '' | 'terang'
  aksen: string
  latar: string
  kartu: string
  sisi: string
}
export interface AcaraDiscord {
  putus: boolean
  crash: boolean
  login: boolean
  rejoin: boolean
  batch: boolean
}
export interface StatusDiscord {
  terpasang: boolean
  samaran: string
  acara: AcaraDiscord
  kehadiran: boolean
}
export interface StatusHello {
  aktif: boolean
  tersedia: boolean
  alasan: string | null
}
export interface InfoUpdate {
  versi: string
  catatan: string
  tanggal: string
}
export interface KemajuanUpdate {
  tahap: 'diam' | 'mengunduh' | 'memasang' | 'galat'
  diunduh: number
  total: number
  pesan: string
}
export interface StatusTrim {
  aktif: boolean
  jumlah: number
  terakhir: number | null
  galat: string | null
}
export interface HasilPulihkan {
  ditambah: number
  diganti: number
  dilewati: number
  gagal: number
  folder_baru: number
  server_baru: number
}

export interface ParamLuncur {
  placeId: number | string
  jobId: string
  linkCode: string
  accessCode?: string
  shareCode?: string
  gameName?: string
  gameIcon?: string
  followUserId?: number
  fpsSekali?: number | null
}

export interface HasilHapus {
  dihapus: string[]
  gagal_keluar: string[]
}
