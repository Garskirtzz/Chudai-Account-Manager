import type * as T from '../types'
import { akunAwal, folderAwal, GAMES, KATALOG_JELAJAH, KATEGORI_JELAJAH, masalahAwal, NEGARA_JELAJAH, PERANGKAT_JELAJAH, riwayatAwal, serverTersimpanAwal, versiAwal } from './data'

const detik = () => Math.floor(Date.now() / 1000)
const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms))
const salin = <X>(x: X): X => JSON.parse(JSON.stringify(x))
const uuid = () => crypto.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

interface Proses {
  pid: number
  akunId: string
  mulai: number
  joinAt: number
  placeId: number
  jobId: string
  game: string
  rejoin: number
  ditolak: boolean
  hwnd: number
  kecil: number
  minimize: boolean
  x: number
  y: number
}


function figurKotak(): T.Avatar3d {
  const v: string[] = [], f: string[] = [], g: string[] = []
  let n = 0
  const kotak = (nama: string, mtl: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]
    for (const q of p) v.push(`v ${q[0]} ${q[1]} ${q[2]}`)
    const sisi = [[1, 2, 3, 4], [6, 5, 8, 7], [5, 1, 4, 8], [2, 6, 7, 3], [4, 3, 7, 8], [5, 6, 2, 1]]
    g.push(`g ${nama}`, `usemtl ${mtl}`)
    for (const s of sisi) g.push(`f ${s.map((i) => i + n).join(' ')}`)
    n += 8
  }
  kotak('Head', 'Kulit', -0.6, 103.2, -0.6, 0.6, 104.4, 0.6)
  kotak('Torso', 'Baju', -1, 101, -0.5, 1, 103.2, 0.5)
  kotak('LeftArm', 'Kulit', -2, 101, -0.5, -1, 103.2, 0.5)
  kotak('RightArm', 'Kulit', 1, 101, -0.5, 2, 103.2, 0.5)
  kotak('LeftLeg', 'Celana', -1, 98.8, -0.5, 0, 101, 0.5)
  kotak('RightLeg', 'Celana', 0, 98.8, -0.5, 1, 101, 0.5)
  const mtl = ['newmtl Kulit', 'Kd 0.95 0.8 0.3', 'newmtl Baju', 'Kd 0.2 0.45 0.8', 'newmtl Celana', 'Kd 0.25 0.25 0.3'].join('\n')
  return { obj: [...v, ...f, ...g].join('\n'), mtl, tekstur: [], aabb_min: [-2, 98.8, -0.6], aabb_max: [2, 104.4, 0.6], dari_cache: true, usang: false, versi: 'contoh-1' }
}

const s = {
  akun: akunAwal(),
  folder: folderAwal(),
  server: serverTersimpanAwal(),
  riwayat: [] as T.Riwayat[],
  masalah: [] as T.CatatanMasalah[],
  gagalKeluar: [] as string[],
  versi: versiAwal(),
  klienPath: '',
  proses: [] as Proses[],
  pidBerikut: 11840,
  multi: true,
  proteksi: true,
  catatanProteksi: [] as ProteksiCatatan[],
  autoRefresh: true,
  sembunyikan: false,
  target: { place_id: '93978595733734', game_name: 'Violence District', game_icon: '', job_id: '', link_code: '', ikuti: '', jeda: '5', sama: '', fps: '' } as T.TargetLuncur | null,
  tolakSekali: new Set<string>(),
  anggaranMb: 0,
  antrean: false,
  layarPenuh: false,
  afkMenit: 15,
  argumen: '--fast',
  grafisRingan: true,
  trim: { aktif: true, jumlah: 3, terakhir: detik() - 540, galat: null } as T.StatusTrim,
  tray: true,
  hotkey: false,
  hello: false,
  discord: { terpasang: false, samaran: '', acara: { putus: true, crash: true, login: true, rejoin: false, batch: true }, kehadiran: true } as T.StatusDiscord,
  kehadiranHalaman: '',
  bahasaRust: 'en',
  gagalPribadi: false,
  serverSepiAda: 6,
  catatanLuncur: '',
  tema: { mode: '', aksen: '#f0f0f0', latar: '#080808', kartu: '#101010', sisi: '#0b0b0b' } as T.Tema,
  matikan: null as number | null,
  fflag: { DFIntTaskSchedulerTargetFps: 60, FFlagDebugGraphicsPreferD3D11: true, FIntRenderShadowIntensity: 0 } as Record<string, T.NilaiFlag>,
  fflagBerkas: { DFIntTaskSchedulerTargetFps: 60, FFlagDebugGraphicsPreferD3D11: true, FIntRenderShadowIntensity: 0, FFlagHandleAltEnterFullscreenManually: false } as Record<string, T.NilaiFlag>,
  unduh: null as null | T.KemajuanUnduh,
  update: { tahap: 'diam', diunduh: 0, total: 0, pesan: '' } as T.KemajuanUpdate,
  impor: [] as string[],
  blokir: new Map<string, T.UserDiblokir[]>(),
  statusMuat: { jenis: 'baik' } as T.StatusMuat,
  loginTerputus: false,
  panggilan: [] as { cmd: string; args: Record<string, unknown>; t: number }[],
  gagal: {} as Record<string, string>,
  tunda: {} as Record<string, number>,
  jawab: {} as Record<string, unknown>,
  jawabPerId: {} as Record<string, Record<string, unknown>>,
  profilTimpa: true,
  log: { berkas: 184, mb: 96.4, usang_berkas: 151, usang_mb: 81.2 } as T.InfoLog,
}
type ProteksiCatatan = { teks: string; jenis: 'info' | 'salah' | 'benar' }
s.riwayat = riwayatAwal(s.akun)
s.masalah = masalahAwal(s.akun)
s.tolakSekali.add(s.akun.find((a) => a.alias === 'Fruit Farm 4')!.id)

const awalUji = (globalThis as unknown as { __camMockAwal?: Partial<typeof s> }).__camMockAwal
if (awalUji && typeof awalUji === 'object') Object.assign(s, awalUji)

for (const alias of ['Main', 'Alt Killer', 'Alt Surv 1', 'Alt Surv 2', 'Fruit Farm 1', 'Fruit Farm 2']) {
  const a = s.akun.find((x) => x.alias === alias)!
  const g = GAMES.find((x) => x.place_id === a.server_terakhir?.place_id) ?? GAMES[0]
  const umur = alias.startsWith('Fruit') ? 3 * 3600 : 24 * 60
  s.proses.push(prosesBaru(a, g.place_id, a.server_terakhir?.job_id ?? uuid(), g.name, detik() - umur, alias === 'Alt Surv 1' ? 2 : alias.startsWith('Fruit') ? 1 : 0))
}

const DATA_UJI = ['demo', 'worst', 'follow', 'nogame', 'one', 'empty', 'many'] as const
const dataUji = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('data')
if (dataUji && dataUji !== 'demo') {
  const cari = (alias: string) => s.akun.find((x) => x.alias === alias)
  const alt1 = cari('Alt Surv 1'), killer = cari('Alt Killer'), farm2 = cari('Fruit Farm 2')
  if (alt1) alt1.alias = 'Aleksandra Wiśniewska-Kowalczyk alt 3 (VD trading, do not launch)'
  if (killer) { killer.alias = 'Jo'; killer.username = 'xX_ShadowSlayer2009' }
  if (farm2) farm2.last_error = 'Cookie rejected by Roblox (signed out). Sign in again.'
  const alts = s.folder.find((f) => f.id === 'f-alts')
  if (alts) alts.nama = 'Blox Fruits farm, second Sea alts (old)'
  s.target = { place_id: '126884695634066', game_name: '[🎃 UPDATE] Grow a Garden 🌱 Halloween Event!', game_icon: '', job_id: '', link_code: '48211933077115620411', ikuti: '', jeda: '5', sama: '', fps: '' }
  if (dataUji === 'follow') s.target = { ...s.target, ikuti: 'xX_ShadowSlayer2009' }
  if (dataUji === 'nogame') s.target = null
  if (dataUji === 'one') { s.akun = s.akun.slice(0, 1); s.proses = s.proses.filter((p) => p.akunId === s.akun[0].id) }
  if (dataUji === 'empty') { s.akun = []; s.proses = [] }
  if (dataUji === 'many') {
    const asal = s.akun
    s.akun = Array.from({ length: 300 }, (_, i) => ({ ...asal[i % asal.length], id: `uji-${i}`, alias: `${asal[i % asal.length].alias} ${Math.floor(i / asal.length) + 1}`, utama: i === 0 }))
  }
}
if (dataUji && typeof document !== 'undefined') {
  const pasang = () => {
    const bar = document.createElement('div')
    bar.setAttribute('data-boleh-potong', '')
    bar.style.cssText = 'position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:2px;padding:2px;border-radius:8px;background:#e5e5e5;font:12px system-ui,sans-serif'
    for (const d of DATA_UJI) {
      const x = document.createElement('a')
      x.textContent = d === 'demo' ? 'Demo data' : d === 'worst' ? 'Worst case' : d
      x.href = `?data=${d}`
      x.onclick = (e) => { e.preventDefault(); location.href = `?data=${d}${location.hash}` }
      x.style.cssText = `white-space:nowrap;padding:3px 8px;border-radius:6px;color:#111;text-decoration:none;${d === dataUji ? 'background:#fff' : ''}`
      bar.append(x)
    }
    document.body.append(bar)
  }
  if (document.body) pasang()
  else addEventListener('DOMContentLoaded', pasang)
}

function prosesBaru(a: T.Akun, placeId: number, jobId: string, game: string, mulai: number, rejoin = 0): Proses {
  const pid = s.pidBerikut
  s.pidBerikut += 412 + (pid % 37)
  const n = s.proses.length
  return { pid, akunId: a.id, mulai, joinAt: mulai + 3, placeId, jobId, game, rejoin, ditolak: false, hwnd: 0x40000 + pid, kecil: a.mulai_kecil, minimize: false, x: 40 + (n % 4) * 340, y: 60 + Math.floor(n / 4) * 220 }
}

function akun(id: string): T.Akun {
  const a = s.akun.find((x) => x.id === id)
  if (!a) throw 'Account not found.'
  return a
}

function terapkanPreset(a: T.Akun, p: T.PresetHemat | null) {
  if (!p) return false
  const sebelum = JSON.stringify(a)
  a.auto_rejoin = p.auto_rejoin
  a.anti_afk = p.anti_afk
  if (!a.utama && !a.kualitas_penuh) {
    a.hemat = p.hemat
    a.hemat_fps = p.hemat ? Math.min(240, Math.max(3, p.fps || 10)) : a.hemat_fps
    a.hemat_ram_mb = p.hemat ? (p.ram_mb ? Math.min(4096, Math.max(128, p.ram_mb)) : 0) : a.hemat_ram_mb
    a.hemat_minimize = p.minimize
    a.mulai_kecil = p.mulai_kecil ? Math.min(1280, Math.max(160, p.mulai_kecil)) : 0
  }
  return JSON.stringify(a) !== sebelum
}

function hasilMassal(ids: string[], gagalJika?: (a: T.Akun) => string | null): T.HasilMassal {
  const pakai = s.akun.filter((a) => ids.includes(a.id))
  if (!pakai.length) throw 'No usable account selected.'
  const gagal: string[] = []
  for (const a of pakai) {
    const g = gagalJika?.(a)
    if (g) gagal.push(`${a.alias}: ${g}`)
  }
  return { berhasil: pakai.length - gagal.length, gagal }
}

function catatRiwayat(a: T.Akun, p: Proses) {
  s.riwayat.unshift({ place_id: p.placeId, game_name: p.game, icon_url: '', account_id: a.id, alias: a.alias, avatar_url: '', at: p.joinAt })
  a.last_launched = p.mulai
  a.server_terakhir = { place_id: p.placeId, job_id: p.jobId, game_name: p.game, pribadi: false, at: p.joinAt }
}

function ramFisik(p: Proses, a: T.Akun | undefined) {
  const w = Math.sin(Date.now() / 7000 + p.pid) * 0.04
  const dasar = a?.hemat ? Math.min(a.hemat_ram_mb || 900, 900) * 0.92 : 1450 + (p.pid % 700)
  return Math.round(dasar * (1 + w))
}

function sumber(): T.LaporanSumber {
  const t = detik()
  const klien = s.proses.filter((p) => t >= p.mulai).map((p) => {
    const a = s.akun.find((x) => x.id === p.akunId)
    const fisik = ramFisik(p, a)
    const hemat = !!a?.hemat
    const cpu = Number(((hemat ? 1.2 : 7.5) + Math.abs(Math.sin(Date.now() / 3000 + p.pid)) * (hemat ? 1.4 : 6)).toFixed(1))
    const kompresi = hemat ? Math.round(300 + (p.pid % 200)) : Math.round(p.pid % 60)
    return {
      pid: p.pid, cpu, ram_mb: fisik + 40, privat_mb: Math.round(fisik * (hemat ? 2.2 : 1.25)), ram_privat_mb: Math.round(fisik * 0.82),
      di_luar_ram_mb: hemat ? 640 : 90, hard_fault: 12, page_fault: 30000 + p.pid, io_byte: 1_200_000,
      gpu: Number((hemat ? 0.8 : 11 + (p.pid % 9)).toFixed(1)), vram_mb: hemat ? 140 : 610 + (p.pid % 300), bersama_mb: 180,
      baca_bps: hemat ? 900 : 42_000, tulis_bps: hemat ? 300 : 12_000, mulai_unix: p.mulai,
      ram_bersama_mb: Math.round(fisik * 0.18), kompresi_perkiraan_mb: kompresi, fisik_perkiraan_mb: fisik,
    }
  })
  const fisikSemua = klien.reduce((x, k) => x + k.fisik_perkiraan_mb, 0)
  const total = 16_310
  const terpakai = 5200 + fisikSemua
  return {
    klien, kompresi_mb: 1400, inti: 12, cpu_sistem: Number((18 + klien.reduce((x, k) => x + k.cpu, 0)).toFixed(1)),
    memori: { total_mb: total, tersedia_mb: total - terpakai, beban_persen: Math.round((terpakai / total) * 100), commit_terpakai_mb: terpakai * 1.6, commit_batas_mb: 32_000, kompresi_mb: 1400 },
    fisik_semua_perkiraan_mb: fisikSemua,
  }
}

function statusPantau(): T.StatusMonitor[] {
  const t = detik()
  return s.proses.map((p) => {
    const a = s.akun.find((x) => x.id === p.akunId)
    let status: T.StatusPantauJenis = t < p.joinAt ? 'menyambung' : 'di_game'
    if (p.ditolak) status = 'ditolak'
    if (a?.alias === 'Fruit Farm 2') status = 'macet'
    if (a?.alias === 'Alt Surv 1' && t - p.mulai > 20 && t - p.mulai < 45) status = 'putus'
    return { akun_id: p.akunId, pid: p.pid, status, alasan: status === 'macet' ? 'The window stopped responding 40 s ago.' : status === 'putus' ? 'Disconnected (error 277). Rejoining in 10 s.' : '', sejak: p.mulai, masuk_at: t >= p.joinAt ? p.joinAt : null, place_id: p.placeId, game_name: p.game, rejoin: p.rejoin }
  })
}

function kapasitas(): T.Kapasitas {
  const r = sumber()
  const tersedia = r.memori.tersedia_mb ?? 0
  const sisa = Math.max(0, tersedia - (s.anggaranMb ? 0 : 2048))
  return {
    anggaran_mb: s.anggaranMb || null, dipakai_mb: r.fisik_semua_perkiraan_mb, jumlah_klien: r.klien.length, tersedia_mb: tersedia,
    normal: { per_klien_mb: 1700, jumlah: Math.floor(sisa / 1700) },
    balanced_afk: { per_klien_mb: 520, jumlah: Math.floor(sisa / 520) },
    deep_afk: { per_klien_mb: 290, jumlah: Math.floor(sisa / 290) },
  }
}

function kebijakan(): T.StatusPerforma {
  const r = sumber()
  return {
    sistem: r.memori,
    klien: s.proses.map((p) => {
      const a = s.akun.find((x) => x.id === p.akunId)!
      const hemat = a.hemat
      const sumberK: T.SumberKebijakan = a.folder_id && s.folder.find((f) => f.id === a.folder_id)?.preset ? 'folder' : 'akun'
      return {
        akun_id: a.id, pid: p.pid, mulai_proses: p.mulai,
        diminta: {
          profil: hemat ? (a.hemat_fps === 3 ? 'deep_afk' : 'balanced_afk') : 'normal',
          fps: { nilai: hemat ? a.hemat_fps || 10 : a.fps_cap || null, sumber: sumberK },
          grafis_rendah: { nilai: hemat, sumber: sumberK },
          ws_mb: { nilai: hemat && a.hemat_ram_mb ? a.hemat_ram_mb : null, sumber: sumberK },
          prioritas_rendah: { nilai: hemat, sumber: sumberK },
          jendela: { nilai: a.hemat_minimize ? 'minimize' : a.mulai_kecil ? { mungil: { lebar: a.mulai_kecil } } : 'normal', sumber: sumberK },
        },
        ws: hemat && a.hemat_ram_mb ? 'terpasang' : 'tidak_berlaku', prioritas: hemat ? 'terpasang' : 'tidak_berlaku', fps: hemat || a.fps_cap ? 'terpasang' : 'tidak_berlaku',
        ws_aktual_mb: ramFisik(p, a),
      }
    }),
    kapasitas: kapasitas(),
    diukur_pada: detik(),
  }
}

function jendela(): T.JendelaView[] {
  return s.proses.map((p) => {
    const a = s.akun.find((x) => x.id === p.akunId)!
    const w = p.kecil || 800
    const h = p.kecil ? Math.ceil((p.kecil * 9) / 16) : 600
    return { hwnd: p.hwnd, pid: p.pid, judul: 'Roblox', x: p.x, y: p.y, w: w + 16, h: h + 39, alias: a.alias, klien_w: w, klien_h: h, kecil: !!p.kecil, minimize: p.minimize }
  })
}

function ubahHemat(a: T.Akun, hemat: boolean, minimize: boolean, ramMb: number, fps: number) {
  if (hemat && !a.hemat && !a.mulai_kecil) a.mulai_kecil = 320
  a.hemat = hemat
  a.hemat_minimize = minimize
  a.hemat_ram_mb = ramMb ? Math.min(4096, Math.max(128, ramMb)) : 0
  a.hemat_fps = fps ? Math.min(240, Math.max(3, fps)) : 0
}

const H: Record<string, (a: Record<string, any>) => unknown> = {
  daftar_akun: () => s.akun,
  tambah_akun: (x) => {
    if (!String(x.cookie || '').trim()) throw 'Cookie is empty.'
    if (!String(x.cookie).includes('_|WARNING')) throw 'That is not a .ROBLOSECURITY cookie. It starts with _|WARNING:-DO-NOT-SHARE-THIS.'
    const n = s.akun.length + 1
    const username = `newAccount_${String(n).padStart(2, '0')}`
    const baru: T.Akun = { ...akunAwal()[19], id: uuid(), alias: x.alias?.trim() || username, username, display_name: username, user_id: 4_100_000_000 + n, folder_id: x.folderId, banned: false, last_launched: 0, catatan: '' }
    const f = s.folder.find((y) => y.id === x.folderId)
    if (f) terapkanPreset(baru, f.preset)
    s.akun.push(baru)
    return baru
  },
  login_browser: async (x) => {
    await tidur(1800)
    const n = s.akun.length + 1
    const username = `browserLogin_${n}`
    const baru: T.Akun = { ...akunAwal()[19], id: uuid(), alias: x.alias?.trim() || username, username, display_name: username, user_id: 4_200_000_000 + n, folder_id: x.folderId, banned: false, last_launched: 0 }
    s.akun.push(baru)
    return `${username} added.`
  },
  login_terputus: () => s.loginTerputus,
  tutup_login_browser: () => undefined,
  hapus_akun_banyak: (x) => {
    const ids = new Set<string>(x.ids)
    const hapus = s.akun.filter((a) => ids.has(a.id))
    const gagal_keluar = x.keluarRoblox ? hapus.filter((a) => s.gagalKeluar.includes(a.alias)).map((a) => `${a.alias} (Roblox answered 500)`) : []
    s.proses = s.proses.filter((p) => !ids.has(p.akunId)) 
    s.akun = s.akun.filter((a) => !ids.has(a.id))
    s.riwayat = s.riwayat.filter((r) => !ids.has(r.account_id))
    s.masalah = s.masalah.filter((m) => !ids.has(m.akun_id))
    return { dihapus: hapus.map((a) => a.alias), gagal_keluar }
  },
  ubah_alias: (x) => { akun(x.id).alias = String(x.alias).trim() || akun(x.id).username },
  avatar_3d: () => figurKotak(),
  avatar_badan: () => '',
  avatar_3d_periksa: (x) => (x.ids as string[]).map((id) => ({ id, versi: 'contoh-1', usang: false, galat: null })),
  segarkan_akun: async (x) => {
    await tidur(350)
    const a = akun(x.id)
    a.banned = a.pembatasan?.jenis === 'ban'
    a.email_ok ??= true
    a.dua_langkah ??= ['Email']
    if (a.last_error) return { cek: 'mati', pesan: `${a.alias}: ${a.last_error}` }
    if (a.pembatasan) return { cek: 'dibatasi', pesan: `${a.alias} is restricted by Roblox.` }
    return { cek: 'ok', pesan: '' }
  },
  perbarui_cookie: async (x) => {
    await tidur(500)
    const a = akun(x.id)
    if (a.last_error) throw `${a.alias}: Roblox rejected the cookie, so it can't be refreshed. Sign in again.`
    a.last_refreshed = detik()
    return a
  },
  auto_refresh_status: () => s.autoRefresh,
  set_auto_refresh: (x) => (s.autoRefresh = !!x.aktif),
  refresh_terjadwal: () => ({ diperiksa: s.akun.length, diperbarui: 0, dilewati: s.akun.length, gagal: [] }),
  jadwal_refresh: () => detik() + 86400,
  salin_cookie: async () => { if (s.hello) await tidur(600); return 30 },
  hello_status: () => ({ aktif: s.hello, tersedia: true, alasan: null }),
  set_hello_salin: async (x) => { await tidur(500); return (s.hello = !!x.aktif) },
  buka_situs: () => undefined,
  salin_teks: (x) => { void navigator.clipboard?.writeText(String(x.teks)).catch(() => undefined) },
  set_favorit: (x) => { for (const a of s.akun) if (x.ids.includes(a.id)) a.favorit = !!x.aktif; return x.ids.length },
  set_akun_utama: (x) => { akun(x.id).utama = !!x.aktif },
  set_kualitas_penuh: (x) => { akun(x.id).kualitas_penuh = !!x.aktif },
  set_catatan: (x) => (akun(x.id).catatan = String(x.teks).trimEnd().slice(0, 2000)),
  set_argumen_akun: (x) => {
    const t = String(x.teks).trim()
    const buruk = /["&|<>^]/.exec(t)
    if (buruk) throw `Launch arguments can't contain ${buruk[0]}`
    akun(x.id).argumen_luncur = t || null
    return t || null
  },
  set_fps_akun: (x) => { akun(x.id).fps_cap = x.fps ? Math.min(1000, Math.max(10, x.fps)) : 0 },
  set_hemat_akun: (x) => ubahHemat(akun(x.id), !!x.hemat, !!x.minimize, Number(x.ramMb) || 0, Number(x.fps) || 0),
  set_rejoin_akun: (x) => { for (const a of s.akun) if (x.ids.includes(a.id)) a.auto_rejoin = !!x.aktif; return x.ids.length },
  set_afk_akun: (x) => { for (const a of s.akun) if (x.ids.includes(a.id)) a.anti_afk = !!x.aktif; return x.ids.length },
  set_kecil_akun: (x) => { for (const a of s.akun) if (x.ids.includes(a.id)) a.mulai_kecil = x.lebar ? Math.min(1280, Math.max(160, x.lebar)) : 0; return x.ids.length },
  afk_menit: () => s.afkMenit,
  set_afk_menit: (x) => (s.afkMenit = x.menit ? Math.min(19, Math.max(1, x.menit)) : 15),
  sembunyikan_username_status: () => s.sembunyikan,
  set_sembunyikan_username: (x) => (s.sembunyikan = !!x.aktif),
  taruh_akun: (x) => {
    const pindah = s.akun.filter((a) => x.ids.includes(a.id))
    const sasaran = akun(x.sasaran)
    let berubah = 0
    for (const a of pindah) if (a.folder_id !== sasaran.folder_id) { a.folder_id = sasaran.folder_id; berubah++ }
    s.akun = s.akun.filter((a) => !x.ids.includes(a.id))
    const i = s.akun.findIndex((a) => a.id === x.sasaran)
    s.akun.splice(x.setelah ? i + 1 : i, 0, ...pindah)
    return berubah
  },
  status_muat: () => s.statusMuat,
  akui_status_muat: () => (s.statusMuat = { jenis: 'baik' }),
  lokasi_penyimpanan: () => 'C:\\Users\\Player\\AppData\\Roaming\\com.chudai.accountmanager\\accounts.json',

  impor_siapkan_teks: (x) => {
    const baris = String(x.teks).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!baris.some((l) => l.includes('_|WARNING'))) throw 'No .ROBLOSECURITY cookies found. Each starts with _|WARNING:-DO-NOT-SHARE-THIS.'
    s.impor = baris
    return baris.map((l, i) => ({ label: `Line ${i + 1}`, lewati: l.includes('_|WARNING') ? null : 'No cookie on this line.' }))
  },
  impor_siapkan_ram: async () => {
    await tidur(300)
    s.impor = ['ram-1', 'ram-2', 'ram-3']
    return s.impor.map((_, i) => ({ label: `Account ${i + 1}`, lewati: null }))
  },
  impor_jalankan: async (x) => {
    await tidur(500)
    if (x.i >= s.impor.length) throw 'The import list changed; start the import again.'
    if (x.i === 1) return { status: 'diperbarui', pesan: 'Already in the list as Spare 2: cookie renewed.' }
    if (x.i === 2) return { status: 'gagal', pesan: 'Roblox rejected this cookie (signed out).' }
    const n = s.akun.length + 1
    const username = `imported_${n}`
    s.akun.push({ ...akunAwal()[19], id: uuid(), alias: username, username, display_name: username, user_id: 4_300_000_000 + n, folder_id: x.folderId ?? null, banned: false, last_launched: 0 })
    return { status: 'ditambah', pesan: `Added as ${username}.` }
  },
  impor_selesai: () => { s.impor = [] },

  daftar_folder: () => s.folder,
  buat_folder: (x) => {
    const nama = String(x.nama).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40)
    if (!nama) throw 'Give the folder a name.'
    if (s.folder.some((f) => f.nama.toLowerCase() === nama.toLowerCase())) throw `A folder named "${nama}" already exists.`
    const f: T.Folder = { id: uuid(), nama, warna: x.warna || '', ikon: x.ikon || '', preset: null }
    s.folder.push(f)
    return f
  },
  ubah_folder: (x) => {
    const f = s.folder.find((y) => y.id === x.folder.id)
    if (!f) throw 'Folder not found.'
    const nama = String(x.folder.nama).trim().slice(0, 40)
    if (!nama) throw 'Give the folder a name.'
    if (s.folder.some((y) => y.id !== f.id && y.nama.toLowerCase() === nama.toLowerCase())) throw `A folder named "${nama}" already exists.`
    Object.assign(f, { ...x.folder, nama })
    let n = 0
    if (f.preset) for (const a of s.akun) if (a.folder_id === f.id && terapkanPreset(a, f.preset)) n++
    return n
  },
  hapus_folder: (x) => {
    const n = s.akun.filter((a) => a.folder_id === x.id).length
    for (const a of s.akun) if (a.folder_id === x.id) a.folder_id = null
    s.folder = s.folder.filter((f) => f.id !== x.id)
    return n
  },
  urutkan_folder: (x) => { s.folder = x.ids.map((id: string) => s.folder.find((f) => f.id === id)).filter(Boolean) as T.Folder[] },
  pindah_akun: (x) => {
    const f = s.folder.find((y) => y.id === x.folderId) ?? null
    let n = 0
    for (const a of s.akun) if (x.ids.includes(a.id) && a.folder_id !== (x.folderId ?? null)) { a.folder_id = x.folderId ?? null; terapkanPreset(a, f?.preset ?? null); n++ }
    return n
  },
  terapkan_preset_folder: (x) => {
    const f = s.folder.find((y) => y.id === x.id)
    if (!f) throw 'Folder not found.'
    let n = 0
    for (const a of s.akun) if (a.folder_id === f.id && terapkanPreset(a, f.preset)) n++
    return n
  },
  ekspor_profil: async (x) => { await tidur(300); const f = s.folder.find((y) => y.id === x.ids[0]); return `C:\\Users\\Player\\Documents\\${f?.nama ?? 'folder'}.camprofile` },
  impor_profil_pilih: async () => {
    await tidur(300)
    if (!s.profilTimpa) return { teks: '{"folder":[{"nama":"Event"}]}', timpa: [] }
    return { teks: '{"folder":[{"nama":"Farm"},{"nama":"Event"}]}', timpa: [{ nama: 'Farm', akun: s.akun.filter((a) => a.folder_id === 'f-farm').length, preset_lama: s.folder.find((f) => f.id === 'f-farm')?.preset ?? null, preset_baru: { hemat: true, fps: 10, ram_mb: 256, minimize: false, auto_rejoin: true, anti_afk: true, mulai_kecil: 0 }, tampilan_berubah: false }] }
  },
  impor_profil_terapkan: (x) => {
    const teks = String(x.teks || '')
    const nama: string[] = []
    let baru = 0, diperbarui = 0, n = 0
    if (teks.includes('"Farm"')) {
      const farm = s.folder.find((f) => f.id === 'f-farm')
      if (farm) {
        farm.preset = { hemat: true, fps: 10, ram_mb: 256, minimize: false, auto_rejoin: true, anti_afk: true, mulai_kecil: 0 }
        for (const a of s.akun) if (a.folder_id === farm.id && terapkanPreset(a, farm.preset)) n++
        diperbarui++
        nama.push('Farm')
      }
    }
    if (teks.includes('"Event"')) {
      if (!s.folder.some((f) => f.nama === 'Event')) { s.folder.push({ id: uuid(), nama: 'Event', warna: 'pink', ikon: 'bintang', preset: null }); baru++ } else diperbarui++
      nama.push('Event')
    }
    return { baru, diperbarui, akun_berubah: n, nama }
  },

  multi_instance_status: () => s.multi,
  set_multi_instance: (x) => (s.multi = !!x.aktif),
  ambil_alih_multi: () => (s.multi = true),
  status_proteksi: () => {
    const c = s.catatanProteksi
    s.catatanProteksi = []
    const total = s.proses.length
    return { setelan: s.proteksi, aktif: s.proteksi && s.multi && total > 0, berkas: total, total, catatan: c }
  },
  set_proteksi_sesi: (x) => { s.proteksi = !!x.aktif; return H.status_proteksi({}) },

  set_antrean_luncur: (x) => { s.antrean = !!x.aktif },
  cek_anggaran: (x) => {
    const r = sumber()
    const tambahan = s.akun.filter((a) => x.ids.includes(a.id)).reduce((n, a) => n + (a.hemat ? 520 : 1700), 0)
    const lewat = !!s.anggaranMb && r.fisik_semua_perkiraan_mb + tambahan > s.anggaranMb
    return { lewat, anggaran_mb: s.anggaranMb || null, dipakai_mb: r.fisik_semua_perkiraan_mb, tambahan_mb: tambahan }
  },
  jumlah_klien_roblox: () => s.proses.filter((p) => detik() >= p.mulai).length,
  jumlah_join_sejak: (x) => s.proses.filter((p) => !p.ditolak && p.joinAt >= x.sejak && detik() >= p.joinAt).length,
  masalah_masuk: (x) => {
    const p = s.proses.find((y) => y.akunId === x.id && y.mulai >= x.sejak)
    return p?.ditolak && detik() >= p.joinAt ? 'tolak' : null
  },
  periksa_akun_join: () => null,
  server_join_akun: (x) => {
    const p = s.proses.find((y) => y.akunId === x.id && y.mulai >= x.sejak)
    return p && detik() >= p.joinAt ? { place_id: p.placeId, job_id: p.jobId } : null
  },
  pilih_server_bersama: async () => { await tidur(700); return '9c1d4f2a-7781-4e21-9c1d-5b77a0e21c3d' },
  periksa_server: async () => { await tidur(300); return { bisa: true, pesan: '' } },
  luncurkan: async (x) => {
    const a = akun(x.id)
    if (a.pembatasan) throw `${a.alias} is restricted by Roblox and can't join games.`
    if (a.last_error) throw `${a.alias}: Roblox rejected the cookie. Sign in again with Add Account → Log in with browser.`
    if (s.proses.some((p) => p.akunId === a.id)) throw `${a.alias} already has a Roblox client open. A second one would sign it out of the first; close that client first.`
    if (!s.multi && s.proses.length) throw 'Another Roblox client is already open and multi-instance is off.'
    const g = GAMES.find((y) => String(y.place_id) === String(x.placeId)) ?? { place_id: Number(x.placeId) || GAMES[0].place_id, name: x.gameName || `Place ${x.placeId}` }
    const p = prosesBaru(a, g.place_id, x.jobId || uuid(), x.gameName || g.name, detik() + 1)
    p.joinAt = p.mulai + 3
    if (s.tolakSekali.has(a.id)) { s.tolakSekali.delete(a.id); p.ditolak = true; p.joinAt = p.mulai + 2 }
    s.proses.push(p)
    if (!p.ditolak) setTimeout(() => catatRiwayat(a, p), (p.joinAt - detik() + 0.2) * 1000)
    else setTimeout(() => { s.proses = s.proses.filter((y) => y !== p) }, 6000)
    return s.catatanLuncur
  },
  jendela_hemat: (x) => { const p = s.proses.find((y) => y.akunId === x.id); if (p) p.minimize = true; return !!p },
  periksa_versi_hemat: () => null,
  kabari_batch: () => undefined,
  target_terakhir: () => s.target,
  simpan_target_terakhir: (x) => { s.target = x.target },
  cari_user: async (x) => {
    await tidur(400)
    const t = String(x.teks || '').trim()
    if (!t) throw 'Enter a username or profile link.'
    const cam = s.akun.find((a) => a.username.toLowerCase() === t.toLowerCase())
    const p = cam && s.proses.find((y) => y.akunId === cam.id)
    const main = t.toLowerCase() === 'builderman'
    return { user_id: cam?.user_id ?? 156, username: cam?.username ?? (main ? 'builderman' : t), place_id: p?.placeId ?? (main ? GAMES[1].place_id : 0), game_name: p?.game ?? (main ? GAMES[1].name : '') }
  },
  calon_ikuti: async () => {
    await tidur(500)
    const cam = s.proses.slice(0, 3).map((p) => {
      const a = akun(p.akunId)
      return { user_id: a.user_id, username: a.username, display_name: a.display_name, status: 'InGame', lokasi: p.game, place_id: p.placeId, job_id: p.jobId, akun_cam: true }
    })
    return [
      { user_id: 98213, username: 'friend_killer', display_name: 'Killer Main', status: 'InGame', lokasi: GAMES[0].name, place_id: GAMES[0].place_id, job_id: '', akun_cam: false },
      { user_id: 77120, username: 'studio_dev', display_name: 'studio_dev', status: 'InStudio', lokasi: '', place_id: 0, job_id: '', akun_cam: false },
      { user_id: 55001, username: 'afk_buddy', display_name: 'AFK Buddy', status: 'Online', lokasi: '', place_id: 0, job_id: '', akun_cam: false },
      ...cam,
    ]
  },

  cari_game: async (x) => {
    await tidur(300)
    const q = String(x.query).toLowerCase()
    return GAMES.filter((g) => g.name.toLowerCase().includes(q))
  },
  jelajah_game: async (x) => {
    await tidur(450)
    const perangkat = String(x.perangkat || '') || 'computer'
    const negara = String(x.negara || '') || 'id'
    const mulai = Number(x.token) || 0
    let benih = [...`${perangkat}|${negara}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483646, 7) + 1
    const acak = () => ((benih = (benih * 16807) % 2147483647) / 2147483647)
    const kategori = KATEGORI_JELAJAH.slice(mulai, mulai + 4).map((k, ki) => {
      const n = k.id === 'trending-in-shooter' ? 9 : 24 + ((ki * 13) % 20)
      const genre = k.id === 'trending-in-rpg' ? 'RPG' : k.id === 'trending-in-shooter' ? 'Shooter' : ''
      const pool = genre ? KATALOG_JELAJAH.filter((g) => g.genre === genre) : KATALOG_JELAJAH
      const ambil = pool.map((g) => ({ g, r: acak() })).sort((a, b) => a.r - b.r).map((v) => v.g).slice(0, n)
      if (k.id === 'top-playing-now' || k.id === 'most-popular') ambil.sort((a, b) => b.players - a.players)
      return { ...k, games: ambil }
    })
    return {
      kategori,
      perangkat: mulai ? [] : PERANGKAT_JELAJAH,
      negara: mulai ? [] : NEGARA_JELAJAH,
      perangkat_terpilih: perangkat,
      negara_terpilih: negara,
      token: mulai + 4 >= KATEGORI_JELAJAH.length ? '' : String(mulai + 4),
    }
  },
  detail_game: async (x) => {
    await tidur(350)
    const i = KATALOG_JELAJAH.findIndex((v) => v.universe_id === Number(x.universeId))
    if (i < 0) throw 'Roblox has no details for this game.'
    const g = KATALOG_JELAJAH[i]
    return {
      universe_id: g.universe_id,
      place_id: g.place_id,
      name: g.name,
      deskripsi: `${g.name} is a made-up game from the mock catalog.\n\nBuild, trade and explore with friends. Weekly events, a ranked ladder and seasonal maps.`,
      pembuat: i % 3 ? 'Lantern Works Studio' : 'pixel_harbor',
      pembuat_grup: i % 3 !== 0,
      pembuat_terverifikasi: i % 2 === 0,
      playing: g.players,
      visits: g.players * 4100 + g.suka * 37,
      favorit: g.suka * 11,
      max_players: [8, 12, 20, 25, 50][i % 5],
      dibuat: '2025-03-14T09:20:00Z',
      diperbarui: new Date(Date.now() - (i % 9) * 86400000).toISOString(),
      genre: g.genre,
      subgenre: '',
      harga: i % 23 === 0 ? 25 : 0,
      server_pribadi: i % 4 !== 0,
      gambar: [],
    }
  },
  daftar_server: async (x) => {
    await tidur(600)
    let seed = Number(String(x.placeId).slice(-5)) + (x.cursor ? 99 : 0)
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const max = String(x.placeId) === String(GAMES[0].place_id) ? 8 : 12
    let servers = Array.from({ length: 12 }, () => {
      const playing = 1 + Math.floor(r() * max)
      const hex = Array.from({ length: 8 }, () => Math.floor(r() * 16).toString(16)).join('')
      return { job_id: `${hex}-${Math.floor(r() * 9000 + 1000)}-4f2a-9c1d-${hex.slice(0, 4)}0e21${hex.slice(4)}`, playing, max_players: max, fps: 59 + r(), ping: Math.floor(30 + r() * 180) }
    })
    if (x.tanpaPenuh) servers = servers.filter((v) => v.playing < v.max_players)
    servers.sort((a, b) => (x.penuhDulu ? b.playing - a.playing : a.playing - b.playing))
    return { servers, cursor: x.cursor ? '' : 'next-page' }
  },
  server_sepi: async (x) => {
    await tidur(300)
    const n = Number(x.n) || 0
    const daftar = Array.from({ length: Math.max(0, s.serverSepiAda) }, (_, i) => `5e9a${String(i).padStart(4, '0')}-d9f8-497a-b266-7bd9d7060a4c`)
    return Array.from({ length: n }, (_, i) => daftar[i] ?? daftar[i % Math.max(1, daftar.length)] ?? '')
  },
  daftar_server_pribadi_semua: async () => {
    await tidur(500)
    const pakai = s.akun.filter((a) => !a.last_error && !a.pembatasan)
    if (!pakai.length) throw 'No usable account: every account is signed out or restricted by Roblox.'
    const id = (nama: string) => s.akun.find((a) => a.alias === nama)?.id ?? pakai[0].id
    return { diperiksa: pakai.length, gagal: s.gagalPribadi ? [`${pakai[0].alias}: Roblox answered HTTP 500 for the private servers.`] : [], servers: [
      { vip_id: 1, nama: 'Farm', pemilik: 'RakaPlaysRB', playing: 2, max_players: 12, job_id: 'aa11bb22-0000-4f2a-9c1d-0e2100000001', access_code: '44444444-d9f8-497a-b266-7bd9d7060a4c', akses: [id('Main'), id('Alt Killer'), id('Alt Surv 1')], terlihat: [id('Main'), id('Alt Killer'), id('Alt Surv 1')] },
      { vip_id: 2, nama: 'Event night', pemilik: 'friend_killer', playing: 0, max_players: 12, job_id: '', access_code: '55555555-d9f8-497a-b266-7bd9d7060a4c', akses: [id('Fruit Farm 1')], terlihat: [id('Fruit Farm 1'), id('Main')] },
      { vip_id: 3, nama: 'Locked', pemilik: 'someone_else', playing: 0, max_players: 12, job_id: '', access_code: '', akses: [], terlihat: [id('Alt Killer')] },
    ] }
  },
  wilayah_server_banyak: async (x) => {
    await tidur(900)
    const KOTA = ['Singapore, Singapore', 'Ashburn, United States', 'Frankfurt, Germany', 'Tokyo, Japan', 'Sydney, Australia', 'Amsterdam, Netherlands']
    return (x.jobIds as string[]).slice(0, 15).map((j, i) => ({ job_id: j, wilayah: KOTA[(j.charCodeAt(0) + i) % KOTA.length] }))
  },
  daftar_server_tersimpan: () => s.server,
  simpan_server_tersimpan: (x) => {
    const v = x.server as T.ServerTersimpan
    if (!v.place_id && !v.link_code) throw 'Pick a game or paste a private server link first.'
    const ada = s.server.find((y) => y.place_id === v.place_id && y.link_code === v.link_code && y.job_id === v.job_id)
    const baru = { ...v, id: ada?.id ?? uuid(), dibuat: detik(), nama: v.nama.slice(0, 80) }
    s.server = [baru, ...s.server.filter((y) => y !== ada)]
    return [s.server, baru.id]
  },
  ubah_nama_server_tersimpan: (x) => {
    const n = String(x.nama).trim()
    if (!n) throw 'Name cannot be empty.'
    const v = s.server.find((y) => y.id === x.id)
    if (v) v.nama = n.slice(0, 80)
    return s.server
  },
  hapus_server_tersimpan: (x) => (s.server = s.server.filter((y) => y.id !== x.id)),

  daftar_riwayat: () => s.riwayat,
  hapus_riwayat: () => { s.riwayat = [] },
  perbaiki_riwayat: () => false,
  daftar_masalah: () => s.masalah,
  hapus_masalah: () => { s.masalah = [] },

  blokir_user: async (x) => { await tidur(500); return hasilMassal(x.akunIds) },
  tambah_teman: async (x) => { await tidur(500); return hasilMassal(x.akunIds, (a) => (a.pembatasan ? 'This account is restricted.' : null)) },
  ubah_display_name: async (x) => {
    if (String(x.nama).trim().length < 3) throw 'Display name must be at least 3 characters.'
    await tidur(500)
    return hasilMassal(x.akunIds, (a) => (a.alias.startsWith('Alt Surv') ? 'Display name was changed less than 7 days ago.' : null))
  },
  daftar_blokir: async (x) => {
    await tidur(400)
    if (!s.blokir.has(x.akunId)) s.blokir.set(x.akunId, [{ user_id: 1001, nama: 'toxic_player1' }, { user_id: 1002, nama: 'spam_bot_77' }])
    return s.blokir.get(x.akunId)
  },
  buka_blokir_semua: async (x) => { await tidur(400); const n = s.blokir.get(x.akunId)?.length ?? 0; s.blokir.set(x.akunId, []); return n },

  sumber_klien: () => sumber(),
  status_pantau: () => statusPantau(),
  klien_akun: () => [
    ...s.proses.filter((p) => detik() >= p.mulai).map((p) => {
      const a = s.akun.find((y) => y.id === p.akunId)
      return { pid: p.pid, exe: s.versi[0].path, akun_id: p.akunId, alias: a?.alias ?? '' }
    }),
  ],
  performance_policy_status: () => kebijakan(),
  set_anggaran_ram: (x) => {
    if (x.mb && x.mb < 1024) throw 'The RAM budget must be at least 1 GB. Leave it empty to turn it off.'
    return (s.anggaranMb = x.mb)
  },
  tutup_semua_klien: (x) => { const n = s.proses.length; s.proses = []; void x; return n },
  tutup_satu_klien: (x) => { s.proses = s.proses.filter((p) => p.pid !== x.pid) },
  hotkey_darurat: () => s.hotkey,
  set_hotkey_darurat: (x) => (s.hotkey = !!x.aktif),
  daftar_jendela: () => jendela(),
  susun_jendela: (x) => {
    const kolom = x.kolom || Math.ceil(Math.sqrt(s.proses.length || 1))
    s.proses.forEach((p, i) => { p.x = x.mode === 'kisi' ? (i % kolom) * 480 : i * 32; p.y = x.mode === 'kisi' ? Math.floor(i / kolom) * 300 : i * 32; p.minimize = false })
    return s.proses.length
  },
  susun_kecil: (x) => { s.proses.forEach((p, i) => { p.kecil = x.lebar; p.x = (i % 5) * (x.lebar + 8); p.y = Math.floor(i / 5) * Math.ceil((x.lebar * 9) / 16 + 40); p.minimize = false }); return s.proses.length },
  semua_jendela: (x) => { s.proses.forEach((p) => (p.minimize = x.aksi === 'minimize')); return s.proses.length },
  jendela_kecil: (x) => { const p = s.proses.find((y) => y.hwnd === x.hwnd); if (p) p.kecil = x.lebar; return [x.lebar, Math.ceil((x.lebar * 9) / 16)] },
  jendela_normal: (x) => { const p = s.proses.find((y) => y.hwnd === x.hwnd); if (p) p.kecil = 0; return [800, 600] },
  pindah_jendela: (x) => { const p = s.proses.find((y) => y.hwnd === x.hwnd); if (p) { p.x = x.x; p.y = x.y; p.minimize = false } },
  fokus_jendela: (x) => { const p = s.proses.find((y) => y.hwnd === x.hwnd); if (p) p.minimize = false },
  pratinjau_tampil: () => undefined,
  pratinjau_tutup: () => undefined,

  daftar_versi_roblox: () => s.versi,
  klien_path: () => s.klienPath,
  set_klien_path: (x) => { s.klienPath = x.path },
  tambah_klien_kustom: async () => {
    await tidur(400)
    const path = 'D:\\Roblox\\version-downgrade-0687\\RobloxPlayerBeta.exe'
    if (!s.versi.some((v) => v.path === path)) s.versi.push({ folder: 'version-downgrade-0687', path, versi: '0.687.0.6870318', bawaan: false, diunduh: false, ada: true, ukuran_mb: 270, protokol: false })
    return path
  },
  hapus_klien_kustom: (x) => { s.versi = s.versi.filter((v) => v.path !== x.path); if (s.klienPath === x.path) s.klienPath = '' },
  hapus_versi_roblox: (x) => {
    const v = s.versi.find((y) => y.path === x.path)
    if (!v) throw 'That version is no longer installed.'
    if (v.protokol) throw 'The current Roblox version can’t be deleted.'
    s.versi = s.versi.filter((y) => y !== v)
    return { dihapus: 1, mb: v.ukuran_mb, dilewati: [] }
  },
  hapus_versi_roblox_lama: () => {
    const lama = s.versi.filter((v) => v.bawaan && !v.protokol && v.path !== s.klienPath)
    s.versi = s.versi.filter((v) => !lama.includes(v))
    return { dihapus: lama.length, mb: lama.reduce((n, v) => n + v.ukuran_mb, 0), dilewati: [] }
  },
  info_log_roblox: () => s.log,
  bersihkan_log_roblox: async () => {
    await tidur(500)
    const hasil = [s.log.usang_berkas, s.log.usang_mb]
    s.log = { berkas: s.log.berkas - s.log.usang_berkas, mb: Math.round((s.log.mb - s.log.usang_mb) * 10) / 10, usang_berkas: 0, usang_mb: 0 }
    return hasil
  },
  argumen_luncur: () => s.argumen,
  set_argumen_luncur: (x) => {
    const t = String(x.teks).trim().replace(/\s+/g, ' ')
    const buruk = /["&|<>^]/.exec(t)
    if (buruk) throw `Launch arguments can't contain ${buruk[0]}`
    return (s.argumen = t)
  },
  fflag_daftar: () => ({ kelola: s.fflag, berkas: 'C:\\Users\\Player\\AppData\\Local\\Roblox\\Versions\\version-e7d81637d42c4b23\\ClientSettings\\ClientAppSettings.json', di_berkas: s.fflagBerkas }),
  fflag_simpan: (x) => {
    for (const [k, v] of Object.entries(x.flags as Record<string, unknown>)) if (!['string', 'number', 'boolean'].includes(typeof v)) throw `${k}: values must be text, a number or true/false.`
    s.fflag = salin(x.flags)
    s.fflagBerkas = { ...s.fflag }
    return H.fflag_daftar({})
  },
  fps_terpasang: () => ({}),
  versi_roblox_terbaru: async () => { await tidur(500); return { hash: 'version-e7d81637d42c4b23', versi: '0.701.0.7010815', paket: 21, ukuran: 301_000_000, terpasang: true } },
  periksa_versi_roblox: async (x) => {
    await tidur(600)
    const hash = String(x.hash).trim()
    if (!/^version-[0-9a-f]{16}$/.test(hash)) throw 'That is not a Roblox version hash (version- followed by 16 hex characters).'
    return { hash, versi: '', paket: 21, ukuran: 296_000_000, terpasang: s.versi.some((v) => v.folder === hash) }
  },
  unduh_versi_roblox: (x) => {
    const total = 296_000_000
    s.unduh = { aktif: true, versi: x.hash, tahap: 'Downloading packages', paket_ke: 0, jumlah_paket: 21, byte_selesai: 0, byte_total: total, galat: '', hasil: '', dilewati: [] }
    const id = setInterval(() => {
      const u = s.unduh
      if (!u || !u.aktif) return clearInterval(id)
      u.paket_ke = Math.min(21, u.paket_ke + 2)
      u.byte_selesai = Math.min(total, u.byte_selesai + 30_000_000)
      if (u.paket_ke >= 21) {
        u.aktif = false
        u.tahap = 'Done'
        u.hasil = `C:\\Users\\Player\\AppData\\Local\\ChudaiAccountManager\\Versions\\${x.hash}\\RobloxPlayerBeta.exe`
        s.versi.push({ folder: x.hash, path: u.hasil, versi: '', bawaan: false, diunduh: true, ada: true, ukuran_mb: 282, protokol: false })
        clearInterval(id)
      }
    }, 700)
  },
  status_unduh_roblox: () => s.unduh ?? { aktif: false, versi: '', tahap: '', paket_ke: 0, jumlah_paket: 0, byte_selesai: 0, byte_total: 0, galat: '', hasil: '', dilewati: [] },
  batal_unduh_roblox: () => { if (s.unduh) { s.unduh.aktif = false; s.unduh.galat = 'Download cancelled.' } },

  status_matikan: () => s.matikan,
  jadwal_matikan: (x) => { if (x.menit < 1 || x.menit > 7 * 1440) throw 'Choose between 1 minute and 7 days.'; return (s.matikan = detik() + x.menit * 60) },
  batal_matikan: () => { s.matikan = null },

  grafis_ringan: () => s.grafisRingan,
  set_grafis_ringan: (x) => (s.grafisRingan = !!x.aktif),
  trim_latar: () => s.trim,
  set_trim_latar: (x) => { s.trim = { ...s.trim, aktif: !!x.aktif }; return s.trim },
  tutup_ke_tray: () => s.tray,
  set_tutup_ke_tray: (x) => (s.tray = !!x.aktif),
  discord_status: () => s.discord,
  set_discord_webhook: (x) => {
    const url = String(x.url).trim()
    if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url)) throw 'Paste a Discord webhook URL: https://discord.com/api/webhooks/<id>/<token>'
    s.discord = { ...s.discord, terpasang: true, samaran: url.slice(-4) }
    return s.discord
  },
  hapus_discord_webhook: () => (s.discord = { ...s.discord, terpasang: false, samaran: '' }),
  set_discord_acara: (x) => (s.discord = { ...s.discord, acara: x.acara }),
  set_discord_kehadiran: (x) => (s.discord = { ...s.discord, kehadiran: !!x.aktif }),
  kehadiran_halaman: (x) => { s.kehadiranHalaman = String(x.nama) },
  atur_bahasa: (x) => { s.bahasaRust = String(x.kode) },
  uji_discord: async () => { await tidur(600); if (!s.discord.terpasang) throw 'Save a webhook first.' },
  tema: () => s.tema,
  set_tema: (x) => { s.tema = x.tema },
  cadangan_buat: async (x) => {
    if ([...String(x.sandi)].length < 8) throw 'Use at least 8 characters.'
    await tidur(700)
    return ['C:\\Users\\Player\\Documents\\CAM backup 2026-11-12.cambackup', s.akun.length]
  },
  cadangan_pilih: async () => { await tidur(300); return 'C:\\Users\\Player\\Documents\\CAM backup 2026-11-01.cambackup' },
  cadangan_pulihkan: async (x) => {
    await tidur(800)
    if (x.sandi !== 'password123') throw 'Wrong password, or the backup file is damaged.'
    return { ditambah: 2, diganti: x.ganti ? 5 : 0, dilewati: x.ganti ? 0 : 5, gagal: 0, folder_baru: 1, server_baru: 1 }
  },
  diagnosa: async () => { await tidur(500); return 'Chudai Account Manager diagnostics\nVersion: dev\nAccounts: 21\nClients: 6\n' },
  simpan_diagnosa: async () => { await tidur(400); return 'C:\\Users\\Player\\Desktop\\CAM diagnostics.txt' },
  cek_update: async () => { await tidur(800); return { versi: '0.15.0', catatan: '- New interface\n- Faster account list\n- Fixed: Refresh all cookies summary', tanggal: '2026-11-20' } },
  pasang_update: async () => {
    if (s.proses.length) throw 'Close every Roblox client before installing the update.'
    s.update = { tahap: 'mengunduh', diunduh: 0, total: 18_000_000, pesan: '' }
    const id = setInterval(() => {
      s.update.diunduh = Math.min(s.update.total, s.update.diunduh + 2_500_000)
      if (s.update.diunduh >= s.update.total) { s.update = { ...s.update, tahap: 'galat', pesan: 'The downloaded update failed the signature check and was not installed.' }; clearInterval(id) }
    }, 400)
  },
  status_update: () => s.update,

  jendela_aksi: (x) => { if (x.aksi === 'layar_penuh') s.layarPenuh = !s.layarPenuh; return false },
  jendela_penuh: () => s.layarPenuh,
  jendela_maks: () => false,
}

export async function jawab(cmd: string, args: Record<string, unknown>): Promise<unknown> {
  const h = H[cmd]
  s.panggilan.push({ cmd, args: salin(args ?? {}), t: Date.now() })
  if (s.panggilan.length > 2000) s.panggilan.splice(0, 500)
  if (!h) throw `Unknown command "${cmd}" (mock backend).`
  await tidur(40 + (s.tunda[cmd] ?? 0))
  if (s.gagal[cmd] != null) throw s.gagal[cmd]
  if (cmd in s.jawab) return salin(s.jawab[cmd])
  const perId = s.jawabPerId[cmd]
  if (perId && typeof args?.id === 'string' && args.id in perId) return salin(perId[args.id])
  const hasil = await h(args)
  return hasil === undefined ? null : salin(hasil)
}

;(globalThis as unknown as { __camMock?: typeof s }).__camMock = s
;(globalThis as unknown as { __camMockJawab?: typeof jawab }).__camMockJawab = jawab
