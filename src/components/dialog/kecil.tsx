import { useEffect, useState } from 'react'
import { Gauge, Pencil } from '@/components/ikon'
import type { Akun } from '@/api/types'
import { simpanAlias, simpanFps, tutupDialog, useCam } from '@/stores/cam'
import { samarkan } from '@/api/api'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

export const kelasInput = 'h-9 w-full rounded-md border border-line bg-app/40 px-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-accent/60 focus:outline-none'

export function JudulDialog({ ikon, judul, sub }: { ikon: React.ReactNode; judul: string; sub?: string }) {
  return (
    <DialogHeader>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-content-secondary">{ikon}</span>
        <div className="min-w-0">
          <DialogTitle>{judul}</DialogTitle>
          {sub ? <DialogDescription className="text-sm" translate="no">{sub}</DialogDescription> : null}
        </div>
      </div>
    </DialogHeader>
  )
}

export function DialogAlias({ a }: { a: Akun }) {
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const [nama, setNama] = useState(a.alias)
  const ok = nama.trim().length > 0
  const simpan = () => {
    if (!ok) return
    tutupDialog()
    void simpanAlias(a, nama.trim())
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) tutupDialog() }}>
      <DialogContent size="sm">
        <JudulDialog ikon={<Pencil className="h-4 w-4" />} judul="Rename this account" />
        <DialogBody className="space-y-2">
          <input autoFocus onFocus={(e) => e.currentTarget.select()} value={nama} onChange={(e) => setNama(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') simpan() }} placeholder={a.username || 'display name'} aria-label="Alias" className={kelasInput} maxLength={60} />
          <p className="text-sm text-content-muted">Only the name shown inside this app. The Roblox username <span translate="no">@{sembunyi ? samarkan(a.username) : a.username}</span> does not change.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="md" onClick={tutupDialog}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!ok} onClick={simpan}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const PRESET_FPS = [0, 10, 30, 60, 120, 144, 240]

export function DialogFps({ a }: { a: Akun }) {
  const [fps, setFps] = useState(a.fps_cap || 0)
  useEffect(() => setFps(a.fps_cap || 0), [a.fps_cap])
  const simpan = () => {
    tutupDialog()
    void simpanFps(a, fps)
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) tutupDialog() }}>
      <DialogContent size="sm">
        <JudulDialog ikon={<Gauge className="h-4 w-4" />} judul="FPS limit" sub={a.alias} />
        <DialogBody className="space-y-3">
          <div role="radiogroup" aria-label="Presets" className="flex flex-wrap gap-1">
            {PRESET_FPS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={fps === n} onClick={() => setFps(n)} className={cn('h-8 rounded-md border px-2.5 text-sm', fps === n ? 'border-accent bg-accent text-accent-fg' : 'border-line text-content-secondary hover:bg-surface-2')}>
                {n === 0 ? 'Default' : n}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-content-secondary">Custom value (10 to 1000, 0 = Roblox default)</span>
            <input type="number" min={0} max={1000} value={fps} onChange={(e) => { const v = Math.round(Number(e.target.value)); setFps(Number.isFinite(v) && v > 0 ? v : 0) }} onKeyDown={(e) => { if (e.key === 'Enter') simpan() }} className={kelasInput} />
          </label>
          <p className="text-sm leading-relaxed text-content-muted">CAM writes the limit to ClientAppSettings.json just before this account launches. Two clients starting at the same moment can end up sharing one value. Resource saver uses its own FPS while it is on.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="md" onClick={tutupDialog}>Cancel</Button>
          <Button variant="primary" size="md" onClick={simpan}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
