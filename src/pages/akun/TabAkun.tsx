import { atributGame } from '@/utils/namaGame'
import { useEffect, useState, type ReactNode } from 'react'
import { Copy, ExternalLink, Gauge, Globe, KeyRound, Pencil, RefreshCw, RotateCcw, Trash2, UserRound } from '@/components/ikon'
import type { Akun } from '@/api/types'
import { FPS_SAVER, samarkan, waktuRelatif } from '@/api/api'
import { IkonFolder, UKURAN_KECIL, folderAkun, labelKecil, labelPreset, sesuaiPreset } from '@/lib/folder'
import { statusAkun } from '@/lib/status-akun'
import {
  bukaDialog, bukaSitus, hapusAkun, perbaruiCookie, pindahAkun, salinCookie, salinTeks, segarkan, setArgumen, setCatatan, setFavorit,
  setKecil, setKualitasPenuh, setUtama, terapkanPresetFolder, ubahAfk, ubahHemat, ubahRejoin, useCam,
} from '@/stores/cam'
import { rejoinServer } from '@/logic/luncur'
import { cn } from '@/utils/cn'
import { Checkbox } from '@/components/ui/Controls'
import { Select } from '@/components/ui/Select'
import { StatusLabel } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { AvatarAkun, LencanaStatus, toneStatus } from '@/components/akun/bagian'
import { Bagian } from './TabLuncur'


function Prop({ nama, title, hint, children }: { nama: string; title?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,38%)_1fr] items-start gap-x-3 py-1" title={title}>
      <span className="pt-1.5 text-sm text-content-muted">{nama}</span>
      <div className="min-w-0">
        <div className="flex min-h-8 min-w-0 items-center gap-1.5 text-sm text-content-primary">{children}</div>
        {hint ? <p className="text-xs leading-snug text-content-muted">{hint}</p> : null}
      </div>
    </div>
  )
}

function Cek({ checked, onChange, label, teks }: { checked: boolean; onChange: (v: boolean) => void; label: string; teks: string }) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-2">
      <Checkbox className="h-5 w-5" checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={label} />
      <span>{teks}</span>
    </label>
  )
}

function Ikon({ title, onClick, children, disabled, bahaya }: { title: string; onClick: () => void; children: ReactNode; disabled?: boolean; bahaya?: boolean }) {
  return (
    <Tooltip content={title}>
      <button type="button" aria-label={title} onClick={onClick} disabled={disabled} className={cn('flex h-8 w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-2 disabled:opacity-40', bahaya ? 'hover:text-error' : 'hover:text-content-primary')}>
        {children}
      </button>
    </Tooltip>
  )
}

function KolomSimpan({ nilai, onSimpan, placeholder, label }: { nilai: string; onSimpan: (t: string) => Promise<void>; placeholder: string; label: string }) {
  const [teks, setTeks] = useState(nilai)
  useEffect(() => setTeks(nilai), [nilai])
  const simpan = async () => {
    if (teks === nilai) return
    try {
      await onSimpan(teks)
    } catch {
      setTeks(nilai)
    }
  }
  return (
    <input
      value={teks}
      onChange={(e) => setTeks(e.target.value)}
      onBlur={() => void simpan()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setTeks(nilai)
      }}
      placeholder={placeholder}
      aria-label={label}
      spellCheck={false}
      className="h-8 w-full rounded-md border border-line bg-app/40 px-2.5 font-mono text-xs text-content-primary placeholder:font-sans placeholder:text-sm placeholder:text-content-muted focus:border-accent/60 focus:outline-none"
    />
  )
}

function Catatan({ nilai, onSimpan }: { nilai: string; onSimpan: (t: string) => void }) {
  const [teks, setTeks] = useState(nilai)
  useEffect(() => setTeks(nilai), [nilai])
  const simpan = () => { if (teks !== nilai) onSimpan(teks) }
  return (
    <textarea
      value={teks}
      maxLength={2000}
      rows={3}
      onChange={(e) => setTeks(e.target.value)}
      onBlur={simpan}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() }
        if (e.key === 'Escape') { e.stopPropagation(); setTeks(nilai) }
      }}
      placeholder="Add a note…"
      aria-label="Notes"
      className="w-full resize-y rounded-md border border-line bg-app/40 px-2.5 py-1.5 text-sm text-content-primary placeholder:text-content-muted focus:border-accent/60 focus:outline-none"
    />
  )
}

export function TabAkun() {
  const akun = useCam((s) => s.akun)
  const fokusId = useCam((s) => s.fokusId)
  const folder = useCam((s) => s.folder)
  const pidAkun = useCam((s) => s.pidAkun)
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const sibuk = useCam((s) => !!s.statusLuncur || !!s.antrean)
  const sedangPerbarui = useCam((s) => s.sedangPerbarui)
  const segarkanSemuaJalan = useCam((s) => s.sedangSegarkan)
  const a = akun.find((x) => x.id === fokusId) ?? null

  if (!a) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <UserRound className="h-6 w-6 text-content-muted" />
        <p className="text-sm font-medium text-content-secondary">No account open</p>
        <p className="text-sm leading-relaxed text-content-muted">Click an account name to see its details. Clicking does not change the selection.</p>
      </div>
    )
  }

  const pid = pidAkun[a.id]
  const st = statusAkun(a)
  const fAkun = folder.find((f) => f.id === folderAkun(a, folder)) ?? null
  const srv = a.server_terakhir
  const satu = (x: Akun) => [x]

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-line-subtle px-4 py-4">
        <div className="flex items-start gap-3">
          <AvatarAkun a={a} size="lg" berjalan={!!pid?.length} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-content-primary" translate="no" title={a.alias}>{a.alias}</h2>
            <p className="truncate text-sm text-content-muted">
              {a.display_name && a.display_name !== a.username ? <span translate="no">{a.display_name} · </span> : null}
              <span>{a.premium ? 'Premium' : a.plus ? 'Plus' : 'Roblox account'}</span>
            </p>
          </div>
        </div>
        <div className="mt-3"><LencanaStatus a={a} /></div>
        <div className="mt-3 flex flex-wrap gap-0.5">
          <Ikon title="Rename" onClick={() => bukaDialog({ jenis: 'alias', akun: a })}><Pencil className="h-4 w-4" /></Ikon>
          <Ikon title={segarkanSemuaJalan ? 'Refresh all is checking every account' : 'Refresh data'} disabled={segarkanSemuaJalan} onClick={() => void segarkan(a.id)}><RefreshCw className="h-4 w-4" /></Ikon>
          <Ikon title={sedangPerbarui.includes(a.id) ? 'Refreshing cookie…' : 'Refresh cookie'} disabled={sedangPerbarui.includes(a.id)} onClick={() => void perbaruiCookie(a)}><KeyRound className="h-4 w-4" /></Ikon>
          <Ikon title="Copy cookie" onClick={() => salinCookie(a)}><Copy className="h-4 w-4" /></Ikon>
          <Ikon title="Open roblox.com as this account" onClick={() => void bukaSitus(a)}><Globe className="h-4 w-4" /></Ikon>
          <Ikon title="Open profile as this account" onClick={() => void bukaSitus(a, 'profil')}><ExternalLink className="h-4 w-4" /></Ikon>
          <Ikon title="FPS limit" onClick={() => bukaDialog({ jenis: 'fps', akun: a })}><Gauge className="h-4 w-4" /></Ikon>
          <Ikon title="Delete account" bahaya onClick={() => hapusAkun(a)}><Trash2 className="h-4 w-4" /></Ikon>
        </div>
      </div>

      <Bagian judul="Account">
        <div>
          <Prop nama="Username">
            <span className="min-w-0 flex-1 select-text truncate" translate={a.username ? 'no' : undefined}>{a.username ? `@${sembunyi ? samarkan(a.username) : a.username}` : 'Not refreshed'}</span>
            {a.username ? <Ikon title="Copy username" onClick={() => void salinTeks('Username', a.username)}><Copy className="h-3.5 w-3.5" /></Ikon> : null}
          </Prop>
          <Prop nama="User ID">
            <span className="min-w-0 flex-1 select-text truncate font-mono text-xs">{a.user_id || '—'}</span>
            {a.user_id ? <Ikon title="Copy user ID" onClick={() => void salinTeks('User ID', String(a.user_id))}><Copy className="h-3.5 w-3.5" /></Ikon> : null}
          </Prop>
          <Prop nama="Last launched"><span>{waktuRelatif(a.last_launched) || 'Never launched'}</span></Prop>
          <Prop nama="Last server" title={srv ? `${srv.game_name || `Place ${srv.place_id}`} · Job ID ${srv.job_id}` : 'Recorded when a client launched by this app joins a server.'}>
            {srv ? (
              <>
                <span className="min-w-0 flex-1"><span translate={atributGame(srv.game_name)}>{srv.game_name || `Place ${srv.place_id}`}</span> · {waktuRelatif(srv.at)}</span>
                <Ikon
                  title={srv.pribadi ? "A private server can't be joined by its Job ID. Launch it from Saved servers or its link." : pid?.length ? "This account's client is already open." : 'Rejoin this server'}
                  disabled={sibuk || srv.pribadi || !!pid?.length}
                  onClick={() => void rejoinServer(a)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Ikon>
              </>
            ) : (
              <span className="text-content-muted">None yet</span>
            )}
          </Prop>
          <Prop nama="Client">
            {pid?.length ? <StatusLabel tone="success"><span className="select-text">Running, PID {pid.join(', ')}</span></StatusLabel> : <span className="text-content-muted">Not running</span>}
          </Prop>
          <Prop nama="Favourite" title="Favourites show a star in the account list."><Cek checked={a.favorit} onChange={(v) => void setFavorit(a, v)} label="Favourite" teks={a.favorit ? 'Yes' : 'No'} /></Prop>
          <Prop nama="Main account" title="Your main account: left out of Select all, bulk resource saver and folder presets. You can still select it yourself."><Cek checked={a.utama} onChange={(v) => void setUtama(a, v)} label="Main account" teks={a.utama ? 'Yes' : 'No'} /></Prop>
          <Prop nama="Full quality" title="Folder presets don't lower this account's FPS, graphics, RAM limit or window size. You can still change them by hand."><Cek checked={a.kualitas_penuh} onChange={(v) => void setKualitasPenuh(a, v)} label="Full quality" teks={a.kualitas_penuh ? 'Yes' : 'No'} /></Prop>
          {folder.length ? (
            <Prop nama="Folder" title="Moving an account into a folder with a resource saver preset applies that preset.">
              <IkonFolder f={fAkun} size={16} />
              <Select value={fAkun?.id ?? ''} onValueChange={(v) => void pindahAkun([a.id], v || null)} ariaLabel="Folder" className="w-full" options={[{ value: '', label: 'Ungrouped' }, ...folder.map((f) => ({ value: f.id, label: f.nama, data: true }))]} />
            </Prop>
          ) : null}
          <Prop nama="Notes" title="Your own notes about this account. Saved when you leave the field; the account filter searches them too.">
            <Catatan nilai={a.catatan || ''} onSimpan={(t) => void setCatatan(a, t)} />
          </Prop>
        </div>
      </Bagian>

      <Bagian judul="Launch behavior">
        <div>
          <Prop nama="FPS limit">
            <span className="flex-1">{a.hemat ? `${a.hemat_fps || 10} FPS (saver)` : a.fps_cap ? `${a.fps_cap} FPS` : 'Roblox default'}</span>
            <Ikon title={a.hemat ? 'Change FPS limit (used when resource saver is off)' : 'Change FPS limit'} onClick={() => bukaDialog({ jenis: 'fps', akun: a })}><Pencil className="h-3.5 w-3.5" /></Ikon>
          </Prop>
          {fAkun?.preset ? (
            sesuaiPreset(a, fAkun.preset) ? (
              <p className="py-1 text-xs text-content-muted">Follows the <span translate="no">{fAkun.nama}</span> preset: {labelPreset(fAkun.preset)}.</p>
            ) : (
              <p className="flex flex-wrap items-center gap-x-2 rounded-md border border-warning/25 bg-warning/[0.07] px-2.5 py-1.5 text-xs text-content-secondary">
                <span>Differs from the <span translate="no">{fAkun.nama}</span> preset ({labelPreset(fAkun.preset)}).</span>
                <button type="button" className="font-medium text-content-primary underline underline-offset-2" onClick={() => void terapkanPresetFolder(fAkun)}>Apply folder preset</button>
              </p>
            )
          ) : null}
          <Prop nama="Resource saver" title="For AFK accounts: low FPS (10 by default), low graphics, low priority and a tiny window (320×180 when Start tiny is off). In an earlier test on Violence District against no saver, 10 FPS used about 66% less CPU and 69% less GPU." hint={`${a.hemat_fps || 10} FPS, low graphics, low priority. Applies from the next launch.`}>
            <Cek checked={a.hemat} onChange={(v) => void ubahHemat(satu(a), { hemat: v })} label="Resource saver (AFK)" teks={a.hemat ? 'On (AFK)' : 'Off'} />
          </Prop>
          {a.hemat ? (
            <>
              <Prop nama="Saver FPS" title="Frame rate while resource saver is on. It replaces the account's FPS limit until resource saver is turned off. Lower values use less CPU and GPU." hint="Replaces the FPS limit while saver is on.">
                <Select value={String(a.hemat_fps || 10)} onValueChange={(v) => void ubahHemat(satu(a), { hemat_fps: Number(v) })} ariaLabel="Saver FPS" labelLain={(v) => `${v} FPS`} className="w-full" options={FPS_SAVER.map((f) => ({ value: String(f), label: f === 10 ? '10 FPS (recommended)' : f === 3 ? '3 FPS (lowest CPU/GPU)' : `${f} FPS` }))} />
              </Prop>
              <Prop nama="Minimize" title="Minimizes the window after it joins: GPU drops to 0%, but private memory grows by about 750 MB and GPU memory doubles." hint="GPU 0%, but uses more memory.">
                <Cek checked={a.hemat_minimize} onChange={(v) => void ubahHemat(satu(a), { hemat_minimize: v })} label="Minimize window after joining" teks={a.hemat_minimize ? 'After joining' : 'Off'} />
              </Prop>
              <Prop nama="RAM limit" title="Limits the client's working set (the memory it holds in RAM), not its total private commit. Windows compresses the rest, which stays in RAM while memory is free; lower values can increase CPU use and page faults. Counting the compressed part, 512 MB still means about 1 GB of physical RAM." hint="Rest is compressed in RAM by Windows.">
                <Select value={String(a.hemat_ram_mb || 0)} onValueChange={(v) => void ubahHemat(satu(a), { hemat_ram_mb: Number(v) })} ariaLabel="RAM limit" labelLain={(v) => `${v} MB`} className="w-full" options={[{ value: '0', label: 'Off' }, { value: '1024', label: '1024 MB' }, { value: '512', label: '512 MB (recommended)' }, { value: '256', label: '256 MB' }, { value: '128', label: '128 MB (less RAM, more CPU)' }]} />
              </Prop>
            </>
          ) : null}
          <Prop nama="Auto-rejoin" title="When this account disconnects, crashes or stops responding, launch it again into the same game (with its resource saver). Not when you leave the game or close it yourself. At most 5 times in 15 minutes." hint="Applies now, also to a running client.">
            <Cek checked={a.auto_rejoin} onChange={(v) => void ubahRejoin(satu(a), v)} label="Auto-rejoin" teks={a.auto_rejoin ? 'On' : 'Off (allow disconnects)'} />
          </Prop>
          <Prop nama="Anti-AFK" title="While you're away from the PC (no input for 5 seconds), this client is brought to the front for a moment and gets one F13 key press every few minutes, so Roblox doesn't disconnect it for being idle (error 278). Skipped while a full-screen app or presentation runs. Interval in Account tools." hint="Applies now, also to a running client.">
            <Cek checked={a.anti_afk} onChange={(v) => void ubahAfk(satu(a), v)} label="Anti-AFK" teks={a.anti_afk ? 'On' : 'Off'} />
          </Prop>
          <Prop nama="Start tiny" title="After joining, the client window is made this small (below Roblox's 800×600 minimum). A small window draws far less: with resource saver on 3 clients, 320×180 cut GPU use by about two thirds with no extra RAM or CPU. Turning resource saver on sets 320×180 when this is off." hint="Applies from the next launch or rejoin.">
            <Select value={String(a.mulai_kecil || 0)} onValueChange={(v) => void setKecil(a, Number(v))} ariaLabel="Start tiny" labelLain={(v) => labelKecil(Number(v))} className="w-full" options={[{ value: '0', label: 'Off' }, ...UKURAN_KECIL.map((w) => ({ value: String(w), label: labelKecil(w) }))]} />
          </Prop>
          <Prop nama="Launch arguments" title="Extra arguments for RobloxPlayerBeta.exe, used instead of the default ones on the Client versions page. Leave empty to use the default.">
            <KolomSimpan key={a.id} nilai={a.argumen_luncur || ''} placeholder="Default" label="Launch arguments" onSimpan={(t) => setArgumen(a, t)} />
          </Prop>
        </div>
      </Bagian>

      <Bagian judul="Sign-in & security">
        <div>
          <Prop nama="Cookie" title="Whether Roblox accepts the stored sign-in (from the last Refresh).">
            <StatusLabel tone={a.last_error ? 'error' : 'success'}>{a.last_error ? 'Rejected' : 'Valid'}</StatusLabel>
          </Prop>
          <Prop nama="Account status" title="Bans, security locks, and other restrictions reported by Roblox (from the last Refresh).">
            {a.last_error && !st.dibatasi ? (
              <span className="text-content-muted">Unknown until the cookie works</span>
            ) : st.belum ? (
              <span className="text-content-muted">Refresh to check</span>
            ) : (
              <StatusLabel tone={toneStatus(st.jenis)}>{st.dibatasi ? st.teks : 'No restriction'}</StatusLabel>
            )}
          </Prop>
          {st.dibatasi ? <p className={cn('select-text break-words py-1 text-xs leading-relaxed', st.jenis === 'bad' ? 'text-error' : 'text-warning')}>{st.rincian}</p> : null}
          <Prop nama="Email" title="Whether the account's email address is verified (from the last Refresh).">
            {a.email_ok == null ? <span className="text-content-muted">—</span> : a.email_ok ? <StatusLabel tone="success">Verified</StatusLabel> : <StatusLabel tone="warning">Not verified</StatusLabel>}
          </Prop>
          <Prop nama="2-step" title="Roblox's 2-step verification methods turned on for this account (from the last Refresh).">
            {a.dua_langkah == null ? <span className="text-content-muted">—</span> : a.dua_langkah.length ? <StatusLabel tone="success">{a.dua_langkah.join(', ')}</StatusLabel> : <StatusLabel tone="warning">Off</StatusLabel>}
          </Prop>
          {a.last_error ? <p className="select-text break-words py-1 text-xs leading-relaxed text-error">{a.last_error}</p> : null}
        </div>
      </Bagian>
    </div>
  )
}
