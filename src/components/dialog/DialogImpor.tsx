import { useRef, useState } from 'react'
import { AlertTriangle, Ban, CheckCircle2, Clock, Eye, EyeOff, FileJson, Loader2, ShieldCheck, Square, Upload, XCircle } from '@/components/ikon'
import { api, dibatalkan, tidur } from '@/api/api'
import type { BarisImpor, HasilImpor } from '@/api/types'
import { labelPreset } from '@/lib/folder'
import { muat, tutupDialog, useCam } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { JudulDialog } from './kecil'

type Status = HasilImpor['status'] | 'jalan' | 'antre'
interface Baris { label: string; status: Status; pesan: string }

const LABEL: Record<Status, [React.ReactNode, string, string]> = {
  ditambah: [<CheckCircle2 key="a" className="h-3.5 w-3.5" />, 'Added', 'text-success'],
  diperbarui: [<CheckCircle2 key="r" className="h-3.5 w-3.5" />, 'Renewed', 'text-success'],
  gagal: [<XCircle key="f" className="h-3.5 w-3.5" />, 'Failed', 'text-error'],
  dilewati: [<Ban key="s" className="h-3.5 w-3.5" />, 'Skipped', 'text-content-muted'],
  jalan: [<Loader2 key="j" className="h-3.5 w-3.5 animate-spin" />, 'Checking…', 'text-info'],
  antre: [<Clock key="q" className="h-3.5 w-3.5" />, 'Waiting', 'text-content-muted'],
}

export function DialogImpor() {
  const folder = useCam((s) => s.folder)
  const filter = useCam((s) => s.filterFolder)
  const [teks, setTeks] = useState('')
  const [lihat, setLihat] = useState(false)
  const [folderId, setFolderId] = useState(folder.some((f) => f.id === filter) ? filter : '')
  const [baris, setBaris] = useState<Baris[] | null>(null)
  const [jalan, setJalan] = useState(false)
  const [galat, setGalat] = useState('')
  const [menyiapkan, setMenyiapkan] = useState(false)
  const henti = useRef(false)
  const kunci = jalan || menyiapkan

  const tutup = () => {
    if (kunci) return
    api.imporSelesai().catch(() => undefined)
    if (baris?.some((b) => b.status === 'ditambah' || b.status === 'diperbarui')) void muat()
    tutupDialog()
  }

  const jalankan = async (daftar: BarisImpor[]) => {
    const awal: Baris[] = daftar.map((d) => (d.lewati ? { label: d.label, status: 'dilewati', pesan: d.lewati } : { label: d.label, status: 'antre', pesan: '' }))
    setBaris(awal)
    setJalan(true)
    henti.current = false
    let pertama = true
    for (let i = 0; i < awal.length; i++) {
      if (awal[i].status !== 'antre') continue
      if (henti.current) break
      if (!pertama) await tidur(400)
      pertama = false
      setBaris((b) => b!.map((x, j) => (j === i ? { ...x, status: 'jalan' } : x)))
      let h: HasilImpor
      try {
        h = await api.imporJalankan(i, folderId || null)
      } catch (e) {
        h = { status: 'gagal', pesan: String(e) }
      }
      setBaris((b) => b!.map((x, j) => (j === i ? { ...x, status: h.status, pesan: h.pesan } : x)))
    }
    if (henti.current) setBaris((b) => b!.map((x) => (x.status === 'antre' ? { ...x, status: 'dilewati', pesan: 'Stopped before this line.' } : x)))
    setJalan(false)
    api.imporSelesai().catch(() => undefined)
  }

  const mulai = async (sumber: 'teks' | 'ram') => {
    setGalat('')
    setMenyiapkan(true)
    try {
      const daftar = sumber === 'ram' ? await api.imporSiapkanRam() : await api.imporSiapkanTeks(teks)
      setTeks('')
      setLihat(false)
      setMenyiapkan(false)
      await jalankan(daftar)
    } catch (e) {
      setMenyiapkan(false)
      if (!dibatalkan(e)) setGalat(String(e))
    }
  }

  const n = (s: Status) => (baris || []).filter((b) => b.status === s).length
  const ringkasan = baris
    ? [n('ditambah') && `${n('ditambah')} added`, n('diperbarui') && `${n('diperbarui')} renewed`, n('gagal') && `${n('gagal')} failed`, n('dilewati') && `${n('dilewati')} skipped`].filter(Boolean).join(', ') || 'Nothing imported'
    : ''
  const sedang = baris ? baris.filter((b) => b.status !== 'antre' && b.status !== 'jalan').length : 0

  return (
    <Dialog open onOpenChange={(o) => { if (!o) tutup() }}>
      <DialogContent size="lg" showClose={!kunci} onEscapeKeyDown={(e) => kunci && e.preventDefault()} onPointerDownOutside={(e) => kunci && e.preventDefault()}>
        <JudulDialog ikon={<Upload className="h-4 w-4" />} judul="Import accounts" />
        <DialogBody className="space-y-3">
          {!baris ? (
            <>
              {folder.length ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">Folder for new accounts</span>
                  <Select value={folderId} onValueChange={setFolderId} ariaLabel="Folder" className="w-full" options={[{ value: '', label: 'Ungrouped' }, ...folder.map((f) => ({ value: f.id, label: `${f.nama}${f.preset ? ` (${labelPreset(f.preset)})` : ''}`, data: true }))]} />
                </label>
              ) : null}
              <div className="flex items-center gap-2">
                <label htmlFor="impor-teks" className="min-w-0 flex-1 text-xs font-medium text-content-secondary">Cookies, one account per line</label>
                <button type="button" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-controls="impor-teks" aria-label={lihat ? 'Hide cookies' : 'Show cookies'} className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs text-content-secondary hover:bg-surface-2">
                  {lihat ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{lihat ? 'Hide' : 'Show'}
                </button>
              </div>
              <textarea
                id="impor-teks"
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder={'_|WARNING:-DO-NOT-SHARE-THIS…\nusername:password:_|WARNING:-DO-NOT-SHARE-THIS…'}
                style={lihat ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
                className={cn('h-32 w-full resize-none break-all rounded-md border bg-app/40 px-2.5 py-1.5 font-mono text-xs leading-5 text-content-primary placeholder:text-content-muted focus:outline-none', lihat ? 'border-warning/60' : 'border-line focus:border-accent/60')}
              />
              <p className="text-sm leading-relaxed text-content-muted">
                Plain cookies and <span className="text-content-primary">username:password:cookie</span> lines both work. Passwords are ignored and never stored. An account that is already in the list gets the new cookie; its settings stay.
              </p>
              <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
                <Button size="md" variant="secondary" onClick={() => void mulai('ram')} disabled={menyiapkan}><FileJson className="h-4 w-4" />Import Roblox Account Manager file…</Button>
                <span className="min-w-[12rem] flex-1 text-sm text-content-muted">Its AccountData.json, from this PC and Windows user. Alias and Description come along.</span>
              </div>
              {galat ? <p role="alert" className="flex gap-2 text-sm text-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{galat}</p> : null}
              <p className="flex gap-2 border-t border-line-subtle pt-3 text-sm text-content-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />Each cookie is checked with Roblox and stored encrypted with Windows DPAPI, like a single account.</p>
            </>
          ) : (
            <>
              <p role="status" className="text-sm text-content-primary">{jalan ? `Importing… ${sedang} of ${baris.length}` : `Done: ${ringkasan}.`}</p>
              <ul className="max-h-72 overflow-y-auto rounded-md border border-line-subtle" aria-label="Import results">
                {baris.map((b, i) => {
                  const [ikon, label, warna] = LABEL[b.status]
                  return (
                    <li key={i} className="flex items-start gap-2 border-b border-line-subtle px-2.5 py-1.5 text-xs last:border-b-0">
                      <span className="w-28 shrink-0 truncate text-content-muted">{b.label}</span>
                      <span className={cn('flex w-24 shrink-0 items-center gap-1', warna)}>{ikon}{label}</span>
                      <span className="min-w-0 flex-1 select-text break-words text-content-secondary">{b.pesan}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          {baris ? (
            <>
              {jalan ? <Button variant="ghost" size="md" onClick={() => { henti.current = true }}><Square className="h-3.5 w-3.5" />Stop</Button> : null}
              <Button variant="primary" size="md" onClick={tutup} disabled={jalan}>Done</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={tutup} disabled={menyiapkan}>Cancel</Button>
              <Button variant="primary" size="md" onClick={() => void mulai('teks')} disabled={menyiapkan || !teks.trim()}><Upload className="h-4 w-4" />Import</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
