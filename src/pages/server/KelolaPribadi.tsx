import { useMemo, useRef, useState } from 'react'
import { Ban, Check, Copy, Crosshair, Loader2, Lock, MoreHorizontal, Pencil, Power, RefreshCw, Users, X } from '@/components/ikon'
import { api, tidur } from '@/api/api'
import type { DetailVip, PerubahanVip, ServerMilik } from '@/api/types'
import { beriTahu, minta, pilihServer, salinTeks, setDipilih, useCam } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Controls'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/Feedback'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'

type Baris = ServerMilik & { akun_id: string }
const kunci = (b: Baris) => `${b.akun_id}:${b.vip_id}`
const habisBerbayar = (b: Baris) => {
  if (b.harga === null) return false
  const t = Date.parse(b.kedaluwarsa)
  return !Number.isFinite(t) || t < Date.now()
}
const BATAS_DETAIL = 40

function teksBerlaku(b: Baris) {
  if (b.harga === null) return 'Free (0 Robux)'
  const d = Date.parse(b.kedaluwarsa)
  const tgl = Number.isNaN(d) ? '—' : new Date(d).toLocaleDateString()
  return `${b.harga} Robux · ${b.perpanjang ? 'renews' : 'ends'} ${tgl}`
}

export function KelolaPribadi() {
  const akun = useCam((s) => s.akun)
  const [baris, setBaris] = useState<Baris[]>([])
  const [detail, setDetail] = useState<Record<string, DetailVip>>({})
  const [memuat, setMemuat] = useState(false)
  const [memuatDetail, setMemuatDetail] = useState(false)
  const [sudah, setSudah] = useState(false)
  const [galat, setGalat] = useState('')
  const [gagal, setGagal] = useState<string[]>([])
  const [diperiksa, setDiperiksa] = useState(0)
  const [filterAkun, setFilterAkun] = useState('')
  const [filterGame, setFilterGame] = useState('')
  const [hanyaAktif, setHanyaAktif] = useState(false)
  const [centang, setCentang] = useState<string[]>([])
  const [sibuk, setSibuk] = useState('')
  const [ganti, setGanti] = useState('')
  const sesi = useRef(0)
  const alias = (id: string) => akun.find((a) => a.id === id)?.alias ?? '?'

  const muatDetail = async (s0: number, daftar: Baris[]) => {
    setMemuatDetail(true)
    for (const b of daftar.slice(0, BATAS_DETAIL)) {
      if (s0 !== sesi.current) return
      try {
        const d = await api.detailServerPribadi(b.akun_id, b.vip_id)
        if (s0 === sesi.current) setDetail((x) => ({ ...x, [kunci(b)]: d }))
      } catch {  }
      await tidur(250)
    }
    if (s0 === sesi.current) setMemuatDetail(false)
  }

  const muat = async () => {
    const s0 = ++sesi.current
    setMemuat(true)
    setGalat('')
    setCentang([])
    let semua: Baris[] = []
    try {
      const h = await api.daftarPribadiMilikSemua()
      if (s0 !== sesi.current) return
      semua = h.akun.flatMap((a) => a.servers.map((s) => ({ ...s, akun_id: a.akun_id })))
      setBaris(semua)
      setGagal(h.gagal)
      setDiperiksa(h.diperiksa)
      setDetail({})
      setSudah(true)
    } catch (e) {
      if (s0 === sesi.current) setGalat(String(e))
      return
    } finally {
      if (s0 === sesi.current) setMemuat(false)
    }
    void muatDetail(s0, semua)
  }

  const ubah = async (b: Baris, u: PerubahanVip, diam = false) => {
    const k = kunci(b)
    setSibuk(k)
    try {
      const d = await api.ubahServerPribadi(b.akun_id, b.vip_id, u)
      setDetail((x) => ({ ...x, [k]: d }))
      setBaris((xs) => xs.map((x) => (kunci(x) === k ? { ...x, nama: d.nama, aktif: d.aktif, perpanjang: d.perpanjang } : x)))
      if (u.nama !== undefined && d.nama !== u.nama.trim()) beriTahu(`Roblox did not keep the new name for "${b.nama}" (it may have been filtered).`, 'salah')
      else if (!diam) {
        if (u.nama !== undefined) beriTahu(`Private server renamed to "${d.nama}".`, 'benar')
        if (u.aktif !== undefined) beriTahu(`Private server "${d.nama}" turned ${d.aktif ? 'on' : 'off'}.`, 'benar')
        if (u.teman !== undefined) beriTahu(`Private server "${d.nama}": friends ${d.teman ? 'allowed' : 'not allowed'}.`, 'benar')
        if (u.link_baru) beriTahu(`Private server "${d.nama}": new invite link made; the old one stops working.`, 'benar')
        if (u.henti_langganan) beriTahu(`Private server "${d.nama}" will not renew.`, 'benar')
      }
      return true
    } catch (e) {
      beriTahu(`Private server "${b.nama}": ${e}`, 'salah')
      return false
    } finally {
      setSibuk('')
    }
  }

  const massal = async (u: PerubahanVip) => {
    let pilihan = baris.filter((b) => centang.includes(kunci(b)))
    if (u.aktif === true) {
      const lewati = pilihan.filter((b) => habisBerbayar(b))
      if (lewati.length) beriTahu(lewati.length === 1 ? 'Skipped 1 paid private server whose paid period has ended.' : `Skipped ${lewati.length} paid private servers whose paid period has ended.`)
      pilihan = pilihan.filter((b) => !lewati.includes(b))
    }
    let ok = 0
    for (let i = 0; i < pilihan.length; i++) {
      if (i) await tidur(500)
      if (await ubah(pilihan[i], u, true)) ok++
    }
    beriTahu(`${ok} of ${pilihan.length} private servers updated.`, ok === pilihan.length ? 'benar' : 'salah')
  }

  const ambilDetail = async (b: Baris) => detail[kunci(b)] ?? (await api.detailServerPribadi(b.akun_id, b.vip_id))
  const bacaDetail = async (b: Baris) => {
    const s0 = sesi.current
    try {
      const d = await api.detailServerPribadi(b.akun_id, b.vip_id)
      if (s0 === sesi.current) setDetail((x) => (x[kunci(b)] ? x : { ...x, [kunci(b)]: d }))
    } catch {  }
  }

  const salinLink = async (b: Baris) => {
    try {
      const d = await ambilDetail(b)
      if (!d.link) return void beriTahu('Roblox gave no invite link for this private server.', 'salah')
      await salinTeks('Private server link', d.link)
    } catch (e) {
      beriTahu(`Private server "${b.nama}": ${e}`, 'salah')
    }
  }

  const jadikanTarget = async (b: Baris) => {
    try {
      const d = await ambilDetail(b)
      if (!d.link) return void beriTahu('Roblox gave no invite link for this private server.', 'salah')
      pilihServer({ placeId: b.place_id, jobId: '', linkCode: d.link, gameName: b.nama_game, gameIcon: '', nama: b.nama })
      setDipilih([b.akun_id])
      beriTahu(`Ticked its owner, ${alias(b.akun_id)}.`)
    } catch (e) {
      beriTahu(`Private server "${b.nama}": ${e}`, 'salah')
    }
  }

  const hentikan = (b: Baris) =>
    minta({
      judul: 'Stop renewal?',
      pesan: `"${b.nama}" stays until ${teksBerlaku(b).split(' · ')[1]?.replace(/^(renews|ends) /, '') || 'the end of its period'}, then it ends. Roblox will not charge for it again.`,
      labelYa: 'Stop renewal',
      bahaya: true,
      aksi: () => void ubah(b, { henti_langganan: true }),
    })

  const game = useMemo(() => [...new Map(baris.map((b) => [String(b.universe_id), b.nama_game || `Place ${b.place_id}`])).entries()], [baris])
  const pemilik = useMemo(() => [...new Set(baris.map((b) => b.akun_id))], [baris])
  const terlihat = baris.filter((b) => (!filterAkun || b.akun_id === filterAkun) && (!filterGame || String(b.universe_id) === filterGame) && (!hanyaAktif || b.aktif))
  const kelompok = useMemo(() => {
    const m = new Map<string, Baris[]>()
    for (const b of terlihat) m.set(String(b.universe_id), [...(m.get(String(b.universe_id)) ?? []), b])
    return [...m.entries()]
  }, [terlihat])
  const template = '2rem minmax(8rem,1.4fr) minmax(6rem,1fr) 4.5rem minmax(7rem,1fr) 5rem 2.5rem'
  const semuaTercentang = terlihat.length > 0 && terlihat.every((b) => centang.includes(kunci(b)))

  return (
    <section className="flex flex-col" aria-label="Owned private servers">
      <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-5 py-3">
        <p className="min-w-[14rem] flex-1 text-sm leading-relaxed text-content-secondary">
          Private servers your accounts own, in every game. Roblox has no way to delete one: turn it off instead, and stop renewal for paid ones.
        </p>
        <Button size="md" variant="secondary" onClick={() => void muat()} disabled={memuat}>
          {memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {memuat ? 'Loading…' : sudah ? 'Reload' : 'Load owned servers'}
        </Button>
      </div>

      {sudah && baris.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-subtle bg-surface-1/30 px-5 py-2 text-sm text-content-secondary">
          <label className="flex items-center gap-2">
            Account
            <Select value={filterAkun} onValueChange={setFilterAkun} ariaLabel="Owner account" size="sm" className="w-40" options={[{ value: '', label: 'All accounts' }, ...pemilik.map((id) => ({ value: id, label: alias(id), data: true }))]} />
          </label>
          <label className="flex items-center gap-2">
            Game
            <Select value={filterGame} onValueChange={setFilterGame} ariaLabel="Game" size="sm" className="w-48" options={[{ value: '', label: 'All games' }, ...game.map(([id, n]) => ({ value: id, label: n, data: true }))]} />
          </label>
          <label className="flex items-center gap-2">
            <Checkbox className="h-5 w-5" checked={hanyaAktif} onCheckedChange={(v) => setHanyaAktif(v === true)} aria-label="Active only" />
            Active only
          </label>
          {memuatDetail ? <span className="flex items-center gap-1 text-xs text-content-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Reading details…</span> : null}
        </div>
      ) : null}

      {centang.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle bg-accent/[0.06] px-5 py-2 text-sm" data-aksi-massal>
          <span className="mr-1 text-content-secondary">{centang.length === 1 ? '1 selected' : `${centang.length} selected`}</span>
          <Button size="sm" variant="secondary" disabled={!!sibuk} onClick={() => void massal({ aktif: false })}><Power className="h-3.5 w-3.5" />Turn off</Button>
          <Button size="sm" variant="secondary" disabled={!!sibuk} onClick={() => void massal({ aktif: true })}><Power className="h-3.5 w-3.5" />Turn on</Button>
          <Button size="sm" variant="secondary" disabled={!!sibuk} onClick={() => void massal({ teman: true })}><Users className="h-3.5 w-3.5" />Allow friends</Button>
          <Button size="sm" variant="secondary" disabled={!!sibuk} onClick={() => void massal({ teman: false })}><Users className="h-3.5 w-3.5" />No friends</Button>
          <Button size="sm" variant="ghost" onClick={() => setCentang([])}>Clear selection</Button>
        </div>
      ) : null}

      {galat ? (
        <EmptyState icon={X} title="Couldn’t load private servers" description={galat} action={<Button size="sm" variant="secondary" onClick={() => void muat()}>Retry</Button>} />
      ) : !sudah ? (
        <EmptyState icon={Lock} title="Private servers your accounts own" description="Press Load owned servers. Each usable account is asked once." />
      ) : !baris.length ? (
        <EmptyState icon={Lock} title="None of your accounts owns a private server." description={diperiksa ? `Checked ${diperiksa} accounts.` : undefined} />
      ) : !terlihat.length ? (
        <EmptyState icon={Lock} title="No private server matches these filters." />
      ) : (
        <div role="grid" aria-label="Owned private servers" className="px-3 pb-3">
          <div role="row" className="grid items-center gap-2 border-b border-line-subtle px-2 py-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
            <span><Checkbox className="h-4 w-4" checked={semuaTercentang} onCheckedChange={(v) => setCentang(v === true ? terlihat.map(kunci) : [])} aria-label="Select all shown" /></span>
            <span>Name</span><span>Owner</span><span>Status</span><span>Price</span><span>Friends</span><span />
          </div>
          {kelompok.map(([uni, rows]) => (
            <div key={uni} role="rowgroup" data-game={uni}>
              <div role="row" className="flex items-center gap-2 px-2 pb-1 pt-3 text-xs font-semibold text-content-secondary">
                <span translate="no" className="truncate">{rows[0].nama_game || `Place ${rows[0].place_id}`}</span>
                <span className="font-normal text-content-muted">{rows.length}</span>
              </div>
              {rows.map((b) => {
                const k = kunci(b)
                const d = detail[k]
                const dicentang = centang.includes(k)
                return (
                  <div key={k} role="row" data-vip={b.vip_id} data-akun={b.akun_id} className={cn('grid items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2/40', dicentang && 'bg-accent/[0.08]')} style={{ gridTemplateColumns: template }}>
                    <span><Checkbox className="h-4 w-4" checked={dicentang} onCheckedChange={(v) => setCentang((c) => (v === true ? [...c, k] : c.filter((x) => x !== k)))} aria-label={`Select ${b.nama}`} /></span>
                    {ganti === k ? (
                      <NamaBaru awal={b.nama} onBatal={() => setGanti('')} onSimpan={(n) => { setGanti(''); if (n !== b.nama) void ubah(b, { nama: n }) }} />
                    ) : (
                      <span className="min-w-0 truncate font-medium text-content-primary" translate="no" title={b.nama}>{b.nama}</span>
                    )}
                    <span className="min-w-0 truncate text-content-secondary" translate="no">{alias(b.akun_id)}</span>
                    <span>{sibuk === k ? <Loader2 className="h-3.5 w-3.5 animate-spin text-content-muted" /> : <span className={cn('rounded px-1.5 text-xs font-medium', b.aktif ? 'bg-success/15 text-success' : 'bg-surface-3 text-content-muted')}>{b.aktif ? 'Active' : 'Off'}</span>}</span>
                    <span className="min-w-0 truncate text-xs text-content-secondary" title={teksBerlaku(b)}>{teksBerlaku(b)}</span>
                    <span className="text-xs text-content-secondary" data-teman={d ? String(d.teman) : undefined} title={!d && memuatDetail ? 'Reading details…' : undefined}>{d ? (d.teman ? 'Allowed' : 'Off') : memuatDetail ? '…' : '—'}</span>
                    <DropdownMenu onOpenChange={(o) => { if (o && !d) void bacaDetail(b) }}>
                      <DropdownMenuTrigger asChild>
                        <button type="button" aria-label={`Actions for ${b.nama}`} disabled={!!sibuk} className="flex h-8 w-8 items-center justify-center rounded text-content-muted hover:bg-surface-3 hover:text-content-primary disabled:opacity-40"><MoreHorizontal className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[15rem]">
                        <DropdownMenuItem icon={<Crosshair className="h-3.5 w-3.5" />} disabled={!b.aktif} onSelect={() => void jadikanTarget(b)}>Use as launch target</DropdownMenuItem>
                        <DropdownMenuItem icon={<Copy className="h-3.5 w-3.5" />} onSelect={() => void salinLink(b)}>Copy invite link</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem icon={<Pencil className="h-3.5 w-3.5" />} onSelect={() => setGanti(k)}>Rename…</DropdownMenuItem>
                        <DropdownMenuItem icon={<Power className="h-3.5 w-3.5" />} disabled={!b.aktif && habisBerbayar(b)} title={!b.aktif && habisBerbayar(b) ? 'Its paid period has ended: turning it on could renew it for Robux. CAM never buys.' : undefined} onSelect={() => void ubah(b, { aktif: !b.aktif })}>{b.aktif ? 'Turn off' : 'Turn on'}</DropdownMenuItem>
                        <DropdownMenuItem icon={<Users className="h-3.5 w-3.5" />} disabled={!d} onSelect={() => void ubah(b, { teman: !d?.teman })}>{d?.teman ? 'Don’t allow friends' : 'Allow friends'}</DropdownMenuItem>
                        <DropdownMenuItem icon={<RefreshCw className="h-3.5 w-3.5" />} onSelect={() => void ubah(b, { link_baru: true })}>New invite link</DropdownMenuItem>
                        {b.harga !== null && b.perpanjang ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="danger" icon={<Ban className="h-3.5 w-3.5" />} onSelect={() => hentikan(b)}>Stop renewal…</DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          ))}
          {gagal.length ? <p className="px-2 pt-3 text-xs text-warning">{gagal.join(' · ')}</p> : null}
        </div>
      )}
    </section>
  )
}

function NamaBaru({ awal, onSimpan, onBatal }: { awal: string; onSimpan: (n: string) => void; onBatal: () => void }) {
  const [nama, setNama] = useState(awal)
  const simpan = () => (nama.trim() ? onSimpan(nama.trim()) : onBatal())
  return (
    <span className="flex min-w-0 items-center gap-1">
      <input autoFocus value={nama} maxLength={50} onChange={(e) => setNama(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') simpan(); if (e.key === 'Escape') onBatal() }} aria-label="Private server name" className="h-8 min-w-0 flex-1 rounded border border-accent/60 bg-app px-2 text-sm text-content-primary outline-none" />
      <button type="button" aria-label="Save name" onClick={simpan} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-content-secondary hover:bg-surface-3"><Check className="h-4 w-4" /></button>
    </span>
  )
}
