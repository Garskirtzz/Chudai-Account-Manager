import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Bookmark, BookmarkCheck, CheckCircle2, ChevronDown, Clock, Gamepad2, Loader2, Lock, Server, Users, XCircle } from '@/components/ikon'
import type { ServerTersimpan } from '@/api/types'
import { bukaDialog, pakaiServerTersimpan, setParam, simpanServerSekarang, useCam, type Antrean, type StatusItem } from '@/stores/cam'
import { batalkanSisa, pilihGagal } from '@/logic/luncur'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { PemilihGame } from '@/components/akun/PemilihGame'

export function jenisServer(s: Pick<ServerTersimpan, 'link_code' | 'job_id'>) {
  if (s.link_code) return { ikon: Lock, teks: 'Private server' }
  if (s.job_id) return { ikon: Server, teks: `Server ${s.job_id.slice(0, 8)}` }
  return { ikon: Gamepad2, teks: 'Any server' }
}

export function Bagian({ judul, kanan, children }: { judul: string; kanan?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line-subtle px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-content-secondary">{judul}</h3>
        {kanan}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

export function Isian({ label, hint, title, children, redup, aktif }: { label: string; hint?: string; title?: string; children: ReactNode; redup?: boolean; aktif?: boolean }) {
  return (
    <label className={cn('block', redup && 'opacity-50')} title={title}>
      <span className={cn('mb-1 block text-xs font-medium', aktif ? 'text-content-primary' : 'text-content-secondary')}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs leading-snug text-content-muted">{hint}</span> : null}
    </label>
  )
}

const kelasInput = 'h-8 w-full rounded-md border border-line bg-app/40 px-2.5 text-sm text-content-primary placeholder:text-content-muted focus:border-accent/60 focus:outline-none disabled:opacity-50'

export function TabLuncur() {
  const navigate = useNavigate()
  const param = useCam((s) => s.param)
  const kunciServer = useCam((s) => s.kunciServer)
  const serverTersimpan = useCam((s) => s.serverTersimpan)
  const akun = useCam((s) => s.akun)
  const dipilih = useCam((s) => s.dipilih)
  const fokusId = useCam((s) => s.fokusId)
  const antrean = useCam((s) => s.antrean)
  const statusLuncur = useCam((s) => s.statusLuncur)
  const gagalTerakhir = useCam((s) => s.gagalTerakhir).filter((id) => akun.some((a) => a.id === id))
  const [tersimpan, setTersimpan] = useState(false)

  const terpilih = akun.filter((a) => dipilih.includes(a.id))
  const n = terpilih.length
  const bisaSimpan = !!(param.placeId || param.linkCode)
  const ikutiAktif = !!param.ikuti.trim()
  const jedaBerlaku = n >= 2
  const serverBebas = !ikutiAktif && !param.jobId.trim() && !param.linkCode.trim()
  const diabaikan = 'Ignored while Follow player is active.'

  const simpan = async () => {
    if (await simpanServerSekarang()) {
      setTersimpan(true)
      window.setTimeout(() => setTersimpan(false), 2000)
    }
  }
  const temanDari = () => akun.find((a) => a.id === fokusId) || terpilih[0] || akun[0]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Bagian
          judul="Launch target"
          kanan={
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-content-secondary hover:bg-surface-2 hover:text-content-primary">
                    Saved <span className="tnum text-content-muted">{serverTersimpan.length}</span><ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[18rem]">
                  {serverTersimpan.length ? (
                    serverTersimpan.map((s) => {
                      const j = jenisServer(s)
                      return (
                        <DropdownMenuItem key={s.id} icon={<j.ikon className="h-3.5 w-3.5" />} onSelect={() => pakaiServerTersimpan(s)}>
                          <span className="truncate" translate="no">{s.nama}</span>
                        </DropdownMenuItem>
                      )
                    })
                  ) : (
                    <p className="px-2 py-2 text-xs leading-relaxed text-content-muted">No saved servers yet. Fill in the launch target, then click the bookmark button.</p>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/servers')}>Manage saved servers…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={() => void simpan()}
                disabled={!bisaSimpan}
                aria-label="Save this launch target"
                title={tersimpan ? 'Saved' : bisaSimpan ? 'Save this launch target' : 'Pick a game or paste a private server link to save'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-2 hover:text-content-primary disabled:opacity-40"
              >
                {tersimpan ? <BookmarkCheck className="h-4 w-4 text-success" /> : <Bookmark className="h-4 w-4" />}
              </button>
            </div>
          }
        >
          <Isian label="Game" redup={ikutiAktif} title={ikutiAktif ? diabaikan : undefined}>
            <PemilihGame
              key={kunciServer}
              nilai={param.placeId}
              nama={param.gameName}
              ikon={param.gameIcon}
              onPilih={(placeId, meta) => setParam({ placeId, gameName: meta?.name ?? '', gameIcon: meta?.icon ?? '', ...(!placeId ? { jobId: '' } : placeId !== param.placeId ? { jobId: '', linkCode: '' } : {}) })}
            />
          </Isian>
          <Isian label="Job ID" redup={ikutiAktif} title={ikutiAktif ? diabaikan : 'Join one specific public server. Pick one on the Servers page.'}>
            <input className={kelasInput} value={param.jobId} onChange={(e) => setParam({ jobId: e.target.value.trim() })} placeholder="Any server" spellCheck={false} />
          </Isian>
          <Isian label="Private server" hint="VIP link, share link, or access code." redup={ikutiAktif} title={ikutiAktif ? diabaikan : 'VIP link, roblox.com/share link, or accessCode=<code> for an invited account.'}>
            <input className={kelasInput} value={param.linkCode} onChange={(e) => setParam({ linkCode: e.target.value })} placeholder="None" spellCheck={false} />
          </Isian>
          <Isian label="Follow player" aktif={ikutiAktif} title="Join whichever server this player is in. Overrides game, Job ID, and private server.">
            <div className="flex gap-1.5">
              <input className={cn(kelasInput, ikutiAktif && 'border-accent/60')} value={param.ikuti} onChange={(e) => setParam({ ikuti: e.target.value })} placeholder="Username" spellCheck={false} />
              <button type="button" onClick={() => { const a = temanDari(); if (a) bukaDialog({ jenis: 'ikuti', akun: a }) }} disabled={!akun.length} aria-label="Join a friend" title="Join a friend" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-content-secondary hover:bg-surface-2 hover:text-content-primary disabled:opacity-40">
                <Users className="h-4 w-4" />
              </button>
            </div>
          </Isian>
          {ikutiAktif ? <p className="rounded-md border border-warning/25 bg-warning/[0.07] px-2.5 py-1.5 text-xs text-content-secondary">Follow player overrides game and server settings.</p> : null}
        </Bagian>

        <Bagian judul="Launch behavior">
          <div className="grid grid-cols-2 gap-2.5">
            <Isian label="Delay (s)" hint="Used only when launching multiple accounts." title={jedaBerlaku ? 'Counted after the previous client has joined.' : 'Has no effect with fewer than two accounts selected.'}>
              <input type="number" min={0} max={60} disabled={!jedaBerlaku} className={kelasInput} value={param.jeda} onChange={(e) => setParam({ jeda: e.target.value })} />
            </Isian>
            <Isian label="FPS limit" hint="This launch only. Empty = each account's setting." title="For this launch only, instead of each account's FPS and resource saver FPS. Auto-rejoin keeps it.">
              <input type="number" min={5} max={1000} className={kelasInput} value={param.fps} onChange={(e) => setParam({ fps: e.target.value })} placeholder="Account setting" />
            </Isian>
          </div>
          <Isian
            label="Server"
            title={!serverBebas ? 'Ignored: the launch target already names one server.' : param.sama === 'sepi' ? 'Every account joins its own public server, the one with the fewest players first.' : param.sama && !jedaBerlaku ? 'All in one server needs two or more accounts selected.' : 'Which public server each account joins.'}
          >
            <Select
              value={param.sama || 'off'}
              onValueChange={(v) => setParam({ sama: v === 'off' ? '' : (v as 'pilih' | 'ikuti' | 'sepi') })}
              disabled={!serverBebas}
              ariaLabel="Server"
              options={[
                { value: 'off', label: 'Roblox picks' },
                { value: 'sepi', label: 'Emptiest server for each' },
                { value: 'pilih', label: 'All in one: room for all' },
                { value: 'ikuti', label: 'All in one: follow the first' },
              ]}
              size="sm"
              className="w-full"
            />
          </Isian>
        </Bagian>

        <Bagian judul="Selection" kanan={<span className="text-xs text-content-muted">{n ? `${n} selected` : 'none'}</span>}>
          {gagalTerakhir.length ? (
            <p className="text-sm text-content-secondary">
              {gagalTerakhir.length} account{gagalTerakhir.length === 1 ? '' : 's'} failed in the last launch.{' '}
              <button type="button" onClick={pilihGagal} className="font-medium text-content-primary underline underline-offset-2">Select {gagalTerakhir.length === 1 ? 'it' : 'them'}</button>
            </p>
          ) : null}
          {n ? (
            <>
              <p className="text-sm text-content-primary">Selected: {n} account{n === 1 ? '' : 's'}</p>
              <p className="line-clamp-2 text-sm text-content-muted" translate="no" title={terpilih.map((a) => a.alias).join(', ')}>{terpilih.map((a) => a.alias).join(', ')}</p>
            </>
          ) : (
            <p className="text-sm text-content-muted">Select accounts in the list to launch or run bulk actions.</p>
          )}
        </Bagian>
      </div>

      {antrean ? (
        <div className="shrink-0 border-t border-line bg-surface-1 p-3">
          <ProgresLuncur antrean={antrean} statusLuncur={statusLuncur} />
        </div>
      ) : null}
    </div>
  )
}

const LABEL: Record<StatusItem, [ReactNode, string, string]> = {
  queued: [<Clock key="q" className="h-3.5 w-3.5" />, 'Queued', 'text-content-muted'],
  starting: [<Loader2 key="s" className="h-3.5 w-3.5 animate-spin" />, 'Starting…', 'text-info'],
  joining: [<Loader2 key="j" className="h-3.5 w-3.5 animate-spin" />, 'Joining…', 'text-info'],
  launched: [<CheckCircle2 key="l" className="h-3.5 w-3.5" />, 'Launched', 'text-success'],
  failed: [<XCircle key="f" className="h-3.5 w-3.5" />, 'Failed', 'text-error'],
  cancelled: [<Ban key="c" className="h-3.5 w-3.5" />, 'Cancelled', 'text-content-muted'],
}

function ProgresLuncur({ antrean, statusLuncur }: { antrean: Antrean; statusLuncur: string }) {
  const { item, batal, fase } = antrean
  const total = item.length
  const n = (s: StatusItem) => item.filter((x) => x.status === s).length
  const selesai = n('launched') + n('failed') + n('cancelled')
  const posisi = Math.min(total, item.filter((x) => x.status !== 'queued' && x.status !== 'cancelled').length)
  const sisa = n('queued')
  const persiapan = fase === 'preparing'
  const labelBatal = sisa > 0 && !persiapan ? 'Cancel remaining' : persiapan ? 'Cancel' : 'Stop waiting'
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const kini = document.activeElement as HTMLButtonElement | null
    if (!kini || kini === document.body || kini.disabled || kini.closest('[data-luncur-utama]')) ref.current?.focus()
  }, [])

  return (
    <div ref={ref} tabIndex={-1} data-progres-luncur role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-2 outline-none">
      <p className="text-sm font-semibold text-content-primary">
        {persiapan ? `Preparing to launch ${total} account${total === 1 ? '' : 's'}` : `Launching ${Math.max(posisi, 1)} of ${total} account${total === 1 ? '' : 's'}`}
      </p>
      <p className="truncate text-xs text-info">{statusLuncur || 'Preparing…'}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] motion-reduce:transition-none" style={{ width: `${(selesai / total) * 100}%` }} />
      </div>
      <p className="tnum text-xs text-content-muted">{n('launched')} launched · {n('failed')} failed · {sisa} remaining</p>
      <ul className="max-h-[8.5rem] overflow-y-auto rounded-md border border-line-subtle bg-app/50">
        {item.map((x) => {
          const [ikon, label, warna] = LABEL[x.status] ?? LABEL.queued
          return (
            <li key={x.id} className="flex h-7 items-center gap-2 px-2.5 text-xs" title={x.pesan || undefined}>
              <span className="min-w-0 flex-1 truncate text-content-primary" translate="no">{x.alias}</span>
              <span className={cn('flex shrink-0 items-center gap-1', warna)}>{ikon}{label}</span>
            </li>
          )
        })}
      </ul>
      <Button variant="secondary" size="md" className="w-full" onClick={batalkanSisa} disabled={batal}>{batal ? 'Cancelling…' : labelBatal}</Button>
      {batal ? <p className="text-xs text-content-muted">Accounts that already started keep running. Nothing is closed.</p> : labelBatal === 'Stop waiting' ? <p className="text-xs text-content-muted">Stops waiting for the join. The Roblox client keeps running.</p> : null}
    </div>
  )
}

