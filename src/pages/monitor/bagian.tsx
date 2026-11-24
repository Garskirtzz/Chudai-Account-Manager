import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from '@/components/ikon'
import { gerakMati } from '@/components/ui/AngkaHidup'
import { api } from '@/api/api'
import type { Kapasitas, StatusKlienKebijakan, StatusKolom } from '@/api/types'
import { beriTahu } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { StatusLabel, type StatusTone } from '@/components/ui/Badge'

export function lamaJalan(detik: number | null | undefined) {
  if (detik == null || detik < 0) return '—'
  const j = Math.floor(detik / 3600)
  const m = Math.floor((detik % 3600) / 60)
  if (j > 0) return `${j}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m`
  return `${Math.floor(detik)}s`
}
export const mb = (v: number | null | undefined) => (v == null ? '—' : v >= 1024 ? `${(v / 1024).toFixed(2)} GB` : `${Math.round(v)} MB`)
export const persen = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`)
export const laju = (v: number | null | undefined) => (v == null ? '—' : v >= 1048576 ? `${(v / 1048576).toFixed(1)} MB/s` : v >= 1024 ? `${(v / 1024).toFixed(0)} KB/s` : `${Math.round(v)} B/s`)

export const STATUS_PANTAU: Record<string, [StatusTone, string]> = {
  memulai: ['info', 'Starting'],
  menyambung: ['info', 'Joining'],
  di_game: ['success', 'In game'],
  teleport: ['info', 'Teleporting'],
  putus: ['error', 'Disconnected'],
  verifikasi: ['warning', 'Human check'],
  ditolak: ['error', 'Sign-in refused'],
  macet: ['warning', 'Not responding'],
}

const TEKS_KOLOM: Partial<Record<StatusKolom, string>> = {
  terpasang: 'applied',
  gagal: 'failed',
  hilang: 'lost',
  diminta: 'relaunch to apply',
  tidak_diketahui: 'not tracked',
}

export function StatusKebijakan({ k }: { k?: StatusKlienKebijakan }) {
  if (!k) return null
  const { diminta } = k
  const kolom = ([[`RAM limit ${diminta.ws_mb.nilai} MB`, k.ws], ['Low priority', k.prioritas]] as [string, StatusKolom][]).filter(([, s]) => s !== 'tidak_berlaku')
  const minta: string[] = []
  if (diminta.fps.nilai != null) minta.push(`${diminta.fps.nilai} FPS`)
  if (diminta.grafis_rendah.nilai) minta.push('low graphics')
  if (!kolom.length && !minta.length) return null
  const ada = (s: StatusKolom) => kolom.some(([, x]) => x === s)
  const [tone, teks]: [StatusTone, string] = ada('gagal') || ada('hilang') ? ['warning', 'Not fully applied']
    : ada('diminta') ? ['muted', 'Relaunch to apply']
    : ada('tidak_diketahui') ? ['muted', 'Not tracked']
    : ada('terpasang') ? ['success', 'Limits applied']
    : ['muted', 'Requested']
  const rincian = [...kolom.map(([nama, s]) => `${nama}: ${TEKS_KOLOM[s]}`), ...(minta.length ? [`Requested at launch, Windows can't confirm it: ${minta.join(', ')}`] : [])].join(' · ')
  return <span title={rincian}><StatusLabel tone={tone} className="text-xs">{teks}</StatusLabel></span>
}

export function TombolTahan({ ikon, label, title, bahaya, disabled, onSelesai }: { ikon: ReactNode; label: string; title: string; bahaya?: boolean; disabled?: boolean; onSelesai: () => void }) {
  const [persenTahan, setPersen] = useState(0)
  const [selesai, setSelesai] = useState(false)
  const mulai = useRef(0)
  const timer = useRef<number | null>(null)
  const henti = () => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    setPersen(0)
  }
  const tekan = () => {
    if (disabled || timer.current) return
    mulai.current = Date.now()
    timer.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - mulai.current) / 1000) * 100)
      setPersen(p)
      if (p >= 100) {
        henti()
        setSelesai(true)
        window.setTimeout(() => setSelesai(false), 1400)
        onSelesai()
      }
    }, 16)
  }
  useEffect(() => henti, [])
  const ditahan = persenTahan > 0
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onPointerDown={tekan}
      onPointerUp={henti}
      onPointerLeave={henti}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); tekan() } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') henti() }}
      className={cn(
        'group relative inline-flex h-9 select-none items-center gap-1.5 overflow-hidden rounded-md border px-3 text-sm font-medium transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-pegas disabled:opacity-40',
        'active:scale-[0.97] enabled:hover:-translate-y-px enabled:hover:shadow-[0_4px_14px_-6px_rgb(0_0_0/0.6)]',
        bahaya ? 'border-error/40 text-error enabled:hover:border-error/70 enabled:hover:bg-error/10' : 'border-line text-content-primary enabled:hover:border-line-strong enabled:hover:bg-surface-2',
        ditahan && (bahaya ? 'border-error bg-error/10' : 'border-content-muted'),
        selesai && 'border-success/60 text-success',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0', bahaya ? 'bg-error/30' : 'bg-content-primary/15')} style={{ width: `${persenTahan}%` }} aria-hidden />
      {ditahan ? <span aria-hidden className="absolute inset-y-0 w-8 -skew-x-12 bg-white/10" style={{ left: `calc(${persenTahan}% - 2rem)` }} /> : null}
      <span className="relative flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn(
            'flex transition-transform duration-300 ease-pegas',
            !ditahan && !selesai && (bahaya ? 'group-enabled:group-hover:animate-getar-kecil' : 'group-enabled:group-hover:-rotate-12 group-enabled:group-hover:scale-110'),
            ditahan && 'scale-125',
            ditahan && bahaya && 'animate-pulse',
          )}
        >
          {selesai ? <Check className="h-3.5 w-3.5" /> : ikon}
        </span>
        <span>{selesai ? 'Done' : ditahan ? 'Keep holding…' : `${label} (hold)`}</span>
      </span>
    </button>
  )
}

export function KapasitasRam({ k, onUbah }: { k: Kapasitas | null; onUbah: () => void }) {
  const [isian, setIsian] = useState('')
  const terisi = useRef(false)
  const tersimpan = useRef(0)
  useEffect(() => {
    if (!k || terisi.current) return
    terisi.current = true
    tersimpan.current = k.anggaran_mb ?? 0
    setIsian(k.anggaran_mb ? String(k.anggaran_mb / 1024) : '')
  }, [k])
  if (!k) return null
  const gb = (v: number | null) => (v == null ? '—' : `${(v / 1024).toFixed(1)} GB`)
  const n = (m: { jumlah: number | null }) => (m.jumlah == null ? '—' : m.jumlah)
  const nilaiTersimpan = () => (tersimpan.current ? String(tersimpan.current / 1024) : '')
  const simpan = async (el: HTMLInputElement) => {
    const teks = isian.trim()
    const v = teks === '' ? 0 : Math.round(Number(teks) * 1024)
    if (el.validity.badInput || !Number.isFinite(v) || v < 0) {
      setIsian(nilaiTersimpan())
      beriTahu('Enter the RAM budget in GB, or leave it empty to turn it off.', 'salah')
      return
    }
    if (v === 0) setIsian('')
    if (v === tersimpan.current) return
    try {
      await api.setAnggaranRam(v)
      tersimpan.current = v
      beriTahu(v ? `RAM budget set to ${(v / 1024).toFixed(1)} GB.` : 'RAM budget is off.', 'benar')
      onUbah()
    } catch (e) {
      setIsian(nilaiTersimpan())
      beriTahu(String(e), 'salah')
    }
  }
  return (
    <section className="rounded-lg border border-line-subtle bg-surface-1/40 p-4" aria-label="RAM capacity">
      <h2 className="text-xs font-semibold text-content-secondary">RAM capacity</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span><span className="text-content-muted">Roblox clients use about</span> <span className="text-content-primary">{gb(k.dipakai_mb)}</span></span>
        <span><span className="text-content-muted">Free on this PC</span> <span className="text-content-primary">{gb(k.tersedia_mb)}</span></span>
        <label className="ml-auto flex items-center gap-2 text-content-muted" title="The physical RAM all Roblox clients may use together. Above it, Launch asks first and auto-rejoin waits for room. Leave empty to turn it off.">
          RAM budget
          <input type="number" min={1} step={0.5} placeholder="Off" data-anggaran-ram value={isian} onChange={(e) => setIsian(e.target.value)} onBlur={(e) => void simpan(e.currentTarget)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} className="h-8 w-20 rounded-md border border-line bg-app/40 px-2 text-sm text-content-primary focus:border-accent/60 focus:outline-none" />
          GB
        </label>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" title="Estimated from one game while idle in a lobby. Real use depends on the game.">
        <span className="text-content-muted">Room for about</span>
        <span><span className="tnum text-content-primary">{n(k.normal)}</span> <span className="text-content-muted">Normal</span></span>
        <span><span className="tnum text-content-primary">{n(k.balanced_afk)}</span> <span className="text-content-muted">Balanced AFK</span></span>
        <span><span className="tnum text-content-primary">{n(k.deep_afk)}</span> <span className="text-content-muted">Deep AFK</span></span>
      </p>
    </section>
  )
}

export function Tren({ nilai, nol, lantai, label, satuan, tinggi = 48, waktu }: { nilai: number[]; nol?: boolean; lantai: number; label: string; satuan: (v: number) => string; tinggi?: number; waktu?: number }) {
  const [arah, setArah] = useState<number | null>(null)
  const gRef = useRef<SVGGElement>(null)
  const SIMPAN = 40
  const w = 200
  const langkah = w / (SIMPAN - 1)
  const terakhir = nilai.length ? `${nilai.length}:${nilai[nilai.length - 1]}:${waktu ?? ''}` : ''
  const lama = useRef(terakhir)

  useLayoutEffect(() => {
    const g = gRef.current
    if (!g || lama.current === terakhir) return
    const pertama = lama.current === ''
    lama.current = terakhir
    if (pertama || gerakMati()) return
    g.style.transition = 'none'
    g.style.transform = `translateX(${langkah}px)`
    void g.getBoundingClientRect()
    g.style.transition = 'transform 2900ms linear'
    g.style.transform = 'translateX(0px)'
  }, [terakhir, langkah])

  if (nilai.length < 2) return <div style={{ height: tinggi }} className="flex items-center text-xs text-content-muted">Measuring…</div>
  const lo = nol ? 0 : Math.min(...nilai)
  const hi = Math.max(...nilai)
  const rentang = Math.max(lantai, hi - lo)
  const x = (i: number) => ((i + SIMPAN - nilai.length) / (SIMPAN - 1)) * w
  const y = (v: number) => tinggi - 2 - ((v - lo) / rentang) * (tinggi - 6)
  const titik = nilai.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const iArah = arah == null ? null : Math.max(0, Math.min(nilai.length - 1, arah))
  const jam = (i: number) => {
    if (!waktu) return `${(nilai.length - 1 - i) * 3}s ago`
    return new Date(waktu - (nilai.length - 1 - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  return (
    <div className="relative" onMouseLeave={() => setArah(null)} onMouseMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect()
      const px = ((e.clientX - r.left) / r.width) * w
      const i = Math.round((px / w) * (SIMPAN - 1)) - (SIMPAN - nilai.length)
      setArah(i)
    }}>
      <svg viewBox={`0 0 ${w} ${tinggi}`} preserveAspectRatio="none" className="block w-full overflow-hidden" style={{ height: tinggi }} role="img" aria-label={`${label}: ${satuan(nilai[nilai.length - 1])}`}>
        <line x1={0} x2={w} y1={tinggi - 1} y2={tinggi - 1} stroke="rgb(var(--border-strong))" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <g ref={gRef}>
          <polygon points={`${x(0)},${tinggi} ${titik} ${x(nilai.length - 1)},${tinggi}`} fill="#3987e5" fillOpacity={0.14} />
          <polyline points={titik} fill="none" stroke="#3987e5" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>
        {iArah != null ? <line x1={x(iArah)} x2={x(iArah)} y1={0} y2={tinggi} stroke="rgb(var(--text-muted))" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {iArah != null ? (
        <>
          <span className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#3987e5] bg-surface-1" style={{ left: `${(x(iArah) / w) * 100}%`, top: y(nilai[iArah]) }} aria-hidden />
          <span className="pointer-events-none absolute -top-7 z-10 whitespace-nowrap rounded border border-line bg-surface-2 px-1.5 py-0.5 text-xs text-content-primary shadow-popover" style={{ left: `${(x(iArah) / w) * 100}%`, transform: 'translateX(-50%)' }}>
            <span className="tnum font-medium" translate="no">{satuan(nilai[iArah])}</span> <span className="tnum text-content-muted" translate="no">· {jam(iArah)}</span>
          </span>
        </>
      ) : null}
    </div>
  )
}
