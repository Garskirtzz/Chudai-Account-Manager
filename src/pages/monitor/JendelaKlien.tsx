import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Crosshair, Expand, Eye, Grid2x2, Layers, LayoutGrid, Maximize2, Minimize2, Shrink } from '@/components/ikon'
import { api } from '@/api/api'
import type { JendelaView } from '@/api/types'
import { UKURAN_KECIL, labelKecil } from '@/lib/folder'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Tooltip } from '@/components/ui/Tooltip'

const kelasInput = 'h-8 rounded-md border border-line bg-app/40 px-2 text-sm text-content-primary focus:border-accent/60 focus:outline-none'

export function JendelaKlien({ aktif }: { aktif: boolean }) {
  const [jendela, setJendela] = useState<JendelaView[]>([])
  const [pesan, setPesan] = useState('')
  const [sunting, setSunting] = useState<{ hwnd: number; x: string | number; y: string | number; w: string | number; h: string | number } | null>(null)
  const [kolom, setKolom] = useState(0)
  const [lebarKecil, setLebarKecil] = useState(320)
  const kotakPratinjau = useRef<HTMLDivElement>(null)
  const [pratinjau, setPratinjau] = useState<{ hwnd: number; judul: string; minimize: boolean } | null>(null)

  const muat = useCallback(async () => {
    try {
      setJendela(await api.daftarJendela())
    } catch {
      setJendela([])
    }
  }, [])

  useEffect(() => {
    if (!aktif) return
    void muat()
    const t = window.setInterval(muat, 4000)
    return () => window.clearInterval(t)
  }, [aktif, muat])

  useEffect(() => {
    if (!pratinjau || pratinjau.minimize) {
      api.pratinjauTutup().catch(() => undefined)
      return
    }
    const el = kotakPratinjau.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const d = window.devicePixelRatio || 1
    api.pratinjauTampil(pratinjau.hwnd, Math.round(r.left * d), Math.round(r.top * d), Math.round(r.width * d), Math.round(r.height * d)).catch((e) => setPesan(String(e)))
    const tutup = () => setPratinjau(null)
    window.addEventListener('wheel', tutup, { passive: true, once: true })
    window.addEventListener('resize', tutup, { once: true })
    return () => {
      window.removeEventListener('wheel', tutup)
      window.removeEventListener('resize', tutup)
    }
  }, [pratinjau])
  useEffect(() => () => { api.pratinjauTutup().catch(() => undefined) }, [])

  const jalankan = async <T,>(fn: () => Promise<T>, pesanOk: string | ((h: T) => string)) => {
    try {
      const h = await fn()
      setPesan(typeof pesanOk === 'function' ? pesanOk(h) : pesanOk)
      await muat()
    } catch (e) {
      setPesan(String(e))
    }
  }
  const susun = (mode: 'kisi' | 'bertumpuk') => jalankan(() => api.susunJendela(mode, kolom), (n) => `Arranged ${n} window${n === 1 ? '' : 's'}.`)
  const simpanSunting = async () => {
    if (!sunting) return
    try {
      await api.pindahJendela(sunting.hwnd, Number(sunting.x) || 0, Number(sunting.y) || 0, Number(sunting.w) || 800, Number(sunting.h) || 600)
      setSunting(null)
      await muat()
    } catch (e) {
      setPesan(String(e))
    }
  }

  return (
    <div className="space-y-4 p-4">
      <section className="flex flex-wrap gap-4 rounded-lg border border-line-subtle bg-surface-1/40 p-4" aria-label="Client windows">
        <PetaLayar jendela={jendela} sorot={sunting?.hwnd} />
        <div className="min-w-[16rem] flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-content-primary">Client windows</h2>
            <span className="text-xs text-content-muted">{jendela.length || 'none'}</span>
          </div>
          <p className="mb-3 mt-1 text-sm leading-relaxed text-content-muted">Stop the Roblox windows from stacking on top of each other. The grid is sized from how many are open.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="md" variant="secondary" onClick={() => void susun('kisi')}><LayoutGrid className="h-4 w-4" />Tile</Button>
            <Button size="md" variant="secondary" onClick={() => void susun('bertumpuk')}><Layers className="h-4 w-4" />Cascade</Button>
            <label className="flex items-center gap-2 text-sm text-content-secondary" title="Leave on Auto to pick the column count from how many windows are open">
              Columns
              <input type="number" min={0} max={6} value={kolom || ''} placeholder="Auto" aria-label="Columns" onChange={(e) => setKolom(Math.max(0, Math.min(6, Number(e.target.value) || 0)))} className={cn(kelasInput, 'w-16 text-center')} />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-content-secondary" title="Client area size for Tiny and Tile tiny. Smaller than Roblox's own 800×600 minimum.">
              Tiny size
              <Select value={String(lebarKecil)} onValueChange={(v) => setLebarKecil(Number(v))} ariaLabel="Tiny size" labelLain={(v) => labelKecil(Number(v))} className="w-32" options={UKURAN_KECIL.map((w) => ({ value: String(w), label: labelKecil(w) }))} />
            </label>
            <Button size="md" variant="secondary" onClick={() => void jalankan(() => api.susunKecil(lebarKecil), (n) => `Made ${n} window${n === 1 ? '' : 's'} tiny and lined them up.`)}><Grid2x2 className="h-4 w-4" />Tile tiny</Button>
            <Button size="md" variant="secondary" onClick={() => void jalankan(() => api.semuaJendela('minimize'), (n) => `Minimized ${n} window${n === 1 ? '' : 's'}.`)}><Minimize2 className="h-4 w-4" />Minimize all</Button>
            <Button size="md" variant="secondary" onClick={() => void jalankan(() => api.semuaJendela('restore'), (n) => `Restored ${n} window${n === 1 ? '' : 's'}; tiny ones stay tiny.`)}><Maximize2 className="h-4 w-4" />Restore all</Button>
          </div>
          {pesan ? <p role="status" className="mt-2 text-sm text-content-muted">{pesan}</p> : null}
        </div>
      </section>

      {pratinjau ? (
        <div className="pointer-events-none fixed bottom-12 right-4 z-40 rounded-lg border border-line bg-surface-1 p-2 shadow-overlay">
          <p className="mb-1 max-w-[320px] truncate text-xs text-content-muted">Preview: <span translate="no">{pratinjau.judul}</span></p>
          <div ref={kotakPratinjau} aria-label={`Live preview of ${pratinjau.judul}`} className="grid h-[180px] w-[320px] place-items-center rounded border border-line bg-app text-xs text-content-muted">
            {pratinjau.minimize ? 'Minimized: a minimized client draws nothing.' : ''}
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-line-subtle" aria-label="Window list">
        {!jendela.length ? (
          <p className="px-4 py-3 text-sm text-content-muted">No Roblox windows are open.</p>
        ) : (
          jendela.map((j, i) => (
            <div key={j.hwnd} className="border-b border-line-subtle last:border-b-0">
              <div className="flex min-h-11 items-center gap-2 px-3 py-1.5">
                <span className="tnum w-5 shrink-0 text-xs text-content-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm" title={j.judul} data-judul-data="">
                  <span className={j.alias ? 'text-content-primary' : 'text-content-secondary'} translate="no">{j.alias || j.judul}</span>
                  {j.minimize ? <span className="ml-1.5 text-content-muted">· minimized</span> : null}
                </span>
                <span className="tnum shrink-0 text-xs text-content-muted" title="Game area (client) size">{j.klien_w}×{j.klien_h}{j.kecil ? ' tiny' : ''}</span>
                <Ikon title="Preview (while the pointer is here)" onEnter={() => setPratinjau({ hwnd: j.hwnd, judul: j.alias || j.judul, minimize: j.minimize })} onLeave={() => setPratinjau(null)}><Eye className="h-4 w-4" /></Ikon>
                {j.kecil ? (
                  <Ikon title="Normal size" onClick={() => void jalankan(() => api.jendelaNormal(j.hwnd), 'Back to its normal size.')}><Expand className="h-4 w-4" /></Ikon>
                ) : (
                  <Ikon title={`Tiny (${labelKecil(lebarKecil)})`} onClick={() => void jalankan(() => api.jendelaKecil(j.hwnd, lebarKecil), ([w, h]) => `Now ${w}×${h}.`)}><Shrink className="h-4 w-4" /></Ikon>
                )}
                <Ikon title="Bring to front" onClick={() => void api.fokusJendela(j.hwnd).catch(() => undefined)}><Crosshair className="h-4 w-4" /></Ikon>
                <Button size="sm" variant="ghost" onClick={() => setSunting(sunting?.hwnd === j.hwnd ? null : { hwnd: j.hwnd, x: j.x, y: j.y, w: j.w, h: j.h })}>{sunting?.hwnd === j.hwnd ? 'Cancel' : 'Move…'}</Button>
              </div>
              {sunting?.hwnd === j.hwnd ? (
                <div className="flex flex-wrap items-center gap-2 px-10 pb-2.5 text-sm text-content-secondary">
                  {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1.5">
                      {k.toUpperCase()}
                      <input type="number" value={sunting[k]} onChange={(e) => setSunting({ ...sunting, [k]: e.target.value })} className={cn(kelasInput, 'w-20 text-center')} />
                    </label>
                  ))}
                  <Button size="sm" variant="primary" onClick={() => void simpanSunting()}><Check className="h-3.5 w-3.5" />Apply</Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function Ikon({ title, onClick, onEnter, onLeave, children }: { title: string; onClick?: () => void; onEnter?: () => void; onLeave?: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={title}>
      <button type="button" aria-label={title} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onEnter} onBlur={onLeave} className="flex h-8 w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-2 hover:text-content-primary">
        {children}
      </button>
    </Tooltip>
  )
}

function PetaLayar({ jendela, sorot }: { jendela: JendelaView[]; sorot?: number }) {
  const dpr = window.devicePixelRatio || 1
  let x0 = 0
  let y0 = 0
  let x1 = Math.round(window.screen.width * dpr)
  let y1 = Math.round(window.screen.height * dpr)
  for (const j of jendela) {
    x0 = Math.min(x0, j.x)
    y0 = Math.min(y0, j.y)
    x1 = Math.max(x1, j.x + j.w)
    y1 = Math.max(y1, j.y + j.h)
  }
  const lebar = 200
  const skala = lebar / Math.max(1, x1 - x0)
  const tinggi = Math.max(60, Math.round((y1 - y0) * skala))
  return (
    <div className="relative shrink-0 overflow-hidden rounded-md border border-line bg-app" style={{ width: lebar, height: tinggi }} title="Where the Roblox windows sit on your screens">
      {jendela.map((j, i) => (
        <div key={j.hwnd} className={cn('absolute grid place-items-center rounded-sm border text-2xs font-bold', sorot === j.hwnd ? 'border-white bg-[#3987e5] text-white' : 'border-[#3987e5] bg-[#3987e5]/40 text-white')} style={{ left: (j.x - x0) * skala, top: (j.y - y0) * skala, width: Math.max(4, j.w * skala), height: Math.max(4, j.h * skala) }}>
          {i + 1}
        </div>
      ))}
    </div>
  )
}
