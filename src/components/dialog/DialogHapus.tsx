import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from '@/components/ikon'
import { samarkan } from '@/api/api'
import { asalFokus, jalankanHapus, tutupDialog, useCam } from '@/stores/cam'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Controls'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { JudulDialog } from './kecil'

export function DialogHapus({ ids }: { ids: string[] }) {
  const akun = useCam((s) => s.akun)
  const pidAkun = useCam((s) => s.pidAkun)
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const [keluar, setKeluar] = useState(false)
  const [asal] = useState(asalFokus)
  const [sibuk, setSibuk] = useState(false)
  const daftar = ids.map((id) => akun.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
  const n = daftar.length
  const jalan = daftar.filter((a) => pidAkun[a.id]?.length)

  useEffect(() => { if (!n && !sibuk) tutupDialog() }, [n, sibuk])
  if (!n) return null

  const hapus = async () => {
    if (sibuk) return
    setSibuk(true)
    const ok = await jalankanHapus(daftar.map((a) => a.id), keluar)
    setSibuk(false)
    if (ok) tutupDialog()
  }
  const judul = n === 1 ? `Delete ${daftar[0].alias}?` : `Delete ${n} accounts?`

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !sibuk) tutupDialog() }}>
      <DialogContent
        size="md"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          const fokus = () => {
            if (asal?.isConnected && !(asal as HTMLButtonElement).disabled) asal.focus()
            else (document.querySelector<HTMLElement>('[data-baris]') ?? document.querySelector<HTMLElement>('[title="Add account (Ctrl+N)"]'))?.focus() 
          }
          fokus()
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const a = document.activeElement
            if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]')) return
            if (!a || a === document.body || !a.isConnected) fokus()
          }))
        }}
      >
        <JudulDialog ikon={<Trash2 className="h-4 w-4" />} judul={judul} />
        <DialogBody className="space-y-3">
          <p className="text-sm leading-relaxed text-content-secondary">
            {n === 1
              ? 'This account is removed from this app completely: cookie, settings, folder, notes, play history, disconnect and crash notes, client tracking and the cached 3D avatar. The Roblox account itself is not deleted.'
              : 'These accounts are removed from this app completely: cookie, settings, folder, notes, play history, disconnect and crash notes, client tracking and the cached 3D avatar. The Roblox accounts themselves are not deleted.'}
          </p>
          <ul aria-label="Accounts to delete" className="max-h-60 overflow-y-auto rounded-md border border-line-subtle">
            {daftar.map((a) => (
              <li key={a.id} className="flex items-center gap-2 border-b border-line-subtle px-3 py-1.5 text-sm last:border-b-0">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-content-primary" translate="no">{a.alias}</span>
                  {a.username ? <span className="ml-1.5 text-content-muted" translate="no">@{sembunyi ? samarkan(a.username) : a.username}</span> : null}
                </span>
                {a.utama ? <span className="shrink-0 rounded border border-line-subtle px-1.5 text-xs text-content-secondary">Main</span> : null}
                {pidAkun[a.id]?.length ? <span className="shrink-0 rounded border border-warning/30 px-1.5 text-xs text-warning">Running</span> : null}
              </li>
            ))}
          </ul>
          {jalan.length ? (
            <p className="flex gap-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {jalan.length === 1 ? 'One of them is running: its Roblox client is closed first.' : `${jalan.length} of them are running: their Roblox clients are closed first.`}
            </p>
          ) : null}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line-subtle p-2.5">
            <Checkbox className="mt-0.5 h-5 w-5" checked={keluar} onCheckedChange={(v) => setKeluar(v === true)} disabled={sibuk} aria-label="Also sign out on Roblox" />
            <span className="text-sm">
              <span className="font-medium text-content-primary">Also sign out on Roblox</span>
              <span className="mt-0.5 block leading-relaxed text-content-muted">Ends each saved session on Roblox, so the cookie stops working everywhere, also in backups you made. Leave it off to keep them usable, for example to restore from a backup later.</span>
            </span>
          </label>
          <p className="text-sm text-content-muted">Backup files you saved earlier are not changed.</p>
        </DialogBody>
        <DialogFooter>
          <Button data-batal variant="ghost" size="md" onClick={tutupDialog} disabled={sibuk}>Cancel</Button>
          <Button variant="danger" size="md" onClick={() => void hapus()} disabled={sibuk}>
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {sibuk ? 'Deleting…' : n === 1 ? 'Delete account' : `Delete ${n} accounts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
