import { atributGame } from '@/utils/namaGame'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, samarkan, waktuRelatif } from '@/api/api'
import type { Akun, HasilPeriksa3d, KlienAkun, LaporanSumber, Riwayat, StatusKlienKebijakan, StatusMonitor } from '@/api/types'
import { beriTahu, useCam } from '@/stores/cam'
import { luncurSatu } from '@/logic/luncur'
import { statusAkun } from '@/lib/status-akun'
import { folderAkun } from '@/lib/folder'
import { cn } from '@/utils/cn'
import { AngkaHidup } from '@/components/ui/AngkaHidup'
import { StatusLabel, type StatusTone } from '@/components/ui/Badge'
import { toneStatus } from '@/components/akun/bagian'
import { STATUS_PANTAU, laju, lamaJalan, mb, persen } from '@/pages/monitor/bagian'
import { Karusel, type KartuKarusel } from './Karusel'
import { Panggung, bangunModel, buangModel, webglAda, type GamePanggung, type ModelSiap, type ModePanggung } from './panggung'
import { LembarKertas, type GameAkun } from './LembarKertas'
import './dashboard.css'

const SIMPAN = 40
const KUNCI_PILIH = 'cam.dashboardAkun'
const MAKS_MODEL = 6
const BELUM_SIAP = "Roblox hasn't finished preparing this 3D avatar yet."
const CEK_PILIHAN_MS = 20000
const CEK_SEMUA_MS = 120000
const CEK_PER_PUTARAN = 15
const DIBATASI = 'Roblox is limiting 3D avatar requests for now.'
const JEDA_DIBATASI_MS = 5 * 60000
const RIWAYAT_MS = 60000
type Tren = Record<number, { cpu: number[]; ram: number[] }>
type Fase = 'memulai' | 'menyambung' | 'di_game'
const FASE: Fase[] = ['memulai', 'menyambung', 'di_game']

function useKlien() {
  const [sumber, setSumber] = useState<LaporanSumber | null>(null)
  const [akunKlien, setAkunKlien] = useState<KlienAkun[]>([])
  const [pantau, setPantau] = useState<StatusMonitor[]>([])
  const [kebijakan, setKebijakan] = useState<Record<number, StatusKlienKebijakan>>({})
  const [tren, setTren] = useState<Tren>({})
  const [kini, setKini] = useState(() => Date.now() / 1000)
  useEffect(() => {
    let hidup = true
    const muat = async () => {
      if (document.hidden) return
      try {
        const [l, a, p] = await Promise.all([api.sumberKlien(), api.klienAkun(), api.statusPantau()])
        if (!hidup) return
        setSumber(l); setAkunKlien(a || []); setPantau(p || []); setKini(Date.now() / 1000)
        setTren((lama) => {
          const baru: Tren = {}
          for (const k of l.klien || []) {
            const t = lama[k.pid] || { cpu: [], ram: [] }
            baru[k.pid] = { cpu: [...t.cpu, k.cpu || 0].slice(-SIMPAN), ram: [...t.ram, k.fisik_perkiraan_mb || 0].slice(-SIMPAN) }
          }
          return baru
        })
      } catch {  }
    }
    const muatKebijakan = async () => {
      if (document.hidden) return
      try { const s = await api.statusKebijakan(); if (hidup) setKebijakan(Object.fromEntries((s.klien || []).map((k) => [k.pid, k]))) } catch {  }
    }
    void muat(); void muatKebijakan()
    const t = window.setInterval(muat, 3000), k = window.setInterval(muatKebijakan, 10000)
    return () => { hidup = false; window.clearInterval(t); window.clearInterval(k) }
  }, [])
  return { sumber, akunKlien, pantau, kebijakan, tren, kini }
}

function useGamesAkun() {
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  useEffect(() => {
    let hidup = true
    const muat = async () => { if (document.hidden) return; try { const r = await api.daftarRiwayat(); if (hidup) setRiwayat(r || []) } catch {  } }
    void muat()
    const t = window.setInterval(muat, RIWAYAT_MS)
    return () => { hidup = false; window.clearInterval(t) }
  }, [])
  return useMemo(() => {
    const per = new Map<string, GameAkun[]>()
    for (const r of [...riwayat].sort((x, y) => y.at - x.at)) {
      const daftar = per.get(r.account_id) ?? []
      if (!daftar.some((x) => x.place_id === r.place_id)) daftar.push({ place_id: r.place_id, nama: r.game_name || `Place ${r.place_id}`, gambar: r.icon_url || '', at: r.at })
      per.set(r.account_id, daftar)
    }
    return per
  }, [riwayat])
}
const keLayar = (g: GameAkun[]): GamePanggung[] => g.map((x) => ({ nama: x.nama, gambar: x.gambar }))
const kunciGames = (g: GameAkun[]) => g.map((x) => `${x.place_id}:${x.gambar}`).join('|')

export function DashboardPage() {
  const akun = useCam((s) => s.akun)
  const folder = useCam((s) => s.folder)
  const pidAkun = useCam((s) => s.pidAkun)
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const autoRefresh = useCam((s) => s.autoRefresh)
  const proteksi = useCam((s) => s.proteksi)
  const { sumber, akunKlien, pantau, kebijakan, tren, kini } = useKlien()
  const gamesAkun = useGamesAkun()
  const gamesRef = useRef(gamesAkun)
  gamesRef.current = gamesAkun

  const daftar = useMemo(() => [...akun].sort((a, b) => Number(!pidAkun[a.id]?.length) - Number(!pidAkun[b.id]?.length)), [akun, pidAkun])
  const [pilihId, setPilihId] = useState<string | null>(() => { try { return localStorage.getItem(KUNCI_PILIH) } catch { return null } })
  const indeks = Math.max(0, daftar.findIndex((a) => a.id === pilihId))
  const a: Akun | undefined = daftar[indeks]
  useEffect(() => { if (a && a.id !== pilihId) setPilihId(a.id) }, [a, pilihId])
  useEffect(() => { if (pilihId) try { localStorage.setItem(KUNCI_PILIH, pilihId) } catch {  } }, [pilihId])

  const pantauAkun = useMemo(() => Object.fromEntries(pantau.map((p) => [p.akun_id, p])), [pantau])
  const pid = a ? pidAkun[a.id]?.[0] : undefined
  const s = pid != null ? sumber?.klien.find((k) => k.pid === pid) : undefined
  const p = a ? pantauAkun[a.id] : undefined
  const kb = pid != null ? kebijakan[pid] : undefined
  const exe = akunKlien.find((k) => k.pid === pid)?.exe || ''
  const versi = exe ? exe.split(/[\\/]/).at(-2) || '' : ''

  const heroRef = useRef<HTMLDivElement>(null)
  const panggung = useRef<Panggung | null>(null)
  const model = useRef(new Map<string, ModelSiap>())
  const permintaan = useRef(0)
  const [ada3d] = useState(webglAda)
  const adaAkun = akun.length > 0
  const [mode, setMode] = useState<'3d' | '2d' | 'memuat'>('memuat')
  const [gambar2d, setGambar2d] = useState('')
  const [catatan, setCatatan] = useState('')
  const [usang, setUsang] = useState(false)
  const [menunggu, setMenunggu] = useState<0 | 1 | 2>(0) 
  const [petunjuk, setPetunjuk] = useState(true)
  const [modeP, setModeP] = useState<ModePanggung>('ganti')
  const [fokusGame, setFokusGame] = useState(0)
  const gamesDiPanggung = useRef<{ id: string; kunci: string } | null>(null)
  const pertama = useRef(true)
  const [fokusBawah, setFokusBawah] = useState(false)
  const fokusBawahRef = useRef(false)
  fokusBawahRef.current = fokusBawah
  const [namaGanti, setNamaGanti] = useState(false)
  const badan = useRef(new Map<number, string>())
  const usangAkun = useRef(new Map<string, boolean>())
  const versiModel = useRef(new Map<string, string>())
  const periksaTerakhir = useRef(new Map<string, { versi: string; usang: boolean }>())
  const pilihRef = useRef<string | undefined>(undefined)
  pilihRef.current = a?.id
  const modeRef = useRef(mode)
  modeRef.current = mode
  const daftarRef = useRef(daftar)
  daftarRef.current = daftar

  useEffect(() => {
    if (!heroRef.current) return
    if (ada3d) {
      try {
        panggung.current = new Panggung(heroRef.current)
        panggung.current.onMulaiGeser = () => setPetunjuk(false)
        panggung.current.onMode = (m) => { setModeP(m); if (m === 'kasus') setFokusGame(0) }
        panggung.current.onFokusGame = setFokusGame
        pertama.current = true
        panggung.current.jeda = fokusBawahRef.current
      } catch (e) { panggung.current = null; console.warn('3D stage unavailable:', e) }
    }
    const peta = model.current
    return () => {
      permintaan.current++
      panggung.current?.dispose(); panggung.current = null
      gamesDiPanggung.current = null
      for (const m of peta.values()) buangModel(m)
      peta.clear()
    }
  }, [ada3d, adaAkun])
  const akarRef = useRef<HTMLDivElement>(null)
  const [sempit, setSempit] = useState(false)
  useEffect(() => {
    const el = akarRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSempit(el.clientWidth < 1040))
    ro.observe(el)
    return () => ro.disconnect()
  }, [adaAkun])
  const [kartuDi, setKartuDi] = useState<{ di: 'panggung' | 'bawah'; fase: 'diam' | 'pergi' | 'datang' }>({ di: 'panggung', fase: 'diam' })
  const awalKartu = useRef(true)
  useEffect(() => {
    const ke = sempit ? 'bawah' : 'panggung'
    if (awalKartu.current) { awalKartu.current = false; setKartuDi({ di: ke, fase: 'diam' }); return }
    const tanpaGerak = document.documentElement.dataset.motion === 'off'
    setKartuDi((k) => (k.di === ke ? { di: ke, fase: k.fase === 'pergi' ? 'diam' : k.fase } : tanpaGerak ? { di: ke, fase: 'diam' } : { di: k.di, fase: 'pergi' }))
    if (tanpaGerak) return
    const t = window.setTimeout(() => setKartuDi((k) => (k.di === ke ? k : { di: ke, fase: 'datang' })), 160)
    return () => window.clearTimeout(t)
  }, [sempit])
  useEffect(() => { if (panggung.current) panggung.current.jeda = fokusBawah }, [fokusBawah])
  useEffect(() => {
    const popupAktif = () => [...document.querySelectorAll('[data-radix-popper-content-wrapper]')].some((w) => !w.querySelector('[role="tooltip"]'))
    const tombol = (e: KeyboardEvent) => {
      const st = panggung.current
      if (!st || e.defaultPrevented || document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"]') || popupAktif()) return
      if (e.key === 'Escape' && document.activeElement?.closest('[data-console][data-buka]')) return
      if (e.key === 'Escape' && (st.modeKini === 'kasus' || st.modeKini === 'detail')) { e.preventDefault(); e.stopPropagation(); st.setMode('beranda') }
      else if (st.modeKini === 'kasus' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); e.stopPropagation(); st.putarKasus(e.key === 'ArrowRight' ? 1 : -1) }
    }
    window.addEventListener('keydown', tombol, true)
    return () => window.removeEventListener('keydown', tombol, true)
  }, [])

  const pakai2d = useCallback(async (x: Akun, sebab: string) => {
    setCatatan(sebab)
    let url = badan.current.get(x.user_id)
    if (url === undefined && x.user_id) {
      url = await api.avatarBadan(x.user_id).catch(() => '')
      if (url) badan.current.set(x.user_id, url)
    }
    panggung.current?.tampilkan(null, keLayar(gamesRef.current.get(x.id) ?? []))
    gamesDiPanggung.current = { id: x.id, kunci: kunciGames(gamesRef.current.get(x.id) ?? []) }
    setGambar2d(url || x.avatar_url || '')
    setMode('2d')
  }, [])

  const tampilkanAkun = useCallback(async (x: Akun) => {
    const stage = panggung.current
    const id = ++permintaan.current
    if (!stage) { void pakai2d(x, ada3d ? '' : '3D needs WebGL, which is not available here.'); return }
    stage.mulaiGanti(pertama.current)
    pertama.current = false
    let tLama = 0
    try {
      let m = model.current.get(x.id)
      if (!m) {
        setMenunggu(1)
        tLama = window.setTimeout(() => id === permintaan.current && setMenunggu(2), 4000)
        const data = await api.avatar3d(x.id)
        if (id !== permintaan.current) return
        m = await bangunModel(data)
        if (panggung.current !== stage) { buangModel(m); return }
        model.current.set(x.id, m)
        versiModel.current.set(x.id, data.versi)
        const pt = periksaTerakhir.current.get(x.id)
        usangAkun.current.set(x.id, data.usang || (!!pt?.usang && pt.versi === data.versi))
      }
      if (id !== permintaan.current) return
      setCatatan(''); setMode('3d'); setUsang(!!usangAkun.current.get(x.id))
      const games = gamesRef.current.get(x.id) ?? []
      stage.tampilkan(m, keLayar(games))
      gamesDiPanggung.current = { id: x.id, kunci: kunciGames(games) }
      for (const [k, tua] of model.current) {
        if (model.current.size <= MAKS_MODEL) break
        if (k === x.id) continue
        buangModel(tua); model.current.delete(k); versiModel.current.delete(k)
      }
    } catch (e) {
      if (id !== permintaan.current) return
      void pakai2d(x, String(e))
    } finally {
      window.clearTimeout(tLama)
      if (id === permintaan.current) setMenunggu(0)
    }
  }, [ada3d, pakai2d])

  useEffect(() => {
    if (!a) return
    setNamaGanti(true)
    const t = window.setTimeout(() => setNamaGanti(false), 180)
    void tampilkanAkun(a)
    return () => window.clearTimeout(t)
  }, [a?.id])

  useEffect(() => {
    const d = gamesDiPanggung.current
    if (!d || !panggung.current) return
    const games = gamesAkun.get(d.id) ?? [], kunci = kunciGames(games)
    if (kunci === d.kunci) return
    d.kunci = kunci
    panggung.current.gantiGames(keLayar(games))
  }, [gamesAkun])

  const terapkanPeriksa = useCallback(async (hasil: HasilPeriksa3d[]) => {
    for (const r of hasil) {
      if (r.galat || !r.versi) continue
      periksaTerakhir.current.set(r.id, { versi: r.versi, usang: r.usang })
      usangAkun.current.set(r.id, r.usang)
      const lama = versiModel.current.get(r.id)
      const x = daftarRef.current.find((y) => y.id === r.id)
      if (!x) continue
      if (r.id === pilihRef.current) {
        if (lama === undefined) {
          if (modeRef.current === '2d') await tampilkanAkun(x) 
        } else if (lama !== r.versi) {
          const tua = model.current.get(r.id)
          model.current.delete(r.id); versiModel.current.delete(r.id)
          await tampilkanAkun(x) 
          if (tua && model.current.get(r.id) !== tua) buangModel(tua)
        } else {
          setUsang(r.usang)
        }
      } else if (lama !== undefined && lama !== r.versi) {
        const tua = model.current.get(r.id)
        model.current.delete(r.id); versiModel.current.delete(r.id)
        if (tua) buangModel(tua)
      }
    }
  }, [tampilkanAkun])

  useEffect(() => {
    if (!adaAkun || !ada3d) return
    let hidup = true, sibuk = false, geser = 0, tundaSampai = 0
    const cek = async (semua: boolean) => {
      if (!hidup || sibuk || document.hidden || Date.now() < tundaSampai) return
      const pilih = pilihRef.current
      let ids = pilih ? [pilih] : []
      if (semua) {
        const lain = daftarRef.current.filter((x) => x.user_id && x.id !== pilih).map((x) => x.id)
        const n = Math.min(lain.length, CEK_PER_PUTARAN - ids.length)
        for (let i = 0; i < n; i++) ids.push(lain[(geser + i) % lain.length])
        geser = lain.length ? (geser + n) % lain.length : 0
      }
      if (!ids.length) return
      sibuk = true
      try {
        const h = await api.avatar3dPeriksa(ids)
        if (h.some((r) => r.galat === DIBATASI)) tundaSampai = Date.now() + JEDA_DIBATASI_MS
        if (hidup) await terapkanPeriksa(h)
      } catch {  } finally { sibuk = false }
    }
    const t0 = window.setTimeout(() => void cek(true), 1500)
    const t1 = window.setInterval(() => void cek(false), CEK_PILIHAN_MS)
    const t2 = window.setInterval(() => void cek(true), CEK_SEMUA_MS)
    return () => { hidup = false; window.clearTimeout(t0); window.clearInterval(t1); window.clearInterval(t2) }
  }, [adaAkun, ada3d, terapkanPeriksa])

  const nama = (u: string) => (sembunyi ? samarkan(u) : u)
  const kartu: KartuKarusel[] = daftar.map((x) => {
    const jalan = !!pidAkun[x.id]?.length
    const st = pantauAkun[x.id]?.status
    return {
      id: x.id,
      nama: x.alias,
      username: x.username ? nama(x.username) : '',
      foto: x.avatar_url,
      baris3: jalan ? pantauAkun[x.id]?.game_name || 'Running' : 'Not running',
      baris3Data: jalan && !!pantauAkun[x.id]?.game_name,
      titik: !jalan ? 'mati' : st === 'di_game' || st === 'teleport' ? 'ok' : st === 'memulai' || st === 'menyambung' ? 'info' : 'warn',
    }
  })

  const [tone, labelPantau] = (p ? STATUS_PANTAU[p.status] ?? ['muted', p.status] : pid ? ['muted', 'Not tracked'] : ['muted', 'Not running']) as [StatusTone, string]
  const fase = p ? FASE.indexOf(p.status as Fase) : -1
  const tahap = !pid ? 0 : p?.status === 'teleport' ? 3 : fase >= 0 ? fase + 1 : 0
  const bermasalah = !!p && ['putus', 'verifikasi', 'ditolak', 'macet'].includes(p.status)
  const stAkun = a ? statusAkun(a) : null
  const namaFolder = a ? folder.find((f) => f.id === folderAkun(a, folder))?.nama ?? 'Ungrouped' : ''
  const game = p?.game_name || (pid ? '' : a?.server_terakhir?.game_name || '')
  const tr = pid != null ? tren[pid] : undefined
  const profil = kb ? ({ normal: 'Normal', balanced_afk: 'Balanced AFK', deep_afk: 'Deep AFK', custom: 'Custom' } as const)[kb.diminta.profil] : a?.hemat ? 'Saver' : 'Normal'
  const fpsBatas = kb?.diminta.fps.nilai ?? (a?.hemat ? a.hemat_fps || 10 : a?.fps_cap || null)
  const ramBatas = kb?.diminta.ws_mb.nilai ?? null
  const terpasang = (st?: string) => (st === 'terpasang' ? ' ✓' : st === 'gagal' || st === 'hilang' ? ' ✗' : '')

  const bawaKeDepan = async () => {
    if (!pid) return
    try {
      const w = (await api.daftarJendela()).find((j) => j.pid === pid)
      if (w) await api.fokusJendela(w.hwnd)
      else beriTahu("This client's window wasn't found.", 'salah')
    } catch (e) { beriTahu(String(e), 'salah') }
  }
  const tutup = async () => {
    if (!pid || !a) return
    try { await api.tutupSatuKlien(pid); beriTahu(`Closed ${a.alias}.`, 'benar') } catch (e) { beriTahu(String(e), 'salah') }
  }

  const jalanSemua = daftar.filter((x) => pidAkun[x.id]?.length)
  const perGame = Object.entries(jalanSemua.reduce<Record<string, number>>((r, x) => { const g = pantauAkun[x.id]?.game_name || 'Not in a game yet'; r[g] = (r[g] || 0) + 1; return r }, {})).sort((x, y) => y[1] - x[1])
  const [filter, setFilter] = useState<'semua' | 'game' | 'join' | 'mati'>('semua')
  const statusBaris = (x: Akun) => { const st = pantauAkun[x.id]?.status; return !pidAkun[x.id]?.length ? 'mati' : st === 'di_game' || st === 'teleport' ? 'game' : st === 'memulai' || st === 'menyambung' ? 'join' : 'game' }
  const baris = daftar.filter((x) => filter === 'semua' || statusBaris(x) === filter)
  const pilihAkun = (id: string) => setPilihId(id)

  const fasaKelas = kartuDi.fase === 'diam' ? undefined : kartuDi.fase
  const selesaiDatang = (e: React.AnimationEvent) => {
    if (kartuDi.fase === 'datang' && /dash-(dari-kanan|naik)/.test(e.animationName) && (e.target as HTMLElement).matches('.dash-apung.kanan, .dash-info > div + div')) setKartuDi((k) => ({ ...k, fase: 'diam' }))
  }

  if (!akun.length) {
    return <div className="grid h-full place-items-center text-sm text-content-muted">Add an account to see it here.</div>
  }

  const kolomKiri = (
    <>
    <section className="dash-kaca">
      <div className="flex items-center justify-between gap-2"><span className="dash-sub">Session</span><StatusLabel tone={tone}>{labelPantau}</StatusLabel></div>
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="dash-ikon-game" style={{ background: game ? 'linear-gradient(135deg, #2b3d5c, #141a26)' : 'rgb(var(--text-primary) / .08)' }}>{game ? game.trim()[0]?.toUpperCase() : '–'}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold" translate={game ? atributGame(game) : undefined}>{game || (pid ? 'Waiting for the game…' : 'Not in a game')}</span>
          <span className="block truncate text-xs text-content-muted">{pid ? (p?.place_id ? `Place ${p.place_id}` : 'Place unknown') : a?.server_terakhir ? `Last played ${waktuRelatif(a.server_terakhir.at) ?? ''}` : 'No client running'}</span>
        </span>
      </div>
      <div className="dash-tahap">{[0, 1, 2].map((k) => <span key={k} className={cn(k < tahap && 'on', bermasalah && k === 2 && 'salah')} />)}</div>
      <div className="dash-tahap-label">{['Starting', 'Joining', 'In game'].map((l, k) => <span key={l} className={cn(k === tahap - 1 && 'on')}>{l}</span>)}</div>
      <dl className="dash-kv">
        <dt>Joined</dt><dd className="tnum">{p?.masuk_at ? waktuRelatif(p.masuk_at) ?? '—' : '—'}</dd>
        <dt>Rejoins</dt><dd className="tnum">{p ? p.rejoin : '—'}</dd>
        <dt>PID</dt><dd className="tnum">{pid ?? '—'}</dd>
        <dt>Roblox version</dt><dd translate="no">{versi || '—'}</dd>
        {bermasalah && p?.alasan ? <><dt>Reason</dt><dd title={p.alasan} className="text-warning">{p.alasan}</dd></> : null}
      </dl>
    </section>
    <section className="dash-kaca">
      <div className="flex items-center justify-between gap-2"><span className="dash-sub">Account</span>{stAkun ? <StatusLabel tone={toneStatus(stAkun.jenis)}>{stAkun.teks}</StatusLabel> : null}</div>
      <dl className="dash-kv">
        <dt>Robux</dt><dd className="tnum">{a ? a.robux.toLocaleString('en-US') : '—'}</dd>
        <dt>Membership</dt><dd>{a?.plus ? 'Plus' : a?.premium ? 'Premium' : '—'}</dd>
        <dt>Folder</dt><dd translate={namaFolder !== 'Ungrouped' ? 'no' : undefined}>{namaFolder}</dd>
        <dt>Profile</dt><dd>{profil}</dd>
        <dt>Auto-rejoin</dt><dd className={a?.auto_rejoin ? 'text-success' : 'text-content-muted'}>{a?.auto_rejoin ? 'On' : 'Off'}</dd>
        <dt>Anti-AFK</dt><dd className={a?.anti_afk ? 'text-success' : 'text-content-muted'}>{a?.anti_afk ? 'On' : 'Off'}</dd>
        <dt>Last launched</dt><dd>{a?.last_launched ? waktuRelatif(a.last_launched) ?? '—' : 'Never'}</dd>
      </dl>
      <div className="dash-aksi">
        <button type="button" className="utama" disabled={!a} onClick={() => a && void luncurSatu(a)}>▶ Launch</button>
        <button type="button" disabled={!pid} onClick={() => void bawaKeDepan()}>Bring to front</button>
        <button type="button" disabled={!pid} onClick={() => void tutup()} title="Close this client (not rejoined)">Close</button>
      </div>
    </section>
    </>
  )
  const kolomKanan = (
    <>
    <section className="dash-kaca">
      <div className="flex items-center justify-between gap-2"><span className="dash-sub">Resources</span><span className="text-xs text-content-muted">{pid ? 'live · every 3 s' : 'not running'}</span></div>
      <div className="dash-stat3">
        <div><div className="k">CPU</div><div className="v tnum"><AngkaHidup nilai={s?.cpu} format={persen} /></div><div className="dash-meter"><span style={{ width: `${Math.min(100, (s?.cpu ?? 0) * 4)}%`, background: '#3987e5' }} /></div></div>
        <div><div className="k">GPU</div><div className="v tnum"><AngkaHidup nilai={s?.gpu} format={persen} /></div><div className="dash-meter"><span style={{ width: `${Math.min(100, (s?.gpu ?? 0) * 3)}%`, background: 'rgb(var(--warning))' }} /></div></div>
        <div><div className="k">GPU memory</div><div className="v tnum text-[15px]"><AngkaHidup nilai={s?.vram_mb} format={mb} /></div></div>
      </div>
      <div className="mt-3 flex items-center justify-between"><span className="text-xs text-content-muted">Physical RAM (est.)</span><span className="tnum text-base font-bold"><AngkaHidup nilai={s?.fisik_perkiraan_mb} format={mb} /></span></div>
      <GrafikRam nilai={tr?.ram ?? []} />
      <dl className="dash-kv" style={{ marginTop: 6 }}>
        <dt>Read · Write</dt><dd className="tnum">{s ? `${laju(s.baca_bps)} · ${laju(s.tulis_bps)}` : '—'}</dd>
        <dt>Up for</dt><dd className="tnum">{s?.mulai_unix ? lamaJalan(kini - s.mulai_unix) : '—'}</dd>
      </dl>
    </section>
    <section className="dash-kaca">
      <div className="flex items-center justify-between gap-2"><span className="dash-sub">Limits &amp; memory</span></div>
      <dl className="dash-kv">
        <dt>FPS limit</dt><dd className="tnum">{fpsBatas ? `${fpsBatas} FPS${terpasang(kb?.fps)}` : 'No limit'}</dd>
        <dt>RAM limit</dt><dd className="tnum">{ramBatas ? `${ramBatas} MB${terpasang(kb?.ws)}` : 'Off'}</dd>
        <dt>Low priority</dt><dd>{kb?.diminta.prioritas_rendah.nilai ? `On${terpasang(kb.prioritas)}` : 'Off'}</dd>
        <dt>Low graphics</dt><dd>{kb?.diminta.grafis_rendah.nilai ? 'On' : 'Off'}</dd>
      </dl>
      {s ? (
        <>
          <div className="dash-komposisi">{[[s.ram_privat_mb, '#3987e5'], [s.ram_bersama_mb, '#8f8f8f'], [s.di_luar_ram_mb, 'rgb(var(--text-primary) / .14)']].map(([v, w], k) => <span key={k} style={{ width: `${(Number(v) / Math.max(1, s.ram_privat_mb + s.ram_bersama_mb + s.di_luar_ram_mb)) * 100}%`, background: String(w) }} />)}</div>
          <div className="dash-legenda"><span><i style={{ background: '#3987e5' }} />Private <b className="tnum">{mb(s.ram_privat_mb)}</b></span><span><i style={{ background: '#8f8f8f' }} />Shared <b className="tnum">{mb(s.ram_bersama_mb)}</b></span><span><i style={{ background: 'rgb(var(--text-primary) / .25)' }} />Not in RAM <b className="tnum">{mb(s.di_luar_ram_mb)}</b></span></div>
        </>
      ) : null}
    </section>
    </>
  )

  return (
    <div ref={akarRef} className={cn('dash h-full overflow-y-auto overflow-x-hidden p-4', fokusBawah && 'fokus-bawah')} id="dash-gulir">
      <section className={cn('dash-hero', !ada3d && 'tanpa-3d')} ref={heroRef} aria-label="3D avatar" data-mode={ada3d ? modeP : 'beranda'}>
        {mode === '2d' && gambar2d ? <img className="dash-2d" src={gambar2d} alt="" /> : null}
        <div className="dash-judul">
          <div className={cn('nama', namaGanti && 'ganti')} translate="no">{a?.alias}</div>
          <div className="text-sm text-content-muted" translate="no">@{a?.username ? nama(a.username) : '—'}</div>
        </div>
        {catatan ? (
          <div className="dash-catatan" title={catatan}>{catatan === BELUM_SIAP ? 'Roblox is still preparing the 3D model · showing the 2D render' : '3D avatar unavailable · showing the 2D render'}</div>
        ) : mode === '3d' && usang ? (
          <div className="dash-catatan" title="Roblox hasn't prepared the 3D model of the current avatar yet. CAM keeps checking on its own.">Last saved 3D model · Roblox is still preparing the current one</div>
        ) : null}

        {kartuDi.di === 'panggung' ? (
          <>
            <div className={cn('dash-apung kiri', fasaKelas)}>{kolomKiri}</div>
            <div className={cn('dash-apung kanan', fasaKelas)} onAnimationEnd={selesaiDatang}>{kolomKanan}</div>
          </>
        ) : null}

        {mode === 'memuat' || menunggu ? <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-content-muted">{menunggu === 2 ? 'Waiting for Roblox to prepare the 3D model…' : 'Loading 3D avatar…'}</div> : null}
        {ada3d ? (
          <div className="dash-alat">
            <span className="dash-petunjuk" style={{ opacity: petunjuk ? 1 : 0 }}>Drag to turn · hold to spin · scroll for games</span>
            <div className="tombol">
              <button type="button" className="dash-detail" disabled={!a || modeP !== 'beranda'} onClick={() => panggung.current?.setMode('detail')} title="Account details: sign-in, security and activity">Detail</button>
            </div>
          </div>
        ) : null}
        {ada3d ? (
          <LembarKertas buka={modeP === 'kasus' || modeP === 'detail' ? modeP : null} akun={a} games={a ? gamesAkun.get(a.id) ?? [] : []} fokus={fokusGame}
            autoRefresh={autoRefresh} proteksi={proteksi} onTutup={() => panggung.current?.setMode('beranda')} />
        ) : null}
      </section>

      <Karusel kartu={kartu} pilih={indeks} onPilih={(i) => daftar[i] && pilihAkun(daftar[i].id)} />
      {kartuDi.di === 'bawah' ? (
        <div className={cn('dash-info', fasaKelas)} onAnimationEnd={selesaiDatang}>
          <div>{kolomKiri}</div>
          <div>{kolomKanan}</div>
        </div>
      ) : null}

      <div className="dash-bawah" onPointerEnter={() => setFokusBawah(true)} onPointerLeave={() => setFokusBawah(false)}>
        <section className="rounded-[14px] border border-line-subtle bg-surface-1 p-4" aria-label="Playing now">
          <div className="flex items-center justify-between"><span className="text-[15px] font-semibold">Playing now</span><span className="tnum text-sm text-content-muted">{jalanSemua.length === 1 ? '1 client' : `${jalanSemua.length} clients`}</span></div>
          {perGame.length ? perGame.map(([g, n]) => (
            <div key={g} className="flex items-center gap-2.5 border-b border-line-subtle py-2 last:border-0">
              <span className="dash-ikon-game h-10 w-10" style={{ background: 'linear-gradient(135deg, #2b3d5c, #141a26)' }}>{g.trim()[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between"><span className="truncate font-medium" translate="no">{g}</span><span className="tnum text-content-muted">{n}</span></span>
                <span className="mt-1 block h-1 overflow-hidden rounded bg-surface-3"><span className="block h-full bg-[#3987e5]" style={{ width: `${(n / Math.max(1, jalanSemua.length)) * 100}%` }} /></span>
              </span>
            </div>
          )) : <p className="mt-3 text-sm text-content-muted">No Roblox client is running.</p>}
        </section>
        <section className="dash-klien min-w-0 rounded-[14px] border border-line-subtle bg-surface-1 p-4" aria-label="Clients">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[15px] font-semibold">Clients <span className="ml-1.5 rounded-full bg-content-muted/15 px-2 text-xs font-medium text-content-muted">{jalanSemua.length} running</span></span>
            <div className="inline-flex gap-0.5 rounded-[10px] border border-line-subtle bg-surface-2 p-[3px]" role="group" aria-label="Show">
              {([['semua', 'All'], ['game', 'In game'], ['join', 'Joining'], ['mati', 'Not running']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={cn('rounded-[7px] px-3 py-1 text-sm', filter === k ? 'bg-surface-1 text-content-primary shadow' : 'text-content-muted hover:text-content-secondary')}>{l}</button>
              ))}
            </div>
          </div>
          <table className="dash-tabel">
            <thead><tr><th>Account</th><th className="k-game">Game</th><th className="k-cpu">CPU</th><th className="k-ram">Physical RAM</th><th className="k-up">Up</th><th className="k-status !text-right">Status</th></tr></thead>
            <tbody>
              {baris.map((x) => {
                const xp = pidAkun[x.id]?.[0]
                const xs = xp != null ? sumber?.klien.find((k) => k.pid === xp) : undefined
                const xm = pantauAkun[x.id]
                const [xt, xl] = (xm ? STATUS_PANTAU[xm.status] ?? ['muted', xm.status] : xp ? ['muted', 'Not tracked'] : ['muted', 'Not running']) as [StatusTone, string]
                return (
                  <tr key={x.id} className={cn(x.id === a?.id && 'dipilih')} onClick={() => { pilihAkun(x.id); document.getElementById('dash-gulir')?.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                    <td title={`${x.alias} @${nama(x.username)}`}><b className="font-semibold" translate="no">{x.alias}</b> <span className="text-content-muted" translate="no">@{nama(x.username)}</span></td>
                    <td className="k-game" title={xm?.game_name || undefined}>{xm?.game_name ? <span translate={atributGame(xm.game_name)}>{xm.game_name}</span> : <span className="text-content-muted">—</span>}</td>
                    <td className="k-cpu tnum">{xs ? persen(xs.cpu) : '—'}</td>
                    <td className="k-ram tnum">{xs ? mb(xs.fisik_perkiraan_mb) : '—'}</td>
                    <td className="k-up tnum text-content-muted">{xs?.mulai_unix ? lamaJalan(kini - xs.mulai_unix) : '—'}</td>
                    <td className="k-status text-right"><StatusLabel tone={xt}>{xl}</StatusLabel></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

function GrafikRam({ nilai }: { nilai: number[] }) {
  const w = 300, h = 92
  if (nilai.length < 2) return <div className="mt-1.5 grid h-[92px] place-items-center text-xs text-content-muted">{nilai.length ? 'Measuring…' : 'Not running'}</div>
  const maks = Math.max(...nilai, 1) * 1.15
  const x = (i: number) => (i / (nilai.length - 1)) * w
  const pts = nilai.map((v, i) => [x(i), h - 6 - (v / maks) * (h - 14)] as const)
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5 block h-[92px] w-full" role="img" aria-label={`Physical RAM, last 2 minutes: ${mb(nilai[nilai.length - 1])}`}>
      <defs><linearGradient id="dash-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3987e5" stopOpacity=".35" /><stop offset="1" stopColor="#3987e5" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h} Z`} fill="url(#dash-gr)" />
      <path d={d} fill="none" stroke="#3987e5" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

export default DashboardPage
