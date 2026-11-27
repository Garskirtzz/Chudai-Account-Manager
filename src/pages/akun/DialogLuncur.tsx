import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Ban, Bookmark, BookmarkCheck, ChevronDown, ChevronRight, ChevronUp, CheckCircle2, Clock, Loader2, Lock, Plus, RotateCcw, Server, XCircle } from '@/components/ikon'
import type { Akun, SiapPribadi } from '@/api/types'
import { samarkan } from '@/api/api'
import { batalkanSisa, luncurkanDaftar, type ModeServer } from '@/logic/luncur'
import { setParam, simpanServerSekarang, useCam, type Antrean, type StatusItem } from '@/stores/cam'

type AntreanItem = Antrean['item'][number]
import { api } from '@/api/api'
import { bukaRencana, setModeGame, tutupRencana, useModeGame, useRencana } from '@/stores/rencanaLuncur'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { AvatarAkun } from '@/components/akun/bagian'
import { TombolLuncur } from './BilahPilihan'
import { ChipTujuan, IkonGame, PemilihTarget, adaTujuan, namaTujuan, sama, teksServer, tujuanAkun, tujuanUmum, type Lingkup, type Tujuan } from './PemilihTarget'

const MODE: Record<ModeServer, string> = { '': 'Roblox picks', sepi: 'Emptiest server for each', sendiri: 'Own private server for each', pilih: 'All together' }

interface Grup {
  kunci: string
  jenis: 'none' | 'follow' | 'game' | 'link'
  t: Tujuan
  akun: Akun[]
  tAkun: Record<string, Tujuan>
}

function kelompokkan(daftar: Akun[], umum: Tujuan): Grup[] {
  const m = new Map<string, Grup>()
  for (const a of daftar) {
    const t = tujuanAkun(a, umum)
    const [kunci, jenis]: [string, Grup['jenis']] = !adaTujuan(t) ? ['none', 'none'] : t.ikuti ? [`follow:${t.ikuti.toLowerCase()}`, 'follow'] : t.placeId ? [`game:${t.placeId}`, 'game'] : ['link', 'link']
    if (!m.has(kunci)) m.set(kunci, { kunci, jenis, t: jenis === 'game' ? { ...t, jobId: '', linkCode: '' } : t, akun: [], tAkun: {} })
    const g = m.get(kunci)!
    g.tAkun[a.id] = t
    if (!g.t.gameName && t.gameName) g.t = { ...g.t, gameName: t.gameName, gameIcon: t.gameIcon || g.t.gameIcon }
    g.akun.push(a)
  }
  const urut = (g: Grup) => (g.jenis === 'none' ? 0 : g.jenis === 'follow' ? 2 : 1)
  return [...m.values()].sort((x, y) => urut(x) - urut(y))
}

function AngkaLangkah({ label, nilai, onUbah, satuan, min = 0, maks = 60, title }: { label: string; nilai: string; onUbah: (v: string) => void; satuan?: string; min?: number; maks?: number; title: string }) {
  const angka = Number(nilai) || 0
  const ke = (v: number) => onUbah(String(Math.min(maks, Math.max(min, v))))
  return (
    <div title={title} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line pl-2.5 pr-1 text-xs text-content-muted transition-colors hover:border-line-strong focus-within:border-accent/60" data-angka-langkah>
      <label htmlFor="jeda-luncur">{label}</label>
      <input
        id="jeda-luncur"
        inputMode="numeric"
        maxLength={2}
        value={nilai}
        onChange={(e) => onUbah(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={() => ke(angka)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); ke(angka + (e.key === 'ArrowUp' ? 1 : -1)) }
        }}
        aria-label={label}
        role="spinbutton"
        aria-valuenow={angka}
        aria-valuemin={min}
        aria-valuemax={maks}
        className="tnum h-6 w-[2.2rem] rounded bg-surface-3 px-1.5 text-right text-content-primary outline-none"
      />
      {satuan ? <span className="-ml-0.5">{satuan}</span> : null}
      <span className="ml-0.5 flex h-6 flex-col overflow-hidden rounded border border-line-strong/70">
        <button type="button" tabIndex={-1} aria-label={`Increase ${label.toLowerCase()}`} disabled={angka >= maks} onClick={() => ke(angka + 1)} className="flex h-3 w-4 items-center justify-center text-content-muted transition-colors hover:bg-surface-3 hover:text-content-primary disabled:opacity-40">
          <ChevronUp className="h-2.5 w-2.5" />
        </button>
        <button type="button" tabIndex={-1} aria-label={`Decrease ${label.toLowerCase()}`} disabled={angka <= min} onClick={() => ke(angka - 1)} className="flex h-3 w-4 items-center justify-center border-t border-line-strong/70 text-content-muted transition-colors hover:bg-surface-3 hover:text-content-primary disabled:opacity-40">
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
      </span>
    </div>
  )
}

function TombolSimpan({ bisa }: { bisa: boolean }) {
  const [tersimpan, setTersimpan] = useState(false)
  return (
    <button
      type="button"
      disabled={!bisa}
      onClick={async () => {
        if (await simpanServerSekarang()) {
          setTersimpan(true)
          window.setTimeout(() => setTersimpan(false), 2000)
        }
      }}
      aria-label="Save this launch target"
      title={tersimpan ? 'Saved' : bisa ? 'Save this launch target' : 'Pick a game or paste a private server link to save'}
      className="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-2 hover:text-content-primary disabled:opacity-40"
    >
      {tersimpan ? <BookmarkCheck className="h-4 w-4 text-success" /> : <Bookmark className="h-4 w-4" />}
    </button>
  )
}

const STATUS: Record<StatusItem, [ReactNode, string, string]> = {
  queued: [<Clock key="q" className="h-3.5 w-3.5" />, 'Queued', 'text-content-muted'],
  starting: [<Loader2 key="s" className="h-3.5 w-3.5 animate-spin" />, 'Starting…', 'text-info'],
  joining: [<Loader2 key="j" className="h-3.5 w-3.5 animate-spin" />, 'Joining…', 'text-info'],
  launched: [<CheckCircle2 key="l" className="h-3.5 w-3.5" />, 'Launched', 'text-success'],
  failed: [<XCircle key="f" className="h-3.5 w-3.5" />, 'Failed', 'text-error'],
  cancelled: [<Ban key="c" className="h-3.5 w-3.5" />, 'Cancelled', 'text-content-muted'],
}

function useStatusPribadi(place: string, ids: string[], aktif: boolean) {
  const [d, setD] = useState<{ kunci: string; data: SiapPribadi | null } | null>(null)
  const kunci = `${place}|${ids.join(',')}`
  useEffect(() => {
    if (!aktif || !place || !ids.length) return
    let hidup = true
    setD({ kunci, data: null })
    api.siapkanPribadiSendiri(Number(place), ids).then((x) => { if (hidup) setD({ kunci, data: x }) }, () => { if (hidup) setD({ kunci, data: null }) })
    return () => { hidup = false }
  }, [kunci, aktif])
  return d && d.kunci === kunci ? d.data : undefined
}

function GrupLuncur({ g, berjalan, statusAkun, onPilih }: { g: Grup; berjalan: boolean; statusAkun: (id: string) => AntreanItem | undefined; onPilih: (el: HTMLElement, l: Lingkup, kanan?: boolean) => void }) {
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const modeSemua = useModeGame((s) => s.mode)
  const mode: ModeServer = g.jenis === 'game' ? modeSemua[g.t.placeId] ?? '' : ''
  const bebas = g.akun.filter((a) => { const t = g.tAkun[a.id] ?? g.t; return !t.jobId && !t.linkCode })
  const efektif: ModeServer = mode === 'pilih' && bebas.length < 2 ? '' : mode
  const pribadi = useStatusPribadi(g.t.placeId, bebas.map((a) => a.id), g.jenis === 'game' && mode === 'sendiri' && !berjalan)
  const banyak = g.akun.length > 1
  const label = g.jenis === 'none' ? 'Choose a game' : namaTujuan(g.t)
  const harga = pribadi?.info.harga ?? null

  const kanan = g.jenis === 'none' ? null
    : g.jenis === 'follow' ? <span className="text-xs text-content-muted">Joins that player's server</span>
      : g.jenis === 'link' ? <span className="text-xs text-content-muted">Private server</span>
        : !bebas.length ? <span className="text-xs text-content-muted">Each has its own server</span>
          : berjalan ? <span className="text-xs text-content-muted">{MODE[efektif]}</span>
            : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="dd-tombol dd-tombol-kecil" title="How these accounts pick a server" data-mode-grup={g.t.placeId}>
                    <Server className="h-3.5 w-3.5 text-content-muted" />{MODE[efektif]}<ChevronDown className="dd-chev h-3.5 w-3.5 text-content-muted" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[19rem]">
                  <DropdownMenuRadioGroup value={efektif || 'acak'} onValueChange={(v) => setModeGame(g.t.placeId, (v === 'acak' ? '' : v) as ModeServer)}>
                    <DropdownMenuRadioItem value="acak"><span className="block">{MODE['']}<span className="block text-xs text-content-muted">Roblox chooses a public server for each account.</span></span></DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sepi"><span className="block">{MODE.sepi}<span className="block text-xs text-content-muted">Each account gets its own emptiest public server.</span></span></DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sendiri"><span className="block">{MODE.sendiri}<span className="block text-xs text-content-muted">Each account’s private server. Free ones are created (0 Robux); paid ones are never bought.</span></span></DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="pilih" disabled={bebas.length < 2}><span className="block">{MODE.pilih}<span className="block text-xs text-content-muted">{bebas.length < 2 ? 'Needs two or more accounts in this game.' : 'All into one server with room for everyone.'}</span></span></DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )

  let catatan: ReactNode = null
  if (!berjalan && g.jenis === 'game' && bebas.length && mode === 'sendiri' && harga && harga > 0) catatan = <>Private servers here cost {harga} Robux. Accounts without one are skipped — CAM never buys them.</>
  else if (!berjalan && g.jenis === 'game' && bebas.length && mode === 'sendiri') catatan = <>Accounts without a private server get a free one (0 Robux). You'll be asked once.</>
  else if (!berjalan && mode === 'pilih' && bebas.length < 2) catatan = <>All together needs two or more accounts in this game.</>
  const info = mode === 'sendiri' && !(harga && harga > 0)

  const tempat = (a: Akun): ReactNode => {
    const s = statusAkun(a.id)
    if (s) {
      const [ikon, teks, warna] = STATUS[s.status] ?? STATUS.queued
      return <span className={cn('inline-flex items-center gap-1.5', warna)} title={s.pesan || undefined}>{ikon}{teks}</span>
    }
    const t = g.tAkun[a.id] ?? g.t
    if (g.jenis === 'game' && (t.jobId || t.linkCode)) return <>{t.jobId ? <Server className="h-3.5 w-3.5 shrink-0" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{teksServer(t)}</span></>
    if (g.jenis !== 'game' || mode !== 'sendiri') return null
    if (pribadi === undefined) return <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</span>
    const x = pribadi?.akun.find((y) => y.akun_id === a.id)
    const gratis = pribadi?.info.harga === 0 && pribadi?.info.diizinkan !== false
    const [ikon, teks, warna] = !x || x.status === 'galat' ? [Lock, x?.pesan || 'Checked when launching', 'text-content-muted']
      : x.status === 'siap' ? [Lock, x.nama || 'Private server', 'text-success']
        : x.status === 'mati' ? (x.harga === 0 ? [Lock, `${x.nama || 'Private server'} · turn on`, 'text-info'] : [Ban, 'Turned off · not free', 'text-warning'])
          : gratis ? [Plus, 'New free server', 'text-info']
            : [Ban, pribadi?.info.harga ? `Skipped · ${pribadi.info.harga} R$` : 'Skipped · no price known', 'text-warning']
    const Ik = ikon as typeof Lock
    return <span className={cn('inline-flex min-w-0 items-center gap-1.5', warna)} title={teks as string}><Ik className="h-3.5 w-3.5 shrink-0" /><span className="truncate" translate={x?.status === 'siap' || x?.status === 'mati' ? 'no' : undefined}>{teks as string}</span></span>
  }

  const isiKepala = (
    <>
      <IkonGame nama={g.jenis === 'game' || g.jenis === 'link' ? label : ''} gambar={g.t.gameIcon} besar ikut={g.jenis === 'follow'} />
      <span className="min-w-0 truncate" translate={g.jenis === 'game' || g.jenis === 'follow' ? 'no' : undefined}>{label}</span>
      <span className="tnum -ml-0.5 shrink-0 text-xs font-medium text-content-muted">{g.akun.length}</span>
    </>
  )

  return (
    <div className="border-b border-line-subtle last:border-b-0" data-grup-luncur={g.kunci}>
      <div className="flex min-w-0 items-center gap-2 pb-1 pl-1.5 pr-2 pt-2.5">
        {berjalan ? (
          <span className="inline-flex h-[34px] min-w-0 items-center gap-[9px] px-[3px] font-semibold text-content-primary">{isiKepala}</span>
        ) : (
          <button
            type="button"
            onClick={(e) => onPilih(e.currentTarget, { jenis: 'akun', ids: g.akun.map((a) => a.id) })}
            title={g.jenis === 'none' ? `Choose a game for ${banyak ? `these ${g.akun.length}` : 'this account'}` : banyak ? `Move all ${g.akun.length} to another game or server` : 'Change where this account goes'}
            className={cn('inline-flex h-[34px] min-w-0 items-center gap-[9px] rounded-lg pl-[3px] pr-2 font-semibold transition-[transform,background-color] duration-150 hover:bg-surface-2 active:scale-[0.97]', g.jenis === 'none' ? 'text-warning' : 'text-content-primary')}
            data-grup-tombol
          >
            {isiKepala}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-muted" />
          </button>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">{kanan}</span>
      </div>
      {catatan ? <div className={cn('mb-1.5 ml-[46px] mr-2 rounded-md border px-2.5 py-1.5 text-xs leading-snug text-content-secondary', info ? 'border-info/[0.22] bg-info/[0.06]' : 'border-warning/25 bg-warning/[0.07]')}>{catatan}</div> : null}
      {g.akun.map((a) => {
        const s = statusAkun(a.id)
        const isi = (
          <>
            <AvatarAkun a={a} size="sm" />
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="min-w-0 shrink truncate font-medium text-content-primary" translate="no">{a.alias}</span>
              {s?.status === 'failed' && s.pesan
                ? <span className="min-w-0 shrink-[1000] truncate text-xs text-error" title={s.pesan}>{s.pesan}</span>
                : <span className="min-w-0 shrink-[1000] truncate text-xs text-content-muted" translate={a.username ? 'no' : undefined}>{a.username ? `@${sembunyi ? samarkan(a.username) : a.username}` : 'Not refreshed'}</span>}
            </span>
            <span className="flex min-w-0 max-w-[15rem] items-center justify-end gap-1.5 whitespace-nowrap text-xs text-content-muted">{tempat(a)}</span>
          </>
        )
        return berjalan ? (
          <div key={a.id} className="grid min-h-10 w-full grid-cols-[26px_minmax(0,1fr)_minmax(0,max-content)_16px] items-center gap-2.5 rounded-lg py-1 pl-[9px] pr-2.5" data-baris-luncur={a.id}>{isi}<span /></div>
        ) : (
          <button
            key={a.id}
            type="button"
            onClick={(e) => onPilih(e.currentTarget, { jenis: 'akun', ids: [a.id] }, true)}
            title={`Change where ${a.alias} goes`}
            className="group grid min-h-10 w-full grid-cols-[26px_minmax(0,1fr)_minmax(0,max-content)_16px] items-center gap-2.5 rounded-lg py-1 pl-[9px] pr-2.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
            data-baris-luncur={a.id}
          >
            {isi}
            <ChevronRight className="h-3.5 w-3.5 text-content-muted opacity-50 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        )
      })}
    </div>
  )
}

export function DialogLuncur() {
  const buka = useRencana((s) => s.buka)
  const idsDiminta = useRencana((s) => s.ids)
  const akun = useCam((s) => s.akun)
  const dipilih = useCam((s) => s.dipilih)
  const fokusId = useCam((s) => s.fokusId)
  const param = useCam((s) => s.param)
  const antrean = useCam((s) => s.antrean)
  const statusLuncur = useCam((s) => s.statusLuncur)
  const [terbang, setTerbang] = useState(false)
  const [hasil, setHasil] = useState<{ item: AntreanItem[] } | null>(null)
  const [sisaDetik, setSisaDetik] = useState(0)
  const [pemilih, setPemilih] = useState<{ el: HTMLElement; lingkup: Lingkup; kanan?: boolean } | null>(null)
  const lepasLandas = useRef(0)
  useEffect(() => {
    if (buka) return
    window.clearTimeout(lepasLandas.current)
    setTerbang(false)
    setPemilih(null)
  }, [buka])
  useEffect(() => () => window.clearTimeout(lepasLandas.current), [])

  const ids = useMemo(() => idsDiminta ?? (dipilih.length ? dipilih : fokusId ? [fokusId] : []), [idsDiminta, dipilih, fokusId])
  useEffect(() => {
    setHasil(null)
  }, [buka, idsDiminta])

  useEffect(
    () =>
      useCam.subscribe((kini, dulu) => {
        if (kini.antrean && !dulu.antrean) setHasil(null)
        const a = dulu.antrean
        if (!a || kini.antrean || !useRencana.getState().buka) return
        if (!a.item.some((x) => x.status === 'launched' || x.status === 'failed')) return
        setHasil({ item: a.item })
        setSisaDetik(3)
      }),
    [],
  )

  useEffect(() => {
    if (!hasil || !buka || antrean || !useRencana.getState().buka) return
    if (sisaDetik <= 0) {
      tutupRencana()
      return
    }
    const t = window.setTimeout(() => setSisaDetik((d) => d - 1), 1000)
    return () => window.clearTimeout(t)
  }, [hasil, sisaDetik, buka, antrean])

  const daftarRencana = useMemo(() => ids.map((id) => akun.find((a) => a.id === id)).filter((a): a is Akun => !!a), [ids, akun])
  const item = antrean?.item ?? hasil?.item ?? null
  const daftar = item ? item.map((x) => akun.find((a) => a.id === x.id)).filter((a): a is Akun => !!a) : daftarRencana
  const n = item ? item.length : daftarRencana.length
  const umum = tujuanUmum(param)
  const grup = kelompokkan(daftar, umum)
  const tanpaGame = grup.find((g) => g.jenis === 'none')
  const pakaiUmum = daftar.filter((a) => sama(tujuanAkun(a, umum), umum)).length
  const bisa = n > 0 && !tanpaGame && !antrean && !hasil
  const nGame = new Set(grup.filter((g) => g.jenis === 'game').map((g) => g.kunci)).size

  const mulai = () => {
    if (!bisa || terbang) return
    setTerbang(true)
    window.clearTimeout(lepasLandas.current)
    lepasLandas.current = window.setTimeout(() => {
      setTerbang(false)
      if (!useRencana.getState().buka) return
      const kini = useCam.getState().akun.filter((a) => ids.includes(a.id))
      if (kini.length) void luncurkanDaftar(kini, kini.length > 1 ? 'selection' : 'single', { mode: useModeGame.getState().mode })
    }, 420)
  }

  const statusAkun = (id: string) => item?.find((x) => x.id === id)
  const hitung = (s: StatusItem) => (item ?? []).filter((x) => x.status === s).length
  const selesai = hitung('launched') + hitung('failed') + hitung('cancelled')
  const posisi = Math.min(n, (item ?? []).filter((x) => x.status !== 'queued' && x.status !== 'cancelled').length)
  const nOk = hitung('launched')
  const nGagal = hitung('failed')
  const sisa = hitung('queued')
  const gagalIds = (hasil?.item ?? []).filter((x) => x.status === 'failed').map((x) => x.id)
  const persiapan = antrean?.fase === 'preparing'

  const judul = antrean
    ? persiapan ? `Preparing to launch ${n}` : `Launching ${Math.max(posisi, 1)} of ${n}`
    : hasil
      ? nGagal ? `${nOk} launched · ${nGagal} failed` : `${nOk} launched`
      : `Launch ${n} account${n === 1 ? '' : 's'}`
  const sub = antrean
    ? statusLuncur || 'Preparing…'
    : hasil
      ? 'Details are in Output (Ctrl+J).'
      : `${nGame ? `${nGame} game${nGame === 1 ? '' : 's'}` : 'No game yet'} · click an account to change where it goes`
  const labelBatal = antrean?.batal ? 'Cancelling…' : sisa > 0 && !persiapan ? 'Cancel remaining' : persiapan ? 'Cancel' : 'Stop waiting'

  return (
    <Dialog open={buka} onOpenChange={(o) => { if (!o) tutupRencana() }}>
      <DialogContent
        size="lg"
        data-rencana-luncur
        aria-describedby={undefined}
        className="w-[min(40rem,calc(100vw-32px))]"
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const lain = [...document.querySelectorAll('[role=dialog][data-state="open"], [role=alertdialog][data-state="open"]')].some((el) => !el.matches('[data-rencana-luncur]'))
          if (lain || (e.target as HTMLElement | null)?.closest?.('[role=dialog], [role=alertdialog], [role=menu], [role=listbox]')) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          const daftarSel = '[role=listbox], [role=menu], [role=option], [aria-expanded="true"]'
          const t = e.target instanceof Element ? e.target : null
          if (t?.closest(daftarSel) || document.activeElement?.closest(daftarSel)) e.preventDefault() 
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.defaultPrevented || antrean || hasil || pemilih) return
          const el = e.target as HTMLElement
          if (el.closest('input, textarea, select, button, [role=combobox], [role=menu], [role=listbox]')) return
          e.preventDefault()
          mulai()
        }}
      >
        <div className="flex items-start gap-3 pb-2.5 pl-[18px] pr-12 pt-4">
          <div className="min-w-0">
            <DialogTitle className="tnum text-[17px] font-semibold tracking-[-0.01em] text-content-primary">{judul}</DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-[12.5px] text-content-muted">{sub}</DialogDescription>
          </div>
        </div>

        {item ? (
          <div className="mx-[18px] mb-3 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <i className="block h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${n ? (selesai / n) * 100 : 0}%` }} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 px-[18px] pb-3 text-[12.5px] text-content-muted" data-target-bawaan>
            <span>Accounts without their own target go to</span>
            <ChipTujuan t={umum} kecil onClick={(el) => setPemilih({ el, lingkup: { jenis: 'umum' } })} data-chip-umum="" />
            <TombolSimpan bisa={!umum.ikuti && !!(umum.placeId || umum.linkCode)} />
            {pakaiUmum ? null : <span className="tnum">· none here</span>}
          </div>
        )}

        <div {...(antrean ? { 'data-progres-luncur': '' } : {})} className="flex min-h-0 flex-1 flex-col" role={antrean ? 'status' : undefined} aria-live={antrean ? 'polite' : undefined}>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-line-subtle px-2.5 pb-2.5 pt-0.5 text-sm [scrollbar-gutter:stable]" aria-label="Accounts in this launch">
            {grup.map((g) => (
              <GrupLuncur key={g.kunci} g={g} berjalan={!!item} statusAkun={statusAkun} onPilih={(el, lingkup, kanan) => setPemilih({ el, lingkup, kanan })} />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-line-subtle py-2.5 pl-[18px] pr-3.5">
            {antrean ? (
              <>
                <span className="tnum min-w-0 truncate text-xs text-content-muted">{nOk} launched · {nGagal} failed · {sisa} remaining</span>
                <span className="ml-auto min-w-0 truncate text-xs text-content-muted">Closing keeps it running.</span>
                <Button variant="secondary" size="md" onClick={batalkanSisa} disabled={antrean.batal}>{labelBatal}</Button>
              </>
            ) : hasil ? (
              <>
                <span className="min-w-0 truncate text-xs text-content-muted">{nGagal ? 'Failed accounts keep their target.' : 'All clients joined.'}</span>
                <span className="ml-auto" />
                {gagalIds.length ? (
                  <Button variant="secondary" size="md" onClick={() => { setHasil(null); bukaRencana(gagalIds) }}>
                    <RotateCcw className="h-3.5 w-3.5" />Retry {gagalIds.length} failed
                  </Button>
                ) : null}
                <Button variant="primary" size="md" className="done-auto" onClick={tutupRencana} data-selesai-luncur>
                  Done<span className="done-sec">{sisaDetik}s</span><span className="done-bar" />
                </Button>
              </>
            ) : (
              <>
                {n > 1 ? <AngkaLangkah label="Delay" satuan="s" nilai={param.jeda} onUbah={(v) => setParam({ jeda: v })} title="Seconds to wait after the previous client has joined" /> : null}
                <span className="ml-auto min-w-0 truncate text-xs text-content-muted">{tanpaGame ? `${tanpaGame.akun.length} without a game` : ''}</span>
                <Button variant="secondary" size="md" onClick={tutupRencana}>Cancel</Button>
                <TombolLuncur
                  label={n > 1 ? `Launch ${n}` : 'Launch'}
                  className="dlg-go"
                  terbang={terbang}
                  disabled={!bisa}
                  onClick={mulai}
                  data-luncur-mulai=""
                  title="Start launching (Enter)"
                />
              </>
            )}
          </div>
        </div>

        {pemilih ? <PemilihTarget jangkar={pemilih.el} lingkup={pemilih.lingkup} kanan={pemilih.kanan} onTutup={() => setPemilih(null)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

