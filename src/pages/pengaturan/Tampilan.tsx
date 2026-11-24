import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Loader2, RotateCcw } from '@/components/ikon'
import { api } from '@/api/api'
import type { Tema } from '@/api/types'
import { beriTahu } from '@/stores/cam'
import { useSettingsStore } from '@/stores/settingsStore'
import { BAHASA, bacaBahasa, pasangBahasa } from '@/lib/bahasa'
import { DENSITY, bacaDensity, pasangDensity } from '@/lib/density'
import { bawaanMode, kontras, luminans, normalkan, pasangTema, presetMode } from '@/lib/tema'
import { ACCOUNT_COLUMNS } from '@/components/account/accountColumns'
import { Button } from '@/components/ui/Button'
import { Checkbox, SegmentedControl, Switch } from '@/components/ui/Controls'
import { cn } from '@/utils/cn'
import { Status } from './bagian'

type Warna = 'aksen' | 'latar' | 'kartu' | 'sisi'
const KOLOM: { k: Warna; label: string; ket: string }[] = [
  { k: 'aksen', label: 'Selection', ket: 'Selected rows, primary buttons and focus rings' },
  { k: 'latar', label: 'Workspace', ket: 'The page area in the middle' },
  { k: 'kartu', label: 'Panels', ket: 'Cards, side panels and the Output panel' },
  { k: 'sisi', label: 'Headers', ket: 'Title bar and navigation' },
]

const TEKS = {
  gelap: { muted: '#9c9c9c', error: '#ec6c6c', warning: '#deac4c', success: '#5fbe8c', info: '#80a8e4' },
  terang: { muted: '#5c5c5c', error: '#b3261e', warning: '#8a5300', success: '#17692b', info: '#0b57a4' },
}

function campur(a: string, b: string, bagian: number) {
  const r = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const x = r(a), y = r(b)
  return '#' + x.map((v, i) => Math.round(v * (1 - bagian) + y[i] * bagian).toString(16).padStart(2, '0')).join('')
}

export function auditKontras(t: Tema) {
  const sah = (h: string) => /^#[0-9a-f]{6}$/i.test(h)
  if (![t.aksen, t.latar, t.kartu, t.sisi].every(sah)) return []
  const permukaan = [t.latar, t.kartu, t.sisi]
  const terburuk = (w: string) => Math.min(...permukaan.map((p) => kontras(w, p)))
  const T = t.mode === 'terang' ? TEKS.terang : TEKS.gelap
  const diAtasAksen = luminans(t.aksen) > 0.4 ? '#080808' : '#ffffff'
  const cek = [
    { nama: 'Secondary text', rasio: terburuk(T.muted), batas: 4.5 },
    { nama: 'Error text', rasio: terburuk(T.error), batas: 4.5 },
    { nama: 'Warning text', rasio: terburuk(T.warning), batas: 4.5 },
    { nama: 'Success text', rasio: terburuk(T.success), batas: 4.5 },
    { nama: 'Links', rasio: terburuk(T.info), batas: 4.5 },
    { nama: 'Focus ring and selection marks', rasio: terburuk(t.aksen), batas: 3 },
    { nama: 'Text on selected rows and primary buttons', rasio: kontras(diAtasAksen, t.aksen), batas: 4.5 },
    { nama: 'Disabled text', rasio: Math.min(...permukaan.map((p) => kontras(campur(T.muted, p, 0.45), p))), batas: 2 },
  ]
  return cek.filter((c) => c.rasio < c.batas)
}

const samaTema = (a: Tema, b: Tema) => a.mode === b.mode && KOLOM.every((c) => a[c.k].toLowerCase() === b[c.k].toLowerCase())

export function Tampilan() {
  const settings = useSettingsStore()
  const update = useSettingsStore((s) => s.update)
  const [bahasa, setBahasa] = useState(bacaBahasa)
  const [density, setDensity] = useState(bacaDensity)

  const [t, setT] = useState<Tema>(() => normalkan(null))
  const [muat, setMuat] = useState<'memuat' | 'siap'>('memuat')
  const [simpanan, setSimpanan] = useState<'idle' | 'menyimpan' | 'tersimpan' | 'galat'>('idle')
  const [kustom, setKustom] = useState(false)
  const tersimpan = useRef<Tema>(normalkan(null))
  const urutanSimpan = useRef(0)

  useEffect(() => {
    let hidup = true
    api.tema().then(
      (x) => { if (!hidup) return; const isi = normalkan(x); tersimpan.current = isi; setT(isi) },
      () => {  },
    ).finally(() => hidup && setMuat('siap'))
    return () => { hidup = false }
  }, [])
  useEffect(() => { pasangTema(t) }, [t])

  useEffect(() => {
    if (muat !== 'siap' || samaTema(t, tersimpan.current)) return
    const h = window.setTimeout(async () => {
      const id = ++urutanSimpan.current
      setSimpanan('menyimpan')
      try {
        await api.setTema(t)
        if (id !== urutanSimpan.current) return
        tersimpan.current = t
        setSimpanan('tersimpan')
      } catch (e) {
        if (id !== urutanSimpan.current) return
        setSimpanan('galat')
        beriTahu(`Couldn’t save theme: ${e}`, 'salah')
      }
    }, 450)
    return () => window.clearTimeout(h)
  }, [t, muat])
  useEffect(() => {
    if (simpanan !== 'tersimpan') return
    const h = window.setTimeout(() => setSimpanan('idle'), 1800)
    return () => window.clearTimeout(h)
  }, [simpanan])

  const buruk = auditKontras(t)
  const daftarPreset = presetMode(t.mode)
  const presetAktif = daftarPreset.find((p) => samaTema(t, { mode: t.mode, ...p }))
  const siap = muat === 'siap'

  const gantiMode = (m: Tema['mode']) => {
    if (m === t.mode) return
    const dasar = bawaanMode(m)
    const aksen = kontras(t.aksen, dasar.latar) >= 3 ? t.aksen : dasar.aksen
    setT({ mode: m, ...dasar, aksen })
  }

  return (
    <div className="divide-y divide-line-subtle/70 border-y border-line-subtle/70">
      <Baris judul="Language" ket="Documentation and some Windows messages stay in English.">
        <SegmentedControl
          ariaLabel="Language"
          value={bahasa}
          onValueChange={(k) => setBahasa(pasangBahasa(k))}
          options={BAHASA.map((b: { kode: string; nama: string }) => ({ value: b.kode, label: <span lang={b.kode} translate="no">{b.nama}</span> }))}
        />
      </Baris>

      <Baris judul="Density" ket="Compact fits more accounts on screen.">
        <SegmentedControl
          ariaLabel="Density"
          value={density as string}
          onValueChange={(v) => setDensity(pasangDensity(v))}
          options={(DENSITY as string[]).map((d) => ({ value: d, label: d === 'compact' ? 'Compact' : 'Comfortable' }))}
        />
      </Baris>

      <Baris judul="Mode" kanan={simpanan === 'menyimpan' ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : simpanan === 'tersimpan' ? <span className="inline-flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" />Saved</span> : !siap ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</span> : null}>
        <SegmentedControl
          ariaLabel="Mode"
          value={t.mode || 'gelap'}
          onValueChange={(v) => gantiMode(v === 'terang' ? 'terang' : '')}
          options={[{ value: 'gelap', label: 'Dark', title: 'Light text on dark surfaces. Easier on the eyes at night.' }, { value: 'terang', label: 'Light', title: 'Dark text on light surfaces. Easier to read in a bright room.' }]}
          disabled={!siap}
        />
      </Baris>

      <div className="py-4">
        <p className="mb-3 text-sm font-medium text-content-primary">Theme</p>
        <div role="radiogroup" aria-label="Theme" className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', !siap && 'pointer-events-none opacity-50')}>
          {daftarPreset.map((p) => {
            const ya = presetAktif?.nama === p.nama
            return (
              <button
                key={p.nama}
                type="button"
                role="radio"
                aria-checked={ya}
                onClick={() => setT({ mode: t.mode, aksen: p.aksen, latar: p.latar, kartu: p.kartu, sisi: p.sisi })}
                className={cn(
                  'group rounded-lg border p-1.5 text-left transition-[border-color,box-shadow,transform] duration-300 ease-pegas hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                  ya ? 'border-content-primary/80 shadow-[0_0_0_1px_rgb(var(--text-primary)/0.35)]' : 'border-line-subtle hover:border-line-strong',
                )}
                style={{ background: p.sisi }}
              >
                <span className="flex h-10 overflow-hidden rounded-md" aria-hidden>
                  <span className="flex-1" style={{ background: p.latar }} />
                  <span className="flex-1" style={{ background: p.kartu }} />
                  <span className="flex-1 rounded-md" style={{ background: p.aksen }} />
                </span>
                <span className="mt-1.5 flex items-center gap-1 px-0.5 text-xs font-semibold" style={{ color: luminans(p.sisi) > 0.4 ? '#161616' : '#f0f0f0' }}>
                  <span translate="no">{p.nama}</span>
                  {ya ? <Check className="ml-auto h-3.5 w-3.5" aria-hidden /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="md" variant="secondary" aria-expanded={kustom} onClick={() => setKustom((k) => !k)} disabled={!siap}>
            Customize colours<ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300 ease-pegas', kustom && 'rotate-180')} />
          </Button>
          <Button size="md" variant="secondary" onClick={() => setT({ mode: t.mode, ...bawaanMode(t.mode) })} disabled={!siap}>
            <RotateCcw className="h-4 w-4" />Reset to default
          </Button>
          {simpanan === 'galat' ? <Status nada="error">Couldn’t save theme</Status> : null}
        </div>
        <div className={cn('grid transition-[grid-template-rows,opacity] duration-500 ease-pegas', kustom ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')} {...(kustom ? {} : { inert: '' })}>
          <div className="min-h-0 overflow-hidden">
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {KOLOM.map((c) => (
                <label key={c.k} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line-subtle px-3 py-2 hover:border-line-strong">
                  <span className="relative h-7 w-9 shrink-0 overflow-hidden rounded border border-line-strong" style={{ background: t[c.k] }}>
                    <input type="color" value={t[c.k]} onChange={(e) => setT({ ...t, [c.k]: e.target.value })} aria-label={c.label} disabled={!siap} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-content-primary">{c.label}</span>
                    <span className="block text-xs text-content-muted">{c.ket}</span>
                  </span>
                  <span className="tnum font-mono text-xs text-content-secondary" translate="no">{t[c.k]}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-content-muted">Text colours are fixed so everything stays readable.</p>
          </div>
        </div>
        {buruk.length ? (
          <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg bg-warning/[0.08] px-3 py-2.5 text-sm leading-relaxed text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Hard to read with these colours: {buruk.map((c) => `${c.nama} ${c.rasio.toFixed(1)}:1 (needs ${c.batas}:1)`).join(', ')}.{' '}
              {t.mode === 'terang' ? 'Pick a lighter background or a different selection colour.' : 'Pick a darker background or a different selection colour.'}
            </span>
          </div>
        ) : null}
      </div>

      <Baris judul="Interface size" ket="Scales all text and controls.">
        <SegmentedControl
          ariaLabel="Interface size"
          value={settings.fontSize}
          onValueChange={(v) => update({ fontSize: v })}
          options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Default' }, { value: 'lg', label: 'Large' }]}
        />
      </Baris>
      <Baris judul="Animations" ket="Sidebar, page and panel motion. Turn off to reduce motion.">
        <Switch checked={settings.animations} onCheckedChange={(v) => update({ animations: v })} aria-label="Animations" />
      </Baris>

      <div className="py-4">
        <p className="text-sm font-medium text-content-primary">Account list columns</p>
        <p className="mt-0.5 text-sm text-content-muted">Shown when there is room. Account and Status are always shown; on a narrow window the others drop out from the right.</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {ACCOUNT_COLUMNS.filter((c) => !c.locked).map((c) => {
            const aktif = settings.visibleColumns.includes(c.key)
            return (
              <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-content-primary">
                <Checkbox
                  checked={aktif}
                  onCheckedChange={(v) => update({ visibleColumns: ACCOUNT_COLUMNS.filter((x) => x.locked || (x.key === c.key ? v === true : settings.visibleColumns.includes(x.key))).map((x) => x.key) })}
                />
                {c.label}
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Baris({ judul, ket, kanan, children }: { judul: string; ket?: string; kanan?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3.5">
      <div className="min-w-[12rem] flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-content-primary">{judul}{kanan ? <span className="text-xs font-normal text-content-muted">{kanan}</span> : null}</p>
        {ket ? <p className="mt-0.5 text-sm text-content-muted">{ket}</p> : null}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}
