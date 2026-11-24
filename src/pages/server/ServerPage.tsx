import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Check, ChevronDown, ChevronRight, Loader2, Lock, MapPin, Pencil, RefreshCw, Sparkles, Trash2, X } from '@/components/ikon'
import { api } from '@/api/api'
import type { ServerInfo, ServerPribadiGabungan, ServerTersimpan } from '@/api/types'
import { useUIStore } from '@/stores/uiStore'
import { beriTahu, hapusServerTersimpan, pakaiServerTersimpan, pilihServer, setDipilih, ubahNamaServerTersimpan, useCam } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { useTabHalaman } from '@/components/shell/navigasi'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Controls'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/Feedback'
import { PemilihGame } from '@/components/akun/PemilihGame'
import { jenisServer } from '@/pages/akun/TabLuncur'
import { useLocation, useNavigate } from 'react-router-dom'
import { Jelajah } from './Jelajah'

const BATAS_MUAT = 15

export function ServerPage() {
  const kunciServer = useCam((s) => s.kunciServer)
  const [tab] = useTabHalaman<'discover' | 'browse' | 'saved'>('/servers')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div key={tab} className="min-h-0 flex-1 animate-halaman overflow-y-auto bg-app">
        {tab === 'saved' ? <ServerTersimpanBagian /> : tab === 'discover' ? <Jelajah /> : <PenjelajahServer key={kunciServer} />}
      </div>
    </div>
  )
}

function ServerTersimpanBagian() {
  const daftar = useCam((s) => s.serverTersimpan)
  const [buka, setBuka] = useState(true)
  return (
    <section className="border-b border-line-subtle" aria-label="Saved servers">
      <button type="button" aria-expanded={buka} onClick={() => setBuka((b) => !b)} className="flex h-10 w-full items-center gap-2 px-5 text-left text-sm font-semibold text-content-primary hover:bg-surface-1/50">
        {buka ? <ChevronDown className="h-4 w-4 text-content-muted" /> : <ChevronRight className="h-4 w-4 text-content-muted" />}
        <Bookmark className="h-4 w-4 text-content-muted" />
        <span className="flex-1">Saved servers</span>
        <span className="text-xs font-normal text-content-muted">{daftar.length || 'none'}</span>
      </button>
      {buka ? (
        daftar.length ? (
          <ul className="px-3 pb-3">
            {daftar.map((s) => <BarisTersimpan key={s.id} s={s} />)}
          </ul>
        ) : (
          <p className="px-5 pb-4 text-sm leading-relaxed text-content-muted">
            No saved servers yet. Pick a game and paste a private server link (or a Job ID) in the Launch panel → Launch target, then click the bookmark button there. Saved servers stay until you delete them.
          </p>
        )
      ) : null}
    </section>
  )
}

function BarisTersimpan({ s }: { s: ServerTersimpan }) {
  const [ubah, setUbah] = useState(false)
  const [nama, setNama] = useState(s.nama)
  const [yakin, setYakin] = useState(false)
  const j = jenisServer(s)
  const simpan = () => {
    setUbah(false)
    if (nama.trim() && nama.trim() !== s.nama) void ubahNamaServerTersimpan(s, nama.trim())
    else setNama(s.nama)
  }
  return (
    <li
      tabIndex={0}
      onDoubleClick={() => pakaiServerTersimpan(s)}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) pakaiServerTersimpan(s) }}
      className="group flex items-center gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-surface-2/50 focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <IkonGame url={s.game_icon} />
      <div className="min-w-0 flex-1">
        {ubah ? (
          <span className="flex items-center gap-1">
            <input autoFocus value={nama} maxLength={80} onChange={(e) => setNama(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') simpan(); if (e.key === 'Escape') { setNama(s.nama); setUbah(false) } }} aria-label="Saved server name" className="h-8 min-w-0 flex-1 rounded border border-accent/60 bg-app px-2 text-sm text-content-primary outline-none" />
            <button type="button" aria-label="Save name" onClick={simpan} className="flex h-8 w-8 items-center justify-center rounded text-content-secondary hover:bg-surface-3"><Check className="h-4 w-4" /></button>
            <button type="button" aria-label="Cancel" onClick={() => { setNama(s.nama); setUbah(false) }} className="flex h-8 w-8 items-center justify-center rounded text-content-secondary hover:bg-surface-3"><X className="h-4 w-4" /></button>
          </span>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-content-primary" translate="no" title={s.nama}>{s.nama}</p>
            <p className="flex items-center gap-1.5 text-xs text-content-muted"><span translate="no">{s.game_name || `Place ${s.place_id}`}</span> · <j.ikon className="h-3 w-3" />{j.teks}</p>
          </>
        )}
      </div>
      {!ubah ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="secondary" onClick={() => pakaiServerTersimpan(s)}>Use</Button>
          <button type="button" aria-label={`Rename ${s.nama}`} title="Rename" onClick={() => setUbah(true)} className="flex h-8 w-8 items-center justify-center rounded text-content-muted hover:bg-surface-3 hover:text-content-primary"><Pencil className="h-4 w-4" /></button>
          {yakin ? (
            <Button size="sm" variant="danger" onMouseLeave={() => setYakin(false)} onBlur={() => setYakin(false)} onClick={() => { setYakin(false); void hapusServerTersimpan(s) }}>Delete</Button>
          ) : (
            <button type="button" aria-label={`Delete ${s.nama}`} title="Delete" onClick={() => setYakin(true)} className="flex h-8 w-8 items-center justify-center rounded text-content-muted hover:bg-surface-3 hover:text-error"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      ) : null}
    </li>
  )
}

function IkonGame({ url }: { url: string }) {
  const [gagal, setGagal] = useState(false)
  return url && !gagal ? <img src={url} alt="" onError={() => setGagal(true)} className="h-9 w-9 shrink-0 rounded-md bg-surface-3 object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-3 text-content-muted"><MapPin className="h-4 w-4" /></span>
}

function PenjelajahServer() {
  const lokasi = useLocation()
  const navigate = useNavigate()
  const [dariJelajah] = useState(() => (lokasi.state as { jelajah?: { placeId: string; name: string; icon: string } } | null)?.jelajah)
  useEffect(() => {
    if (dariJelajah) navigate({ pathname: lokasi.pathname, search: lokasi.search }, { replace: true, state: null })
  }, []) 
  const param0 = useCam((s) => s.param)
  const param = dariJelajah ? { ...param0, placeId: dariJelajah.placeId, gameName: dariJelajah.name, gameIcon: dariJelajah.icon } : param0
  const akun = useCam((s) => s.akun)
  const dipilih = useCam((s) => s.dipilih)
  const akunPertama = akun.find((a) => dipilih.includes(a.id)) || akun[0]
  const [placeId, setPlaceId] = useState(param.placeId || '')
  const [nama, setNama] = useState(param.placeId ? param.gameName || '' : '')
  const [ikon, setIkon] = useState(param.placeId ? param.gameIcon || '' : '')
  const [servers, setServers] = useState<ServerInfo[]>([])
  const [cursor, setCursor] = useState('')
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState('')
  const [wilayah, setWilayah] = useState<Record<string, string>>({})
  const [memuatWilayah, setMemuatWilayah] = useState(false)
  const [minSlot, setMinSlot] = useState(2)
  const [urut, setUrut] = useState<'kosong' | 'penuh' | 'ping'>('kosong')
  const [jenis, setJenis] = useState<'publik' | 'pribadi'>('publik')
  const [filterNegara, setFilterNegara] = useState('')
  const [diambilPada, setDiambilPada] = useState(0)
  const [, setDetak] = useState(0)
  const [otomatis, setOtomatis] = useState(() => { try { return localStorage.getItem('wilayahOtomatis') === '1' } catch { return false } })
  const wilayahRef = useRef<Record<string, string>>({})
  const sesiRef = useRef(0)
  const sedangRef = useRef(false)
  const pid = Number(String(placeId).replace(/\D/g, '')) || 0

  const muat = useCallback(async (lanjut: boolean) => {
    if (!pid) return []
    setMemuat(true)
    setGalat('')
    try {
      const h = await api.daftarServer(pid, lanjut ? cursor : '', urut === 'penuh', minSlot > 0)
      setServers((lama) => (lanjut ? [...lama, ...h.servers] : h.servers))
      setCursor(h.cursor || '')
      setDiambilPada(Date.now())
      return h.servers
    } catch (e) {
      setGalat(String(e))
      return []
    } finally {
      setMemuat(false)
    }
  }, [pid, cursor, urut, minSlot])

  const penuhDulu = urut === 'penuh'
  useEffect(() => { if (servers.length) void muat(false) }, [penuhDulu]) 
  useEffect(() => { setServers([]); setCursor(''); setDiambilPada(0); setFilterNegara(''); sesiRef.current += 1 }, [pid])
  useEffect(() => { const h = window.setInterval(() => setDetak((n) => n + 1), 5000); return () => window.clearInterval(h) }, [])
  const sudahOtomatis = useRef(false)
  useEffect(() => {
    if (!dariJelajah || sudahOtomatis.current || !pid || pid !== Number(dariJelajah.placeId)) return
    sudahOtomatis.current = true
    void muat(false)
  }, [pid]) 

  const muatWilayah = useCallback(async (daftar: ServerInfo[], batas = BATAS_MUAT, ulang = false) => {
    if (!akunPertama || !pid || sedangRef.current) return
    const perlu = daftar.map((s) => s.job_id).filter((j) => wilayahRef.current[j] === undefined || (ulang && wilayahRef.current[j] === '—')).slice(0, batas)
    if (!perlu.length) return
    const sesi = sesiRef.current
    sedangRef.current = true
    setMemuatWilayah(true)
    try {
      const hasil = await api.wilayahServerBanyak(akunPertama.id, pid, perlu)
      if (sesi !== sesiRef.current) return
      const baru = { ...wilayahRef.current }
      for (const w of hasil) baru[w.job_id] = w.wilayah || '—'
      for (const j of perlu) if (baru[j] === undefined) baru[j] = '—'
      wilayahRef.current = baru
      setWilayah(baru)
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      sedangRef.current = false
      setMemuatWilayah(false)
    }
  }, [akunPertama, pid])

  const sisaWilayah = useMemo(() => servers.filter((s) => wilayah[s.job_id] === undefined).length, [servers, wilayah])
  const ubahOtomatis = (v: boolean) => { setOtomatis(v); try { localStorage.setItem('wilayahOtomatis', v ? '1' : '0') } catch {  } }
  const urutan = { kosong: (a: ServerInfo, b: ServerInfo) => a.playing - b.playing, penuh: (a: ServerInfo, b: ServerInfo) => b.playing - a.playing, ping: (a: ServerInfo, b: ServerInfo) => (a.ping || 999) - (b.ping || 999) }

  const terlihat = useMemo(() => {
    const q = filterNegara.trim().toLowerCase()
    const f = servers.filter((s) => {
      if (s.max_players - s.playing < minSlot) return false
      if (!q) return true
      const w = wilayah[s.job_id]
      if (!w || w === '—') return false
      return w.split(',').pop()!.trim().toLowerCase() === q
    })
    return [...f].sort(urutan[urut])
  }, [servers, minSlot, urut, filterNegara, wilayah]) 

  useEffect(() => { if (servers.length && otomatis) void muatWilayah([...servers].sort(urutan[urut])) }, [servers, urut, muatWilayah, otomatis]) 

  const negara = useMemo(() => {
    const hitung = new Map<string, number>()
    for (const s of servers) {
      if (s.max_players - s.playing < minSlot) continue
      const w = wilayah[s.job_id]
      if (!w || w === '—') continue
      const n = w.split(',').pop()!.trim()
      hitung.set(n, (hitung.get(n) || 0) + 1)
    }
    return [...hitung.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [servers, wilayah, minSlot])

  const pilih = (s: ServerInfo) => pilihServer({ placeId: pid, jobId: s.job_id, gameName: nama, gameIcon: ikon })

  const pakaiTerbaik = async () => {
    const segar = await muat(false)
    const q = filterNegara.trim().toLowerCase()
    const kandidat = segar
      .filter((s) => s.max_players - s.playing >= minSlot)
      .filter((s) => {
        if (!q) return true
        const w = wilayahRef.current[s.job_id]
        return !!w && w !== '—' && w.split(',').pop()!.trim().toLowerCase() === q
      })
      .sort((a, b) => a.playing - b.playing)[0]
    if (kandidat) pilih(kandidat)
    else beriTahu(filterNegara ? `No located server in ${filterNegara} matches that free-slot filter.` : 'No server matches that free-slot filter.', 'salah')
  }

  const umur = diambilPada ? Math.round((Date.now() - diambilPada) / 1000) : 0
  const kelasInput = 'h-8 rounded-md border border-line bg-app/40 px-2 text-sm text-content-primary focus:border-accent/60 focus:outline-none'

  return (
    <section className="flex flex-col" aria-label="Server browser">
      <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-5 py-3">
        <div className="min-w-[16rem] flex-1">
          <PemilihGame varian="bar" nilai={placeId} nama={nama} ikon={ikon} onPilih={(p, meta) => { setPlaceId(p); setNama(meta?.name ?? ''); setIkon(meta?.icon ?? '') }} />
        </div>
        <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Server type">
          {(['publik', 'pribadi'] as const).map((j) => (
            <button key={j} type="button" aria-pressed={jenis === j} onClick={() => setJenis(j)} className={cn('h-7 rounded px-3 text-sm', jenis === j ? 'bg-surface-3 text-content-primary' : 'text-content-muted hover:text-content-primary')}>{j === 'publik' ? 'Public' : 'Private'}</button>
          ))}
        </div>
        {jenis === 'publik' ? (
          <>
            <Button size="md" variant="secondary" onClick={() => void muat(false)} disabled={!pid || memuat}>{memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{memuat ? 'Loading…' : 'Load servers'}</Button>
            <Button size="md" variant="primary" onClick={() => void pakaiTerbaik()} disabled={!pid || memuat} title="Reload the list, then set the emptiest matching server as the launch target"><Sparkles className="h-4 w-4" />Use best server</Button>
          </>
        ) : null}
      </div>

      {jenis === 'pribadi' ? (
        <PrivatServer placeId={pid} nama={nama} ikon={ikon} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-subtle bg-surface-1/30 px-5 py-2 text-sm text-content-secondary">
            <label className="flex items-center gap-2" title="Player counts in the list are cached by Roblox and can lag behind. The live check happens just before launching.">
              Min. free slots
              <input type="number" min={0} max={100} value={minSlot} onChange={(e) => setMinSlot(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className={cn(kelasInput, 'w-16')} />
            </label>
            <label className="flex items-center gap-2">
              Region
              <Select value={filterNegara} onValueChange={setFilterNegara} disabled={!negara.length} ariaLabel="Region" className="w-48" options={[{ value: '', label: negara.length ? 'All regions' : 'Not located yet' }, ...negara.map(([n, j]) => ({ value: n, label: `${n} (${j})`, data: true }))]} />
            </label>
            <label className="flex items-center gap-2">
              <Checkbox className="h-5 w-5" checked={otomatis} onCheckedChange={(v) => ubahOtomatis(v === true)} aria-label="Auto-locate" />
              Auto-locate{memuatWilayah ? <span className="flex items-center gap-1 text-content-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Locating…</span> : null}
            </label>
            <label className="flex items-center gap-2">
              Sort
              <Select value={urut} onValueChange={(v) => setUrut(v as typeof urut)} size="sm" ariaLabel="Sort servers" className="w-40" options={[{ value: 'kosong', label: 'Emptiest' }, { value: 'penuh', label: 'Fullest' }, { value: 'ping', label: 'Lowest ping' }]} />
            </label>
          </div>
          {servers.length ? (
            <p className="border-b border-line-subtle px-5 py-2 text-xs leading-relaxed text-content-muted">
              Locating is optional: each lookup sends the server's address to ip-api.com without encryption and makes one Roblox join request with this account. The region is an estimate. Ping doesn't need it.
            </p>
          ) : null}

          {galat ? (
            <EmptyState icon={X} title="Couldn’t load servers" description={galat} action={<Button size="sm" variant="secondary" onClick={() => void muat(false)}>Retry</Button>} />
          ) : memuat && !servers.length ? (
            <EmptyState icon={Loader2} title="Loading servers…" />
          ) : !terlihat.length ? (
            <EmptyState icon={MapPin} title={!pid ? 'Pick a game above, then load its servers.' : !servers.length ? 'No servers loaded yet' : filterNegara ? `No server in ${filterNegara} has that many free slots.` : 'No server has that many free slots. Lower the number above.'} description={pid && !servers.length ? 'Press Load servers.' : undefined} />
          ) : (
            <TabelServer servers={terlihat} wilayah={wilayah} onPilih={pilih} onLokasi={(s) => void muatWilayah([s], 1, true)} />
          )}

          {servers.length ? (
            <div className="flex flex-wrap items-center gap-3 px-5 py-2 text-xs text-content-muted" title="Player counts are cached by Roblox. CAM checks the server live just before launching.">
              <span className={cn(umur > 60 && 'text-warning')}>{terlihat.length} of {servers.length} servers shown, list loaded {umur}s ago</span>
              {sisaWilayah ? <button type="button" disabled={memuatWilayah} onClick={() => void muatWilayah(terlihat.length ? terlihat : servers)} className="font-medium text-content-secondary underline underline-offset-2 hover:text-content-primary disabled:opacity-50">Locate {Math.min(BATAS_MUAT, sisaWilayah)} more</button> : null}
              {cursor ? <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void muat(true)} disabled={memuat}>Load more servers</Button> : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function TabelServer({ servers, wilayah, onPilih, onLokasi }: { servers: ServerInfo[]; wilayah: Record<string, string>; onPilih: (s: ServerInfo) => void; onLokasi: (s: ServerInfo) => void }) {
  const template = 'minmax(9rem,1.2fr) minmax(8rem,1fr) 4.5rem 3.5rem minmax(7rem,1fr) 4.5rem'
  return (
    <div role="grid" aria-label="Servers" className="px-3">
      <div role="row" className="grid gap-3 border-b border-line-subtle px-2 py-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
        <span>Players</span><span>Region</span><span className="text-right">Ping</span><span className="text-right">FPS</span><span>Job ID</span><span />
      </div>
      {servers.map((s) => {
        const isi = s.playing / Math.max(1, s.max_players)
        const bebas = s.max_players - s.playing
        const w = wilayah[s.job_id]
        return (
          <div key={s.job_id} role="row" tabIndex={0} onDoubleClick={() => onPilih(s)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onPilih(s) } }} className="grid items-center gap-3 border-b border-line-subtle/70 px-2 py-2 text-sm outline-none hover:bg-surface-2/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60" style={{ gridTemplateColumns: template }}>
            <span className="flex items-center gap-2">
              <span className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-3" aria-hidden><span className={cn('absolute inset-y-0 left-0 rounded-full', bebas <= 0 ? 'bg-error' : isi > 0.75 ? 'bg-warning' : 'bg-success')} style={{ width: `${isi * 100}%` }} /></span>
              <span className="tnum text-content-primary">{s.playing}/{s.max_players}</span>
              <span className="text-xs text-content-muted">{bebas > 0 ? `${bebas} free` : 'full'}</span>
            </span>
            <span className="min-w-0 truncate text-content-secondary" title={w && w !== '—' ? w : undefined}>{w ? w : <button type="button" onClick={() => onLokasi(s)} className="text-xs font-medium underline underline-offset-2 hover:text-content-primary">Locate</button>}</span>
            <span className={cn('tnum text-right', !s.ping ? 'text-content-muted' : s.ping < 90 ? 'text-success' : s.ping < 160 ? 'text-warning' : 'text-error')}>{s.ping ? `${s.ping} ms` : '—'}</span>
            <span className="tnum text-right text-content-secondary">{s.fps ? Math.round(s.fps) : '—'}</span>
            <span className="truncate font-mono text-xs text-content-muted" title={s.job_id}>{s.job_id.slice(0, 8)}…{s.job_id.slice(-4)}</span>
            <Button size="sm" variant="secondary" onClick={() => onPilih(s)}>Use</Button>
          </div>
        )
      })}
    </div>
  )
}

function PrivatServer({ placeId, nama, ikon }: { placeId: number; nama: string; ikon: string }) {
  const akun = useCam((s) => s.akun)
  const [servers, setServers] = useState<ServerPribadiGabungan[] | null>(null)
  const [info, setInfo] = useState<{ diperiksa: number; gagal: string[] } | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState('')
  useEffect(() => { setServers(null); setInfo(null); setGalat('') }, [placeId])
  const alias = (id: string) => akun.find((a) => a.id === id)?.alias ?? ''
  const muat = async () => {
    if (!placeId) return
    setMemuat(true)
    setGalat('')
    try {
      const h = await api.daftarServerPribadiSemua(placeId)
      setServers(h.servers)
      setInfo({ diperiksa: h.diperiksa, gagal: h.gagal })
    } catch (e) {
      setGalat(String(e))
    } finally {
      setMemuat(false)
    }
  }
  const pakai = (s: ServerPribadiGabungan) => {
    const namaServer = s.nama || 'Private server'
    pilihServer({ placeId, jobId: '', linkCode: `accessCode=${s.access_code}`, gameName: nama, gameIcon: ikon, nama: namaServer })
    const bisa = s.akses.map((id) => akun.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
    const bukanUtama = bisa.filter((a) => !a.utama)
    const dicentang = bukanUtama.filter((a, i) => !a.user_id || bukanUtama.findIndex((b) => b.user_id === a.user_id) === i)
    setDipilih(dicentang.map((a) => a.id))
    if (dicentang.length) {
      useCam.setState({ filterFolder: 'semua' })
      useUIStore.getState().setFilterStatus('semua')
      useUIStore.getState().setCariAkun('')
    }
    const utama = bisa.length - dicentang.length
    beriTahu(
      dicentang.length
        ? `Ticked ${dicentang.length === 1 ? '1 account' : `${dicentang.length} accounts`} that can join ${namaServer}${utama ? ' (the main account is left out)' : ''}.`
        : `Only the main account can join ${namaServer}: tick it yourself to launch it there.`,
    )
  }
  if (!akun.length) return <EmptyState icon={Lock} title="Add an account first." />
  if (!placeId) return <EmptyState icon={Lock} title="Pick a game above." />
  const template = 'minmax(10rem,1.4fr) minmax(7rem,1fr) minmax(8rem,1.1fr) 5rem 5.5rem 4.5rem'
  return (
    <div className="px-5 py-3">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-content-secondary">
          {info ? (info.diperiksa === 1 ? 'Private servers in this game, from your 1 usable account.' : `Private servers in this game, from your ${info.diperiksa} usable accounts.`) : 'Private servers your accounts can see in this game.'}
        </p>
        <Button size="md" variant="secondary" onClick={() => void muat()} disabled={memuat}>{memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{memuat ? 'Loading…' : servers ? 'Reload' : 'Load private servers'}</Button>
      </div>
      {info?.gagal.length ? (
        <div role="status" className="mb-3 rounded-md border border-warning/25 bg-warning/[0.07] px-3 py-2 text-sm text-content-secondary">
          {info.gagal.map((g) => <p key={g}>{g}</p>)}
        </div>
      ) : null}
      {galat ? (
        <EmptyState icon={X} title="Couldn’t load private servers" description={galat} action={<Button size="sm" variant="secondary" onClick={() => void muat()}>Retry</Button>} compact />
      ) : servers && !servers.length ? (
        <p className="text-sm text-content-muted">None of your accounts has a private server in this game, and none were shared with them.</p>
      ) : servers ? (
        <div role="grid" aria-label="Private servers">
          <div role="row" className="grid gap-3 border-b border-line-subtle px-2 py-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
            <span>Name</span><span>Owner</span><span>Can join</span><span>Players</span><span>Status</span><span />
          </div>
          {servers.map((s, i) => {
            const nama = s.akses.map(alias).filter(Boolean)
            return (
              <div key={`${s.vip_id}-${i}`} role="row" data-vip={s.vip_id} className="grid items-center gap-3 border-b border-line-subtle/70 px-2 py-2 text-sm" style={{ gridTemplateColumns: template }}>
                <span className="flex min-w-0 items-center gap-2"><Lock className="h-3.5 w-3.5 shrink-0 text-content-muted" /><span className="truncate text-content-primary" translate="no">{s.nama || 'Private server'}</span></span>
                <span className="truncate text-content-secondary" translate="no">{s.pemilik || '—'}</span>
                <span className="min-w-0 truncate text-content-secondary" title={nama.length ? nama.join(', ') : undefined} data-judul-data>
                  {nama.length ? <><span translate="no">{nama[0]}</span>{nama.length > 1 ? <span className="text-content-muted"> +{nama.length - 1}</span> : null}</> : <span className="text-content-muted">None of your accounts</span>}
                </span>
                <span className="tnum text-content-secondary">{s.max_players ? `${s.playing}/${s.max_players}` : '—'}</span>
                <span className={s.job_id ? 'text-success' : 'text-content-muted'}>{s.job_id ? 'Running' : 'Empty'}</span>
                <Button size="sm" variant="secondary" disabled={!s.access_code} title={!s.access_code ? 'None of your accounts can join this server' : `Set as the launch target and tick the ${s.akses.length === 1 ? 'account' : `${s.akses.length} accounts`} that can join it`} onClick={() => pakai(s)}>Use</Button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
