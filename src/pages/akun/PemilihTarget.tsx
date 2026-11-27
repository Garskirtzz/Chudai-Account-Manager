import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Gamepad2, Globe, Loader2, Lock, Plus, RotateCcw, Search, Server, Users } from '@/components/ikon'
import type { Akun, CalonIkuti, GameHasil, PribadiAkun, SiapPribadi, TargetLuncur } from '@/api/types'
import { api } from '@/api/api'
import { aturTargetAkun, muatRiwayat, setParam, useCam } from '@/stores/cam'
import { setModeGame, tutupRencana } from '@/stores/rencanaLuncur'
import { cn } from '@/utils/cn'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/Popover'


export interface Tujuan {
  placeId: string
  gameName: string
  gameIcon: string
  jobId: string
  linkCode: string
  ikuti: string
}

export const tujuanKosong: Tujuan = { placeId: '', gameName: '', gameIcon: '', jobId: '', linkCode: '', ikuti: '' }

export const tujuanUmum = (p: { placeId: string; gameName: string; gameIcon: string; jobId: string; linkCode: string; ikuti: string }): Tujuan => ({
  placeId: String(p.placeId || ''), gameName: p.gameName || '', gameIcon: p.gameIcon || '', jobId: p.jobId || '', linkCode: p.linkCode || '', ikuti: p.ikuti?.trim() || '',
})

export function tujuanAkun(a: Akun, umum: Tujuan): Tujuan {
  const t = a.target_sendiri
  if (!t || (!t.place_id && !t.link_code && !t.ikuti)) return umum
  return { placeId: t.place_id || '', gameName: t.game_name || '', gameIcon: t.game_icon || '', jobId: t.job_id || '', linkCode: t.link_code || '', ikuti: t.ikuti || '' }
}

export const adaTujuan = (t: Tujuan) => !!(t.ikuti || t.placeId || t.linkCode)
export const namaTujuan = (t: Tujuan) => (t.ikuti ? `Following ${t.ikuti}` : t.placeId ? t.gameName || `Place ${t.placeId}` : t.linkCode ? 'Private server link' : 'Choose a game')
export const teksServer = (t: Tujuan) => (t.ikuti ? '' : t.jobId ? `server ${t.jobId.slice(0, 8)}…` : t.linkCode ? 'private server' : '')
export const sama = (x: Tujuan | null, y: Tujuan | null) => !!x && !!y && x.placeId === y.placeId && x.jobId === y.jobId && x.linkCode === y.linkCode && x.ikuti.toLowerCase() === y.ikuti.toLowerCase()

export function IkonGame({ nama, gambar, besar, ikut }: { nama: string; gambar?: string; besar?: boolean; ikut?: boolean }) {
  const [gagal, setGagal] = useState(false)
  useEffect(() => setGagal(false), [gambar])
  const uk = besar ? 'size-7 rounded-md text-[11px]' : 'size-6 rounded-[5px] text-[10px]'
  if (ikut) return <span className={cn('flex shrink-0 items-center justify-center bg-surface-3 text-content-muted', uk)}><Users className="h-3.5 w-3.5" /></span>
  if (!nama) return <span className={cn('flex shrink-0 items-center justify-center bg-surface-3 text-content-muted', uk)}><Gamepad2 className="h-3.5 w-3.5" /></span>
  if (gambar && !gagal) return <img src={gambar} alt="" onError={() => setGagal(true)} className={cn('shrink-0 object-cover', uk)} />
  const kata = nama.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const huruf = ((kata[0]?.[0] || '?') + (kata.length > 1 ? kata[kata.length - 1][0] : kata[0]?.[1] || '')).toUpperCase()
  let h = 0
  for (const c of nama) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center font-bold tracking-[0.02em] text-white/90', uk)} style={{ background: `linear-gradient(135deg,hsl(${h} 45% 34%),hsl(${h + 30} 40% 22%))` }}>
      {huruf}
    </span>
  )
}

export function ChipTujuan({ t, onClick, kecil, ...rest }: { t: Tujuan; onClick: (el: HTMLElement) => void; kecil?: boolean } & Record<`data-${string}`, string>) {
  const ada = adaTujuan(t)
  const sv = teksServer(t)
  return (
    <button
      type="button"
      onClick={(e) => onClick(e.currentTarget)}
      title={`${namaTujuan(t)}${sv ? ` · ${sv}` : ''} — click to change`}
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-2 rounded-[7px] border bg-surface-1 pl-[3px] pr-2 text-content-primary transition-[transform,border-color] duration-150 hover:border-line-strong active:scale-[0.97]',
        kecil ? 'h-7' : 'h-[30px]',
        ada ? 'border-line' : 'border-dashed border-line text-warning',
      )}
      {...rest}
    >
      <IkonGame nama={ada && !t.ikuti ? namaTujuan(t) : ''} gambar={t.gameIcon} ikut={!!t.ikuti} />
      <span className="min-w-0 truncate" translate={ada && !t.ikuti ? 'no' : undefined}>{namaTujuan(t)}</span>
      {sv ? <span className="shrink-0 text-xs text-content-muted">· {sv}</span> : null}
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-muted" />
    </button>
  )
}

export type Lingkup = { jenis: 'umum' } | { jenis: 'akun'; ids: string[] }

interface Item {
  ikon?: ReactNode
  judul: string
  ket?: string
  tr?: boolean
  centang?: boolean
  mati?: boolean
  pilih?: () => void
}
interface Bagian {
  label: string
  tr?: boolean
  item: Item[]
}

const kelasIkon = 'flex size-6 shrink-0 items-center justify-center text-content-secondary'
const TAUTAN = /roblox\.com\/(share|games\/\d+.*privateServerLinkCode)|accessCode=/i
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i

export function PemilihTarget({ jangkar, lingkup, kanan, onTutup }: { jangkar: HTMLElement; lingkup: Lingkup; kanan?: boolean; onTutup: () => void }) {
  const navigate = useNavigate()
  const akun = useCam((s) => s.akun)
  const param = useCam((s) => s.param)
  const riwayat = useCam((s) => s.riwayat)
  const statusRiwayat = useCam((s) => s.statusRiwayat)
  const serverTersimpan = useCam((s) => s.serverTersimpan)
  const fokusId = useCam((s) => s.fokusId)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [teman, setTeman] = useState<CalonIkuti[] | null>(null)
  const [pribadi, setPribadi] = useState<SiapPribadi | null | 'muat'>(null)
  const [hasilGame, setHasilGame] = useState<{ q: string; daftar: GameHasil[] | null; galat: boolean }>({ q: '', daftar: null, galat: false })
  const daftarRef = useRef<HTMLDivElement>(null)

  const umum = tujuanUmum(param)
  const daftarAkun = lingkup.jenis === 'akun' ? lingkup.ids.map((id) => akun.find((a) => a.id === id)).filter((a): a is Akun => !!a) : []
  const satu = daftarAkun.length === 1 ? daftarAkun[0] : null
  const kini: Tujuan | null = lingkup.jenis === 'umum'
    ? umum
    : (() => {
      const ts = daftarAkun.map((a) => tujuanAkun(a, umum))
      return ts.length && ts.every((t) => sama(t, ts[0])) ? ts[0] : null
    })()
  const g = kini && !kini.ikuti && kini.placeId ? kini : null
  const acuan = satu ?? daftarAkun[0] ?? akun.find((a) => a.id === fokusId) ?? akun[0]

  useEffect(() => { if (statusRiwayat !== 'siap') void muatRiwayat() }, [statusRiwayat])
  useEffect(() => {
    if (!acuan) return
    let hidup = true
    api.calonIkuti(acuan.id).then((d) => { if (hidup) setTeman(Array.isArray(d) ? d.filter((c) => c.status === 'InGame') : []) }, () => { if (hidup) setTeman([]) })
    return () => { hidup = false }
  }, [acuan?.id])
  useEffect(() => {
    if (!satu || !g) return
    let hidup = true
    setPribadi('muat')
    api.siapkanPribadiSendiri(Number(g.placeId), [satu.id]).then((d) => { if (hidup) setPribadi(d) }, () => { if (hidup) setPribadi(null) })
    return () => { hidup = false }
  }, [satu?.id, g?.placeId]) 
  const kueri = q.trim()
  const cariNama = !!kueri && !TAUTAN.test(kueri) && !GUID.test(kueri) && !/roblox\.com\/games\/(\d+)/i.test(kueri) && !/^\d{6,}$/.test(kueri) && !kueri.startsWith('@')
  useEffect(() => {
    if (!cariNama) return
    let hidup = true
    setHasilGame({ q: kueri, daftar: null, galat: false })
    const t = window.setTimeout(() => {
      api.cariGame(kueri).then((d) => { if (hidup) setHasilGame({ q: kueri, daftar: d, galat: false }) }, () => { if (hidup) setHasilGame({ q: kueri, daftar: [], galat: true }) })
    }, 300)
    return () => { hidup = false; window.clearTimeout(t) }
  }, [kueri, cariNama])

  const pakai = (t: Tujuan) => {
    onTutup()
    if (lingkup.jenis === 'umum') {
      setParam({ placeId: t.placeId, gameName: t.gameName, gameIcon: t.gameIcon, jobId: t.jobId, linkCode: t.linkCode, ikuti: t.ikuti })
      return
    }
    const tl: TargetLuncur = { place_id: t.placeId, game_name: t.gameName, game_icon: t.gameIcon, job_id: t.jobId, link_code: t.linkCode, ikuti: t.ikuti, jeda: '', sama: '', fps: '' }
    void aturTargetAkun(lingkup.ids, tl)
  }
  const gameItem = (place: string, nama: string, ikon: string, ket?: string): Item => {
    const t = { ...tujuanKosong, placeId: place, gameName: nama, gameIcon: ikon }
    return { ikon: <IkonGame nama={nama || `Place ${place}`} gambar={ikon} />, judul: nama || `Place ${place}`, ket, tr: true, centang: sama(kini, t), pilih: () => pakai(t) }
  }
  const temanItem = (c: CalonIkuti): Item => c.akun_cam && c.job_id && c.place_id
    ? { ikon: <span className={kelasIkon}><Users className="h-3.5 w-3.5" /></span>, judul: c.username, tr: true, ket: `Your account · in ${c.lokasi || 'a game'}`, pilih: () => pakai({ ...tujuanKosong, placeId: String(c.place_id), gameName: c.lokasi, jobId: c.job_id }) }
    : { ikon: <span className={kelasIkon}><Users className="h-3.5 w-3.5" /></span>, judul: c.username, tr: true, ket: `Follow · in ${c.lokasi || 'a game'}`, centang: !!kini?.ikuti && kini.ikuti.toLowerCase() === c.username.toLowerCase(), pilih: () => pakai({ ...tujuanKosong, ikuti: c.username }) }

  const bagian: Bagian[] = useMemo(() => {
    const b: Bagian[] = []
    if (!kueri) {
      if (g) {
        const its: Item[] = [{ ikon: <span className={kelasIkon}><Globe className="h-3.5 w-3.5" /></span>, judul: 'Any server', ket: 'The group’s server rule decides', centang: !g.jobId && !g.linkCode, pilih: () => pakai({ ...g, jobId: '', linkCode: '' }) }]
        if (satu && pribadi === 'muat') its.push({ ikon: <span className={kelasIkon}><Loader2 className="h-3.5 w-3.5 animate-spin" /></span>, judul: 'Checking private servers…', mati: true })
        if (satu && pribadi && pribadi !== 'muat') {
          const x: PribadiAkun | undefined = pribadi.akun[0]
          const gratis = pribadi.info.harga === 0 && pribadi.info.diizinkan !== false
          if (x?.status === 'siap') its.push({ ikon: <span className={kelasIkon}><Lock className="h-3.5 w-3.5" /></span>, judul: x.nama || 'Private server', ket: 'Private · active', tr: true, pilih: () => pakai({ ...g, jobId: '', linkCode: x.access_code ? `accessCode=${x.access_code}` : x.link }) })
          else if (x?.status === 'mati') its.push(x.harga === 0
            ? { ikon: <span className={kelasIkon}><Lock className="h-3.5 w-3.5" /></span>, judul: x.nama || 'Private server', ket: 'Private · turned on before launch', tr: true, pilih: () => { setModeGame(g.placeId, 'sendiri'); pakai({ ...g, jobId: '', linkCode: '' }) } }
            : { ikon: <span className={kelasIkon}><Lock className="h-3.5 w-3.5" /></span>, judul: x.nama || 'Private server', ket: 'Private · turned off, not free', tr: true, mati: true })
          else if (x?.status === 'tidak_ada' && gratis) its.push({ ikon: <span className={kelasIkon}><Plus className="h-3.5 w-3.5" /></span>, judul: 'New free private server', ket: '0 Robux · asks once before launch', pilih: () => { setModeGame(g.placeId, 'sendiri'); pakai({ ...g, jobId: '', linkCode: '' }) } })
        }
        its.push({ ikon: <span className={kelasIkon}><Server className="h-3.5 w-3.5" /></span>, judul: 'Pick a server…', ket: 'Opens Servers for this game', pilih: () => { onTutup(); tutupRencana(); navigate('/servers?tab=browse', { state: { jelajah: { placeId: g.placeId, name: g.gameName, icon: g.gameIcon } } }) } })
        b.push({ label: namaTujuan(g), tr: true, item: its })
      }
      const dilihat = new Set<number>()
      const baru = riwayat.filter((r) => r.place_id && String(r.place_id) !== g?.placeId && !dilihat.has(r.place_id) && dilihat.add(r.place_id)).slice(0, 4)
      if (baru.length) b.push({ label: g ? 'Other games' : 'Recent games', item: baru.map((r) => gameItem(String(r.place_id), r.game_name, r.icon_url)) })
      if (serverTersimpan.length) b.push({ label: 'Saved', item: serverTersimpan.map((s) => {
        const t = { ...tujuanKosong, placeId: String(s.place_id || ''), gameName: s.game_name, gameIcon: s.game_icon, jobId: s.job_id, linkCode: s.link_code }
        return { ikon: <IkonGame nama={s.game_name || s.nama} gambar={s.game_icon} />, judul: s.nama, tr: true, ket: teksServer(t) || 'Any server', centang: sama(kini, t), pilih: () => pakai(t) }
      }) })
      if (teman === null) b.push({ label: 'Friends in a game', item: [{ ikon: <span className={kelasIkon}><Loader2 className="h-3.5 w-3.5 animate-spin" /></span>, judul: 'Asking Roblox…', mati: true }] })
      else if (teman.length) b.push({ label: 'Friends in a game', item: teman.map(temanItem) })
      return b
    }
    const its: Item[] = []
    const tempat = kueri.match(/roblox\.com\/games\/(\d+)/i)?.[1] || (/^\d{3,}$/.test(kueri) ? kueri : '')
    const hasilCari = (): Item[] => {
      if (!cariNama) return []
      if (hasilGame.q !== kueri || hasilGame.daftar === null) return [{ ikon: <span className={kelasIkon}><Loader2 className="h-3.5 w-3.5 animate-spin" /></span>, judul: 'Searching Roblox…', mati: true }]
      if (hasilGame.galat) return [{ judul: 'Couldn’t search Roblox.', ket: 'Paste a game link or a Place ID instead.', mati: true }]
      return hasilGame.daftar.filter((r) => String(r.place_id) !== tempat).slice(0, 6).map((r) => gameItem(String(r.place_id), r.name, r.icon_url, r.players ? `${r.players.toLocaleString()} playing` : undefined))
    }
    if (TAUTAN.test(kueri)) {
      const p = tempat || g?.placeId || ''
      its.push({ ikon: <span className={kelasIkon}><Lock className="h-3.5 w-3.5" /></span>, judul: 'Private server link', ket: `${p ? (g && g.placeId === p ? namaTujuan(g) : `Place ${p}`) : 'The game in the link'} · checked when launching`, pilih: () => pakai({ ...tujuanKosong, placeId: p, gameName: g && g.placeId === p ? g.gameName : '', gameIcon: g && g.placeId === p ? g.gameIcon : '', linkCode: kueri }) })
    } else if (GUID.test(kueri)) {
      its.push(g
        ? { ikon: <span className={kelasIkon}><Server className="h-3.5 w-3.5" /></span>, judul: `Server ${kueri.slice(0, 8)}…`, ket: `Job ID in ${namaTujuan(g)}`, pilih: () => pakai({ ...g, jobId: kueri, linkCode: '' }) }
        : { judul: 'A Job ID needs a game', ket: 'Pick the game first, then paste the Job ID.', mati: true })
    } else if (tempat) {
      its.push(gameItem(tempat, '', '', 'Place ID'), ...hasilCari())
    } else {
      const nama = kueri.replace(/^@/, '')
      its.push(...hasilCari())
      for (const c of teman ?? []) if (c.username.toLowerCase().includes(nama.toLowerCase())) its.push(temanItem(c))
      if (/^[A-Za-z0-9_]{3,20}$/.test(nama) && !(teman ?? []).some((c) => c.username.toLowerCase() === nama.toLowerCase())) its.push({ ikon: <span className={kelasIkon}><Users className="h-3.5 w-3.5" /></span>, judul: `Follow ${nama}`, tr: true, ket: 'Join whatever server this player is in', pilih: () => pakai({ ...tujuanKosong, ikuti: nama }) })
    }
    b.push({ label: '', item: its })
    return b
  }, [kueri, g?.placeId, g?.jobId, g?.linkCode, g?.gameName, satu?.id, pribadi, riwayat, serverTersimpan, teman, hasilGame, kini?.placeId, kini?.jobId, kini?.linkCode, kini?.ikuti])

  const rata = bagian.flatMap((x) => x.item).filter((i) => !i.mati && i.pilih)
  const hiAman = Math.max(0, Math.min(hi, rata.length - 1))
  useEffect(() => setHi(0), [kueri])
  const kaki = lingkup.jenis === 'umum' ? 'For every account without its own target.' : satu ? null : `Saved for these ${daftarAkun.length} accounts.`
  const adaSendiri = daftarAkun.some((a) => a.target_sendiri)
  let n = -1

  return (
    <Popover open onOpenChange={(o) => { if (!o) onTutup() }}>
      <PopoverAnchor virtualRef={{ current: jangkar }} />
      <PopoverContent
        align={kanan ? 'end' : 'start'}
        side="bottom"
        sideOffset={6}
        className="w-[21rem] bg-surface-1 p-0"
        data-pemilih-target
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input')?.focus() }}
      >
        <div className="p-2">
          <label className="flex h-[34px] items-center gap-2 rounded-lg border border-line-strong bg-app/40 px-2.5 text-content-muted focus-within:border-accent/60">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (!rata.length) return
                  const j = (hiAman + (e.key === 'ArrowDown' ? 1 : -1) + rata.length) % rata.length
                  setHi(j)
                  daftarRef.current?.querySelector(`[data-ix="${j}"]`)?.scrollIntoView({ block: 'nearest' })
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  rata[hiAman]?.pilih?.()
                }
              }}
              placeholder="Game, link, Job ID or player"
              aria-label="Search targets"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-sm text-content-primary outline-none placeholder:text-content-muted"
            />
          </label>
        </div>
        <div ref={daftarRef} role="listbox" aria-label="Targets" className="max-h-[19rem] overflow-y-auto overscroll-contain px-1.5 pb-1.5">
          {rata.length || bagian.some((x) => x.item.length) ? (
            bagian.map((bg, bi) => (bg.item.length ? (
              <div key={bi}>
                {bg.label ? <div className="truncate px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-content-muted" translate={bg.tr ? 'no' : undefined}>{bg.label}</div> : null}
                {bg.item.map((it, ii) => {
                  const ix = !it.mati && it.pilih ? ++n : -1
                  return (
                    <button
                      key={ii}
                      type="button"
                      role="option"
                      aria-selected={ix === hiAman}
                      disabled={it.mati}
                      data-ix={ix >= 0 ? ix : undefined}
                      onMouseEnter={() => { if (ix >= 0) setHi(ix) }}
                      onClick={() => it.pilih?.()}
                      className={cn('flex w-full min-h-8 items-center gap-2.5 rounded-[7px] px-2 py-1.5 text-left text-content-primary disabled:cursor-default disabled:opacity-60', ix === hiAman && 'bg-surface-3')}
                    >
                      {it.ikon}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm" translate={it.tr ? 'no' : undefined}>{it.judul}</span>
                        {it.ket ? <span className="block truncate text-xs leading-snug text-content-muted">{it.ket}</span> : null}
                      </span>
                      {it.centang ? <Check className="h-3.5 w-3.5 shrink-0 text-content-muted" /> : null}
                    </button>
                  )
                })}
              </div>
            ) : null))
          ) : (
            <p className="px-2 py-2.5 text-xs leading-snug text-content-muted">Nothing matches. Paste a game link, a private server link or a Job ID.</p>
          )}
        </div>
        <div className="flex min-h-[38px] items-center gap-2 border-t border-line-subtle py-1 pl-3 pr-1.5 text-xs text-content-muted">
          <span className="min-w-0 flex-1 truncate">
            {kaki ?? <><span>Saved for </span><b className="font-medium text-content-secondary" translate="no">{satu?.alias}</b><span>, next launches too.</span></>}
          </span>
          {lingkup.jenis === 'akun' && adaSendiri ? (
            <button type="button" onClick={() => { onTutup(); void aturTargetAkun(lingkup.ids, null) }} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-content-secondary hover:bg-surface-2 hover:text-content-primary" data-pakai-bawaan>
              <RotateCcw className="h-3.5 w-3.5" />Use default
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
