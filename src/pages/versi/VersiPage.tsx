import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AlertTriangle, Download, FolderPlus, Loader2, RefreshCw, RotateCw, Search, Trash2, X } from '@/components/ikon'
import { api, dibatalkan } from '@/api/api'
import type { Klien, KemajuanUnduh, VersiRoblox } from '@/api/types'
import { beriTahu } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { BilahAksi } from '@/components/shared/PageHeader'
import { useTabHalaman } from '@/components/shell/navigasi'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'

function useYakin() {
  const [yakin, setYakin] = useState(false)
  useEffect(() => {
    if (!yakin) return
    const t = setTimeout(() => setYakin(false), 5000)
    return () => clearTimeout(t)
  }, [yakin])
  return [yakin, setYakin] as const
}

export function VersiPage() {
  const [tab] = useTabHalaman<'versions' | 'download' | 'arguments'>('/client-versions')
  const [daftar, setDaftar] = useState<Klien[]>([])
  const [dipakai, setDipakai] = useState('')
  const [fokusRadio, setFokusRadio] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [status, setStatus] = useState<'memuat' | 'segar' | 'siap' | 'galat'>('memuat')
  const [galat, setGalat] = useState('')
  const [sibukHapus, setSibukHapus] = useState(false)

  const muat = useCallback(async () => {
    setStatus((s) => (s === 'siap' || s === 'segar' ? 'segar' : 'memuat'))
    try {
      setDaftar(await api.daftarVersiRoblox())
      setDipakai(await api.klienPath())
      setStatus('siap')
      setGalat('')
    } catch (e) {
      setStatus((s) => (s === 'segar' ? 'siap' : 'galat'))
      setGalat(String(e))
      beriTahu(`Couldn’t load Roblox versions: ${e}`, 'salah')
    }
  }, [])
  useEffect(() => { void muat() }, [muat])

  const pakai = async (path: string) => {
    try {
      await api.setKlienPath(path)
      setDipakai(path)
      beriTahu(path ? 'This version will be used for launching.' : 'Back to following the Roblox protocol.', 'benar')
    } catch (e) {
      beriTahu(String(e), 'salah')
    }
  }
  const tambah = async () => {
    setSibuk(true)
    try {
      await api.tambahKlienKustom()
      await muat()
      beriTahu('Version added.', 'benar')
    } catch (e) {
      if (!dibatalkan(e)) beriTahu(String(e), 'salah')
    } finally {
      setSibuk(false)
    }
  }
  const hapus = async (path: string, diunduh: boolean) => {
    try {
      await api.hapusKlienKustom(path)
      await muat()
      beriTahu(diunduh ? 'Downloaded version deleted.' : 'Removed from the list. The folder itself is untouched.')
    } catch (e) {
      beriTahu(String(e), 'salah')
    }
  }
  const hapusVersi = async (path: string) => {
    setSibukHapus(true)
    try {
      const h = await api.hapusVersiRoblox(path)
      beriTahu(`Old Roblox version deleted (${h.mb} MB freed).`, 'benar')
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      setSibukHapus(false)
      await muat()
    }
  }
  const hapusLama = async () => {
    setSibukHapus(true)
    try {
      const h = await api.hapusVersiRobloxLama()
      const lewat = h.dilewati?.length ? ` Skipped: ${h.dilewati.join('; ')}` : ''
      beriTahu(h.dihapus ? `Deleted ${h.dihapus} old Roblox version${h.dihapus === 1 ? '' : 's'} (${h.mb} MB freed).${lewat}` : `No old Roblox version was deleted.${lewat}`, h.dilewati?.length ? 'salah' : 'benar')
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      setSibukHapus(false)
      await muat()
    }
  }

  const bawaan = daftar.filter((k) => k.bawaan)
  const adaDipakai = dipakai === '' || daftar.some((k) => k.path === dipakai && k.ada)
  const tabStop = fokusRadio ?? (adaDipakai ? dipakai : '')
  const gerakRadio = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || (e.target as HTMLElement).getAttribute('role') !== 'radio') return
    const daftarRadio = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=radio]:not([aria-disabled=true])')]
    const i = daftarRadio.indexOf(e.target as HTMLElement)
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? daftarRadio.length - 1 : Math.max(0, Math.min(daftarRadio.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))
    e.preventDefault()
    daftarRadio[j]?.focus()
  }
  const adaSaatIni = bawaan.some((k) => k.protokol)
  const lama = adaSaatIni ? bawaan.filter((k) => !k.protokol && k.path !== dipakai) : []
  const mbLama = lama.reduce((n, k) => n + (k.ukuran_mb || 0), 0)
  const kustom = daftar.filter((k) => !k.bawaan)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BilahAksi>
        <Button size="md" variant="ghost" onClick={() => void muat()} disabled={status === 'segar' || status === 'memuat'}><RefreshCw className={cn('h-4 w-4', status === 'segar' && 'animate-spin')} />{status === 'segar' ? 'Refreshing…' : 'Reload'}</Button>
      </BilahAksi>
      <div key={tab} className="min-h-0 flex-1 animate-halaman overflow-y-auto">
        <div className="mx-auto max-w-[64rem] space-y-5 p-5">
          {tab === 'versions' ? (
            <>
          {status === 'memuat' ? <EmptyState icon={Loader2} title="Loading Roblox versions…" compact /> : null}
          {status === 'galat' ? <EmptyState icon={AlertTriangle} title="Couldn’t load Roblox versions" description={galat} action={<Button size="sm" variant="secondary" onClick={() => void muat()}>Retry</Button>} compact /> : null}

          <section aria-label="Client used for launching">
            <h2 className="mb-2 text-md font-semibold text-content-primary">Client used for launching</h2>
            <div role="radiogroup" aria-label="Client used for launching" onKeyDown={gerakRadio} className="overflow-hidden rounded-lg border border-line-subtle">
              <BarisPilih aktif={dipakai === ''} tab={tabStop === ''} onFokus={() => setFokusRadio('')} onPilih={() => void pakai('')} judul="Automatic (roblox-player: protocol)" sub="Windows can point the protocol at one version only, and Roblox rewrites it on every update. Pick a version below to pin it." />
              {bawaan.length ? bawaan.map((k) => <BarisVersi key={k.path} k={k} aktif={dipakai === k.path} tab={tabStop === k.path} onFokus={() => setFokusRadio(k.path)} onPakai={pakai} onHapus={hapus} onHapusVersi={adaSaatIni ? hapusVersi : null} sibukHapus={sibukHapus} />) : status === 'siap' ? <p className="border-t border-line-subtle px-4 py-2.5 text-sm text-content-muted">No Roblox installation found in the standard folder.</p> : null}
              {kustom.map((k) => <BarisVersi key={k.path} k={k} aktif={dipakai === k.path} tab={tabStop === k.path} onFokus={() => setFokusRadio(k.path)} onPakai={pakai} onHapus={hapus} onHapusVersi={null} sibukHapus={sibukHapus} />)}
            </div>
            {!adaSaatIni && bawaan.length ? <p className="mt-2 text-sm text-content-muted">CAM couldn't tell which Roblox version is current, so old versions can't be deleted here.</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {lama.length ? <TombolHapusLama jumlah={lama.length} mb={mbLama} sibuk={sibukHapus} onHapus={() => void hapusLama()} /> : null}
              <Button size="md" variant="secondary" onClick={() => void tambah()} disabled={sibuk}><FolderPlus className="h-4 w-4" />{sibuk ? 'Choosing…' : 'Add downgraded version…'}</Button>
              <span className="text-sm text-content-muted">Pick the folder that contains RobloxPlayerBeta.exe.</span>
            </div>
            {lama.length ? <p className="mt-2 text-xs text-content-muted">Roblox keeps an old version when it was still in use during an update. The current version and a pinned version are kept.</p> : null}
          </section>

            </>
          ) : tab === 'download' ? (
            <UnduhVersi onSelesai={() => void muat()} />
          ) : (
            <ArgumenBawaan />
          )}
        </div>
      </div>
    </div>
  )
}

function Radio({ aktif }: { aktif: boolean }) {
  return <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', aktif ? 'border-accent' : 'border-line-strong')}>{aktif ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}</span>
}

function BarisPilih({ aktif, tab, onFokus, onPilih, judul, sub }: { aktif: boolean; tab: boolean; onFokus: () => void; onPilih: () => void; judul: string; sub: string }) {
  return (
    <div role="radio" aria-checked={aktif} tabIndex={tab ? 0 : -1} onFocus={onFokus} onClick={onPilih} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPilih() } }} className={cn('flex cursor-pointer items-start gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60', aktif ? 'bg-accent/[0.12]' : 'hover:bg-surface-2/50')}>
      <Radio aktif={aktif} />
      <div className="min-w-0"><p className="text-sm font-semibold text-content-primary">{judul}</p><p className="mt-0.5 text-sm text-content-muted">{sub}</p></div>
    </div>
  )
}

function BarisVersi({ k, aktif, tab, onFokus, onPakai, onHapus, onHapusVersi, sibukHapus }: { k: Klien; aktif: boolean; tab: boolean; onFokus: () => void; onPakai: (p: string) => void; onHapus: (p: string, diunduh: boolean) => void; onHapusVersi: ((p: string) => void) | null; sibukHapus: boolean }) {
  const [yakin, setYakin] = useYakin()
  const label = k.bawaan ? (!onHapusVersi ? 'Installed' : k.protokol ? 'Installed · current' : 'Installed · old') : k.diunduh ? 'Downloaded' : 'Added folder'
  const tombolHapus = (judul: string, aksi: () => void) => (
    <Button size="sm" variant={yakin ? 'danger' : 'ghost'} disabled={sibukHapus} onMouseLeave={() => setYakin(false)} onBlur={() => setYakin(false)} title={judul} aria-label={yakin ? `Confirm: ${judul.toLowerCase()}` : judul} onClick={(e) => { e.stopPropagation(); if (yakin) { setYakin(false); aksi() } else setYakin(true) }}>
      <Trash2 className="h-3.5 w-3.5" />{yakin ? 'Delete files' : null}
    </Button>
  )
  return (
    <div
      role="radio"
      aria-checked={aktif}
      aria-disabled={!k.ada || undefined}
      aria-label={`${k.versi || 'Version unreadable'}, ${k.bawaan ? 'installed' : k.diunduh ? 'downloaded' : 'added folder'}${k.ada ? '' : ', missing'}`}
      tabIndex={k.ada && tab ? 0 : -1}
      onFocus={(e) => { if (e.target === e.currentTarget) onFokus() }}
      onClick={() => k.ada && onPakai(k.path)}
      onKeyDown={(e) => { if (k.ada && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onPakai(k.path) } }}
      className={cn('flex items-start gap-3 border-t border-line-subtle px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60', k.ada ? 'cursor-pointer' : 'cursor-not-allowed opacity-55', aktif ? 'bg-accent/[0.12]' : k.ada && 'hover:bg-surface-2/50')}
    >
      <Radio aktif={aktif} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="tnum font-semibold text-content-primary">{k.versi || 'Version unreadable'}</span>
          <span className={k.bawaan && !k.protokol && onHapusVersi ? 'text-warning' : 'text-content-muted'}>{label}</span>
          {k.ukuran_mb > 0 ? <span className="tnum text-content-muted">{k.ukuran_mb} MB</span> : null}
          {!k.ada ? <span className="inline-flex items-center gap-1 text-error"><AlertTriangle className="h-3.5 w-3.5" />Missing</span> : null}
        </p>
        <p className="mt-0.5 break-all font-mono text-xs text-content-muted" title={k.path}>{k.path}</p>
      </div>
      {k.bawaan && !k.protokol && onHapusVersi ? tombolHapus('Delete this old Roblox version from disk', () => onHapusVersi(k.path)) : null}
      {!k.bawaan ? (
        k.diunduh ? tombolHapus('Delete this downloaded version from disk', () => onHapus(k.path, true)) : (
          <Button size="sm" variant="ghost" title="Remove from list (the folder is not deleted)" aria-label="Remove from list (the folder is not deleted)" onClick={(e) => { e.stopPropagation(); onHapus(k.path, false) }}><Trash2 className="h-3.5 w-3.5" /></Button>
        )
      ) : null}
    </div>
  )
}

function TombolHapusLama({ jumlah, mb, sibuk, onHapus }: { jumlah: number; mb: number; sibuk: boolean; onHapus: () => void }) {
  const [yakin, setYakin] = useYakin()
  const n = `${jumlah} old Roblox version${jumlah === 1 ? '' : 's'}`
  return (
    <Button size="md" variant="danger" disabled={sibuk} onMouseLeave={() => setYakin(false)} onBlur={() => setYakin(false)} aria-label={yakin ? `Confirm: delete ${n}` : `Delete ${n}`} onClick={() => { if (yakin) { setYakin(false); onHapus() } else setYakin(true) }}>
      <Trash2 className="h-4 w-4" />{sibuk ? 'Deleting…' : yakin ? `Confirm: delete ${jumlah} (${mb} MB)` : `Delete old versions (${mb} MB)`}
    </Button>
  )
}

function ArgumenBawaan() {
  const [nilai, setNilai] = useState('')
  const [teks, setTeks] = useState('')
  useEffect(() => { api.argumenLuncur().then((v) => { setNilai(v || ''); setTeks(v || '') }, () => undefined) }, [])
  const simpan = async () => {
    if (teks === nilai) return
    try {
      const v = await api.setArgumenLuncur(teks)
      setNilai(v)
      setTeks(v)
      beriTahu(v ? `Default launch arguments: ${v}` : 'Default launch arguments cleared.', 'benar')
    } catch (e) {
      beriTahu(String(e), 'salah')
      setTeks(nilai)
    }
  }
  return (
    <section aria-label="Launch arguments">
      <h2 className="mb-2 text-md font-semibold text-content-primary">Launch arguments</h2>
      <input value={teks} onChange={(e) => setTeks(e.target.value)} onBlur={() => void simpan()} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setTeks(nilai) }} placeholder="None" aria-label="Default launch arguments" spellCheck={false} className="h-9 w-full rounded-md border border-line bg-app/40 px-3 font-mono text-sm text-content-primary placeholder:font-sans placeholder:text-content-muted focus:border-accent/60 focus:outline-none" />
      <p className="mt-1.5 text-sm leading-relaxed text-content-muted">Added after the launch link for every account that has none of its own (account details). With arguments, RobloxPlayerBeta.exe is started directly: the newest installed version when Automatic is selected. Quotes and &amp; | &lt; &gt; ^ aren't allowed.</p>
    </section>
  )
}

const mbB = (b: number) => `${Math.round((b || 0) / 1e6)} MB`

function UnduhVersi({ onSelesai }: { onSelesai: () => void }) {
  const [terbaru, setTerbaru] = useState<VersiRoblox | null | false>(null)
  const [hash, setHash] = useState('')
  const [cek, setCek] = useState<VersiRoblox | null>(null)
  const [memeriksa, setMemeriksa] = useState(false)
  const [status, setStatus] = useState<KemajuanUnduh | null>(null)
  const pantau = useRef<number | null>(null)
  const berhenti = () => { if (pantau.current) window.clearInterval(pantau.current); pantau.current = null }

  const ikuti = useCallback(() => {
    if (pantau.current) return
    pantau.current = window.setInterval(async () => {
      try {
        const s = await api.statusUnduhRoblox()
        setStatus(s)
        if (!s.aktif) {
          berhenti()
          if (s.hasil) {
            beriTahu(`Downloaded ${s.versi}. Select it in the list above to launch with it.`, 'benar')
            onSelesai()
            setTerbaru((t) => (t && t.hash === s.versi ? { ...t, terpasang: true } : t))
            setCek((c) => (c && c.hash === s.versi ? { ...c, terpasang: true } : c))
          } else if (s.galat) {
            beriTahu(`Download of ${s.versi} stopped: ${s.galat}`, 'salah')
          }
        }
      } catch {
        berhenti()
      }
    }, 700)
  }, [onSelesai])

  const tanyaTerbaru = useCallback(() => {
    setTerbaru(null)
    api.versiRobloxTerbaru().then(setTerbaru, () => setTerbaru(false))
  }, [])

  useEffect(() => {
    tanyaTerbaru()
    api.statusUnduhRoblox().then((s) => { setStatus(s); if (s.aktif) ikuti() }, () => undefined)
    return berhenti
  }, [ikuti, tanyaTerbaru])

  const periksa = async () => {
    setMemeriksa(true)
    setCek(null)
    try {
      setCek(await api.periksaVersiRoblox(hash))
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      setMemeriksa(false)
    }
  }
  const unduh = async (h: string) => {
    try {
      await api.unduhVersiRoblox(h)
      setStatus({ aktif: true, versi: h, tahap: 'Starting', paket_ke: 0, jumlah_paket: 0, byte_selesai: 0, byte_total: 0, galat: '', hasil: '', dilewati: [] })
      ikuti()
    } catch (e) {
      beriTahu(String(e), 'salah')
    }
  }
  const aktif = !!status?.aktif
  const persen = status?.byte_total ? Math.min(100, (status.byte_selesai / status.byte_total) * 100) : 0

  return (
    <section aria-label="Download a version from Roblox">
      <h2 className="mb-2 text-md font-semibold text-content-primary">Download a version from Roblox</h2>
      <div className="overflow-hidden rounded-lg border border-line-subtle">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="w-28 shrink-0 text-sm text-content-muted">Latest (live)</span>
          {terbaru === null ? (
            <span role="status" className="text-sm text-content-muted">Asking Roblox…</span>
          ) : terbaru === false ? (
            <>
              <span className="min-w-0 flex-1 text-sm text-error">Couldn’t reach Roblox.</span>
              <Button size="sm" variant="secondary" onClick={tanyaTerbaru}><RotateCw className="h-3.5 w-3.5" />Retry</Button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-sm"><span className="tnum font-semibold text-content-primary">{terbaru.versi}</span><span className="ml-2 break-all font-mono text-xs text-content-muted">{terbaru.hash}, {mbB(terbaru.ukuran)}</span></span>
              {terbaru.terpasang ? <span className="text-sm text-success">Downloaded</span> : <Button size="sm" variant="secondary" onClick={() => void unduh(terbaru.hash)} disabled={aktif}><Download className="h-3.5 w-3.5" />Download</Button>}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle px-4 py-3">
          <span className="w-28 shrink-0 text-sm text-content-muted">By version</span>
          <input value={hash} onChange={(e) => { setHash(e.target.value); setCek(null) }} onKeyDown={(e) => { if (e.key === 'Enter' && hash.trim()) void periksa() }} placeholder="version-0123456789abcdef" spellCheck={false} className="h-8 min-w-[12rem] flex-1 rounded-md border border-line bg-app/40 px-2.5 font-mono text-sm text-content-primary placeholder:text-content-muted focus:border-accent/60 focus:outline-none" />
          <Button size="sm" variant="secondary" onClick={() => void periksa()} disabled={!hash.trim() || memeriksa}><Search className="h-3.5 w-3.5" />{memeriksa ? 'Checking…' : 'Check'}</Button>
        </div>
        {cek ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle px-4 py-3">
            <span className="w-28 shrink-0" />
            <span className="min-w-0 flex-1 break-all text-sm text-success">{cek.hash} exists on the Roblox CDN: {cek.paket} packages, {mbB(cek.ukuran)}.</span>
            {cek.terpasang ? <span className="text-sm text-success">Downloaded</span> : <Button size="sm" variant="secondary" onClick={() => void unduh(cek.hash)} disabled={aktif}><Download className="h-3.5 w-3.5" />Download</Button>}
          </div>
        ) : null}
        {aktif && status ? (
          <div className="border-t border-line-subtle px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 text-content-primary">{status.tahap}{status.jumlah_paket ? ` (${status.paket_ke} of ${status.jumlah_paket})` : ''}</span>
              <span className="tnum text-content-muted">{mbB(status.byte_selesai)} of {mbB(status.byte_total)}</span>
              <Button size="sm" variant="ghost" onClick={() => void api.batalUnduhRoblox().catch(() => undefined)}><X className="h-3.5 w-3.5" />Cancel</Button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${persen}%` }} /></div>
          </div>
        ) : null}
        {!aktif && status?.galat ? <p className="border-t border-line-subtle px-4 py-2.5 text-sm text-error">{status.versi}: {status.galat}</p> : null}
        {!aktif && status?.dilewati?.length ? <p className="border-t border-line-subtle px-4 py-2.5 text-sm text-warning">Roblox added packages this app does not know yet, so they were not installed: {status.dilewati.join(', ')}. That version may not start.</p> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-content-muted">Every package is checked against Roblox's own manifest (size and MD5) before it is unpacked. Since March 2026 Roblox no longer publishes the hashes of older versions, so paste the one your executor lists. Very old versions are refused when joining a game.</p>
    </section>
  )
}
