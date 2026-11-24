import { useEffect, useState } from 'react'
import { AlertTriangle, Eye, EyeOff, Loader2, LogIn, ShieldCheck, Upload, UserPlus } from '@/components/ikon'
import { api } from '@/api/api'
import { labelPreset } from '@/lib/folder'
import { bukaDialog, loginBrowser, tambahAkun, tutupDialog, useCam } from '@/stores/cam'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Controls'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { JudulDialog, kelasInput } from './kecil'

export function DialogTambah() {
  const folder = useCam((s) => s.folder)
  const filter = useCam((s) => s.filterFolder)
  const [alias, setAlias] = useState('')
  const [folderId, setFolderId] = useState(folder.some((f) => f.id === filter) ? filter : '')
  const [cookie, setCookie] = useState('')
  const [lihat, setLihat] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [menunggu, setMenunggu] = useState(false)
  const [tanpaGpu, setTanpaGpu] = useState(false)
  const [terputus, setTerputus] = useState(false)
  const kunci = sibuk || menunggu

  useEffect(() => {
    let hidup = true
    api.loginTerputus().then((t) => { if (hidup) { setTerputus(!!t); if (t) setTanpaGpu(true) } }, () => undefined)
    return () => { hidup = false }
  }, [])

  const tutup = () => { if (!kunci) tutupDialog() }
  const login = async () => {
    setMenunggu(true)
    const ok = await loginBrowser(alias, folderId || null, tanpaGpu)
    setMenunggu(false)
    if (ok) tutupDialog()
  }
  const simpan = async () => {
    setSibuk(true)
    const ok = await tambahAkun(cookie, alias, folderId || null)
    setSibuk(false)
    if (ok) tutupDialog()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) tutup() }}>
      <DialogContent size="md" showClose={!kunci} onEscapeKeyDown={(e) => kunci && e.preventDefault()} onPointerDownOutside={(e) => kunci && e.preventDefault()}>
        <JudulDialog ikon={<UserPlus className="h-4 w-4" />} judul="Add Account" />
        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-content-secondary">Alias <span className="font-normal text-content-muted">(optional)</span></span>
              <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Leave empty to use the username" className={kelasInput} />
            </label>
            {folder.length ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-content-secondary">Folder</span>
                <Select value={folderId} onValueChange={setFolderId} ariaLabel="Folder" className="w-full" options={[{ value: '', label: 'Ungrouped' }, ...folder.map((f) => ({ value: f.id, label: `${f.nama}${f.preset ? ` (${labelPreset(f.preset)})` : ''}`, data: true }))]} />
              </label>
            ) : null}
          </div>

          <section className="rounded-lg border border-line bg-app/40 p-3.5" aria-label="Log in with browser">
            <p className="text-sm font-semibold text-content-primary">Log in with browser <span className="font-normal text-content-muted">(recommended)</span></p>
            <p className="mb-3 mt-1 text-sm leading-relaxed text-content-muted">
              Opens a private Roblox login window. The cookie is captured automatically and the window closes <span className="text-content-primary">without logging out</span>, so the session stays valid. Also renews the cookie of an account that is already in the list.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="md" onClick={() => void login()} disabled={kunci}>
                {menunggu ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}{menunggu ? 'Waiting for login…' : 'Log in with browser'}
              </Button>
              {menunggu ? <Button variant="ghost" size="md" onClick={() => void api.tutupLoginBrowser().catch(() => undefined)}>Cancel login</Button> : null}
            </div>
            {menunggu ? <p role="status" className="mt-2 text-sm text-content-muted">Sign in in the Roblox window. Do not press Log Out there — just finish signing in.</p> : null}
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm leading-snug text-content-muted">
              <Checkbox className="mt-0.5 h-5 w-5" checked={tanpaGpu} onCheckedChange={(v) => setTanpaGpu(v === true)} disabled={menunggu} aria-label="Sign-in window: software rendering" />
              <span><span className="text-content-primary">Sign-in window: software rendering</span> — draws the Roblox page without the graphics card. Use it if the PC freezes or restarts while signing in.</span>
            </label>
            {terputus ? (
              <p role="status" className="mt-2 flex items-start gap-1.5 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />The last sign-in did not finish, so software rendering is turned on.</p>
            ) : null}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-content-secondary">Or paste the cookie manually</p>
            <div className="flex items-center gap-2">
              <label htmlFor="tambah-cookie" className="min-w-0 flex-1 text-xs font-medium text-content-secondary">.ROBLOSECURITY cookie</label>
              <span className={lihat ? 'text-xs text-warning' : 'text-xs text-content-muted'} aria-live="polite">{lihat ? 'Cookie visible' : 'Cookie hidden'}</span>
              <button type="button" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-controls="tambah-cookie" className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs text-content-secondary hover:bg-surface-2">
                {lihat ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{lihat ? 'Hide cookie' : 'Show cookie'}
              </button>
            </div>
            <textarea
              id="tambah-cookie"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="_|WARNING:-DO-NOT-SHARE-THIS…"
              style={lihat ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
              className={`h-24 w-full resize-none break-all rounded-md border bg-app/40 px-2.5 py-1.5 font-mono text-xs leading-5 text-content-primary placeholder:text-content-muted focus:outline-none ${lihat ? 'border-warning/60' : 'border-line focus:border-accent/60'}`}
            />
            <p className="flex gap-2 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />This value is equivalent to a password and bypasses 2FA. Never share it.</p>
            <p className="text-sm leading-relaxed text-content-muted">
              F12 → Application → Cookies → <span className="text-content-primary">.roblox.com</span> → <span className="text-content-primary">.ROBLOSECURITY</span> → copy the value, including the <span className="text-content-primary">_|WARNING…|_</span> part.
            </p>
          </section>

          <div className="flex items-center gap-2 border-t border-line-subtle pt-3 text-sm text-content-muted">
            <span className="min-w-0 flex-1">Adding many accounts?</span>
            <Button size="sm" variant="secondary" disabled={kunci} onClick={() => bukaDialog({ jenis: 'impor' })}><Upload className="h-3.5 w-3.5" />Import many…</Button>
          </div>
          <p className="flex gap-2 text-sm leading-relaxed text-content-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />Encrypted with Windows DPAPI before it touches the disk — the stored file is useless on any other PC or Windows user.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="md" onClick={tutup} disabled={kunci}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => void simpan()} disabled={kunci || !cookie.trim()}>{sibuk ? 'Testing cookie…' : 'Add Account'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
