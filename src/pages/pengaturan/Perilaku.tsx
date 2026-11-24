import { useEffect, useState } from 'react'
import { Keyboard, Loader2, Send, Trash2 } from '@/components/ikon'
import { api } from '@/api/api'
import type { AcaraDiscord, StatusDiscord, StatusHello, StatusTrim } from '@/api/types'
import { beriTahu } from '@/stores/cam'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/Button'
import { Checkbox, Switch } from '@/components/ui/Controls'
import { Select } from '@/components/ui/Select'
import { kelasInput } from '@/components/dialog/kecil'
import { cn } from '@/utils/cn'
import { Bagian, Baris, Isi, Status } from './bagian'

export function Umum() {
  const s = useSettingsStore()
  const update = useSettingsStore((x) => x.update)
  const setShortcutsOpen = useUIStore((x) => x.setShortcutsOpen)
  return (
    <div className="space-y-4">
      <Bagian judul="Startup" ket="CAM always opens on Accounts. Stored on this PC.">
        <Baris judul="Open the Output panel" ket="Show the message log at startup. Errors still show a badge when it is closed.">
          <Switch checked={s.consoleDefaultOpen} onCheckedChange={(v) => update({ consoleDefaultOpen: v })} aria-label="Open the Output panel at startup" />
        </Baris>
        <Baris judul="Navigation" ket="Remember: collapse automatically on a narrow window, otherwise keep your last choice.">
          <Select
            value={s.sidebarBehavior}
            onValueChange={(v) => update({ sidebarBehavior: v as typeof s.sidebarBehavior })}
            options={[{ value: 'remember', label: 'Remember' }, { value: 'expanded', label: 'Always expanded' }, { value: 'collapsed', label: 'Always collapsed' }]}
            ariaLabel="Navigation"
            className="w-[12rem]"
          />
        </Baris>
      </Bagian>
      <Bagian judul="Keyboard">
        <Baris judul="Keyboard shortcuts" ket="Ctrl+K searches accounts, pages and commands. Press ? anywhere to see every shortcut.">
          <Button size="md" variant="secondary" onClick={() => setShortcutsOpen(true)}><Keyboard className="h-4 w-4" />Show shortcuts</Button>
        </Baris>
      </Bagian>
    </div>
  )
}

function statusTrim(t: StatusTrim) {
  if (!t.jumlah) return 'On · nothing trimmed yet'
  const menit = Math.max(0, Math.round((Date.now() / 1000 - (t.terakhir || 0)) / 60))
  return `On · ${t.jumlah} trim${t.jumlah === 1 ? '' : 's'}, last ${menit < 1 ? 'just now' : `${menit} min ago`}`
}

export function Perilaku() {
  const [tray, setTray] = useState<boolean | null>(null)
  const [ringan, setRingan] = useState<boolean | null>(null)
  const [trim, setTrim] = useState<StatusTrim | null>(null)
  useEffect(() => {
    api.tutupKeTray().then((v) => setTray(!!v), () => setTray(false))
    api.grafisRingan().then((v) => setRingan(!!v), () => setRingan(false))
    let hidup = true
    const baca = () => api.trimLatar().then((v) => hidup && setTrim(v), () => {})
    baca()
    const h = window.setInterval(baca, 15000)
    return () => { hidup = false; window.clearInterval(h) }
  }, [])
  return (
    <div className="space-y-4">
      <Bagian judul="Launching">
        <Baris judul="Light graphics" ket="Launch clients with low graphics. FPS and RAM limits are not changed. Main and Full quality accounts keep their own Roblox graphics. Applies from the next launch.">
          <Switch
            checked={!!ringan}
            disabled={ringan === null}
            aria-label="Use low graphics for every launch"
            onCheckedChange={async (v) => {
              try {
                setRingan(await api.setGrafisRingan(v))
                beriTahu(v ? 'Light graphics is on from the next launch.' : 'Light graphics is off from the next launch.', 'benar')
              } catch (e) {
                beriTahu(String(e), 'salah')
              }
            }}
          />
        </Baris>
      </Bagian>

      <Bagian judul="Memory" kanan={trim?.aktif ? <span className="text-success">{statusTrim(trim)}</span> : trim ? 'Off' : null}>
        <Baris
          judul="Trim background clients"
          ket="Every 10 seconds, a background client using more than 768 MB of RAM has its working set trimmed, at most once every 2 minutes. Skipped: Main and Full quality accounts, the client in front, clients that are not responding, clients started less than 2 minutes ago, and clients already held by a resource saver RAM limit. Nothing is left behind to undo when CAM closes."
        >
          <Switch
            checked={!!trim?.aktif}
            disabled={!trim}
            data-trim-latar=""
            aria-label="Trim the memory of background clients"
            onCheckedChange={async (v) => {
              try {
                setTrim(await api.setTrimLatar(v))
                beriTahu(v ? 'Background clients over 768 MB are now trimmed.' : 'Background clients are no longer trimmed.', 'benar')
              } catch (e) {
                beriTahu(String(e), 'salah')
              }
            }}
          />
        </Baris>
        {trim?.aktif ? (
          <Isi>
            {trim.galat ? <Status nada="error">Last attempt failed: {trim.galat}</Status> : <Status>Measured on one game: a client without a RAM limit went from about 2.3 GB to about 0.5 GB on average, and its CPU did not rise while the game was quiet. Switching to a trimmed client can stutter for a moment while Windows brings its memory back.</Status>}
          </Isi>
        ) : null}
      </Bagian>

      <Bagian judul="Window">
        <Baris judul="Close button" ket="The tray icon is always there: click it to show the window; its menu launches folders and saved servers, closes clients, or quits.">
          <span className="text-sm text-content-muted">{tray === null ? '' : tray ? 'Hides to the tray' : 'Quits'}</span>
          <Switch
            checked={!!tray}
            disabled={tray === null}
            aria-label="Close button hides to the tray"
            onCheckedChange={async (v) => {
              try {
                setTray(await api.setTutupKeTray(v))
                beriTahu(v ? 'The close button now hides the window to the tray. Quit from the tray menu.' : 'The close button quits again.', 'benar')
              } catch (e) {
                beriTahu(String(e), 'salah')
              }
            }}
          />
        </Baris>
      </Bagian>
    </div>
  )
}

const ACARA_DISCORD: [keyof AcaraDiscord, string][] = [
  ['putus', 'Disconnects'],
  ['crash', 'Crashes, hangs, and auto-rejoin giving up'],
  ['login', 'Sign-in problems'],
  ['rejoin', 'Successful rejoins'],
  ['batch', 'A launch of several accounts finishing'],
]

export function Notifikasi() {
  const [st, setSt] = useState<StatusDiscord | null>(null)
  const [url, setUrl] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galatMuat, setGalatMuat] = useState('')
  useEffect(() => {
    api.discordStatus().then(setSt, (e) => setGalatMuat(String(e)))
  }, [])
  const jalan = async (fn: () => Promise<StatusDiscord | void>, pesan?: string) => {
    setSibuk(true)
    try {
      const h = await fn()
      if (h) setSt(h)
      if (pesan) beriTahu(pesan, 'benar')
      return true
    } catch (e) {
      beriTahu(`Discord: ${e}`, 'salah')
      return false
    } finally {
      setSibuk(false)
    }
  }
  return (
    <div className="space-y-4">
      <Bagian
        judul="Discord status"
        ket="Shows Chudai on your Discord profile: “Playing Roblox with Chudai” and how many clients are open while clients launched by CAM run, otherwise the tab you are on. No account names, games or cookies are shared. Needs the Discord app running on this PC."
        kanan={st ? (st.kehadiran ? <span className="text-success">On</span> : 'Off') : null}
      >
        <Baris judul="Show Chudai on Discord" ket="Discord updates the status within a few seconds.">
          <Switch checked={!!st?.kehadiran} disabled={!st || sibuk} onCheckedChange={(v) => void jalan(() => api.setDiscordKehadiran(v), v ? 'Discord status on.' : 'Discord status off.')} aria-label="Show Chudai on Discord" />
        </Baris>
      </Bagian>
      <Bagian
        judul="Discord"
        ket="Messages name accounts by their alias and never carry a cookie, ticket or launch link. Nothing is sent until a webhook is saved."
        kanan={st ? (st.terpasang ? <span className="text-success">On</span> : 'Off') : null}
      >
        {galatMuat ? <Isi><Status nada="error">Couldn’t read the Discord settings: {galatMuat}</Status></Isi> : null}
        {st?.terpasang ? (
          <Baris judul="Webhook" ket={<>Saved (webhook <span translate="no">{st.samaran}</span>). The URL is stored encrypted and never shown again.</>}>
            <Button size="md" variant="secondary" disabled={sibuk} onClick={() => void jalan(api.ujiDiscord, 'Test message sent to Discord.')}><Send className="h-4 w-4" />Send test</Button>
            <Button size="md" variant="danger" disabled={sibuk} onClick={() => void jalan(api.hapusDiscordWebhook, 'Discord webhook removed. No more notifications are sent.')}><Trash2 className="h-4 w-4" />Remove</Button>
          </Baris>
        ) : st ? (
          <Isi>
            <label htmlFor="discord-url" className="text-sm font-medium text-content-primary">Webhook URL</label>
            <p className="mt-0.5 text-sm text-content-muted">In Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.</p>
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                if (await jalan(() => api.setDiscordWebhook(url), 'Discord webhook saved. Use Send test to check it.')) setUrl('')
              }}
            >
              <input id="discord-url" type="password" className={cn(kelasInput, 'min-w-[16rem] flex-1')} placeholder="https://discord.com/api/webhooks/…" value={url} autoComplete="off" spellCheck={false} onChange={(e) => setUrl(e.target.value)} />
              <Button type="submit" size="md" variant="primary" disabled={!url.trim() || sibuk}>{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</Button>
            </form>
          </Isi>
        ) : !galatMuat ? (
          <Isi className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</Isi>
        ) : null}
        {st?.terpasang ? (
          <Isi>
            <p className="text-sm font-medium text-content-primary">Send a message for</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ACARA_DISCORD.map(([k, label]) => (
                <label key={k} className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-content-primary', sibuk && 'opacity-60')}>
                  <Checkbox checked={!!st.acara?.[k]} disabled={sibuk} aria-label={`Discord: ${label}`} onCheckedChange={(v) => void jalan(() => api.setDiscordAcara({ ...st.acara, [k]: v === true }))} />
                  {label}
                </label>
              ))}
            </div>
          </Isi>
        ) : null}
      </Bagian>
    </div>
  )
}

export function Keamanan() {
  const [h, setH] = useState<StatusHello | null>(null)
  const [sibuk, setSibuk] = useState(false)
  useEffect(() => {
    let hidup = true
    api.helloStatus().then((x) => hidup && setH(x), (e) => hidup && setH({ aktif: false, tersedia: false, alasan: String(e) }))
    return () => { hidup = false }
  }, [])
  const ubah = async (v: boolean) => {
    setSibuk(true)
    try {
      const aktif = await api.setHelloSalin(v)
      setH((x) => (x ? { ...x, aktif } : x))
      beriTahu(aktif ? 'Windows Hello is now required before copying a cookie.' : 'Copying a cookie no longer asks for Windows Hello.', 'benar')
    } catch (e) {
      if (String(e) !== '__BATAL__') beriTahu(String(e), 'salah')
    } finally {
      setSibuk(false)
    }
  }
  const bisa = !!h && (h.tersedia || h.aktif) && !sibuk
  return (
    <div className="space-y-4">
      <Bagian judul="Cookies">
        <Baris judul="Windows Hello" ket="Ask for your face, fingerprint or Windows PIN before Copy cookie puts a cookie on the clipboard.">
          <span className="text-sm text-content-muted">{!h ? 'Checking…' : sibuk ? 'Waiting for Windows Hello…' : h.aktif ? 'Required' : 'Not required'}</span>
          <Switch checked={!!h?.aktif} disabled={!bisa} onCheckedChange={(v) => void ubah(v)} aria-label="Require Windows Hello before copying a cookie" />
        </Baris>
        {h && !h.tersedia ? <Isi><Status>{h.alasan || "Windows Hello isn't available on this PC."}</Status></Isi> : null}
      </Bagian>
      <Bagian judul="How accounts are stored">
        <Isi>
          Cookies are encrypted with Windows DPAPI, so the accounts file only opens for this Windows user on this PC. To move accounts to another PC, use a password-protected backup.
        </Isi>
      </Bagian>
    </div>
  )
}
