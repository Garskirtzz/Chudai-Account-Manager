import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Gamepad2, Loader2, Search, X } from '@/components/ikon'
import { ambilPlaceIdDariUrl, angka, api } from '@/api/api'
import type { GameHasil } from '@/api/types'
import { cn } from '@/utils/cn'

export function PemilihGame({ nilai, nama = '', ikon = '', onPilih, varian = 'panel', redup = false }: { nilai: string; nama?: string; ikon?: string; onPilih: (placeId: string, meta: { name: string; icon: string } | null) => void; varian?: 'panel' | 'bar'; redup?: boolean }) {
  const [teks, setTeks] = useState('')
  const [hasil, setHasil] = useState<GameHasil[]>([])
  const [buka, setBuka] = useState(false)
  const [keadaan, setKeadaan] = useState<'idle' | 'mencari' | 'siap' | 'galat'>('idle')
  const [aktif, setAktif] = useState(-1)
  const [arah, setArah] = useState<'atas' | 'bawah'>('bawah')
  const ref = useRef<HTMLDivElement>(null)
  const permintaan = useRef(0)
  const idDaftar = useId()

  useEffect(() => {
    if (!buka) return
    const ukur = () => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const bawah = window.innerHeight - r.bottom
      setArah(bawah >= 296 || bawah > r.top ? 'bawah' : 'atas')
    }
    ukur()
    window.addEventListener('resize', ukur)
    return () => window.removeEventListener('resize', ukur)
  }, [buka])

  const dikirim = useRef<string | null>(null)
  const kirim = (placeId: string, meta: { name: string; icon: string } | null) => {
    dikirim.current = placeId
    onPilih(placeId, meta)
  }
  useEffect(() => {
    if (nama || String(nilai || '') !== dikirim.current) setTeks('')
  }, [nilai, nama])
  useEffect(() => { if (!teks) setBuka(false) }, [teks])

  useEffect(() => {
    const klikLuar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setBuka(false)
    }
    document.addEventListener('mousedown', klikLuar)
    return () => document.removeEventListener('mousedown', klikLuar)
  }, [])

  useEffect(() => {
    const q = teks.trim()
    if (!q || /^\d+$/.test(q)) {
      setHasil([])
      setKeadaan('idle')
      setBuka(false)
      return
    }
    const t = setTimeout(async () => {
      const seq = ++permintaan.current
      setKeadaan('mencari')
      setBuka(true)
      try {
        const r = await api.cariGame(q)
        if (seq === permintaan.current) {
          setHasil(r)
          setAktif(r.length ? 0 : -1)
          setKeadaan('siap')
        }
      } catch {
        if (seq === permintaan.current) {
          setHasil([])
          setKeadaan('galat')
        }
      }
    }, 350)
    return () => clearTimeout(t)
  }, [teks])

  const ubah = (v: string) => {
    const dariUrl = ambilPlaceIdDariUrl(v)
    if (dariUrl) v = dariUrl
    setTeks(v)
    kirim(/^\d+$/.test(v.trim()) ? v.trim() : '', null)
  }

  const pilih = (g: GameHasil) => {
    setTeks('')
    setBuka(false)
    kirim(String(g.place_id), { name: g.name, icon: g.icon_url })
  }

  const kunci = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!buka || !hasil.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAktif((i) => Math.min(hasil.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAktif((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && aktif >= 0) { e.preventDefault(); pilih(hasil[aktif]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setBuka(false) }
  }

  const placeId = String(nilai || '').trim()
  if (placeId && !teks) {
    const judul = nama || `Place ${placeId}`
    return (
      <div className={cn('flex items-center gap-2.5 rounded-md border border-line bg-surface-2/50 p-2', redup && 'opacity-50')}>
        <Ikon key={ikon} url={ikon} besar={varian === 'panel'} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-content-primary" translate="no" title={judul}>{judul}</p>
          <p className="tnum text-xs text-content-muted">Place {placeId}</p>
        </div>
        <button type="button" aria-label="Clear game" title="Clear game" onClick={() => kirim('', null)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-content-muted hover:bg-surface-3 hover:text-content-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className={cn('relative', redup && 'opacity-50')}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
      <input
        value={teks}
        onChange={(e) => ubah(e.target.value)}
        onKeyDown={kunci}
        onFocus={() => hasil.length && setBuka(true)}
        placeholder={varian === 'panel' ? 'Search game or paste Place ID' : 'Game name, Place ID, or paste a link…'}
        title="Type a game name, a Place ID, or paste a roblox.com game link"
        role="combobox"
        aria-expanded={buka}
        aria-controls={idDaftar}
        aria-activedescendant={buka && aktif >= 0 && hasil[aktif] ? `${idDaftar}-${hasil[aktif].place_id}` : undefined}
        aria-autocomplete="list"
        className="h-8 w-full rounded-md border border-line bg-app/40 pl-8 pr-2 text-sm text-content-primary placeholder:text-content-muted focus:border-accent/60 focus:outline-none"
      />
      {buka ? (
        <div id={idDaftar} role="listbox" className={cn('absolute left-0 right-0 z-50 max-h-72 overflow-y-auto rounded-md border border-line bg-surface-2 p-1 shadow-popover', arah === 'bawah' ? 'top-full mt-1' : 'bottom-full mb-1')}>
          {keadaan === 'mencari' ? (
            <p className="flex items-center gap-2 px-2 py-3 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Searching Roblox…</p>
          ) : keadaan === 'galat' ? (
            <div className="px-2 py-3 text-sm"><p className="text-content-primary">Couldn’t search Roblox.</p><p className="text-content-muted">Check your connection, or type a Place ID instead.</p></div>
          ) : !hasil.length ? (
            <div className="px-2 py-3 text-sm"><p className="text-content-primary">No games found.</p><p className="text-content-muted">Try a Place ID or paste a Roblox game link.</p></div>
          ) : (
            hasil.map((g, i) => (
              <button key={g.place_id} id={`${idDaftar}-${g.place_id}`} type="button" tabIndex={-1} role="option" aria-selected={i === aktif} onMouseEnter={() => setAktif(i)} onClick={() => pilih(g)} className={cn('flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left', i === aktif ? 'bg-surface-3' : 'hover:bg-surface-3/60')}>
                <Ikon url={g.icon_url} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-content-primary" translate="no">{g.name}</span>
                  <span className="block text-xs text-content-muted">{angka(g.players)} playing</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function Ikon({ url, besar = false }: { url: string; besar?: boolean }) {
  const [gagal, setGagal] = useState(false)
  const ukuran = besar ? 'h-11 w-11' : 'h-8 w-8'
  if (!url || gagal) {
    return <span className={cn('flex shrink-0 items-center justify-center rounded-md bg-surface-3 text-content-muted', ukuran)}><Gamepad2 className="h-4 w-4" /></span>
  }
  return <img src={url} alt="" onError={() => setGagal(true)} className={cn('shrink-0 rounded-md bg-surface-3 object-cover', ukuran)} />
}
