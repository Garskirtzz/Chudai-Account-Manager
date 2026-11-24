import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardPaste, FileInput, Flag, Loader2, Plus, RotateCcw, Save, Trash2 } from '@/components/ikon'
import { api } from '@/api/api'
import type { FflagView, NilaiFlag } from '@/api/types'
import { beriTahu } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { BilahAksi } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { JudulDialog } from '@/components/dialog/kecil'

const KUNCI_FPS = 'DFIntTaskSchedulerTargetFps'
const NAMA_SAH = /^[A-Za-z][A-Za-z0-9_]{0,199}$/

function jenis(nama: string) {
  const m = /^(?:D|S)?F(Flag|Int|String|Log)/.exec(nama)
  return m ? ({ Flag: 'Bool', Int: 'Int', String: 'String', Log: 'Log' } as Record<string, string>)[m[1]] : ''
}
function urai(nama: string, teks: string): NilaiFlag {
  const t = String(teks).trim()
  const j = jenis(nama)
  if (j === 'Bool' && /^(true|false)$/i.test(t)) return t.toLowerCase() === 'true'
  if ((j === 'Int' || j === 'Log') && /^-?\d+$/.test(t)) return Number(t)
  return String(teks)
}
const tampil = (v: NilaiFlag) => (typeof v === 'string' ? v : JSON.stringify(v))
const kelasInput = 'h-8 w-full rounded-md border border-line bg-app/40 px-2.5 font-mono text-xs text-content-primary placeholder:font-sans placeholder:text-sm placeholder:text-content-muted focus:border-accent/60 focus:outline-none'

export function FlagPage() {
  const [kelola, setKelola] = useState<Record<string, NilaiFlag>>({})
  const [awal, setAwal] = useState<Record<string, NilaiFlag>>({})
  const [berkas, setBerkas] = useState('')
  const [diBerkas, setDiBerkas] = useState<Record<string, NilaiFlag>>({})
  const [nama, setNama] = useState('')
  const [nilai, setNilai] = useState('')
  const [tempel, setTempel] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>('memuat')
  const [galat, setGalat] = useState('')

  const pakai = useCallback((v: FflagView) => {
    setKelola(v.kelola || {})
    setAwal(v.kelola || {})
    setBerkas(v.berkas || '')
    setDiBerkas(v.di_berkas || {})
  }, [])
  const muat = useCallback(() => {
    setStatus('memuat')
    api.fflagDaftar().then((v) => { pakai(v); setStatus('siap') }, (e) => { setStatus('galat'); setGalat(String(e)); beriTahu(`Couldn’t load Fast Flags: ${e}`, 'salah') })
  }, [pakai])
  useEffect(() => { muat() }, [muat])

  const kunci = useMemo(() => Object.keys(kelola).sort((a, b) => a.localeCompare(b)), [kelola])
  const berubah = JSON.stringify(kelola) !== JSON.stringify(awal)
  const asing = Object.keys(diBerkas).filter((k) => !(k in kelola))

  const tambah = () => {
    const n = nama.trim()
    if (!NAMA_SAH.test(n)) return beriTahu(`"${n}" is not a valid flag name. Use letters, digits and _ only.`, 'salah')
    setKelola({ ...kelola, [n]: urai(n, nilai) })
    setNama('')
    setNilai('')
  }
  const hapus = (k: string) => {
    const b = { ...kelola }
    delete b[k]
    setKelola(b)
  }
  const imporBerkas = () => {
    const b = { ...kelola }
    for (const k of asing) b[k] = diBerkas[k]
    setKelola(b)
    beriTahu(`Imported ${asing.length} flag${asing.length === 1 ? '' : 's'} from the client's file. Save to keep them.`)
  }
  const imporTempel = () => {
    let obj: unknown
    try {
      obj = JSON.parse(tempel || '')
    } catch (e) {
      return beriTahu(`That is not valid JSON: ${(e as Error).message}`, 'salah')
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return beriTahu('Paste a JSON object, like {"FFlagExample": "True"}.', 'salah')
    const buruk = Object.keys(obj).filter((k) => !NAMA_SAH.test(k))
    if (buruk.length) return beriTahu(`Not a valid flag name: ${buruk.slice(0, 3).join(', ')}`, 'salah')
    setKelola({ ...kelola, ...(obj as Record<string, NilaiFlag>) })
    setTempel(null)
    beriTahu(`Added ${Object.keys(obj).length} flags. Save to keep them.`)
  }
  const simpan = async () => {
    setSibuk(true)
    try {
      pakai(await api.fflagSimpan(kelola))
      beriTahu('Fast flags saved and written to the Roblox client.', 'benar')
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      setSibuk(false)
    }
  }
  const template = 'minmax(14rem,1.6fr) minmax(8rem,1fr) 4.5rem 2.5rem'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BilahAksi>
            <Button size="md" variant="ghost" onClick={imporBerkas} disabled={!asing.length} title="Take over flags that are already in the client's ClientAppSettings.json"><FileInput className="h-4 w-4" />Import from client{asing.length ? ` (${asing.length})` : ''}</Button>
            <Button size="md" variant="ghost" onClick={() => setTempel('')}><ClipboardPaste className="h-4 w-4" />Paste JSON…</Button>
            <Button size="md" variant="ghost" onClick={() => setKelola(awal)} disabled={!berubah}><RotateCcw className="h-4 w-4" />Revert</Button>
            <Button size="md" variant="primary" onClick={() => void simpan()} disabled={!berubah || sibuk || status !== 'siap'}><Save className="h-4 w-4" />Save</Button>
      </BilahAksi>
      <p className="shrink-0 select-text break-all border-b border-line-subtle px-5 py-2 font-mono text-xs text-content-muted">{berkas || 'No Roblox client found'}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[72rem] p-5">
          {status === 'memuat' ? <EmptyState icon={Loader2} title="Loading Fast Flags…" compact /> : null}
          {status === 'galat' ? <EmptyState icon={AlertTriangle} title="Couldn’t load Fast Flags" description={galat} action={<Button size="sm" variant="secondary" onClick={muat}>Retry</Button>} compact /> : null}
          <div role="table" aria-label="Fast flags" className="overflow-hidden rounded-lg border border-line-subtle">
            <div role="row" className="grid gap-3 border-b border-line-subtle bg-surface-1/50 px-3 py-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
              <span>Flag</span><span>Value</span><span>Type</span><span />
            </div>
            {kunci.map((k) => {
              const j = jenis(k)
              return (
                <div key={k} role="row" className="grid items-center gap-3 border-b border-line-subtle/70 px-3 py-1.5 text-sm hover:bg-surface-2/30" style={{ gridTemplateColumns: template }}>
                  <span className="min-w-0 break-all font-mono text-xs text-content-primary" title={k}>
                    {k}
                    {k === KUNCI_FPS ? <span className="ml-2 font-sans text-warning" title="An account's own FPS limit overrides this value">per-account FPS wins</span> : null}
                  </span>
                  <input className={kelasInput} value={tampil(kelola[k])} onChange={(e) => setKelola({ ...kelola, [k]: urai(k, e.target.value) })} aria-label={`Value of ${k}`} spellCheck={false} />
                  <span className={cn('text-sm', j ? 'text-content-muted' : 'text-warning')}>
                    {j || <span className="inline-flex items-center gap-1" title="Roblox flag names start with FFlag, FInt, FString or FLog (optionally D or S first)"><AlertTriangle className="h-3.5 w-3.5" />?</span>}
                  </span>
                  <button type="button" aria-label={`Remove ${k}`} title={`Remove ${k}`} onClick={() => hapus(k)} className="flex h-8 w-8 items-center justify-center rounded text-content-muted hover:bg-surface-2 hover:text-error"><Trash2 className="h-4 w-4" /></button>
                </div>
              )
            })}
            <div role="row" className="grid items-center gap-3 bg-surface-1/40 px-3 py-2" style={{ gridTemplateColumns: template }}>
              <input className={kelasInput} value={nama} onChange={(e) => setNama(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') tambah() }} placeholder="New flag, e.g. FFlagDebugGraphicsPreferD3D11" aria-label="New flag name" spellCheck={false} />
              <input className={kelasInput} value={nilai} onChange={(e) => setNilai(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') tambah() }} placeholder="Value" aria-label="New flag value" spellCheck={false} />
              <Button size="sm" variant="secondary" className="col-span-2" onClick={tambah} disabled={!nama.trim()}><Plus className="h-3.5 w-3.5" />Add</Button>
            </div>
          </div>
          {status === 'siap' && !kunci.length ? <EmptyState icon={Flag} title="No flags yet" description="Add one above, paste a JSON block, or import the flags already in the client's file." compact /> : null}
          <p className="mt-4 text-sm leading-relaxed text-content-muted">
            Flags are written to the selected client's ClientAppSettings.json when you save, and again right before every launch, so they follow you to any Roblox version you pick. Flags from other tools in that file are left alone. Roblox now ignores most flags that are not on its allow-list, and a flag can change how the client behaves, so add only flags you know.
          </p>
        </div>
      </div>

      <Dialog open={tempel !== null} onOpenChange={(o) => { if (!o) setTempel(null) }}>
        <DialogContent size="md">
          <JudulDialog ikon={<ClipboardPaste className="h-4 w-4" />} judul="Paste flags as JSON" />
          <DialogBody className="space-y-2">
            <textarea value={tempel || ''} onChange={(e) => setTempel(e.target.value)} spellCheck={false} placeholder={'{\n  "FFlagExample": "True",\n  "DFIntExample": 10\n}'} className="h-48 w-full resize-none rounded-md border border-line bg-app/40 px-2.5 py-1.5 font-mono text-xs leading-5 text-content-primary placeholder:text-content-muted focus:border-accent/60 focus:outline-none" />
            <p className="text-sm text-content-muted">Flags with the same name replace the ones in the list. Nothing is written until you press Save.</p>
          </DialogBody>
          <DialogFooter>
            <Button size="md" variant="ghost" onClick={() => setTempel(null)}>Cancel</Button>
            <Button size="md" variant="primary" onClick={imporTempel} disabled={!tempel?.trim()}>Add flags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
