import type { Akun, CatatanMasalah, Folder, Klien, Riwayat, ServerTersimpan } from '../types'

const now = () => Math.floor(Date.now() / 1000)
const JAM = 3600
const HARI = 86400

export const GAMES = [
  { place_id: 93978595733734, universe_id: 6789012345, name: 'Violence District', players: 41200, icon_url: '' },
  { place_id: 2753915549, universe_id: 994732206, name: 'Blox Fruits', players: 512000, icon_url: '' },
  { place_id: 13772394625, universe_id: 4777817887, name: 'Blade Ball', players: 38100, icon_url: '' },
  { place_id: 126884695634066, universe_id: 7436755782, name: 'Grow a Garden', players: 1210000, icon_url: '' },
  { place_id: 8737899170, universe_id: 3317771874, name: 'Pet Simulator 99', players: 94000, icon_url: '' },
  { place_id: 116495829188952, universe_id: 6655432112, name: 'Dead Rails', players: 120500, icon_url: '' },
]

export function folderAwal(): Folder[] {
  return [
    { id: 'f-main', nama: 'Main', warna: 'kuning', ikon: 'mahkota', preset: null },
    { id: 'f-alts', nama: 'Alts', warna: 'biru', ikon: 'orang', preset: { hemat: true, fps: 10, ram_mb: 512, minimize: false, auto_rejoin: true, anti_afk: true, mulai_kecil: 0 } },
    { id: 'f-farm', nama: 'Farm', warna: 'hijau', ikon: 'koin', preset: { hemat: true, fps: 15, ram_mb: 512, minimize: true, auto_rejoin: true, anti_afk: true, mulai_kecil: 320 } },
    { id: 'f-test', nama: 'Test', warna: 'ungu', ikon: 'bot', preset: null },
    { id: 'f-old', nama: 'Old', warna: '', ikon: '', preset: null },
  ]
}

interface Benih {
  alias: string
  username: string
  folder: string | null
  hemat?: [fps: number, ram: number, minimize?: boolean]
  fps?: number
  rejoin?: boolean
  afk?: boolean
  premium?: boolean
  plus?: boolean
  utama?: boolean
  favorit?: boolean
  kualitas?: boolean
  kecil?: number
  jamLalu?: number | null
  banHari?: number
  kunci?: boolean
  galat?: string
  belum?: boolean
  catatan?: string
  server?: [placeIdx: number, jamLalu: number, pribadi?: boolean]
}

const BENIH: Benih[] = [
  { alias: 'Main', username: 'RakaPlaysRB', folder: 'f-main', premium: true, utama: true, favorit: true, afk: true, jamLalu: 0.4, catatan: 'Main account. Never enable resource saver.', server: [0, 0.4] },
  { alias: 'Main backup', username: 'RakaPlays_2', folder: 'f-main', plus: true, jamLalu: 52, server: [1, 52] },
  { alias: 'Alt Killer', username: 'xKillerAlt09', folder: 'f-alts', fps: 30, afk: true, favorit: true, jamLalu: 0.4, server: [0, 0.4] },
  { alias: 'Alt Surv 1', username: 'survAlt_one', folder: 'f-alts', hemat: [10, 512], rejoin: true, afk: true, jamLalu: 0.4, server: [0, 0.4] },
  { alias: 'Alt Surv 2', username: 'survAlt_two', folder: 'f-alts', hemat: [10, 512], rejoin: true, afk: true, jamLalu: 0.4, server: [0, 0.4] },
  { alias: 'Alt Surv 3', username: 'survAlt_three', folder: 'f-alts', hemat: [10, 512], rejoin: true, afk: true, jamLalu: 26 },
  { alias: 'Alt Surv 4', username: 'survAlt_four', folder: 'f-alts', hemat: [3, 256], rejoin: true, afk: true, jamLalu: 30 },
  { alias: 'Fruit Farm 1', username: 'fruitFarmer_01', folder: 'f-farm', hemat: [15, 512, true], rejoin: true, afk: true, kecil: 320, jamLalu: 3.2, server: [1, 3.2] },
  { alias: 'Fruit Farm 2', username: 'fruitFarmer_02', folder: 'f-farm', hemat: [15, 512, true], rejoin: true, afk: true, kecil: 320, jamLalu: 3.2, server: [1, 3.2] },
  { alias: 'Fruit Farm 3', username: 'fruitFarmer_03', folder: 'f-farm', hemat: [15, 512, true], rejoin: true, afk: true, kecil: 320, jamLalu: 3.2 },
  { alias: 'Fruit Farm 4', username: 'fruitFarmer_04', folder: 'f-farm', hemat: [15, 1024, true], rejoin: true, afk: true, jamLalu: 30 },
  { alias: 'Garden 1', username: 'gardenBot_a', folder: 'f-farm', hemat: [10, 512], afk: true, jamLalu: 74, server: [3, 74] },
  { alias: 'Garden 2', username: 'gardenBot_b', folder: 'f-farm', hemat: [10, 512], galat: 'Cookie rejected by Roblox (signed out). Sign in again.', jamLalu: 190 },
  { alias: 'Parry Test', username: 'parryTester7', folder: 'f-test', kualitas: true, jamLalu: 20, server: [2, 20] },
  { alias: 'Test 01', username: 'camTest_01', folder: 'f-test', banHari: 3, jamLalu: 96 },
  { alias: 'Test 02', username: 'camTest_02', folder: 'f-test', banHari: 6, jamLalu: 120 },
  { alias: 'Test 03', username: 'camTest_03', folder: 'f-test', banHari: 13, jamLalu: 150, catatan: 'Banned while testing auto parry.' },
  { alias: 'Old 01', username: 'oldAccount_2019', folder: 'f-old', kunci: true, jamLalu: 900 },
  { alias: 'Old 02', username: 'oldAccount_2020', folder: 'f-old', kunci: true, jamLalu: 1400 },
  { alias: 'Spare 1', username: 'spareSlot_one', folder: null, belum: true, jamLalu: null },
  { alias: 'Spare 2', username: 'spareSlot_two', folder: null, jamLalu: null },
]

export function akunAwal(): Akun[] {
  const t = now()
  return BENIH.map((b, i) => {
    const pembatasan = b.banHari
      ? { jenis: 'ban' as const, label: `Ban ${b.banHari === 3 ? 3 : b.banHari === 6 ? 7 : 14} Days`, mulai: new Date((t - HARI) * 1000).toISOString(), berakhir: new Date((t + b.banHari * HARI) * 1000).toISOString(), sumber: 1 }
      : b.kunci
        ? { jenis: 'lock' as const, label: 'Account locked', mulai: '', berakhir: '', sumber: 5 }
        : null
    return {
      id: `a${String(i + 1).padStart(2, '0')}-${b.username.toLowerCase().slice(0, 6)}`,
      alias: b.alias,
      username: b.username,
      display_name: b.username.replace(/[_\d]+$/, ''),
      user_id: 1_200_000_000 + i * 7_919_311,
      robux: b.premium ? 2450 : i * 3,
      premium: !!b.premium,
      plus: !!b.plus,
      avatar_url: '',
      last_launched: b.jamLalu == null ? 0 : Math.round(t - b.jamLalu * JAM),
      last_refreshed: t - 2 * HARI,
      fps_cap: b.fps ?? 0,
      last_error: b.galat ?? '',
      hemat: !!b.hemat,
      hemat_minimize: !!b.hemat?.[2],
      hemat_ram_mb: b.hemat?.[1] ?? 0,
      hemat_fps: b.hemat?.[0] ?? 0,
      folder_id: b.folder,
      auto_rejoin: !!b.rejoin,
      anti_afk: !!b.afk,
      catatan: b.catatan ?? '',
      favorit: !!b.favorit,
      server_terakhir: b.server
        ? { place_id: GAMES[b.server[0]].place_id, job_id: `4f2a9c1d-${String(1000 + i)}-4e21-9c1d-0e21${String(i).padStart(8, '0')}`, game_name: GAMES[b.server[0]].name, pribadi: !!b.server[2], at: Math.round(t - b.server[1] * JAM) }
        : null,
      mulai_kecil: b.kecil ?? 0,
      banned: b.belum ? null : !!b.banHari,
      email_ok: b.belum ? null : i % 4 !== 3,
      dua_langkah: b.belum ? null : i % 3 === 0 ? ['Authenticator'] : i % 3 === 1 ? ['Email'] : [],
      argumen_luncur: null,
      utama: !!b.utama,
      kualitas_penuh: !!b.kualitas,
      pembatasan,
    }
  })
}

export function serverTersimpanAwal(): ServerTersimpan[] {
  const t = now()
  return [
    { id: 's1', nama: 'Violence District · Private server', place_id: String(GAMES[0].place_id), game_name: GAMES[0].name, game_icon: '', job_id: '', link_code: '48211933077115620411', dibuat: t - 9 * HARI },
    { id: 's2', nama: 'Blox Fruits · Server 7d1c09a2', place_id: String(GAMES[1].place_id), game_name: GAMES[1].name, game_icon: '', job_id: '7d1c09a2-5b77-4f2a-9c1d-3e5f0e210b11', link_code: '', dibuat: t - 3 * HARI },
    { id: 's3', nama: 'Blade Ball', place_id: String(GAMES[2].place_id), game_name: GAMES[2].name, game_icon: '', job_id: '', link_code: '', dibuat: t - HARI },
  ]
}

export function riwayatAwal(akun: Akun[]): Riwayat[] {
  const t = now()
  const out: Riwayat[] = []
  const pakai: [number, number, number][] = [[0, 0, 0.4], [2, 0, 0.4], [3, 0, 0.4], [4, 0, 0.4], [7, 1, 3.2], [8, 1, 3.2], [11, 3, 74], [13, 2, 20], [1, 1, 52], [16, 2, 150], [5, 4, 200], [6, 5, 260]]
  for (const [ai, gi, jam] of pakai) {
    const a = akun[ai]
    out.push({ place_id: GAMES[gi].place_id, game_name: GAMES[gi].name, icon_url: '', account_id: a.id, alias: a.alias, avatar_url: '', at: Math.round(t - jam * JAM) })
  }
  return out
}

export function masalahAwal(akun: Akun[]): CatatanMasalah[] {
  const t = now()
  return [
    { akun_id: akun[3].id, alias: akun[3].alias, at: t - 6 * 60, jenis: 'putus', teks: 'Disconnected (error 277)', place_id: GAMES[0].place_id, game_name: GAMES[0].name, umur_dtk: 2 * JAM + 14 * 60, rincian: 'Lost connection to the game server, please reconnect.' },
    { akun_id: akun[9].id, alias: akun[9].alias, at: t - 47 * 60, jenis: 'crash', teks: 'Roblox closed unexpectedly', place_id: GAMES[1].place_id, game_name: GAMES[1].name, umur_dtk: 38 * 60, rincian: 'Exit code -1073741819 (access violation).' },
    { akun_id: akun[8].id, alias: akun[8].alias, at: t - 2 * JAM, jenis: 'macet', teks: 'Not responding for 2 minutes', place_id: GAMES[1].place_id, game_name: GAMES[1].name, umur_dtk: 5 * JAM, rincian: 'The window stopped answering; the client was restarted by auto-rejoin.' },
    { akun_id: akun[12].id, alias: akun[12].alias, at: t - 8 * JAM, jenis: 'login', teks: 'Sign-in rejected', place_id: 0, game_name: '', umur_dtk: 0, rincian: 'Roblox signed this account out. Sign in again with Add Account → Log in with browser.' },
  ]
}

export function versiAwal(): Klien[] {
  const base = 'C:\\Users\\Player\\AppData\\Local\\Roblox\\Versions'
  return [
    { folder: 'version-e7d81637d42c4b23', path: `${base}\\version-e7d81637d42c4b23\\RobloxPlayerBeta.exe`, versi: '0.701.0.7010815', bawaan: true, diunduh: false, ada: true, ukuran_mb: 287, protokol: true },
    { folder: 'version-4f8a912cd18e4a07', path: `${base}\\version-4f8a912cd18e4a07\\RobloxPlayerBeta.exe`, versi: '0.699.0.6990731', bawaan: true, diunduh: false, ada: true, ukuran_mb: 281, protokol: false },
    { folder: 'version-91c0a4a57b1d2e33', path: `${base}\\version-91c0a4a57b1d2e33\\RobloxPlayerBeta.exe`, versi: '0.697.1.6970612', bawaan: true, diunduh: false, ada: true, ukuran_mb: 276, protokol: false },
    { folder: 'version-0b12c7aa31f95e10', path: 'C:\\Users\\Player\\AppData\\Local\\ChudaiAccountManager\\Versions\\version-0b12c7aa31f95e10\\RobloxPlayerBeta.exe', versi: '0.690.0.6900520', bawaan: false, diunduh: true, ada: true, ukuran_mb: 279, protokol: false },
  ]
}

const KATA_A = ['Neon', 'Lantern', 'Copper', 'Velvet', 'Hollow', 'Tidal', 'Paper', 'Static', 'Ember', 'Granite', 'Cloud', 'Rusty', 'Midnight', 'Pixel', 'Saffron', 'Orbit', 'Mossy', 'Glass']
const KATA_B = ['Harbor', 'Raceway', 'Bakery', 'Dungeon', 'Arena', 'Tycoon', 'Island', 'Courier', 'Garden', 'Heist', 'Obby', 'Academy', 'Station', 'Outpost', 'Carnival', 'Lighthouse']
const GENRE_JELAJAH = ['Action', 'RPG', 'Simulation', 'Social', 'Survival', 'Obby & Platformer', 'Shooter', 'Sports & Racing', 'Party & Casual', 'Adventure', 'Roleplay & Avatar Sim', 'Strategy']
export const KATALOG_JELAJAH = Array.from({ length: 160 }, (_, i) => {
  const a = KATA_A[i % KATA_A.length]
  const b = KATA_B[Math.floor(i / KATA_A.length) % KATA_B.length]
  const ekor = i % 11 === 0 ? ' [UPDATE 4]' : i % 17 === 0 ? ' 2' : ''
  const players = Math.round(120 + ((i * 7919) % 97) ** 2.6)
  const suka = 1000 + ((i * 104729) % 90000)
  return {
    universe_id: 9000000000 + i * 37,
    place_id: 90000000000000 + i * 1013,
    name: `${a} ${b}${ekor}`,
    players,
    suka,
    tak_suka: Math.round(suka * (0.03 + ((i * 31) % 25) / 100)),
    genre: GENRE_JELAJAH[(i * 5) % GENRE_JELAJAH.length],
    icon_url: '',
  }
})
export const KATEGORI_JELAJAH = [
  { id: 'top-trending', nama: 'Top Trending', info: 'Top experiences with the largest relative increase in daily active users over the past week.', catatan: '' },
  { id: 'up-and-coming', nama: 'Up-and-Coming', info: 'Top experiences published within the last 28 days sorted by user growth.', catatan: '' },
  { id: 'top-playing-now', nama: 'Top Playing Now', info: 'Top experiences sorted by the number of concurrent users.', catatan: 'Results for all devices and locations' },
  { id: 'fun-with-friends', nama: 'Fun with Friends', info: 'Experiences with at least 5000 users daily, sorted by the proportion of time spent as groups of friends.', catatan: '' },
  { id: 'top-revisited', nama: 'Top Revisited', info: 'Experiences sorted by the proportion of users who come back after a week.', catatan: '' },
  { id: 'top-earning', nama: 'Top Earning', info: 'Experiences sorted by total robux spent in the last 7 days.', catatan: '' },
  { id: 'top-rated', nama: 'Top Rated', info: 'Experiences with at least 5000 users daily, that have both a high number and proportion of likes.', catatan: 'Results for all devices and locations' },
  { id: 'most-popular', nama: 'Most Popular', info: 'Top experiences sorted by daily users.', catatan: '' },
  { id: 'trending-in-rpg', nama: 'Trending in RPG', info: '', catatan: '' },
  { id: 'trending-in-shooter', nama: 'Trending in Shooter', info: '', catatan: '' },
]
export const PERANGKAT_JELAJAH = [
  { id: 'all', nama: 'All Devices', tag: '' },
  { id: 'low_end_phone', nama: 'Entry-level Phone', tag: '' },
  { id: 'high_end_phone', nama: 'Standard Phone', tag: '' },
  { id: 'low_end_tablet', nama: 'Entry-level Tablet', tag: '' },
  { id: 'high_end_tablet', nama: 'Standard Tablet', tag: '' },
  { id: 'computer', nama: 'Computer', tag: 'My device' },
  { id: 'console', nama: 'Console', tag: '' },
  { id: 'vr', nama: 'VR', tag: '' },
]
export const NEGARA_JELAJAH = [
  { id: 'all', nama: 'All Locations', tag: '' },
  { id: 'id', nama: 'Indonesia', tag: 'My location' },
  { id: 'au', nama: 'Australia', tag: '' },
  { id: 'br', nama: 'Brazil', tag: '' },
  { id: 'jp', nama: 'Japan', tag: '' },
  { id: 'my', nama: 'Malaysia', tag: '' },
  { id: 'ph', nama: 'Philippines', tag: '' },
  { id: 'sg', nama: 'Singapore', tag: '' },
  { id: 'gb', nama: 'United Kingdom', tag: '' },
  { id: 'us', nama: 'United States', tag: '' },
  { id: 'vn', nama: 'Vietnam', tag: '' },
]
