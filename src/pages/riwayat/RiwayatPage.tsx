import { atributGame } from '@/utils/namaGame'
import { useEffect, useState } from 'react'
import { AlertTriangle, Crosshair, Gamepad2, History, Loader2, Play, Trash2 } from '@/components/ikon'
import { waktuRelatif } from '@/api/api'
import type { CatatanMasalah, Riwayat } from '@/api/types'
import { hapusMasalah, hapusRiwayat, muatRiwayat, pantauMasalah, pilihGame, useCam } from '@/stores/cam'
import { mainLagi } from '@/logic/luncur'
import { avatarTone, cn, initials } from '@/utils/cn'
import { useTabHalaman } from '@/components/shell/navigasi'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { useLebar, skalaRem } from '@/hooks/useLebar'
import { StatusLabel, type StatusTone } from '@/components/ui/Badge'

export function RiwayatPage() {
  const masalah = useCam((s) => s.masalah)
  const [tab] = useTabHalaman<'games' | 'disconnects'>('/history')
  useEffect(() => pantauMasalah(), [])
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div key={tab} className="min-h-0 flex-1 animate-halaman overflow-y-auto">{tab === 'games' ? <RiwayatGame /> : <RiwayatMasalah masalah={masalah} />}</div>
    </div>
  )
}

const JENIS: Record<string, [StatusTone, string]> = {
  putus: ['warning', 'Disconnected'],
  crash: ['error', 'Crashed'],
  macet: ['warning', 'Froze'],
  login: ['error', 'Sign-in problem'],
}

function RiwayatMasalah({ masalah }: { masalah: CatatanMasalah[] }) {
  const [ref, lebarPx] = useLebar<HTMLDivElement>()
  const px = lebarPx / skalaRem()
  const lebarPenuh = px === 0 || px >= 864
  if (!masalah.length) {
    return <EmptyState icon={AlertTriangle} title="No disconnects or crashes recorded" description="Clients launched by this app are watched; when one is disconnected, crashes or freezes, it is listed here with Roblox's reason." />
  }
  const jam = (t: number) => new Date(t * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const umur = (d: number) => (d >= 3600 ? `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m` : d >= 60 ? `${Math.floor(d / 60)}m` : `${d}s`)
  const template = '7.5rem minmax(7rem,0.8fr) 8.5rem minmax(12rem,2fr) 5rem 7.5rem'
  return (
    <div ref={ref}>
      <div className="flex items-center gap-2 border-b border-line-subtle px-5 py-2 text-sm text-content-muted">
        <span className="flex-1">{masalah.length} recorded, newest first (the last 200 are kept).</span>
        <Button size="sm" variant="danger" onClick={hapusMasalah}><Trash2 className="h-3.5 w-3.5" />Clear</Button>
      </div>
      <div role="table" aria-label="Disconnects and crashes" className="px-3">
        {lebarPenuh ? (
          <div role="row" className="grid gap-3 border-b border-line-subtle px-2 py-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
            <span>When</span><span>Account</span><span>What</span><span>Details</span><span title="How long the client had been running">Ran for</span><span />
          </div>
        ) : null}
        {masalah.map((m, i) => {
          const [tone, label] = JENIS[m.jenis] ?? ['warning', m.jenis]
          const main = m.jenis !== 'login' && m.place_id > 0 ? (
            <Button size="sm" variant="secondary" title={`Launch ${m.alias} into ${m.game_name || `Place ${m.place_id}`} again (a new server)`} aria-label={`Play again: ${m.alias}`} onClick={() => void mainLagi(m)}><Play className="h-3 w-3" />Play again</Button>
          ) : null
          const rincian = (
            <>
              {m.teks}
              {m.game_name || m.place_id ? <span className="text-content-muted"> · <span translate={atributGame(m.game_name)}>{m.game_name || `Place ${m.place_id}`}</span></span> : null}
              {m.rincian ? <span className="mt-0.5 block text-xs text-content-muted">{m.rincian}</span> : null}
            </>
          )
          if (!lebarPenuh) {
            return (
              <div key={i} role="row" className="flex items-start gap-3 border-b border-line-subtle/70 px-2 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <StatusLabel tone={tone}>{label}</StatusLabel>
                    <span className="min-w-0 font-medium text-content-primary" translate="no">{m.alias}</span>
                    <span className="tnum text-content-muted">{jam(m.at)} · ran {umur(m.umur_dtk || 0)}</span>
                  </div>
                  <p className="mt-1 min-w-0 select-text break-words text-content-secondary">{rincian}</p>
                </div>
                {main ? <span className="shrink-0">{main}</span> : null}
              </div>
            )
          }
          return (
            <div key={i} role="row" className="grid items-start gap-3 border-b border-line-subtle/70 px-2 py-2 text-sm" style={{ gridTemplateColumns: template }}>
              <span className="tnum text-content-muted">{jam(m.at)}</span>
              <span className="truncate text-content-primary" translate="no">{m.alias}</span>
              <StatusLabel tone={tone}>{label}</StatusLabel>
              <span className="min-w-0 select-text break-words text-content-secondary">{rincian}</span>
              <span className="tnum text-content-muted">{umur(m.umur_dtk || 0)}</span>
              <span className="text-right">{main}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RiwayatGame() {
  const [fokusBaris, setFokusBaris] = useState<number | null>(null)
  const [ref, lebarPx] = useLebar<HTMLDivElement>()
  const px = lebarPx / skalaRem()
  const adaPlace = px === 0 || px >= 704
  const adaPemain = px === 0 || px >= 544
  const riwayat = useCam((s) => s.riwayat)
  const status = useCam((s) => s.statusRiwayat)
  const placeTarget = useCam((s) => s.param.placeId)
  if (!riwayat.length && status === 'memuat') return <EmptyState icon={Loader2} title="Loading history…" />
  if (!riwayat.length && status === 'galat') {
    return <EmptyState icon={AlertTriangle} title="Couldn’t load history" description="The launch history file could not be read. Accounts and launching still work." action={<Button size="sm" variant="secondary" onClick={() => { useCam.setState({ statusRiwayat: 'memuat' }); void muatRiwayat() }}>Retry</Button>} />
  }
  if (!riwayat.length) return <EmptyState icon={History} title="No games played yet" description="Every game an account joins from this app is listed here, so it can be picked again in one click." />

  const groups: { place_id: number; game_name: string; icon_url: string; at: number; accounts: Riwayat[] }[] = []
  const index = new Map<number, (typeof groups)[number]>()
  for (const r of riwayat) {
    let g = index.get(r.place_id)
    if (!g) {
      g = { place_id: r.place_id, game_name: r.game_name, icon_url: r.icon_url, at: r.at, accounts: [] }
      index.set(r.place_id, g)
      groups.push(g)
    }
    g.accounts.push(r)
    if (r.at > g.at) g.at = r.at
  }
  const template = ['minmax(12rem,2fr)', adaPemain && 'minmax(10.5rem,1fr)', '7rem', adaPlace && '9.5rem'].filter(Boolean).join(' ')

  return (
    <div ref={ref}>
      <div className="flex items-center gap-2 border-b border-line-subtle px-5 py-2 text-sm text-content-muted">
        <span className="flex-1">{groups.length} {groups.length === 1 ? 'game' : 'games'}. Click one to make it the launch target.</span>
        <Button size="sm" variant="danger" onClick={hapusRiwayat}><Trash2 className="h-3.5 w-3.5" />Clear history</Button>
      </div>
      <div
        role="grid"
        aria-label="Launch history"
        className="px-3"
        onKeyDown={(e) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
          const baris = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-baris]')]
          const i = baris.indexOf(e.target as HTMLElement)
          if (i < 0) return
          e.preventDefault()
          const j = e.key === 'Home' ? 0 : e.key === 'End' ? baris.length - 1 : Math.max(0, Math.min(baris.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))
          baris[j]?.focus()
        }}
      >
        <div role="row" className="grid gap-3 border-b border-line-subtle px-2 py-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
          <span>Game</span>{adaPemain ? <span>Played by</span> : null}<span>Last played</span>{adaPlace ? <span>Place ID</span> : null}
        </div>
        {groups.map((g, gi) => {
          const sel = String(g.place_id) === String(placeTarget)
          const iSel = groups.findIndex((x) => String(x.place_id) === String(placeTarget))
          const tabStop = fokusBaris ?? (iSel >= 0 ? iSel : 0)
          const pakai = () => pilihGame(g)
          const unik = [...new Map(g.accounts.map((a) => [a.account_id, a])).values()]
          const namaPemain = unik.length === 1 ? unik[0].alias : `${unik.length} accounts`
          return (
            <div
              key={g.place_id}
              role="row"
              data-baris
              tabIndex={gi === tabStop ? 0 : -1}
              onFocus={() => setFokusBaris(gi)}
              aria-selected={sel}
              aria-label={`${g.game_name}, place ${g.place_id}${sel ? ', current launch target' : '. Press Enter to set as launch target'}`}
              onClick={pakai}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); pakai() } }}
              className={cn('group grid cursor-pointer items-center gap-3 border-b border-line-subtle/70 px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60', sel ? 'bg-accent/[0.14]' : 'hover:bg-surface-2/40')}
              style={{ gridTemplateColumns: template }}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {g.icon_url ? <img src={g.icon_url} alt="" className="h-9 w-9 shrink-0 rounded-md bg-surface-3" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3"><Gamepad2 className="h-4 w-4 text-content-muted" /></span>}
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-content-primary" translate={atributGame(g.game_name)} title={adaPlace ? undefined : `Place ${g.place_id}`}>{g.game_name}</span>
                  {sel ? (
                    <span className="flex items-center gap-1 text-xs text-accent"><Crosshair className="h-3.5 w-3.5 shrink-0" />Launch target</span>
                  ) : adaPemain ? null : (
                    <span className="block truncate text-xs text-content-muted" translate={unik.length === 1 ? 'no' : undefined}>{namaPemain}</span>
                  )}
                </span>
              </span>
              {adaPemain ? <span className="flex min-w-0 items-center gap-2">
                <span className="flex shrink-0 -space-x-1.5">
                  {unik.slice(0, 3).map((a) => {
                    const t = avatarTone(a.alias)
                    return a.avatar_url ? <img key={a.account_id} src={a.avatar_url} alt="" title={a.alias} className="h-7 w-7 rounded-full border-2 border-app bg-surface-3" /> : <span key={a.account_id} title={a.alias} className="grid h-7 w-7 place-items-center rounded-full border-2 border-app text-[0.6875rem] font-semibold" style={{ backgroundColor: t.bg, color: t.fg }}>{initials(a.alias)}</span>
                  })}
                </span>
                <span className="min-w-0 truncate text-content-secondary" translate={unik.length === 1 ? 'no' : undefined}>{namaPemain}</span>
              </span> : null}
              <span className="text-content-muted">{waktuRelatif(g.at)}</span>
              {adaPlace ? <span className="tnum font-mono text-xs text-content-muted">{g.place_id}</span> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
