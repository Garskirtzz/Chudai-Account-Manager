import { create } from 'zustand'
import { api, dibatalkan, samarkan, samarkanRahasia } from '@/api/api'
import type { Akun, Folder, InfoUpdate, ProteksiView, Riwayat, ServerTersimpan, StatusMuat, CatatanMasalah, TargetLuncur } from '@/api/types'
import { bacaLokal, folderAkun, labelPreset, tulisLokal } from '@/lib/folder'
import { VERSI_APP } from '@/lib/rilis'
import { pasangTema } from '@/lib/tema'

export const RAM_HEMAT_MB = 512

export type JenisLog = 'info' | 'benar' | 'salah'
export interface BarisLog {
  id: number
  jam: string
  pesan: string
  jenis: JenisLog
}

export interface Konfirmasi {
  judul: string
  pesan: string
  labelYa?: string
  bahaya?: boolean
  aksi: () => unknown
  batal?: () => unknown
  pemilik?: object
  asal?: HTMLElement | null
}

export interface ParamTarget {
  placeId: string
  jobId: string
  linkCode: string
  ikuti: string
  jeda: string
  gameName: string
  gameIcon: string
  sama: '' | 'pilih' | 'ikuti' | 'sepi' | 'sendiri'
  fps: string
}

export type StatusItem = 'queued' | 'starting' | 'joining' | 'launched' | 'failed' | 'cancelled'
export interface Antrean {
  sesi: { batal: boolean }
  sumber: 'selection' | 'single' | 'folder'
  fase: 'preparing' | 'running'
  batal: boolean
  item: { id: string; alias: string; status: StatusItem; pesan: string }[]
}

export type Dialog =
  | null
  | { jenis: 'tambah' }
  | { jenis: 'impor' }
  | { jenis: 'folder'; folder: Folder | null; pindahkan?: string[] }
  | { jenis: 'alias'; akun: Akun }
  | { jenis: 'fps'; akun: Akun }
  | { jenis: 'alat' }
  | { jenis: 'hapus'; ids: string[] }
  | { jenis: 'ikuti'; akun: Akun }

type Muat = 'memuat' | 'siap' | 'galat'

interface CamState {
  akun: Akun[]
  statusMuat: Muat
  galatMuat: string
  folder: Folder[]
  filterFolder: string
  serverTersimpan: ServerTersimpan[]
  riwayat: Riwayat[]
  statusRiwayat: Muat
  masalah: CatatanMasalah[]
  pidAkun: Record<string, number[]>
  klienAsing: number
  dipilih: string[]
  fokusId: string | null
  multiAktif: boolean
  proteksi: ProteksiView | null
  berkasAkun: StatusMuat | null
  autoRefresh: boolean
  sembunyikanUsername: boolean
  sedangSegarkan: boolean
  sedangPerbarui: string[]
  updateAwal: InfoUpdate | null
  log: BarisLog[]
  galatBaru: { n: number; pesan: string; jam: string }
  statusLuncur: string
  antrean: Antrean | null
  gagalTerakhir: string[]
  param: ParamTarget
  kunciServer: number
  konfirmasi: Konfirmasi | null
  dialog: Dialog
}

const PARAM_AWAL: ParamTarget = { placeId: '', jobId: '', linkCode: '', ikuti: '', jeda: '5', gameName: '', gameIcon: '', sama: '', fps: '' }

export const useCam = create<CamState>(() => ({
  akun: [],
  statusMuat: 'memuat',
  galatMuat: '',
  folder: [],
  filterFolder: bacaLokal('cam.filterFolder', 'semua'),
  serverTersimpan: [],
  riwayat: [],
  statusRiwayat: 'memuat',
  masalah: [],
  pidAkun: {},
  klienAsing: 0,
  dipilih: [],
  fokusId: null,
  multiAktif: false,
  proteksi: null,
  berkasAkun: null,
  autoRefresh: false,
  sembunyikanUsername: false,
  sedangSegarkan: false,
  sedangPerbarui: [],
  updateAwal: null,
  log: [],
  galatBaru: { n: 0, pesan: '', jam: '' },
  statusLuncur: '',
  antrean: null,
  gagalTerakhir: [],
  param: PARAM_AWAL,
  kunciServer: 0,
  konfirmasi: null,
  dialog: null,
}))

const get = () => useCam.getState()
const namaAkun = (u: string) => (get().sembunyikanUsername ? samarkan(u) : u)
const set = useCam.setState

let nomorLog = 0
export function beriTahu(pesan: unknown, jenis: JenisLog = 'info') {
  const jam = new Date().toLocaleTimeString('en-GB', { hour12: false })
  nomorLog += 1
  const bersih = samarkanRahasia(pesan)
  if (import.meta.env.DEV || import.meta.env.VITE_MOCK === '1') ((window as unknown as { __camPesan?: string[] }).__camPesan ??= []).push(bersih)
  set((s) => ({
    log: [...s.log.slice(-199), { id: nomorLog, jam, pesan: bersih, jenis }],
    galatBaru: jenis === 'salah' ? { n: s.galatBaru.n + 1, pesan: bersih, jam } : s.galatBaru,
  }))
}

export const bersihkanLog = () => set({ log: [], galatBaru: { n: 0, pesan: '', jam: '' } })
export const tutupGalat = () => set({ galatBaru: { n: 0, pesan: '', jam: '' } })
export function asalFokus(): HTMLElement | null {
  const el = typeof document === 'undefined' ? null : document.activeElement
  if (!(el instanceof HTMLElement) || el === document.body) return null
  const id = el.closest('[role=menu]')?.getAttribute('aria-labelledby')
  return (id ? document.getElementById(id) : null) ?? el
}
export const minta = (k: Konfirmasi) => {
  const lama = get().konfirmasi
  set({ konfirmasi: { ...k, asal: k.asal ?? asalFokus() } })
  if (lama?.batal) void lama.batal()
}

export const tanya = (k: Omit<Konfirmasi, 'aksi' | 'batal'>) =>
  new Promise<boolean>((selesai) => minta({ ...k, aksi: () => selesai(true), batal: () => selesai(false) }))
export const bukaDialog = (dialog: Dialog) => set({ dialog })
export const tutupDialog = () => set({ dialog: null })

export async function muat() {
  try {
    const data = await api.daftarAkun()
    set((s) => ({
      akun: data,
      statusMuat: 'siap',
      galatMuat: '',
      dipilih: s.dipilih.filter((id) => data.some((a) => a.id === id)),
    }))
  } catch (e) {
    set((s) => ({ statusMuat: s.statusMuat === 'siap' ? s.statusMuat : 'galat', galatMuat: samarkanRahasia(e) }))
    beriTahu(`Couldn’t load accounts: ${e}`, 'salah')
  }
}

export async function muatFolder() {
  try {
    const d = await api.daftarFolder()
    set({ folder: Array.isArray(d) ? d : [] })
  } catch (e) {
    beriTahu(`Couldn’t load folders: ${e}`, 'salah')
  }
}

export function cobaMuatLagi() {
  set({ statusMuat: 'memuat' })
  void muat()
}

let riwayatGagal = false
export async function muatRiwayat() {
  try {
    set({ riwayat: await api.daftarRiwayat(), statusRiwayat: 'siap' })
  } catch (e) {
    if (!riwayatGagal) beriTahu(`Couldn’t load history: ${e}`, 'salah')
    riwayatGagal = true
    set((s) => ({ statusRiwayat: s.statusRiwayat === 'siap' ? s.statusRiwayat : 'galat' }))
    return
  }
  riwayatGagal = false
}

export function pilihTeman(c: { akun_cam: boolean; job_id: string; place_id: number; lokasi: string; username: string }) {
  set({ dialog: null })
  if (c.akun_cam && c.job_id) {
    set((s) => ({
      param: { ...s.param, placeId: String(c.place_id), jobId: c.job_id, ikuti: '', gameName: c.lokasi || '', gameIcon: '' },
    }))
    beriTahu(`Launch target set to ${namaAkun(c.username)}'s server.`)
  } else {
    set((s) => ({ param: { ...s.param, ikuti: c.username } }))
    beriTahu(`Following ${c.akun_cam ? namaAkun(c.username) : c.username}.`)
  }
}

export async function muatServerTersimpan() {
  try {
    const d = await api.daftarServerTersimpan()
    set({ serverTersimpan: Array.isArray(d) ? d : [] })
  } catch (e) {
    beriTahu(`Couldn’t load saved servers: ${e}`, 'salah')
  }
}

let targetDipulihkan = false
let sudahMulai = false

export function mulaiCam(): () => void {
  if (sudahMulai) return () => undefined
  sudahMulai = true
  const timer: number[] = []
  void (async () => {
    try {
      pasangTema(await api.tema())
    } catch {
    }
    try {
      const t = await api.targetTerakhir()
      if (t && typeof t === 'object') {
        set((s) => ({
          param: {
            ...s.param,
            placeId: t.place_id || '',
            gameName: t.game_name || '',
            gameIcon: t.game_icon || '',
            jobId: t.job_id || '',
            linkCode: t.link_code || '',
            ikuti: t.ikuti || '',
            jeda: t.jeda || s.param.jeda,
            sama: t.sama || '',
            fps: t.fps || '',
          },
        }))
      }
    } catch (e) {
      beriTahu(`Couldn’t restore the last launch target: ${e}`, 'salah')
    } finally {
      targetDipulihkan = true
    }
    await muatServerTersimpan()
    await muatFolder()
    const opsional = async <X>(nama: string, fn: () => Promise<X>, pasang: (v: X) => void): Promise<X | false> => {
      try {
        const v = await fn()
        pasang(v)
        return v
      } catch (e) {
        beriTahu(`Couldn't read ${nama}: ${e}`, 'salah')
        return false
      }
    }
    await opsional('accounts file status', api.statusMuat, (v) => set({ berkasAkun: v }))
    await opsional('multi-instance setting', api.multiInstanceStatus, (v) => set({ multiAktif: v }))
    await opsional('sign-in protection setting', api.statusProteksi, (v) => set({ proteksi: v }))
    const auto = await opsional('auto-refresh setting', api.autoRefreshStatus, (v) => set({ autoRefresh: v }))
    await opsional('hide-usernames setting', api.sembunyikanUsernameStatus, (v) => set({ sembunyikanUsername: v }))
    await muat()
    await muatRiwayat()
    try {
      if (await api.perbaikiRiwayat()) await muatRiwayat()
    } catch {
    }
    if (auto) {
      try {
        const lap = await api.refreshTerjadwal()
        if (lap.diperbarui > 0) {
          beriTahu(`Refreshed ${lap.diperbarui} idle account${lap.diperbarui === 1 ? '' : 's'}.`)
          await muat()
        }
      } catch {
      }
    }
  })()

  timer.push(window.setInterval(async () => {
    try {
      if (!(await api.autoRefreshStatus())) return
      const lap = await api.refreshTerjadwal()
      if (lap.diperbarui > 0) await muat()
    } catch {
    }
  }, 6 * 60 * 60 * 1000))

  const dataUlang = async () => {
    try {
      const daftar = await api.klienAkun()
      const peta: Record<string, number[]> = {}
      for (const k of daftar) {
        if (!k.akun_id) continue
        ;(peta[k.akun_id] ||= []).push(k.pid)
      }
      set((s) => ({
        pidAkun: JSON.stringify(s.pidAkun) === JSON.stringify(peta) ? s.pidAkun : peta,
        klienAsing: daftar.filter((k) => !k.akun_id).length,
      }))
    } catch {
    }
  }
  void dataUlang()
  timer.push(window.setInterval(dataUlang, 4000))

  timer.push(window.setInterval(async () => {
    try {
      const s = await api.statusProteksi()
      set({ proteksi: s })
      for (const c of s.catatan || []) beriTahu(c.teks, c.jenis || 'info')
    } catch {
    }
  }, 5000))

  if (VERSI_APP !== 'dev') {
    try {
      const lama = localStorage.getItem('cam.versiTerakhir')
      localStorage.setItem('cam.versiTerakhir', VERSI_APP)
      if (lama && lama !== VERSI_APP) beriTahu(`Updated to ${VERSI_APP}. See About → Changelog for what changed.`, 'benar')
    } catch {
    }
  }

  timer.push(window.setTimeout(() => {
    api.cekUpdate().then((info) => {
      if (info && info.versi) {
        set({ updateAwal: info })
        beriTahu(`Update ${info.versi} is available. Open About to install it.`, 'info')
      }
    }, () => undefined)
  }, 4000))

  let tunda = 0
  const lepas = useCam.subscribe((s, lama) => {
    if (s.param === lama.param || !targetDipulihkan) return
    window.clearTimeout(tunda)
    tunda = window.setTimeout(() => {
      const p = get().param
      api
        .simpanTargetTerakhir({
          place_id: String(p.placeId || ''),
          game_name: p.gameName || '',
          game_icon: p.gameIcon || '',
          job_id: p.jobId || '',
          link_code: p.linkCode || '',
          ikuti: p.ikuti || '',
          jeda: String(p.jeda ?? ''),
          sama: p.sama || '',
          fps: String(p.fps ?? ''),
        })
        .catch(() => undefined)
    }, 500)
  })
  const lepasFilter = useCam.subscribe((s, lama) => {
    if (s.filterFolder !== lama.filterFolder) tulisLokal('cam.filterFolder', s.filterFolder)
  })

  return () => {
    timer.forEach((t) => { window.clearInterval(t); window.clearTimeout(t) })
    lepas()
    lepasFilter()
    sudahMulai = false
  }
}

export function pantauMasalah(): () => void {
  let hidup = true
  const muatM = () => api.daftarMasalah().then((d) => hidup && set({ masalah: Array.isArray(d) ? d : [] }), () => undefined)
  void muatM()
  const h = window.setInterval(muatM, 10000)
  return () => { hidup = false; window.clearInterval(h) }
}

export const setParam = (ubah: Partial<ParamTarget>) => set((s) => ({ param: { ...s.param, ...ubah } }))
export const setFokus = (id: string | null) => set({ fokusId: id })
export function toggle(id: string) {
  set((s) => ({ dipilih: s.dipilih.includes(id) ? s.dipilih.filter((x) => x !== id) : [...s.dipilih, id] }))
}
export const setDipilih = (ids: string[]) => set({ dipilih: ids })

export const namaFolder = (id: string | null) => (id ? get().folder.find((f) => f.id === id)?.nama || 'folder' : 'Ungrouped')

export async function pindahAkun(ids: string[], folderId: string | null) {
  const { akun, folder } = get()
  const nyata = ids.filter((id) => akun.some((a) => a.id === id && folderAkun(a, folder) !== folderId))
  if (!nyata.length) return
  try {
    const n = await api.pindahAkun(nyata, folderId)
    await muat()
    const f = folder.find((x) => x.id === folderId)
    const siapa = n === 1 ? akun.find((a) => a.id === nyata[0])?.alias || '1 account' : `${n} accounts`
    beriTahu(`Moved ${siapa} to ${namaFolder(folderId)}.${f?.preset ? ` Saver preset applied (${labelPreset(f.preset)}).` : ''}`, 'benar')
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function taruhAkun(ids: string[], sasaran: string, setelah: boolean, fokusLagi?: string) {
  try {
    const pindahFolder = await api.taruhAkun(ids, sasaran, setelah)
    const { akun, folder } = get()
    await muat()
    if (pindahFolder) {
      const t = akun.find((a) => a.id === sasaran)
      beriTahu(`Moved ${pindahFolder === 1 ? '1 account' : `${pindahFolder} accounts`} to ${namaFolder(t ? folderAkun(t, folder) : null)}.`, 'benar')
    }
    if (fokusLagi) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-baris][data-id="${fokusLagi}"]`)?.focus())
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export function geserAkun(id: string, arah: 1 | -1) {
  const { akun, folder } = get()
  const a = akun.find((x) => x.id === id)
  if (!a) return
  const f = folderAkun(a, folder)
  const sama = akun.filter((x) => folderAkun(x, folder) === f)
  const j = sama.findIndex((x) => x.id === id) + arah
  if (j < 0 || j >= sama.length) return
  void taruhAkun([id], sama[j].id, arah > 0, id)
}

export async function simpanFolder(data: Folder | (Omit<Folder, 'id'> & { id?: string }), pindahkan: string[] = []) {
  try {
    if (data.id) {
      const n = await api.ubahFolder(data as Folder)
      beriTahu(`Folder "${data.nama}" saved.${n ? ` Saver preset applied to ${n} account${n === 1 ? '' : 's'}.` : ''}`, 'benar')
    } else {
      const f = await api.buatFolder(data.nama, data.warna, data.ikon)
      if (data.preset) await api.ubahFolder({ ...f, preset: data.preset })
      if (pindahkan.length) {
        const n = await api.pindahAkun(pindahkan, f.id)
        beriTahu(`Folder "${f.nama}" created with ${n === 1 ? '1 account' : `${n} accounts`}.`, 'benar')
      } else {
        beriTahu(`Folder "${f.nama}" created. Drag accounts onto it, or use Move to folder.`, 'benar')
      }
    }
    await muatFolder()
    await muat()
    return true
  } catch (e) {
    beriTahu(String(e), 'salah')
    return false
  }
}

const filterSah = () => {
  const { filterFolder, folder } = get()
  return filterFolder === 'semua' || filterFolder === 'tanpa' || folder.some((f) => f.id === filterFolder) ? filterFolder : 'semua'
}
export const setFilterFolder = (id: string) => set({ filterFolder: id })

export const folderAksi = {
  baru: () => bukaDialog({ jenis: 'folder', folder: null }),
  edit: (f: Folder) => bukaDialog({ jenis: 'folder', folder: f }),
  filter: (id: string) => set({ filterFolder: filterSah() === id ? 'semua' : id }),
  ubahNama: (f: Folder, nama: string) => simpanFolder({ ...f, nama }),
  ekspor: async (f: Folder) => {
    try {
      const jalur = await api.eksporProfil([f.id])
      beriTahu(`Folder profile ${f.nama} saved to ${jalur}. It holds the name, color, icon and saver preset only — no accounts.`, 'benar')
    } catch (e) {
      if (!dibatalkan(e)) beriTahu(`Export profile: ${e}`, 'salah')
    }
  },
  pilihSemua: (anggota: Akun[], lepas: boolean) =>
    set((s) => {
      const n = new Set(s.dipilih)
      for (const a of anggota) {
        if (lepas) n.delete(a.id)
        else if (!a.utama) n.add(a.id)
      }
      return { dipilih: [...n] }
    }),
  geser: async (f: Folder, arah: 1 | -1) => {
    const ids = get().folder.map((x) => x.id)
    const i = ids.indexOf(f.id)
    const j = i + arah
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    try {
      await api.urutkanFolder(ids)
      await muatFolder()
    } catch (e) {
      beriTahu(String(e), 'salah')
    }
  },
  hapus: (f: Folder, jumlah: number) =>
    minta({
      judul: `Delete folder ${f.nama}?`,
      pesan: jumlah
        ? `Its ${jumlah} account${jumlah === 1 ? '' : 's'} stay in the app and move to Ungrouped. Their resource saver settings are kept.`
        : 'The folder is empty. No account is affected.',
      labelYa: 'Delete folder',
      bahaya: true,
      aksi: async () => {
        try {
          await api.hapusFolder(f.id)
          if (filterSah() === f.id) set({ filterFolder: 'semua' })
          await muatFolder()
          await muat()
          beriTahu(`Folder "${f.nama}" deleted.`)
        } catch (e) {
          beriTahu(String(e), 'salah')
        }
      },
    }),
}

export async function terapkanPresetFolder(f: Folder) {
  try {
    const n = await api.terapkanPresetFolder(f.id)
    await muat()
    beriTahu(n ? `${f.nama} preset applied to ${n} account${n === 1 ? '' : 's'}.` : `Every account in ${f.nama} already matches its preset.`, 'benar')
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function imporProfilFolder(): Promise<boolean> {
  let pr
  try {
    pr = await api.imporProfilPilih()
  } catch (e) {
    if (!dibatalkan(e)) beriTahu(`Import profile: ${e}`, 'salah')
    return false
  }
  const terapkan = async () => {
    try {
      const h = await api.imporProfilTerapkan(pr.teks)
      const bagian = [h.baru && `${h.baru} new`, h.diperbarui && `${h.diperbarui} updated`].filter(Boolean).join(', ')
      beriTahu(
        `Imported folder profile${h.nama.length === 1 ? '' : 's'} ${h.nama.join(', ')} (${bagian}).` +
          (h.akun_berubah ? ` The preset was applied to ${h.akun_berubah} account${h.akun_berubah === 1 ? '' : 's'}.` : ''),
        'benar',
      )
      await muatFolder()
      if (h.akun_berubah) await muat()
    } catch (e) {
      beriTahu(`Import profile: ${e}`, 'salah')
    }
  }
  if (!pr.timpa.length) {
    await terapkan()
    return true
  }
  minta({
    judul: `Replace the settings of ${pr.timpa.length} folder${pr.timpa.length === 1 ? '' : 's'}?`,
    pesan:
      pr.timpa
        .map((t) => `${t.nama} (${t.akun} account${t.akun === 1 ? '' : 's'})\nNow: ${labelPreset(t.preset_lama) || 'no preset'}\nAfter: ${labelPreset(t.preset_baru) || 'no preset'}${t.tampilan_berubah ? '\nColor or icon also change.' : ''}`)
        .join('\n\n') + '\n\nThe new preset is applied to these accounts right away.',
    labelYa: 'Replace',
    aksi: terapkan,
  })
  return true
}

const segarkanJalan = new Set<string>()

export async function segarkan(id: string) {
  if (segarkanJalan.has(id) || get().sedangSegarkan) return
  segarkanJalan.add(id)
  try {
    const h = await api.segarkanAkun(id)
    await muat()
    const alias = get().akun.find((a) => a.id === id)?.alias
    if (h && h.cek !== 'ok') beriTahu(alias && !h.pesan.startsWith(`${alias}: `) ? `${alias}: ${h.pesan}` : h.pesan, 'salah')
  } catch (e) {
    beriTahu(String(e), 'salah')
  } finally {
    segarkanJalan.delete(id)
  }
}

export async function simpanAlias(a: Akun, nama: string) {
  try {
    await api.ubahAlias(a.id, nama)
    await muat()
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export const hapusAkun = (a: Akun) => bukaDialog({ jenis: 'hapus', ids: [a.id] })

export function hapusTerpilih() {
  const ids = get().dipilih
  if (ids.length) bukaDialog({ jenis: 'hapus', ids: [...ids] })
}

const KUNCI_DASHBOARD = 'cam.dashboardAkun'

export async function jalankanHapus(ids: string[], keluar: boolean): Promise<boolean> {
  try {
    const h = await api.hapusAkunBanyak(ids, keluar)
    await muat()
    set((s) => ({ dipilih: s.dipilih.filter((id) => !ids.includes(id)), fokusId: s.fokusId && ids.includes(s.fokusId) ? null : s.fokusId }))
    try { if (ids.includes(localStorage.getItem(KUNCI_DASHBOARD) ?? '')) localStorage.removeItem(KUNCI_DASHBOARD) } catch {  }
    const n = h.dihapus.length
    beriTahu(n === 1 ? `Account deleted: ${h.dihapus[0]}.` : `${n} accounts deleted.`, 'benar')
    if (keluar) {
      const ok = n - h.gagal_keluar.length
      if (ok > 0) beriTahu(ok === 1 ? 'Signed out on Roblox: that cookie no longer works.' : `Signed out on Roblox: those ${ok} cookies no longer work.`)
      if (h.gagal_keluar.length) beriTahu(`Couldn't sign out on Roblox: ${h.gagal_keluar.join(', ')}. Those cookies may still work; they are deleted from this app anyway.`, 'salah')
    }
    return true
  } catch (e) {
    beriTahu(String(e), 'salah')
    await muat() 
    return false
  }
}

export const salinCookie = (a: Akun) =>
  minta({
    judul: `Copy ${a.alias}'s cookie?`,
    pesan:
      "This cookie is equivalent to a password and bypasses 2FA. CAM keeps it out of Windows' clipboard history and clears the clipboard after 30 seconds; until then other apps on this PC can read it.",
    labelYa: 'Copy',
    bahaya: false,
    aksi: async () => {
      try {
        const detik = await api.salinCookie(a.id)
        beriTahu(`Cookie copied. The clipboard is cleared in ${detik} seconds.`, 'benar')
      } catch (e) {
        if (dibatalkan(e)) return
        beriTahu(String(e), 'salah')
      }
    },
  })

export async function simpanFps(a: Akun, fps: number) {
  try {
    await api.setFpsAkun(a.id, fps)
    await muat()
    beriTahu(fps === 0 ? `${a.alias}: FPS limit reset to default.` : `${a.alias}: FPS limit set to ${fps}.`, 'benar')
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export type UbahHemat = Partial<Pick<Akun, 'hemat' | 'hemat_minimize' | 'hemat_ram_mb' | 'hemat_fps'>>

export async function ubahHemat(daftar: Akun[], ubah: UbahHemat) {
  let gagal = 0
  for (const a of daftar) {
    const n = { hemat: a.hemat, hemat_minimize: a.hemat_minimize, hemat_ram_mb: a.hemat_ram_mb, hemat_fps: a.hemat_fps || 0, ...ubah }
    if (ubah.hemat === true && !a.hemat && !('hemat_ram_mb' in ubah) && !a.hemat_ram_mb) n.hemat_ram_mb = RAM_HEMAT_MB
    try {
      await api.setHematAkun(a.id, n.hemat, n.hemat_minimize, n.hemat_ram_mb, n.hemat_fps)
    } catch (e) {
      gagal++
      beriTahu(`${a.alias}: ${e}`, 'salah')
    }
  }
  await muat()
  if (!gagal) {
    const siapa = daftar.length === 1 ? daftar[0].alias : `${daftar.length} accounts`
    beriTahu(
      'hemat' in ubah
        ? `${siapa}: resource saver ${ubah.hemat ? 'on' : 'off'}. Applies from the next launch.`
        : `${siapa}: resource saver updated. Applies from the next launch.`,
      'benar',
    )
  }
  return gagal
}

export async function ubahRejoin(daftar: Akun[], aktif: boolean) {
  try {
    await api.setRejoinAkun(daftar.map((a) => a.id), aktif)
    await muat()
    const siapa = daftar.length === 1 ? daftar[0].alias : `${daftar.length} accounts`
    beriTahu(`${siapa}: auto-rejoin ${aktif ? 'on' : 'off'}. Applies now, also to running clients.`, 'benar')
    return 0
  } catch (e) {
    beriTahu(`Auto-rejoin: ${e}`, 'salah')
    return daftar.length
  }
}

export async function ubahAfk(daftar: Akun[], aktif: boolean) {
  try {
    await api.setAfkAkun(daftar.map((a) => a.id), aktif)
    await muat()
    const siapa = daftar.length === 1 ? daftar[0].alias : `${daftar.length} accounts`
    beriTahu(`${siapa}: anti-AFK ${aktif ? 'on' : 'off'}.`, 'benar')
    return 0
  } catch (e) {
    beriTahu(`Anti-AFK: ${e}`, 'salah')
    return daftar.length
  }
}

export async function toggleSembunyikan() {
  try {
    set({ sembunyikanUsername: await api.setSembunyikanUsername(!get().sembunyikanUsername) })
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function tambahAkun(cookie: string, alias: string, folderId: string | null) {
  try {
    const a = await api.tambahAkun(cookie, alias, folderId)
    await muat()
    beriTahu(`${namaAkun(a.username)} added.`, 'benar')
    return true
  } catch (e) {
    beriTahu(String(e), 'salah')
    return false
  }
}

export async function loginBrowser(alias: string, folderId: string | null, tanpaGpu: boolean) {
  beriTahu('Waiting for the Roblox login window…')
  try {
    const pesan = await api.loginBrowser(alias, folderId, tanpaGpu)
    beriTahu(pesan, 'benar')
    await muat()
    return true
  } catch (e) {
    beriTahu(String(e), 'salah')
    return false
  }
}

const tandaiPerbarui = (id: string, aktif: boolean) =>
  set((s) => ({ sedangPerbarui: aktif ? [...s.sedangPerbarui, id] : s.sedangPerbarui.filter((x) => x !== id) }))

export async function perbaruiCookie(a: Akun, diam = false) {
  tandaiPerbarui(a.id, true)
  try {
    await api.perbaruiCookie(a.id)
    await muat()
    if (!diam) beriTahu(`${a.alias}: cookie refreshed.`, 'benar')
    return true
  } catch (e) {
    if (!diam) beriTahu(String(e), 'salah')
    return false
  } finally {
    tandaiPerbarui(a.id, false)
  }
}

export async function perbaruiSemuaCookie() {
  const akun = get().akun
  let ok = 0
  for (const a of akun) if (await perbaruiCookie(a, true)) ok++
  if (akun.length) beriTahu(`${ok}/${akun.length} cookies refreshed.`, ok ? 'benar' : 'salah')
}

export async function toggleAutoRefresh() {
  try {
    const aktif = await api.setAutoRefresh(!get().autoRefresh)
    set({ autoRefresh: aktif })
    beriTahu(aktif ? 'Auto-refresh on — idle cookies are refreshed when the app starts.' : 'Auto-refresh off.')
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function segarkanSemua() {
  if (get().sedangSegarkan) return
  set({ sedangSegarkan: true })
  const akun = get().akun
  const n = { ok: 0, login: 0, verifikasi: 0, dibatasi: 0, sementara: 0 }
  try {
    for (const a of akun) {
      while (segarkanJalan.has(a.id)) await new Promise((r) => setTimeout(r, 100))
      try {
        const h = await api.segarkanAkun(a.id)
        const c = h?.cek || 'sementara'
        if (c === 'ok') n.ok++
        else if (c === 'verifikasi') n.verifikasi++
        else if (c === 'dibatasi') n.dibatasi++
        else if (c === 'sementara') n.sementara++
        else n.login++
      } catch {
        n.sementara++
      }
    }
    await muat()
  } finally {
    set({ sedangSegarkan: false })
  }
  const bagian = [
    `${n.ok} ready`,
    n.login && `${n.login} need signing in again`,
    n.verifikasi && `${n.verifikasi} need a human check`,
    n.dibatasi && `${n.dibatasi} restricted by Roblox (banned or locked; see Status)`,
    n.sementara && `${n.sementara} couldn't be checked (network or Roblox busy; their status was kept)`,
  ].filter(Boolean)
  beriTahu(
    `Checked ${akun.length} account${akun.length === 1 ? '' : 's'}: ${bagian.join(', ')}.`,
    n.login || n.verifikasi || n.dibatasi || n.sementara ? 'salah' : 'benar',
  )
}

export const namaTargetSendiri = (t: TargetLuncur) => t.game_name || (t.place_id ? `Place ${t.place_id}` : 'Private server link')

export async function pasangTargetSendiri(ids: string[]) {
  const p = get().param
  if (!String(p.placeId).replace(/\D/g, '') && !p.linkCode.trim()) return void beriTahu('Pick a game or paste a private server link in the Launch panel first.', 'salah')
  const t: TargetLuncur = { place_id: String(p.placeId), game_name: p.gameName || '', game_icon: p.gameIcon || '', job_id: p.jobId || '', link_code: p.linkCode || '', ikuti: '', jeda: '', sama: '', fps: '' }
  await aturTargetAkun(ids, t)
}

export async function aturTargetAkun(ids: string[], t: TargetLuncur | null) {
  const nama = ids.length === 1 ? get().akun.find((a) => a.id === ids[0])?.alias ?? '' : `${ids.length} accounts`
  try {
    await api.aturTargetAkun(ids, t)
    await muat()
    beriTahu(t ? `Own launch target for ${nama}: ${namaTargetSendiri(t)}.` : `Own launch target cleared for ${nama}.`, 'benar')
  } catch (e) {
    beriTahu(`Own target: ${e}`, 'salah')
  }
}

export async function setFavorit(a: Akun, v: boolean) {
  try { await api.setFavorit([a.id], v); await muat() } catch (e) { beriTahu(`Favourite: ${e}`, 'salah') }
}
export async function setUtama(a: Akun, v: boolean) {
  try { await api.setAkunUtama(a.id, v); await muat() } catch (e) { beriTahu(`Main account: ${e}`, 'salah') }
}
export async function setKualitasPenuh(a: Akun, v: boolean) {
  try { await api.setKualitasPenuh(a.id, v); await muat() } catch (e) { beriTahu(`Full quality: ${e}`, 'salah') }
}
export async function setKecil(a: Akun, lebar: number) {
  try { await api.setKecilAkun([a.id], lebar); await muat() } catch (e) { beriTahu(`Start tiny: ${e}`, 'salah') }
}
export async function setCatatan(a: Akun, teks: string) {
  try { await api.setCatatan(a.id, teks); await muat() } catch (e) { beriTahu(`Notes: ${e}`, 'salah') }
}
export async function setArgumen(a: Akun, teks: string) {
  try {
    const v = await api.setArgumenAkun(a.id, teks)
    beriTahu(v ? `${a.alias}: launch arguments ${v}` : `${a.alias}: default launch arguments.`, 'benar')
    await muat()
  } catch (e) {
    beriTahu(`Launch arguments: ${e}`, 'salah')
    throw e
  }
}
export async function bukaSitus(a: Akun, halaman?: string) {
  try { await api.bukaSitus(a.id, halaman) } catch (e) { beriTahu(String(e), 'salah') }
}
export async function salinTeks(label: string, teks: string) {
  try { await api.salinTeks(teks); beriTahu(`${label} copied.`, 'benar') } catch (e) { beriTahu(String(e), 'salah') }
}

export async function toggleProteksi() {
  try {
    const s = await api.setProteksiSesi(!get().proteksi?.setelan)
    set({ proteksi: s })
    beriTahu(
      s.setelan
        ? "Sign-in protection on — Roblox's shared sign-in files are locked while this app's clients run (with multi-instance)."
        : "Sign-in protection off — clients can overwrite each other's session. You can open Roblox yourself now.",
    )
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function ambilAlihMulti() {
  try {
    set({ multiAktif: await api.ambilAlihMulti() })
    beriTahu('Multi-instance on — the open Roblox game keeps running.', 'benar')
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function nyalakanMulti(): Promise<boolean> {
  try {
    const aktif = await api.setMultiInstance(true)
    set({ multiAktif: aktif })
    beriTahu('Multi-instance on — more than one Roblox client can open.')
    return aktif
  } catch (e) {
    beriTahu(String(e), 'salah')
    if (String(e).includes('opened before multi-instance was turned on')) {
      minta({
        judul: 'Take over from the open Roblox?',
        pesan:
          "A Roblox game that was opened before multi-instance holds Roblox's single-instance lock. Take over closes that one lock inside the open game (nothing else in it is touched) so it keeps running next to the clients CAM starts. Roblox doesn't officially support several clients at once. If you'd rather not, close Roblox and turn multi-instance on again.",
        labelYa: 'Take over',
        aksi: ambilAlihMulti,
      })
    }
    return false
  }
}

export async function toggleMulti() {
  if (!get().multiAktif) {
    return minta({
      judul: 'Enable multi-instance?',
      pesan:
        "This holds Roblox's own single-instance lock so more than one client can run. Roblox's anti-cheat vendor has said running multiple clients may be treated as suspicious behaviour, so this is off by default. Your call.",
      labelYa: 'Enable',
      aksi: nyalakanMulti,
    })
  }
  try {
    const aktif = await api.setMultiInstance(false)
    set({ multiAktif: aktif })
    beriTahu(aktif ? 'Multi-instance on — more than one Roblox client can open.' : 'Multi-instance off.')
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export async function akuiStatusMuat() {
  try { set({ berkasAkun: await api.akuiStatusMuat() }) } catch (e) { beriTahu(String(e), 'salah') }
}
export const mulaiBaru = () =>
  minta({
    judul: 'Start with an empty account list?',
    pesan: 'CAM will start saving again and write a new accounts file. The copy of the unreadable file stays where the banner says, so you can still restore it later.',
    labelYa: 'Start fresh',
    bahaya: true,
    aksi: akuiStatusMuat,
  })

export function pakaiServerTersimpan(s: ServerTersimpan) {
  set((st) => ({
    param: { ...st.param, placeId: String(s.place_id || ''), gameName: s.game_name || '', gameIcon: s.game_icon || '', jobId: s.job_id || '', linkCode: s.link_code || '', ikuti: '' },
    kunciServer: st.kunciServer + 1,
  }))
  beriTahu(`"${s.nama}" set as the launch target.`, 'benar')
}

export async function simpanServerSekarang() {
  const param = get().param
  const place = String(param.placeId || '').trim()
  const link = String(param.linkCode || '').trim()
  const job = String(param.jobId || '').trim()
  const game = param.gameName || (place ? `Place ${place}` : 'Private server link')
  const nama = link ? `${game} · Private server` : job ? `${game} · Server ${job.slice(0, 8)}` : game
  try {
    const [daftar] = await api.simpanServerTersimpan({ id: '', nama, place_id: place, game_name: param.gameName || '', game_icon: param.gameIcon || '', job_id: job, link_code: link, dibuat: 0 })
    set({ serverTersimpan: daftar })
    beriTahu(`Saved "${nama}". Find it under Saved in the Launch panel or on the Servers page.`, 'benar')
    return true
  } catch (e) {
    beriTahu(String(e), 'salah')
    return false
  }
}

export async function ubahNamaServerTersimpan(s: ServerTersimpan, nama: string) {
  try { set({ serverTersimpan: await api.ubahNamaServerTersimpan(s.id, nama) }) } catch (e) { beriTahu(String(e), 'salah') }
}
export async function hapusServerTersimpan(s: ServerTersimpan) {
  try {
    set({ serverTersimpan: await api.hapusServerTersimpan(s.id) })
    beriTahu(`Deleted saved server "${s.nama}".`)
  } catch (e) {
    beriTahu(String(e), 'salah')
  }
}

export function pilihServer(v: { placeId: string | number; jobId: string; linkCode?: string; gameName: string; gameIcon: string; nama?: string }) {
  set((s) => ({
    param: { ...s.param, placeId: String(v.placeId), jobId: v.jobId, linkCode: v.linkCode ?? '', gameName: v.gameName || '', gameIcon: v.gameIcon || '', ikuti: '' },
  }))
  beriTahu(v.nama ? `Private server ${v.nama} set as the launch target.` : `Server ${v.jobId} set as the launch target.`)
}

export function pilihGame(g: { place_id: number; game_name: string; icon_url: string }) {
  set((s) => {
    const lain = String(g.place_id) !== s.param.placeId
    return {
      param: { ...s.param, placeId: String(g.place_id), gameName: g.game_name || '', gameIcon: g.icon_url || '', ikuti: '', ...(lain ? { jobId: '', linkCode: '' } : {}) },
    }
  })
  beriTahu(`${g.game_name || `Place ${g.place_id}`} set as the launch target.`, 'benar')
}

export function pakaiGameJelajah(g: { place_id: number; name: string; icon_url: string }) {
  set((s) => {
    const lain = String(g.place_id) !== s.param.placeId
    return {
      param: { ...s.param, placeId: String(g.place_id), gameName: g.name || '', gameIcon: g.icon_url || '', ikuti: '', ...(lain ? { jobId: '', linkCode: '' } : {}) },
    }
  })
  beriTahu(`${g.name || `Place ${g.place_id}`} set as the launch target.`, 'benar')
}

export const hapusRiwayat = () =>
  minta({
    judul: 'Clear history?',
    pesan: 'Every recorded game will be removed. Accounts and their cookies are not affected.',
    labelYa: 'Clear history',
    bahaya: true,
    aksi: async () => {
      try {
        await api.hapusRiwayat()
        await muatRiwayat()
        beriTahu('History cleared.')
      } catch (e) {
        beriTahu(String(e), 'salah')
      }
    },
  })

export const hapusMasalah = () =>
  minta({
    judul: 'Clear disconnects and crashes?',
    pesan: 'The recorded disconnects and crashes are removed. Nothing else changes.',
    labelYa: 'Clear',
    bahaya: true,
    aksi: async () => {
      try {
        await api.hapusMasalah()
        set({ masalah: [] })
      } catch (e) {
        beriTahu(String(e), 'salah')
      }
    },
  })
