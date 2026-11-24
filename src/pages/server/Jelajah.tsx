import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Earth, Loader2, Monitor, Play, RefreshCw, Search, Server, Tag, ThumbsUp, Users, X } from '@/components/ikon'
import type { LucideIcon } from '@/components/ikon'
import { api } from '@/api/api'
import type { DetailGame, GameJelajah, InfoPribadi, KategoriJelajah, OpsiFilter } from '@/api/types'
import { pakaiGameJelajah, useCam } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import './jelajah.css'

interface Muatan {
  kategori: KategoriJelajah[]
  token: string
  perangkat: string
  negara: string
  waktu: number
}

const KARTU_AWAL = 16
const SEGAR_MS = 5 * 60_000
const cache = new Map<string, Muatan>()
let opsiPerangkat: OpsiFilter[] = []
let opsiNegara: OpsiFilter[] = []
const detailCache = new Map<number, Promise<DetailGame>>()

function ambilDetail(universeId: number) {
  let p = detailCache.get(universeId)
  if (!p) {
    p = api.detailGame(universeId)
    p.catch(() => detailCache.delete(universeId))
    detailCache.set(universeId, p)
  }
  return p
}

const pribadiCache = new Map<number, Promise<InfoPribadi>>()
function ambilPribadi(universeId: number, placeId: number) {
  let p = pribadiCache.get(universeId)
  if (!p) {
    p = api.infoServerPribadi(universeId, placeId)
    p.catch(() => pribadiCache.delete(universeId))
    pribadiCache.set(universeId, p)
  }
  return p
}

export function teksPribadi(p: InfoPribadi | null) {
  if (!p) return ''
  if (p.diizinkan === false) return 'Not allowed'
  if (p.harga === 0) return 'Free (0 Robux)'
  if (p.harga) return `${p.harga} Robux`
  return p.diizinkan ? 'Allowed' : 'Unknown'
}

const baca = (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const tulis = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {  } }

const PERANGKAT_CADANGAN: OpsiFilter[] = [
  { id: 'all', nama: 'All Devices', tag: '' },
  { id: 'low_end_phone', nama: 'Entry-level Phone', tag: '' },
  { id: 'high_end_phone', nama: 'Standard Phone', tag: '' },
  { id: 'low_end_tablet', nama: 'Entry-level Tablet', tag: '' },
  { id: 'high_end_tablet', nama: 'Standard Tablet', tag: '' },
  { id: 'computer', nama: 'Computer', tag: '' },
  { id: 'console', nama: 'Console', tag: '' },
  { id: 'vr', nama: 'VR', tag: '' },
]

const angka = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
export const ringkas = (n: number) => angka.format(Math.max(0, n || 0))
export const persenSuka = (g: { suka: number; tak_suka: number }) => {
  const t = g.suka + g.tak_suka
  return t > 0 ? Math.round((g.suka * 100) / t) : null
}

function sejak(ms: number) {
  const d = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)} min ago`
  return `${Math.floor(d / 3600)} h ago`
}

function tanggal(iso: string) {
  const t = Date.parse(iso)
  if (!t) return '—'
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function hue(teks: string) {
  let h = 0
  for (const c of teks) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return Math.floor(((h * 0.6180339887) % 1) * 360)
}

const gerakMati = () =>
  document.documentElement.dataset.motion === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

const gayaI = (i: number) => ({ '--i': i }) as CSSProperties

function useMasuk<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (gerakMati()) { el.dataset.masuk = ''; return }
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { el.dataset.masuk = ''; io.disconnect() }
    }, { rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

export function Jelajah() {
  const navigate = useNavigate()
  const targetPlace = useCam((s) => s.param.placeId)
  const [perangkat, setPerangkat] = useState(() => baca('jelajahPerangkat'))
  const [negara, setNegara] = useState(() => baca('jelajahNegara'))
  const kunci = `${perangkat}|${negara}`
  const [data, setData] = useState<Muatan | null>(() => cache.get(kunci) ?? null)
  const [memuat, setMemuat] = useState(false)
  const [memuatLagi, setMemuatLagi] = useState(false)
  const [gagalLagi, setGagalLagi] = useState(false)
  const sedangLagi = useRef(false)
  const [galat, setGalat] = useState('')
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [hasilCari, setHasilCari] = useState<GameJelajah[] | null>(null)
  const [mencari, setMencari] = useState(false)
  const [buka, setBuka] = useState<{ g: GameJelajah; asal: HTMLElement | null } | null>(null)
  const [, setDetak] = useState(0)
  const sesi = useRef(0)
  const cariRef = useRef<HTMLInputElement>(null)

  const muatAwal = useCallback(async (paksa: boolean) => {
    const id = ++sesi.current
    sedangLagi.current = false
    setMemuatLagi(false)
    setGagalLagi(false)
    const ada = cache.get(kunci)
    if (!paksa && ada && Date.now() - ada.waktu < SEGAR_MS) {
      setData(ada)
      setGalat('')
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const h = await api.jelajahGame(perangkat, negara, '')
      if (id !== sesi.current) return
      if (h.perangkat.length) opsiPerangkat = h.perangkat
      if (h.negara.length) opsiNegara = h.negara
      const m: Muatan = { kategori: h.kategori, token: h.token, perangkat: h.perangkat_terpilih, negara: h.negara_terpilih, waktu: Date.now() }
      cache.set(kunci, m)
      setData(m)
      setGagalLagi(false)
    } catch (e) {
      if (id === sesi.current) setGalat(String(e))
    } finally {
      if (id === sesi.current) setMemuat(false)
    }
  }, [kunci, perangkat, negara])

  useEffect(() => { void muatAwal(false) }, [muatAwal])
  useEffect(() => { const h = window.setInterval(() => setDetak((n) => n + 1), 30_000); return () => window.clearInterval(h) }, [])

  const muatBerikut = useCallback(async (otomatis: boolean) => {
    const d = cache.get(kunci)
    if (!d || !d.token || sedangLagi.current || (otomatis && gagalLagi)) return
    const id = sesi.current
    sedangLagi.current = true
    setMemuatLagi(true)
    setGagalLagi(false)
    try {
      const h = await api.jelajahGame(d.perangkat || perangkat, d.negara || negara, d.token)
      if (id !== sesi.current) return
      const sudah = new Set(d.kategori.map((k) => k.id))
      const m: Muatan = { ...d, kategori: [...d.kategori, ...h.kategori.filter((k) => !sudah.has(k.id))], token: h.token }
      cache.set(kunci, m)
      setData(m)
    } catch {
      if (id === sesi.current) setGagalLagi(true)
    } finally {
      if (id === sesi.current) {
        sedangLagi.current = false
        setMemuatLagi(false)
      }
    }
  }, [kunci, perangkat, negara, gagalLagi])

  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) { setHasilCari(null); setMencari(false); return }
    setMencari(true)
    let hidup = true
    const h = window.setTimeout(async () => {
      try {
        const r = await api.cariGame(t)
        if (hidup) setHasilCari(r.map((g) => ({ universe_id: g.universe_id, place_id: g.place_id, name: g.name, players: g.players, suka: 0, tak_suka: 0, genre: '', icon_url: g.icon_url })))
      } catch {
        if (hidup) setHasilCari([])
      } finally {
        if (hidup) setMencari(false)
      }
    }, 400)
    return () => { hidup = false; window.clearTimeout(h) }
  }, [q])

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return
      e.preventDefault()
      cariRef.current?.focus()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  const pilihPerangkat = (id: string) => { setPerangkat(id); tulis('jelajahPerangkat', id); setGenre('') }
  const pilihNegara = (id: string) => { setNegara(id); tulis('jelajahNegara', id); setGenre('') }

  const kategori = data?.kategori ?? []
  const [genres, jumlahSemua] = useMemo(() => {
    const per = new Map<string, Set<number>>()
    const semua = new Set<number>()
    for (const k of kategori) for (const g of k.games) {
      semua.add(g.universe_id)
      if (g.genre) { if (!per.has(g.genre)) per.set(g.genre, new Set()); per.get(g.genre)!.add(g.universe_id) }
    }
    return [[...per.entries()].map(([genre, s]) => ({ genre, jumlah: s.size })).sort((a, b) => b.jumlah - a.jumlah), semua.size] as const
  }, [kategori])

  const qKecil = q.trim().toLowerCase()
  const cocok = useCallback((g: GameJelajah) => (!genre || g.genre === genre) && (!qKecil || g.name.toLowerCase().includes(qKecil) || g.genre.toLowerCase().includes(qKecil)), [genre, qKecil])
  const rak = useMemo(() => kategori.map((k) => ({ k, games: k.games.filter(cocok) })).filter((r) => r.games.length), [kategori, cocok])
  const aktif = !!genre || !!qKecil
  const jumlah = useMemo(() => new Set(rak.flatMap((r) => r.games.map((g) => g.universe_id))).size, [rak])
  const cariTampil = hasilCari && !genre ? hasilCari : null

  const sorotan = useMemo(() => {
    const ambil = (id: string) => kategori.find((k) => k.id === id)?.games[0]
    const daftar: { g: GameJelajah; label: string }[] = []
    const pakai = (g: GameJelajah | undefined, label: string) => { if (g && !daftar.some((d) => d.g.universe_id === g.universe_id)) daftar.push({ g, label }) }
    pakai(ambil('top-trending'), '#1 Top Trending')
    pakai(ambil('up-and-coming'), '#1 Up-and-Coming')
    pakai(ambil('top-playing-now'), '#1 Playing now')
    for (const k of kategori) if (daftar.length < 3) pakai(k.games[0], `#1 ${k.nama}`)
    return daftar
  }, [kategori])

  const bukaDetail = useCallback((g: GameJelajah, asal: HTMLElement | null) => setBuka((b) => b ?? { g, asal }), [])
  const keServer = useCallback((g: { place_id: number; name: string; icon_url: string }) => {
    navigate('/servers?tab=browse', { state: { jelajah: { placeId: String(g.place_id), name: g.name, icon: g.icon_url } } })
  }, [navigate])

  const reset = () => { setQ(''); setGenre('') }
  const label = (opsi: OpsiFilter[], id: string, cadangan: string) => opsi.find((o) => o.id === id)?.nama || cadangan
  const perangkatAktif = perangkat || data?.perangkat || ''
  const negaraAktif = negara || data?.negara || ''

  return (
    <section className="jl flex flex-col pb-12" aria-label="Discover games">
      <div className="jl-filter flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="jl-cari">
            <Search className="h-4 w-4" />
            <input
              ref={cariRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape' && q) { e.stopPropagation(); setQ('') } }}
              placeholder="Search games or genres"
              aria-label="Search games"
              spellCheck={false}
              autoComplete="off"
              maxLength={80}
            />
            {q ? <button type="button" className="jl-hapus" onClick={() => setQ('')} aria-label="Clear search"><X className="h-3.5 w-3.5" /></button> : <kbd>/</kbd>}
          </label>
          <Dropdown
            ikon={Monitor}
            judul="Device"
            kosong="Roblox default"
            opsi={(opsiPerangkat.length ? opsiPerangkat : PERANGKAT_CADANGAN).map((o) => ({ id: o.id, nama: o.nama, tag: o.tag === 'My device' ? 'This PC' : o.tag }))}
            nilai={perangkatAktif}
            onPilih={pilihPerangkat}
          />
          <Dropdown
            ikon={Tag}
            judul="Genre"
            kosong="All genres"
            opsi={[{ id: '', nama: 'All genres', jumlah: jumlahSemua }, ...genres.map((g) => ({ id: g.genre, nama: g.genre, jumlah: g.jumlah, data: true }))]}
            nilai={genre}
            onPilih={setGenre}
            nonaktif={!genres.length}
          />
          <Dropdown ikon={Earth} judul="Location" kosong="Roblox default" opsi={opsiNegara.map((o) => ({ id: o.id, nama: o.nama, tag: o.tag === 'My location' ? 'Yours' : o.tag, data: o.id !== 'all' }))} nilai={negaraAktif} onPilih={pilihNegara} cari />
          <button type="button" className="jl-ikon-tombol" onClick={() => void muatAwal(true)} disabled={memuat} title={data ? `Reload charts (loaded ${sejak(data.waktu)})` : 'Reload charts'} aria-label="Reload charts">
            {memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
        {galat && kategori.length ? <p role="alert" className="text-xs text-error">{`Couldn’t reload the charts: ${galat}`}</p> : null}
        {aktif ? (
          <p className="jl-mono text-xs text-content-muted" aria-live="polite">
            <span className="text-accent">{`${jumlah} ${jumlah === 1 ? 'game matches' : 'games match'} in the charts`}</span>
            {qKecil ? <span translate="no">{` · “${q.trim()}”`}</span> : null}
            {genre ? <span translate="no">{` · ${genre}`}</span> : null}
            <button type="button" onClick={reset} className="ml-3 font-sans font-semibold text-content-secondary underline underline-offset-2 hover:text-content-primary">Clear filters</button>
          </p>
        ) : null}
      </div>

      {galat && !kategori.length ? (
        <EmptyState icon={X} title="Couldn’t load the charts" description={galat} action={<Button size="sm" variant="secondary" onClick={() => void muatAwal(true)}>Retry</Button>} />
      ) : !kategori.length || memuat ? (
        <Kerangka sorotan={!aktif} />
      ) : (
        <div className="flex flex-col">
          {!aktif && sorotan.length ? <Sorotan daftar={sorotan} onBuka={bukaDetail} onServer={keServer} /> : null}

          {cariTampil || (mencari && qKecil.length >= 2) ? (
            <Rak nomor="⌕" judul="On Roblox" sub={`Roblox search for “${q.trim()}”`} games={cariTampil ?? []} memuat={mencari && !cariTampil} tanpaPeringkat target={targetPlace} onBuka={bukaDetail} onServer={keServer} />
          ) : null}

          {rak.map((r, i) => (
            <Rak
              key={r.k.id}
              id={r.k.id}
              nomor={String(i + 1).padStart(2, '0')}
              judul={r.k.nama}
              sub={r.k.info}
              catatan={r.k.catatan}
              hidup={r.k.id === 'top-playing-now'}
              games={r.games}
              tanpaPeringkat={aktif}
              target={targetPlace}
              onBuka={bukaDetail}
              onServer={keServer}
            />
          ))}

          {aktif && !rak.length && !(cariTampil?.length) && !mencari ? (
            <EmptyState icon={Search} title="Nothing in the charts matches" description="Try another genre, a shorter search, or clear the filters." action={<Button size="sm" variant="secondary" onClick={reset}>Clear filters</Button>} />
          ) : null}

          {data?.token ? <Lanjut onTampak={() => void muatBerikut(true)} memuat={memuatLagi} gagal={gagalLagi} onKlik={() => void muatBerikut(false)} /> : null}
          {!data?.token && !aktif ? <p className="jl-mono px-5 pt-10 text-center text-xs text-content-muted">{`That’s every chart Roblox has for ${label(opsiPerangkat, perangkatAktif, 'this device')} · ${label(opsiNegara, negaraAktif, 'this location')}.`}</p> : null}
        </div>
      )}

      {buka ? <DialogGame key={`${buka.g.universe_id}-${buka.g.place_id}`} awal={buka} semua={kategori} target={targetPlace} onTutup={() => setBuka(null)} onServer={keServer} /> : null}
    </section>
  )
}

interface OpsiDd {
  id: string
  nama: string
  tag?: string
  jumlah?: number
  data?: boolean
}

function Dropdown({ ikon: Ikon, judul, kosong, opsi, nilai, onPilih, cari = false, nonaktif = false }: {
  ikon: LucideIcon
  judul: string
  kosong: string
  opsi: OpsiDd[]
  nilai: string
  onPilih: (id: string) => void
  cari?: boolean
  nonaktif?: boolean
}) {
  const [buka, setBuka] = useState(false)
  const [q, setQ] = useState('')
  const [aktif, setAktif] = useState(0)
  const daftarRef = useRef<HTMLDivElement>(null)
  const kunci = judul.toLowerCase()
  const kini = opsi.find((o) => o.id === nilai)
  const tampil = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? opsi.filter((o) => o.nama.toLowerCase().includes(t) || o.id === t) : opsi
  }, [opsi, q])
  useEffect(() => { if (buka) { setQ(''); setAktif(Math.max(0, opsi.findIndex((o) => o.id === nilai))) } }, [buka]) 
  useEffect(() => { daftarRef.current?.querySelector<HTMLElement>(`[data-i="${aktif}"]`)?.scrollIntoView({ block: 'nearest' }) }, [aktif, buka])
  const pilih = (o: OpsiDd) => { onPilih(o.id); setBuka(false) }
  const tombol = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAktif((i) => Math.min(tampil.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAktif((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setAktif(0) }
    else if (e.key === 'End') { e.preventDefault(); setAktif(tampil.length - 1) }
    else if ((e.key === 'Enter' || (!cari && e.key === ' ')) && tampil[aktif]) { e.preventDefault(); pilih(tampil[aktif]) }
  }
  const idOpsi = (o: OpsiDd) => `jl-${kunci}-${o.id || 'semua'}`
  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverTrigger asChild>
        <button type="button" className="dd-tombol dd-tombol-besar max-w-[15rem]" aria-label={`${judul}: ${kini?.nama || kosong}`} data-dd={kunci} disabled={nonaktif || !opsi.length}>
          <Ikon className="h-4 w-4 shrink-0 text-content-muted" />
          <span className="truncate" translate={kini?.data ? 'no' : undefined}>{kini?.nama || kosong}</span>
          <ChevronDown className="dd-chev h-3.5 w-3.5 shrink-0 text-content-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="dd-panel w-[15rem]"
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>(cari ? 'input' : '[role=listbox]')?.focus() }}
      >
        <div className="dd-kepala">{judul}</div>
        {cari ? (
          <input
            className="dd-cari"
            value={q}
            onChange={(e) => { setQ(e.target.value); setAktif(0) }}
            onKeyDown={tombol}
            placeholder="Find a country"
            aria-label="Find a country"
            aria-controls={`jl-daftar-${kunci}`}
            aria-activedescendant={tampil[aktif] ? idOpsi(tampil[aktif]) : undefined}
            spellCheck={false}
            autoComplete="off"
          />
        ) : null}
        <div
          ref={daftarRef}
          id={`jl-daftar-${kunci}`}
          role="listbox"
          aria-label={judul}
          tabIndex={cari ? undefined : -1}
          onKeyDown={cari ? undefined : tombol}
          aria-activedescendant={!cari && tampil[aktif] ? idOpsi(tampil[aktif]) : undefined}
          className="max-h-[min(19rem,calc(var(--radix-popover-content-available-height,24rem)-3.5rem))] overflow-y-auto outline-none"
        >
          {tampil.length ? tampil.map((o, i) => (
            <button
              key={o.id || 'semua'}
              id={idOpsi(o)}
              data-i={i}
              data-aktif={i === aktif}
              style={gayaI(Math.min(i, 10))}
              type="button"
              role="option"
              aria-selected={o.id === nilai}
              tabIndex={-1}
              onMouseMove={() => { if (i !== aktif) setAktif(i) }}
              onClick={() => pilih(o)}
              className="dd-opsi"
            >
              <span className="dd-centang"><Check className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1 truncate" translate={o.data ? 'no' : undefined}>{o.nama}</span>
              {o.tag ? <span className="dd-tag">{o.tag}</span> : o.jumlah !== undefined ? <span className="dd-tag">{o.jumlah}</span> : null}
            </button>
          )) : <p className="px-3 py-3 text-sm text-content-muted">No country matches.</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Sorotan({ daftar, onBuka, onServer }: { daftar: { g: GameJelajah; label: string }[]; onBuka: (g: GameJelajah, asal: HTMLElement | null) => void; onServer: (g: GameJelajah) => void }) {
  const ref = useMasuk<HTMLDivElement>()
  return (
    <div ref={ref} className="jl-sorotan">
      {daftar.map((d, i) => <Spot key={d.g.universe_id} g={d.g} label={d.label} urutan={i} onBuka={onBuka} onServer={onServer} />)}
    </div>
  )
}

function Spot({ g, label, urutan, onBuka, onServer }: { g: GameJelajah; label: string; urutan: number; onBuka: (g: GameJelajah, asal: HTMLElement | null) => void; onServer: (g: GameJelajah) => void }) {
  const [gambar, setGambar] = useState('')
  const utama = urutan === 0
  useEffect(() => {
    let hidup = true
    ambilDetail(g.universe_id).then((d) => { if (hidup && d.gambar[0]) setGambar(d.gambar[0]) }).catch(() => {})
    return () => { hidup = false }
  }, [g.universe_id])
  const suka = persenSuka(g)
  const bukaIni = () => onBuka(g, null)
  return (
    <div
      className={cn('jl-spot jl-rv', utama ? 'jl-spot-utama' : 'jl-spot-sisi')}
      style={gayaI(urutan)}
      role="button"
      tabIndex={0}
      aria-label={`${g.name}: details`}
      onClick={bukaIni}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); bukaIni() } }}
    >
      <div className="jl-spot-seni" aria-hidden>
        {gambar ? <img src={gambar} alt="" decoding="async" draggable={false} /> : <GambarGame g={g} />}
      </div>
      {!utama ? <span className="jl-sudut" aria-hidden><ArrowUp className="h-3.5 w-3.5 rotate-45" /></span> : null}
      <div className="jl-alis">{label}</div>
      <h3 translate="no" title={g.name}>{g.name}</h3>
      <div className="jl-meta">
        <span className="flex items-center gap-2"><span className="jl-titik-hidup" aria-hidden /><b>{ringkas(g.players)}</b> playing</span>
        {suka !== null ? <span><b>{`${suka}%`}</b> like it</span> : null}
        {g.genre && utama ? <span translate="no">{g.genre}</span> : null}
      </div>
      {utama ? (
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button type="button" className="jl-tombol jl-tombol-utama" onClick={(e) => { e.stopPropagation(); pakaiGameJelajah(g) }}><Play className="h-4 w-4" />Set as launch target</button>
          <button type="button" className="jl-tombol jl-tombol-hantu" onClick={(e) => { e.stopPropagation(); onServer(g) }}><Server className="h-4 w-4" />Browse servers</button>
        </div>
      ) : null}
    </div>
  )
}

const Rak = memo(function Rak({ id, nomor, judul, sub, catatan, hidup, games, memuat, tanpaPeringkat, target, onBuka, onServer }: {
  id?: string
  nomor: string
  judul: string
  sub?: string
  catatan?: string
  hidup?: boolean
  games: GameJelajah[]
  memuat?: boolean
  tanpaPeringkat?: boolean
  target: string
  onBuka: (g: GameJelajah, asal: HTMLElement | null) => void
  onServer: (g: GameJelajah) => void
}) {
  const rakRef = useMasuk<HTMLElement>()
  const jalurRef = useRef<HTMLDivElement>(null)
  const bungkusRef = useRef<HTMLDivElement>(null)
  const batangRef = useRef<HTMLElement>(null)
  const [ujung, setUjung] = useState({ kiri: true, kanan: true })
  const seret = useRef({ turun: false, x: 0, kiri: 0, geser: 0 })
  const sampel = useRef<{ t: number; x: number }[]>([])
  const tujuan = useRef<number | null>(null)
  const [batas, setBatas] = useState(KARTU_AWAL)
  const tampil = games.length > batas ? games.slice(0, batas) : games
  const sisa = games.length > batas

  const perbarui = useCallback(() => {
    const t = jalurRef.current
    if (!t) return
    const maks = t.scrollWidth - t.clientWidth
    const r = maks > 0 ? t.scrollLeft / maks : 0
    const tampak = t.scrollWidth ? t.clientWidth / t.scrollWidth : 1
    if (batangRef.current) {
      const w = Math.max(tampak, 0.12)
      batangRef.current.style.width = `${w * 100}%`
      batangRef.current.style.transform = `translateX(${r * (100 / w - 100)}%)`
    }
    bungkusRef.current?.classList.toggle('jl-pudar-kiri', t.scrollLeft > 8)
    bungkusRef.current?.classList.toggle('jl-pudar-kanan', t.scrollLeft < maks - 8)
    const kiri = t.scrollLeft < 8
    const kanan = t.scrollLeft > maks - 8 && !sisa
    setUjung((u) => (u.kiri === kiri && u.kanan === kanan ? u : { kiri, kanan }))
    if (sisa && maks - t.scrollLeft < t.clientWidth * 1.5) setBatas((b) => b + KARTU_AWAL)
  }, [sisa])

  useLayoutEffect(() => {
    const t = jalurRef.current
    if (!t) return
    perbarui()
    const ro = new ResizeObserver(perbarui)
    ro.observe(t)
    return () => ro.disconnect()
  }, [perbarui, tampil.length])

  const henti = () => {
    const t = jalurRef.current
    if (tujuan.current !== null && t) t.scrollTo({ left: t.scrollLeft, behavior: 'auto' })
    tujuan.current = null
  }
  useEffect(() => {
    const t = jalurRef.current
    if (!t) return
    const selesai = () => { tujuan.current = null }
    t.addEventListener('scrollend', selesai)
    return () => t.removeEventListener('scrollend', selesai)
  }, [])
  const langkahKartu = () => {
    const t = jalurRef.current
    const k = t?.querySelector<HTMLElement>('.jl-kartu')
    if (!t || !k) return 0
    return k.offsetWidth + (parseFloat(getComputedStyle(t).columnGap) || 0)
  }
  const animasiKe = (target: number) => {
    const t = jalurRef.current
    if (!t) return
    const ke = Math.max(0, Math.min(t.scrollWidth - t.clientWidth, target))
    if (Math.abs(ke - t.scrollLeft) < 1) { tujuan.current = null; return }
    tujuan.current = ke
    t.scrollTo({ left: ke, behavior: gerakMati() ? 'auto' : 'smooth' })
  }
  const geser = (arah: number) => {
    const t = jalurRef.current
    const s = langkahKartu()
    if (!t || !s) return
    const per = Math.max(1, Math.floor((t.clientWidth + 1) / s))
    const dari = Math.round((tujuan.current ?? t.scrollLeft) / s)
    animasiKe((dari + arah * per) * s)
  }

  const turun = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    henti()
    seret.current = { turun: true, x: e.clientX, kiri: jalurRef.current?.scrollLeft ?? 0, geser: 0 }
    sampel.current = [{ t: e.timeStamp, x: e.clientX }]
  }
  const gerak = (e: ReactPointerEvent) => {
    const s = seret.current
    if (!s.turun || !jalurRef.current) return
    const dx = e.clientX - s.x
    if (!s.geser && Math.abs(dx) > 6) {
      s.geser = 1
      jalurRef.current.setPointerCapture(e.pointerId)
      jalurRef.current.classList.add('jl-menyeret')
    }
    if (s.geser) {
      jalurRef.current.scrollLeft = s.kiri - dx
      sampel.current.push({ t: e.timeStamp, x: e.clientX })
      while (sampel.current.length > 2 && e.timeStamp - sampel.current[0].t > 100) sampel.current.shift()
    }
  }
  const naik = (e?: ReactPointerEvent) => {
    const s = seret.current
    s.turun = false
    jalurRef.current?.classList.remove('jl-menyeret')
    if (!s.geser) return
    window.setTimeout(() => { s.geser = 0 }, 0)
    const t = jalurRef.current
    const a = sampel.current[0]
    const b = sampel.current[sampel.current.length - 1]
    const lama = b && a ? b.t - a.t : 0
    const v = lama > 0 && (!e || e.timeStamp - b.t < 80) ? (b.x - a.x) / lama : 0
    const st = langkahKartu()
    if (!t || !st) return
    const proyeksi = t.scrollLeft - v * 240
    animasiKe(Math.round(proyeksi / st) * st)
  }

  return (
    <section ref={rakRef} className="jl-rak" data-rak={id} aria-label={judul}>
      <div className="jl-rak-kepala jl-rv">
        <span className="jl-nomor" aria-hidden>{nomor}</span>
        <div className="min-w-0 flex-1">
          <h3 className="jl-rak-judul">
            <span>{judul}</span>
            {hidup ? <span className="jl-titik-hidup" title="Live player counts" /> : null}
            {catatan ? <span className="jl-catatan hidden sm:inline" title={catatan}>All devices &amp; locations</span> : null}
          </h3>
          {sub ? <p className="jl-rak-sub" title={sub} data-boleh-potong>{sub}</p> : null}
        </div>
        <div className="jl-alat">
          <span className="jl-kemajuan" aria-hidden><i ref={batangRef} /></span>
          <span className="jl-jumlah hidden sm:inline">{memuat ? '' : games.length}</span>
          <div className="flex gap-2">
            <button type="button" className="jl-panah" onClick={() => geser(-1)} disabled={ujung.kiri} aria-label={`Scroll ${judul} left`}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" className="jl-panah" onClick={() => geser(1)} disabled={ujung.kanan} aria-label={`Scroll ${judul} right`}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      <div ref={bungkusRef} className="jl-bungkus jl-rv" style={gayaI(1)}>
        <div
          ref={jalurRef}
          className="jl-jalur"
          data-boleh-potong
          onScroll={perbarui}
          onWheel={henti}
          onPointerDown={turun}
          onPointerMove={gerak}
          onPointerUp={naik}
          onPointerCancel={naik}
          onClickCapture={(e) => { if (seret.current.geser) { e.stopPropagation(); e.preventDefault() } }}
        >
          {memuat
            ? Array.from({ length: 8 }, (_, i) => <KartuKerangka key={i} i={i} />)
            : tampil.length
              ? tampil.map((g, i) => <Kartu key={g.universe_id || g.place_id} g={g} urutan={i} peringkat={tanpaPeringkat ? 0 : i + 1} target={target === String(g.place_id)} onBuka={onBuka} onServer={onServer} />)
              : <p className="py-6 text-sm text-content-muted">Roblox found no game by that name.</p>}
        </div>
      </div>
    </section>
  )
})

const Kartu = memo(function Kartu({ g, urutan, peringkat, target, onBuka, onServer }: { g: GameJelajah; urutan: number; peringkat: number; target: boolean; onBuka: (g: GameJelajah, asal: HTMLElement | null) => void; onServer: (g: GameJelajah) => void }) {
  const sampulRef = useRef<HTMLDivElement>(null)
  const niat = useRef(0)
  const pergi = useRef(0)
  const [hover, setHover] = useState<0 | 1 | 2>(0)
  const suka = persenSuka(g)
  const masuk = () => {
    window.clearTimeout(pergi.current)
    setHover(1)
    window.clearTimeout(niat.current)
    if (g.universe_id) niat.current = window.setTimeout(() => void ambilDetail(g.universe_id).catch(() => {}), 250)
  }
  const keluar = () => {
    window.clearTimeout(niat.current)
    setHover((h) => (h ? 2 : 0))
    window.clearTimeout(pergi.current)
    pergi.current = window.setTimeout(() => setHover(0), 300)
  }
  useEffect(() => () => { window.clearTimeout(niat.current); window.clearTimeout(pergi.current) }, [])
  return (
    <div className="jl-kartu" data-urutan={urutan} data-game={g.place_id} data-genre={g.genre} data-hover={hover || undefined} onPointerEnter={masuk} onPointerLeave={keluar}>
      <div ref={sampulRef} className="jl-sampul">
        <div className="jl-seni-bungkus"><GambarGame g={g} segera={urutan < 8} /></div>
        <div className="jl-lencana-baris">
          {g.genre ? <span className="jl-tag" translate="no">{g.genre}</span> : null}
          {target ? <span className="jl-tag jl-tag-target"><Check className="h-3 w-3" />Target</span> : null}
        </div>
        {peringkat ? <span className="jl-peringkat" aria-hidden>{String(peringkat).padStart(2, '0')}</span> : null}
        <div className="jl-judul-sampul" translate="no" aria-hidden>{g.name}</div>
        {hover === 1 ? <div className="jl-kilau" aria-hidden /> : null}
        <button type="button" className="absolute inset-0 z-[1] rounded-[inherit]" aria-label={`${g.name}${peringkat ? `, rank ${peringkat}` : ''}: details`} onClick={() => onBuka(g, sampulRef.current)} onFocus={masuk} onBlur={keluar} />
        {hover ? (
          <div className="jl-cepat">
            <button type="button" tabIndex={-1} className="jl-cepat-utama" onClick={() => pakaiGameJelajah(g)} title="Set as launch target"><Play className="h-3.5 w-3.5" />Use</button>
            <button type="button" tabIndex={-1} className="jl-cepat-ikon" onClick={() => onServer(g)} title="Browse servers" aria-label={`Browse servers of ${g.name}`}><Server className="h-3.5 w-3.5" /></button>
          </div>
        ) : null}
      </div>
      <div className="jl-info">
        <p className="jl-nama" translate="no" title={g.name}>{g.name}</p>
        <p className="jl-statistik-kartu">
          {suka !== null ? <span className="jl-naik"><ThumbsUp className="h-3 w-3" />{`${suka}%`}</span> : null}
          <span><Users className="h-3 w-3" />{ringkas(g.players)}</span>
        </p>
      </div>
    </div>
  )
})

function GambarGame({ g, segera = true }: { g: GameJelajah; segera?: boolean }) {
  const [gagal, setGagal] = useState(false)
  const [siap, setSiap] = useState(false)
  if (!g.icon_url || gagal) return <Seni g={g} />
  return <img src={g.icon_url} alt="" loading={segera ? 'eager' : 'lazy'} decoding="async" draggable={false} data-siap={siap || undefined} onLoad={() => setSiap(true)} onError={() => setGagal(true)} className="jl-gambar" />
}

function Seni({ g }: { g: { name: string; universe_id: number } }) {
  const h = hue(`${g.universe_id}${g.name}`)
  const huruf = g.name.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase() || '?'
  return (
    <div className="jl-seni" aria-hidden style={{ background: `radial-gradient(130% 100% at 82% 8%, hsl(${h} 78% 56% / .55), transparent 58%), radial-gradient(95% 80% at 12% 96%, hsl(${(h + 46) % 360} 70% 46% / .42), transparent 55%), linear-gradient(158deg, hsl(${h} 42% 17%), hsl(${(h + 46) % 360} 48% 8%))` }}>
      <span>{huruf}</span>
    </div>
  )
}

function Lanjut({ onTampak, memuat, gagal, onKlik }: { onTampak: () => void; memuat: boolean; gagal: boolean; onKlik: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const panggil = useRef(onTampak)
  panggil.current = onTampak
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let akar: HTMLElement | null = el.parentElement
    while (akar && !/(auto|scroll)/.test(getComputedStyle(akar).overflowY)) akar = akar.parentElement
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) panggil.current() }, { root: akar, rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (memuat || gagal) return
    const el = ref.current
    let akar: HTMLElement | null = el?.parentElement ?? null
    while (akar && !/(auto|scroll)/.test(getComputedStyle(akar).overflowY)) akar = akar.parentElement
    if (el && akar && el.getBoundingClientRect().top - akar.getBoundingClientRect().bottom < 600) panggil.current()
  }, [memuat, gagal])
  return (
    <div ref={ref}>
      {memuat ? (
        <div aria-busy aria-label="Loading more charts">{[0, 1].map((r) => <RakKerangka key={r} />)}</div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-5 pt-10">
          {gagal ? <p className="text-xs text-error">Couldn’t load more charts.</p> : null}
          <button type="button" className="jl-tombol jl-tombol-hantu" onClick={onKlik}><ChevronDown className="h-4 w-4" />Load more charts</button>
        </div>
      )}
    </div>
  )
}

function KartuKerangka({ i }: { i: number }) {
  return (
    <div className="jl-kartu" aria-hidden style={gayaI(i)}>
      <div className="jl-sk jl-sk-sampul" />
      <div className="jl-info">
        <div className="jl-sk jl-sk-baris" style={{ width: `${68 + ((i * 37) % 25)}%` }} />
        <div className="mt-2 flex gap-2"><div className="jl-sk jl-sk-baris w-10" /><div className="jl-sk jl-sk-baris w-12" /></div>
      </div>
    </div>
  )
}

function RakKerangka() {
  return (
    <div className="jl-rak" aria-hidden>
      <div className="jl-rak-kepala">
        <span className="jl-sk jl-sk-baris mt-2 w-6" />
        <div className="min-w-0 flex-1">
          <div className="jl-sk jl-sk-judul" />
          <div className="jl-sk jl-sk-baris mt-2 w-[min(26rem,70%)]" />
        </div>
      </div>
      <div className="jl-jalur" data-boleh-potong>
        {Array.from({ length: 8 }, (_, i) => <KartuKerangka key={i} i={i} />)}
      </div>
    </div>
  )
}

function Kerangka({ sorotan }: { sorotan: boolean }) {
  return (
    <div className="flex flex-col" aria-busy aria-label="Loading charts">
      {sorotan ? (
        <div className="jl-sorotan" aria-hidden>
          <div className="jl-sk jl-spot jl-spot-utama jl-sk-spot" style={gayaI(0)}>
            <div className="jl-sk-isi"><div className="jl-sk-terang jl-sk-baris w-36" /><div className="jl-sk-terang jl-sk-judul-besar" /><div className="jl-sk-terang jl-sk-baris w-56" /><div className="mt-3 flex gap-2.5"><div className="jl-sk-terang jl-sk-pil" /><div className="jl-sk-terang jl-sk-pil" /></div></div>
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="jl-sk jl-spot jl-spot-sisi jl-sk-spot" style={gayaI(i)}>
              <div className="jl-sk-isi"><div className="jl-sk-terang jl-sk-baris w-28" /><div className="jl-sk-terang jl-sk-judul" /></div>
            </div>
          ))}
        </div>
      ) : null}
      {[0, 1, 2].map((r) => <RakKerangka key={r} />)}
    </div>
  )
}

type Fase = 'masuk' | 'mendarat' | 'keluar'
const EASE_BUKA = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_TUTUP = 'cubic-bezier(0.32, 0.72, 0.24, 1)'

function buatPenerbang(sumber: Element | null, r: DOMRect) {
  const f = document.createElement('div')
  f.className = 'jl-terbang'
  f.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`
  const isi = sumber?.firstElementChild?.cloneNode(true) as HTMLElement | undefined
  if (isi) { isi.style.opacity = '1'; f.appendChild(isi) }
  document.body.appendChild(f)
  return f
}

function DialogGame({ awal, semua, target, onTutup, onServer }: {
  awal: { g: GameJelajah; asal: HTMLElement | null }
  semua: KategoriJelajah[]
  target: string
  onTutup: () => void
  onServer: (g: GameJelajah) => void
}) {
  const [g, setG] = useState(awal.g)
  const [detail, setDetail] = useState<DetailGame | null>(null)
  const [pribadi, setPribadi] = useState<InfoPribadi | null>(null)
  const [galat, setGalat] = useState('')
  const [lebar, setLebar] = useState(false)
  const [lihat, setLihat] = useState('')
  const [diganti, setDiganti] = useState(false)
  const [terbang] = useState(() => !!awal.asal && awal.asal.isConnected && !gerakMati())
  const [fase, setFase] = useState<Fase>(terbang ? 'masuk' : 'mendarat')
  const sampulRef = useRef<HTMLDivElement>(null)
  const kiriRef = useRef<HTMLDivElement>(null)
  const badanRef = useRef<HTMLDivElement>(null)
  const sibuk = useRef(false)
  const batalBuka = useRef<(() => DOMRect | null) | null>(null)

  useEffect(() => {
    let hidup = true
    setDetail(null)
    setGalat('')
    setLebar(false)
    setPribadi(null)
    ambilDetail(g.universe_id).then((d) => { if (hidup) setDetail(d) }).catch((e) => { if (hidup) setGalat(String(e)) })
    if (g.universe_id && g.place_id) ambilPribadi(g.universe_id, g.place_id).then((p) => { if (hidup) setPribadi(p) }).catch(() => { if (hidup) setPribadi({ diizinkan: null, harga: null, bisa_buat: null, batas: null }) })
    return () => { hidup = false }
  }, [g])

  useLayoutEffect(() => {
    if (!terbang) return
    const asal = awal.asal!
    const tujuan = sampulRef.current
    const seni = tujuan?.querySelector('.jl-seni-bungkus') ?? null
    if (!tujuan) { setFase('mendarat'); return }
    const a = asal.getBoundingClientRect()
    const b = tujuan.getBoundingClientRect()
    const f = buatPenerbang(seni, b)
    f.style.transform = `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`
    void f.offsetWidth
    f.style.transition = `transform 600ms ${EASE_BUKA}`
    f.style.transform = 'none'
    let selesai = false
    const mendarat = () => { if (selesai) return; selesai = true; batalBuka.current = null; f.remove(); setFase('mendarat') }
    batalBuka.current = () => {
      if (selesai) return null
      selesai = true
      window.clearTimeout(t)
      const r = f.getBoundingClientRect()
      f.remove()
      batalBuka.current = null
      return r
    }
    f.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') mendarat() })
    const jaga = () => {
      if (selesai) return
      const r = f.getBoundingClientRect()
      if (Math.abs(r.left - b.left) < 1.5 && Math.abs(r.top - b.top) < 1.5 && Math.abs(r.width - b.width) < 1.5) mendarat()
      else t = window.setTimeout(jaga, 250)
    }
    let t = window.setTimeout(jaga, 900)
    return () => { window.clearTimeout(t); batalBuka.current = null; if (!selesai) { selesai = true; f.remove() } }
  }, []) 

  const tutup = useCallback(() => {
    if (sibuk.current || fase === 'keluar') return
    const asal = awal.asal
    const tujuan = sampulRef.current
    if (!terbang || diganti || !asal || !asal.isConnected || !tujuan || gerakMati()) { onTutup(); return }
    sibuk.current = true
    setFase('keluar')
    const b = tujuan.getBoundingClientRect()
    const d = asal.getBoundingClientRect()
    const dariUdara = batalBuka.current?.() ?? null
    const f = buatPenerbang(tujuan.querySelector('.jl-seni-bungkus'), b)
    if (dariUdara) f.style.transform = `translate(${dariUdara.left - b.left}px,${dariUdara.top - b.top}px) scale(${dariUdara.width / b.width},${dariUdara.height / b.height})`
    void f.offsetWidth
    f.style.transition = `transform 480ms ${EASE_TUTUP}`
    f.style.transform = `translate(${d.left - b.left}px,${d.top - b.top}px) scale(${d.width / b.width},${d.height / b.height})`
    let selesai = false
    const pulang = () => {
      if (selesai) return
      selesai = true
      onTutup()
      f.style.transition = 'opacity 100ms ease'
      f.style.opacity = '0'
      window.setTimeout(() => f.remove(), 110)
    }
    f.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') pulang() })
    window.setTimeout(pulang, 800)
  }, [fase, terbang, diganti, awal.asal, onTutup])

  const ganti = (m: GameJelajah) => {
    if (sibuk.current) return
    const bagian = [kiriRef.current, badanRef.current].filter(Boolean) as HTMLElement[]
    setDiganti(true)
    if (gerakMati() || !bagian.length) { setG(m); return }
    sibuk.current = true
    bagian.forEach((el) => el.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' }))
    window.setTimeout(() => {
      setG(m)
      requestAnimationFrame(() => {
        bagian.forEach((el) => {
          el.getAnimations().forEach((a) => a.cancel())
          el.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, easing: EASE_BUKA })
        })
        window.setTimeout(() => { sibuk.current = false }, 270)
      })
    }, 170)
  }

  const mirip = useMemo(() => {
    const genre = g.genre || detail?.genre
    if (!genre) return []
    const lihat = new Set([g.universe_id])
    const out: GameJelajah[] = []
    for (const k of semua) for (const x of k.games) {
      if (out.length >= 3) break
      if (x.genre === genre && !lihat.has(x.universe_id)) { lihat.add(x.universe_id); out.push(x) }
    }
    return out
  }, [g, semua, detail?.genre])

  const kosong = galat ? '—' : '…'
  const suka = persenSuka(g)
  const terpilih = target === String(g.place_id)
  const panjang = (detail?.deskripsi.length ?? 0) > 420
  const gambar = detail?.gambar ?? []
  const tags = [detail?.genre || g.genre, detail?.subgenre, pribadi?.harga === 0 ? 'Free private servers' : pribadi?.diizinkan ? 'Private servers' : '', detail?.harga ? `${detail.harga} Robux` : ''].filter(Boolean) as string[]

  return (
    <DialogPrimitive.Root open onOpenChange={(v) => { if (!v) tutup() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="jl-latar" data-fase={fase} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="jl jl-modal"
          data-fase={fase}
          data-terbang={terbang ? 'ya' : 'tidak'}
          onEscapeKeyDown={(e) => { if (lihat) { e.preventDefault(); setLihat('') } }}
          onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus({ preventScroll: true }) }}
        >
          <DialogPrimitive.Close className="jl-tutup" aria-label="Close"><X className="h-4 w-4" /></DialogPrimitive.Close>
          <div ref={kiriRef} className="jl-modal-kiri">
            <div ref={sampulRef} className="jl-modal-sampul">
              <div className="jl-seni-bungkus"><GambarGame g={g} /></div>
              <div className="jl-judul-sampul" translate="no" aria-hidden>{g.name}</div>
            </div>
            <dl className="jl-fakta">
              <div><dt>Max players</dt><dd>{detail ? detail.max_players || '—' : kosong}</dd></div>
              <div><dt>Private servers</dt><dd data-pribadi>{pribadi ? teksPribadi(pribadi) : kosong}</dd></div>
              {detail?.harga ? <div><dt>Paid access</dt><dd>{`${detail.harga} Robux`}</dd></div> : null}
              <div><dt>Updated</dt><dd>{detail ? tanggal(detail.diperbarui) : kosong}</dd></div>
              <div><dt>Created</dt><dd>{detail ? tanggal(detail.dibuat) : kosong}</dd></div>
              <div><dt>Place ID</dt><dd className="jl-mono text-2xs" translate="no">{g.place_id}</dd></div>
            </dl>
          </div>
          <div ref={badanRef} className="jl-modal-badan">
            <div className="jl-alis" translate="no">{[detail?.genre || g.genre, detail?.subgenre].filter(Boolean).join(' · ') || 'Experience'}</div>
            <DialogPrimitive.Title asChild><h2 translate="no">{detail?.name || g.name}</h2></DialogPrimitive.Title>
            <div className="jl-pembuat">
              {detail?.pembuat ? (
                <>
                  <span>by</span>
                  <b translate="no">{detail.pembuat}</b>
                  {detail.pembuat_terverifikasi ? <span className="jl-centang" title="Verified creator"><Check className="h-2.5 w-2.5" /></span> : null}
                  {detail.pembuat_grup ? <span className="text-xs text-content-muted">(group)</span> : null}
                </>
              ) : <span className="h-3 w-40 rounded bg-surface-2" aria-hidden />}
            </div>
            <div className="jl-tags">{tags.map((t) => <span key={t} translate="no">{t}</span>)}</div>
            <div className="jl-stat">
              <div><b>{ringkas(detail?.playing ?? g.players)}</b><span>Playing now</span></div>
              <div><b>{suka !== null ? `${suka}%` : '—'}</b><span>Like it</span></div>
              <div><b>{detail ? ringkas(detail.visits) : kosong}</b><span>Visits</span></div>
              <div><b>{detail ? ringkas(detail.favorit) : kosong}</b><span>Favorites</span></div>
            </div>
            <div className="jl-cta">
              <button type="button" className="jl-tombol jl-tombol-utama" onClick={() => pakaiGameJelajah(g)} aria-pressed={terpilih}>{terpilih ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}{terpilih ? 'Launch target' : 'Set as launch target'}</button>
              <button type="button" className="jl-tombol jl-tombol-hantu" onClick={() => { onTutup(); onServer(g) }}><Server className="h-4 w-4" />Browse servers</button>
            </div>
            <div className="flex flex-col">
              {galat ? (
                <p className="jl-desk text-error">{galat}</p>
              ) : detail ? (
                detail.deskripsi ? (
                  <>
                    <p className={cn('jl-desk', !lebar && panjang && 'jl-desk-lipat')} translate="no">{detail.deskripsi}</p>
                    {panjang ? <button type="button" className="jl-teks-tombol" onClick={() => setLebar((v) => !v)}>{lebar ? 'Show less' : 'Show more'}</button> : null}
                  </>
                ) : <p className="jl-desk">No description.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2" aria-busy aria-label="Loading details"><div className="h-3 w-full rounded bg-surface-2" /><div className="h-3 w-5/6 rounded bg-surface-2" /><div className="h-3 w-2/3 rounded bg-surface-2" /></div>
              )}
            </div>
            {gambar.length ? (
              <div className="jl-gambar-layar" role="group" aria-label="Screenshots">
                {gambar.map((u, i) => (
                  <button key={u} type="button" onClick={() => setLihat(u)} aria-label={`Screenshot ${i + 1}`}><img src={u} alt="" loading="lazy" decoding="async" /></button>
                ))}
              </div>
            ) : null}
            {mirip.length ? (
              <div className="jl-mirip">
                <h5>More like this</h5>
                <div className="jl-mirip-baris">
                  {mirip.map((m) => (
                    <button key={m.universe_id} type="button" className="jl-sim" onClick={() => ganti(m)}>
                      <span className="jl-sim-ikon"><GambarGame g={m} /></span>
                      <span className="min-w-0">
                        <p translate="no">{m.name}</p>
                        <span>{`${ringkas(m.players)} playing`}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {lihat ? (
            <div className="jl-lihat" role="button" tabIndex={-1} aria-label="Close screenshot" onClick={() => setLihat('')}>
              <img src={lihat} alt="" />
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
