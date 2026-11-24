import { useEffect, useRef, useState } from 'react'
import { Check, FolderCog, FolderPlus, Gamepad2, Loader2, Monitor, Users } from '@/components/ikon'
import { api, FPS_SAVER, samarkan } from '@/api/api'
import type { Akun, CalonIkuti, Folder, PresetHemat } from '@/api/types'
import { IKON_FOLDER, IkonFolder, UKURAN_KECIL, WARNA_FOLDER, labelKecil } from '@/lib/folder'
import { imporProfilFolder, pilihTeman, simpanFolder, tutupDialog, useCam } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Controls'
import { StatusLabel } from '@/components/ui/Badge'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { JudulDialog, kelasInput } from './kecil'

const RAM = [
  { v: 0, l: 'Off' },
  { v: 1024, l: '1024 MB' },
  { v: 512, l: '512 MB (recommended)' },
  { v: 256, l: '256 MB' },
  { v: 128, l: '128 MB (less RAM, more CPU)' },
]
const PRESET_AWAL: PresetHemat = { hemat: true, fps: 10, ram_mb: 512, minimize: false, auto_rejoin: false, anti_afk: false, mulai_kecil: 0 }

export function DialogFolder({ folder, pindahkan = [] }: { folder: Folder | null; pindahkan?: string[] }) {
  const akun = useCam((s) => s.akun)
  const [nama, setNama] = useState(folder?.nama || '')
  const [warna, setWarna] = useState(folder?.warna || '')
  const [ikon, setIkon] = useState(folder?.ikon || '')
  const [pakaiPreset, setPakaiPreset] = useState(!!folder?.preset)
  const [preset, setPreset] = useState<PresetHemat>(folder?.preset || PRESET_AWAL)
  const [sibuk, setSibuk] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const jumlah = folder ? akun.filter((a) => a.folder_id === folder.id).length : 0

  useEffect(() => {
    const t = setTimeout(() => { ref.current?.focus(); ref.current?.select() }, 60)
    return () => clearTimeout(t)
  }, [])

  const simpan = async () => {
    if (!nama.trim() || sibuk) return
    setSibuk(true)
    const ok = await simpanFolder({ ...(folder || {}), nama: nama.trim(), warna, ikon, preset: pakaiPreset ? preset : null } as Folder, folder ? [] : pindahkan)
    setSibuk(false)
    if (ok) tutupDialog()
  }
  const ubah = (k: keyof PresetHemat, v: number | boolean) => setPreset((p) => ({ ...p, [k]: v }))
  const baris = (label: string, isi: React.ReactNode) => (
    <>
      <span className="text-sm text-content-muted">{label}</span>
      <div className="flex min-h-8 items-center text-sm text-content-primary">{isi}</div>
    </>
  )
  const cek = (k: 'hemat' | 'minimize' | 'auto_rejoin' | 'anti_afk', label: string, on: string, off = 'Off') => (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox className="h-5 w-5" checked={!!preset[k]} onCheckedChange={(v) => ubah(k, v === true)} aria-label={label} />
      {preset[k] ? on : off}
    </label>
  )

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !sibuk) tutupDialog() }}>
      <DialogContent size="md">
        <JudulDialog ikon={folder ? <FolderCog className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />} judul={folder ? 'Edit folder' : 'New folder'} />
        <DialogBody className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-content-secondary">Name</span>
            <span className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-app/40" aria-hidden><IkonFolder f={{ warna, ikon }} size={18} /></span>
              <input ref={ref} value={nama} maxLength={40} onChange={(e) => setNama(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void simpan() }} placeholder="e.g. Farming, Boosting" className={kelasInput} />
            </span>
          </label>
          <div>
            <p className="mb-1 text-xs font-medium text-content-secondary" id="folder-warna">Color</p>
            <div role="radiogroup" aria-labelledby="folder-warna" className="flex flex-wrap gap-1.5">
              {WARNA_FOLDER.map((w) => (
                <button key={w.kunci || 'bawaan'} type="button" role="radio" aria-checked={warna === w.kunci} aria-label={w.label} title={w.label} onClick={() => setWarna(w.kunci)} className={cn('grid h-8 w-8 place-items-center rounded-md border', warna === w.kunci ? 'border-content-primary' : 'border-line hover:border-line-strong')}>
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-surface-3" style={w.hex ? { background: w.hex } : undefined}>
                    {warna === w.kunci ? <Check className={cn('h-2.5 w-2.5', w.hex ? 'text-white' : 'text-content-primary')} /> : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-content-secondary" id="folder-ikon">Icon</p>
            <div role="radiogroup" aria-labelledby="folder-ikon" className="flex flex-wrap gap-1.5">
              {IKON_FOLDER.map((i) => (
                <button key={i.kunci || 'folder'} type="button" role="radio" aria-checked={ikon === i.kunci} aria-label={i.label} title={i.label} onClick={() => setIkon(i.kunci)} className={cn('grid h-8 w-8 place-items-center rounded-md border', ikon === i.kunci ? 'border-content-primary bg-surface-3' : 'border-line hover:border-line-strong')}>
                  <IkonFolder f={{ warna, ikon: i.kunci }} size={15} />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-content-primary">
              <Checkbox className="h-5 w-5" checked={pakaiPreset} onCheckedChange={(v) => setPakaiPreset(v === true)} aria-label="Resource saver preset" />
              Resource saver preset
            </label>
            <p className="mt-1 text-sm leading-relaxed text-content-muted">Applied to every account in this folder{folder && jumlah ? ` (${jumlah} now)` : ''} and to accounts moved in later. Accounts can still be changed one by one.</p>
            {pakaiPreset ? (
              <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1">
                {baris('Resource saver', cek('hemat', 'Preset: resource saver on', 'On'))}
                {preset.hemat ? (
                  <>
                    {baris('FPS', <Select value={String(preset.fps || 10)} onValueChange={(v) => ubah('fps', Number(v))} ariaLabel="Preset: FPS" labelLain={(v) => `${v} FPS`} options={FPS_SAVER.map((f) => ({ value: String(f), label: `${f} FPS` }))} />)}
                    {baris('RAM limit', <Select value={String(preset.ram_mb || 0)} onValueChange={(v) => ubah('ram_mb', Number(v))} ariaLabel="Preset: RAM limit" labelLain={(v) => `${v} MB`} options={RAM.map((r) => ({ value: String(r.v), label: r.l }))} />)}
                    {baris('Minimize', cek('minimize', 'Preset: minimize after joining', 'After joining'))}
                  </>
                ) : null}
                {baris('Auto-rejoin', cek('auto_rejoin', 'Preset: auto-rejoin', 'On'))}
                {baris('Anti-AFK', cek('anti_afk', 'Preset: anti-AFK', 'On'))}
                {baris('Start tiny', <Select value={String(preset.mulai_kecil || 0)} onValueChange={(v) => ubah('mulai_kecil', Number(v))} ariaLabel="Preset: start tiny" labelLain={(v) => labelKecil(Number(v))} options={[{ value: '0', label: 'Off' }, ...UKURAN_KECIL.map((w) => ({ value: String(w), label: labelKecil(w) }))]} />)}
              </div>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          {!folder ? (
            <Button variant="ghost" size="md" className="mr-auto" title="Add folders from a .camprofile file someone shared: name, color, icon and saver preset. No accounts are in it." onClick={async () => { if (await imporProfilFolder()) tutupDialog() }}>Import profile…</Button>
          ) : null}
          <Button variant="ghost" size="md" onClick={tutupDialog}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => void simpan()} disabled={!nama.trim() || sibuk}>{folder ? 'Save' : 'Create folder'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DialogIkuti({ akun }: { akun: Akun }) {
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const [daftar, setDaftar] = useState<CalonIkuti[] | null>(null)
  const [galat, setGalat] = useState('')
  useEffect(() => {
    let hidup = true
    api.calonIkuti(akun.id).then(
      (d) => { if (hidup) setDaftar(Array.isArray(d) ? d : []) },
      (e) => { if (hidup) { setGalat(String(e)); setDaftar([]) } },
    )
    return () => { hidup = false }
  }, [akun])
  const diGame = (c: CalonIkuti) => c.status === 'InGame'
  return (
    <Dialog open onOpenChange={(o) => { if (!o) tutupDialog() }}>
      <DialogContent size="md">
        <JudulDialog ikon={<Users className="h-4 w-4" />} judul="Join a friend" sub={`Online friends of ${akun.alias}, and your accounts in a game`} />
        <DialogBody>
          {daftar === null ? (
            <p role="status" className="flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Asking Roblox…</p>
          ) : (
            <>
              {galat ? <p role="alert" className="mb-2 text-sm text-error">{galat}</p> : null}
              {!daftar.length && !galat ? <p className="text-sm text-content-muted">No friends online, and none of your accounts launched by this app is in a game.</p> : null}
              {daftar.length ? (
                <ul className="max-h-80 overflow-y-auto rounded-md border border-line-subtle" aria-label="People to join">
                  {daftar.map((c) => (
                    <li key={`${c.akun_cam ? 'a' : 't'}${c.user_id}`} className="flex items-center gap-2 border-b border-line-subtle px-3 py-2 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-content-primary">
                          {c.display_name && c.display_name !== c.username ? <span translate="no">{c.display_name} </span> : ''}
                          <span className="text-content-muted" translate="no">@{c.akun_cam && sembunyi ? samarkan(c.username) : c.username}</span>
                          {c.akun_cam ? <span className="ml-1.5 text-xs text-info">your account</span> : null}
                        </p>
                        <StatusLabel tone={diGame(c) ? 'success' : 'muted'} className="text-xs">
                          {diGame(c) ? (c.lokasi ? <span translate="no">{c.lokasi}</span> : 'In a game') : c.status === 'InStudio' ? 'In Studio' : 'Online, not in a game'}
                        </StatusLabel>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => pilihTeman(c)} disabled={!diGame(c)} title={diGame(c) ? (c.akun_cam ? 'Set this exact server as the launch target' : 'Follow this player') : 'Not in a game'}>
                        {c.akun_cam ? <Monitor className="h-3.5 w-3.5" /> : <Gamepad2 className="h-3.5 w-3.5" />}Join
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="md" onClick={tutupDialog}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
