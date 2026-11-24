import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Ban, CheckCircle2, Search, ShieldOff, Tag, UserPlus, Wrench, XCircle } from '@/components/ikon'
import { api, FPS_SAVER, namaProfilHemat, PROFIL_HEMAT } from '@/api/api'
import type { Akun, HasilCariUser, HasilMassal, UserDiblokir } from '@/api/types'
import { beriTahu, pindahAkun, tutupDialog, ubahAfk, ubahHemat, ubahRejoin, useCam } from '@/stores/cam'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StatusLabel } from '@/components/ui/Badge'
import { Dialog, DialogBody, DialogContent } from '@/components/ui/Dialog'
import { JudulDialog, kelasInput } from './kecil'

interface Hasil { label: string; total: number; berhasil: number; gagal: string[]; dilewati: number }
interface Tanya { judul: string; label: string; jalan: () => void }

function Kotak({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} className="rounded-lg border border-line bg-app/30 p-3.5">{children}</section>
}

function Jumlah({ aktif, n }: { aktif: number; n: number }) {
  if (!n) return null
  return <StatusLabel tone={aktif === n ? 'success' : aktif === 0 ? 'muted' : 'warning'} className="text-xs font-normal">{aktif} of {n} on</StatusLabel>
}

export function DialogAlat() {
  const akun = useCam((s) => s.akun)
  const dipilih = useCam((s) => s.dipilih)
  const folder = useCam((s) => s.folder)
  const akunDipilih = akun.filter((a) => dipilih.includes(a.id))
  const [folderTujuan, setFolderTujuan] = useState('')
  const [target, setTarget] = useState('')
  const [ketemu, setKetemu] = useState<HasilCariUser | null>(null)
  const [namaBaru, setNamaBaru] = useState('')
  const [sibuk, setSibuk] = useState('')
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [blokir, setBlokir] = useState<UserDiblokir[] | null>(null)
  const [tanya, setTanya] = useState<Tanya | null>(null)
  const [ramMassal, setRamMassal] = useState(512)
  const [fpsMassal, setFpsMassal] = useState(10)
  const [hasilHemat, setHasilHemat] = useState<{ gagal: number; teks: string } | null>(null)
  const [afkMenit, setAfkMenitLokal] = useState(15)
  const kotakTanya = useRef<HTMLDivElement>(null)

  const ids = akunDipilih.map((a) => a.id)
  const n = ids.length
  const bukanUtama = akunDipilih.filter((a) => !a.utama)
  const pertama = akunDipilih[0]
  const jumlahAkun = `${n} selected account${n === 1 ? '' : 's'}`
  const hematAktif = akunDipilih.filter((a) => a.hemat).length
  const rejoinAktif = akunDipilih.filter((a) => a.auto_rejoin).length
  const afkAktif = akunDipilih.filter((a) => a.anti_afk).length
  const kunci = !!sibuk && sibuk !== 'cari'

  useEffect(() => { if (tanya) kotakTanya.current?.querySelector('button')?.focus() }, [tanya])
  useEffect(() => { api.afkMenit().then((m) => setAfkMenitLokal(Number(m) || 15), () => undefined) }, [])
  const kunciSeleksi = ids.join(',')
  useEffect(() => { setBlokir(null); setHasil(null); setTanya(null); setHasilHemat(null) }, [kunciSeleksi])

  const ubahMenit = (m: number) => {
    setAfkMenitLokal(m)
    api.setAfkMenit(m).then((v) => setAfkMenitLokal(Number(v) || m), (e) => beriTahu(`Anti-AFK: ${e}`, 'salah'))
  }

  const cari = async () => {
    setSibuk('cari')
    setKetemu(null)
    try {
      setKetemu(await api.cariUser(target, ids[0]))
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      setSibuk('')
    }
  }

  const jalankan = async (nama: string, label: string, sasaran: string[], fn: () => Promise<HasilMassal>) => {
    setTanya(null)
    setSibuk(nama)
    setHasil(null)
    try {
      const r = await fn()
      const dilewati = Math.max(0, sasaran.length - r.berhasil - r.gagal.length)
      const h = { label, total: sasaran.length, berhasil: r.berhasil, gagal: r.gagal, dilewati }
      setHasil(h)
      beriTahu(`${label}: ${r.berhasil} succeeded · ${r.gagal.length} failed${dilewati ? ` · ${dilewati} skipped` : ''}`, r.gagal.length || dilewati ? 'salah' : 'benar')
      for (const g of r.gagal) beriTahu(`  ${g}`, 'salah')
      return h
    } catch (e) {
      beriTahu(`${label} failed: ${e}`, 'salah')
    } finally {
      setSibuk('')
    }
  }
  const konfirmasi = (judul: string, label: string, jalan: () => void) => setTanya({ judul, label, jalan })

  const muatBlokir = async () => {
    setSibuk('blokir')
    try {
      setBlokir(await api.daftarBlokir(ids[0]))
    } catch (e) {
      beriTahu(String(e), 'salah')
    } finally {
      setSibuk('')
    }
  }

  const namaTarget = ketemu ? ketemu.username || `User ${ketemu.user_id}` : ''
  const cakupanUtama = (x: number) => (x === n ? jumlahAkun : `${x} of ${n} selected accounts (main accounts are left out)`)

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !kunci) tutupDialog() }}>
      <DialogContent size="lg" showClose={!kunci} onEscapeKeyDown={(e) => kunci && e.preventDefault()} onPointerDownOutside={(e) => kunci && e.preventDefault()}>
        <JudulDialog ikon={<Wrench className="h-4 w-4" />} judul={`Account tools — ${jumlahAkun}`} />
        <DialogBody className="space-y-4">
          <p className="text-sm leading-relaxed text-content-muted">
            Actions in the first two sections run on all <span className="font-semibold text-content-primary">{jumlahAkun}</span>
            {n ? <>: <span className="text-content-primary" translate="no">{akunDipilih.map((a) => a.alias).join(', ')}</span></> : null}.
          </p>

          <Kotak label="Target player">
            <div className="flex items-end gap-2">
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-xs font-medium text-content-secondary">Target player <span className="font-normal text-content-muted">(username, profile link or ID)</span></span>
                <input value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && target) void cari() }} placeholder="Builderman" className={kelasInput} />
              </label>
              <Button size="md" variant="secondary" onClick={() => void cari()} disabled={!target || !!sibuk}><Search className="h-4 w-4" />{sibuk === 'cari' ? 'Finding…' : 'Find'}</Button>
            </div>
            {ketemu ? (
              <p className="mt-2 select-text text-sm text-content-muted">
                <span className="font-semibold text-content-primary" translate="no">{namaTarget}</span> #{ketemu.user_id}
                {ketemu.place_id ? <> — playing <span translate="no">{ketemu.game_name}</span></> : ' — not in a game'}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={!ketemu || !!sibuk} onClick={() => konfirmasi(`Block ${namaTarget} on ${jumlahAkun}?`, `Block on ${n}`, () => void jalankan('block', `Block ${namaTarget}`, ids, () => api.blokirUser(ids, ketemu!.user_id, false)))}><Ban className="h-3.5 w-3.5" />Block</Button>
              <Button size="sm" variant="secondary" disabled={!ketemu || !!sibuk} onClick={() => konfirmasi(`Unblock ${namaTarget} on ${jumlahAkun}?`, `Unblock on ${n}`, () => void jalankan('unblock', `Unblock ${namaTarget}`, ids, () => api.blokirUser(ids, ketemu!.user_id, true)))}><ShieldOff className="h-3.5 w-3.5" />Unblock</Button>
              <Button size="sm" variant="secondary" disabled={!ketemu || !!sibuk} onClick={() => konfirmasi(`Send a friend request to ${namaTarget} from ${jumlahAkun}?`, `Send from ${n}`, () => void jalankan('friend', `Friend request to ${namaTarget}`, ids, () => api.tambahTeman(ids, ketemu!.user_id)))}><UserPlus className="h-3.5 w-3.5" />Add friend</Button>
            </div>
          </Kotak>

          <Kotak label="Display name">
            <div className="flex items-end gap-2">
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-xs font-medium text-content-secondary">New display name <span className="font-normal text-content-muted">(Roblox allows one change per 7 days)</span></span>
                <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="NewName" className={kelasInput} />
              </label>
              <Button size="md" variant="secondary" disabled={namaBaru.trim().length < 3 || !!sibuk} onClick={() => konfirmasi(`Rename ${jumlahAkun} to "${namaBaru.trim()}"?`, `Rename ${n}`, () => void jalankan('nama', `Display name "${namaBaru.trim()}"`, ids, () => api.ubahDisplayName(ids, namaBaru.trim())))}><Tag className="h-4 w-4" />Apply</Button>
            </div>
          </Kotak>

          {tanya ? (
            <div ref={kotakTanya} role="alertdialog" aria-label="Confirm bulk action" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setTanya(null) } }} className="rounded-lg border border-warning/40 bg-warning/[0.07] p-3.5">
              <p className="flex gap-2 text-sm text-content-primary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span><span className="font-semibold">{tanya.judul}</span><span className="block text-content-muted">This will run on {jumlahAkun}, one request per account.</span></span>
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="md" variant="ghost" onClick={() => setTanya(null)}>Cancel</Button>
                <Button size="md" variant="primary" onClick={tanya.jalan}>{tanya.label}</Button>
              </div>
            </div>
          ) : null}

          {hasil ? <HasilMassalView h={hasil} akunDipilih={akunDipilih} /> : null}

          {folder.length ? (
            <Kotak label="Folder">
              <p className="text-sm font-semibold text-content-primary">Folder</p>
              <p className="text-sm text-content-muted">Move the selected accounts. A folder's resource saver preset is applied to accounts moved into it.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select value={folderTujuan} onValueChange={setFolderTujuan} ariaLabel="Move selected accounts to folder" options={[{ value: '', label: 'Ungrouped' }, ...folder.map((f) => ({ value: f.id, label: f.nama, data: true }))]} />
                <Button size="md" variant="secondary" disabled={!n} onClick={() => void pindahAkun(ids, folderTujuan || null)}>Move {n} account{n === 1 ? '' : 's'}</Button>
              </div>
            </Kotak>
          ) : null}

          <Kotak label="Resource saver">
            <p className="flex items-center gap-2 text-sm font-semibold text-content-primary">Resource saver (AFK) <Jumlah aktif={hematAktif} n={n} /></p>
            <p className="text-sm text-content-muted">{fpsMassal} FPS, low graphics, low priority{ramMassal ? `, RAM limit ${ramMassal} MB` : ''}. Applies from the next launch.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Resource saver profiles">
              {PROFIL_HEMAT.map((p) => (
                <Button
                  key={p.nama}
                  size="md"
                  variant="secondary"
                  disabled={!!sibuk || !bukanUtama.length}
                  title={`${p.fps} FPS, low graphics, low priority, RAM limit ${p.ram} MB.${bukanUtama.length < n ? ' Main accounts are left out.' : ''}`}
                  onClick={() => konfirmasi(`Apply ${p.nama} to ${cakupanUtama(bukanUtama.length)}? ${p.fps} FPS with a ${p.ram} MB RAM limit.`, `Apply to ${bukanUtama.length}`, async () => {
                    setTanya(null)
                    setHasilHemat(null)
                    setFpsMassal(p.fps)
                    setRamMassal(p.ram)
                    const gagal = (await ubahHemat(bukanUtama, { hemat: true, hemat_ram_mb: p.ram, hemat_fps: p.fps })) || 0
                    setHasilHemat({ gagal, teks: `${p.nama} applied to ${bukanUtama.length - gagal} of ${bukanUtama.length} · ${p.fps} FPS · RAM limit ${p.ram} MB` })
                  })}
                >
                  {p.nama}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select value={String(fpsMassal)} onValueChange={(v) => setFpsMassal(Number(v))} ariaLabel="FPS for selected accounts" labelLain={(v) => `FPS: ${v}`} title="FPS applied when turning resource saver on" options={FPS_SAVER.map((f) => ({ value: String(f), label: `FPS: ${f}` }))} />
              <Select value={String(ramMassal)} onValueChange={(v) => setRamMassal(Number(v))} ariaLabel="RAM limit for selected accounts" labelLain={(v) => `RAM: ${v} MB`} title="RAM limit applied when turning resource saver on" options={[{ value: '0', label: 'RAM: Off' }, { value: '1024', label: 'RAM: 1024 MB' }, { value: '512', label: 'RAM: 512 MB' }, { value: '256', label: 'RAM: 256 MB' }, { value: '128', label: 'RAM: 128 MB (more CPU)' }]} />
              <Button size="md" variant="secondary" disabled={!!sibuk || !bukanUtama.length} title={bukanUtama.length < n ? 'Main accounts are left out.' : undefined} onClick={() => konfirmasi(`Turn resource saver on for ${cakupanUtama(bukanUtama.length)} at ${fpsMassal} FPS${ramMassal ? ` with a ${ramMassal} MB RAM limit` : ', RAM limit off'}?`, `Turn on for ${bukanUtama.length}`, async () => {
                setTanya(null)
                setHasilHemat(null)
                const gagal = (await ubahHemat(bukanUtama, { hemat: true, hemat_ram_mb: ramMassal, hemat_fps: fpsMassal })) || 0
                setHasilHemat({ gagal, teks: `Turned on for ${bukanUtama.length - gagal} of ${bukanUtama.length} · ${fpsMassal} FPS${ramMassal ? ` · RAM limit ${ramMassal} MB` : ' · RAM limit off'}` })
              })}>Turn on</Button>
              <Button size="md" variant="secondary" disabled={!!sibuk || !n || !hematAktif} onClick={() => konfirmasi(`Turn resource saver off for ${jumlahAkun}?`, `Turn off for ${n}`, async () => {
                setTanya(null)
                setHasilHemat(null)
                const gagal = (await ubahHemat(akunDipilih, { hemat: false })) || 0
                setHasilHemat({ gagal, teks: `Turned off for ${n - gagal} of ${n}` })
              })}>Turn off</Button>
            </div>
            {hasilHemat ? (
              <p role="status" className={cn('mt-2 flex items-center gap-1.5 text-sm', hasilHemat.gagal ? 'text-warning' : 'text-success')}>
                {hasilHemat.gagal ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {hasilHemat.teks}{hasilHemat.gagal ? ` · ${hasilHemat.gagal} failed (see Output)` : ''}. Relaunch to apply.
              </p>
            ) : null}
            {n ? (
              <ul className="mt-2 max-h-36 overflow-y-auto rounded-md border border-line-subtle" aria-label="Resource saver per account">
                {akunDipilih.map((a) => (
                  <li key={a.id} className="flex h-8 items-center gap-2 border-b border-line-subtle px-2.5 text-xs last:border-b-0">
                    <span className="min-w-0 flex-1 truncate text-content-primary" translate="no">{a.alias}</span>
                    <span className="min-w-0 flex-1 truncate text-content-muted" title={namaProfilHemat(a) || undefined}>{a.hemat ? `${a.hemat_fps || 10} FPS · ${a.hemat_ram_mb ? `RAM ${a.hemat_ram_mb} MB` : 'RAM limit off'}${a.hemat_minimize ? ' · minimize' : ''}` : ''}</span>
                    <StatusLabel tone={a.hemat ? 'success' : 'muted'} className="w-12 shrink-0 text-xs">{a.hemat ? 'On' : 'Off'}</StatusLabel>
                  </li>
                ))}
              </ul>
            ) : null}
          </Kotak>

          <Kotak label="Auto-rejoin">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-[14rem] flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-content-primary">Auto-rejoin <Jumlah aktif={rejoinAktif} n={n} /></p>
                <p className="text-sm text-content-muted">Launch again into the same game after a disconnect, crash or freeze. Not when you leave or close it yourself. Applies now.</p>
              </div>
              <Button size="md" variant="secondary" disabled={!!sibuk || !n || rejoinAktif === n} onClick={() => void ubahRejoin(akunDipilih, true)}>Turn on</Button>
              <Button size="md" variant="secondary" disabled={!!sibuk || !n || !rejoinAktif} onClick={() => void ubahRejoin(akunDipilih, false)}>Turn off</Button>
            </div>
          </Kotak>

          <Kotak label="Anti-AFK">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-[14rem] flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-content-primary">Anti-AFK <Jumlah aktif={afkAktif} n={n} /></p>
                <p className="text-sm text-content-muted">While you're away from the PC, each client briefly comes to the front for one F13 key press, so Roblox doesn't disconnect it for idling. Not while a full-screen app runs.</p>
                <label className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-content-muted">
                  Every
                  <Select value={String(afkMenit)} onValueChange={(v) => ubahMenit(Number(v))} ariaLabel="Anti-AFK interval" labelLain={(v) => `${v} minutes`} options={[5, 10, 15, 19].map((m) => ({ value: String(m), label: `${m} minutes${m === 15 ? ' (default)' : ''}` }))} />
                  for all accounts (Roblox disconnects after 20 idle minutes).
                </label>
              </div>
              <Button size="md" variant="secondary" disabled={!!sibuk || !n || afkAktif === n} onClick={() => void ubahAfk(akunDipilih, true)}>Turn on</Button>
              <Button size="md" variant="secondary" disabled={!!sibuk || !n || !afkAktif} onClick={() => void ubahAfk(akunDipilih, false)}>Turn off</Button>
            </div>
          </Kotak>

          <Kotak label="Blocked list">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-content-primary">Blocked list — first selected account only</p>
                <p className="truncate text-sm text-content-muted">{pertama ? <>Shows and changes blocks for <span translate="no">{pertama.alias}</span> only.</> : 'No account selected.'}</p>
              </div>
              <Button size="md" variant="secondary" onClick={() => void muatBlokir()} disabled={!!sibuk || !pertama}>{sibuk === 'blokir' ? 'Loading…' : blokir ? 'Reload' : 'Load'}</Button>
            </div>
            {blokir && pertama ? (
              !blokir.length ? (
                <p className="mt-2 text-sm text-content-muted">Nobody is blocked on <span translate="no">{pertama.alias}</span>.</p>
              ) : (
                <>
                  <ul className="mt-2 max-h-40 overflow-auto">
                    {blokir.map((b) => (
                      <li key={b.user_id} className="flex h-8 items-center gap-2 rounded px-1.5 text-sm text-content-primary hover:bg-surface-2">
                        <span className="min-w-0 flex-1 select-text truncate" translate="no">{b.nama}</span>
                        <Button size="sm" variant="ghost" disabled={!!sibuk} aria-label={`Unblock ${b.nama} on ${pertama.alias}`} onClick={() => void jalankan('unblock', `Unblock ${b.nama} on ${pertama.alias}`, [ids[0]], () => api.blokirUser([ids[0]], b.user_id, true)).then(muatBlokir)}>Unblock</Button>
                      </li>
                    ))}
                  </ul>
                  <Button size="md" variant="secondary" className="mt-2 w-full" disabled={!!sibuk} onClick={() => konfirmasi(`Unblock all ${blokir.length} players on ${pertama.alias}?`, 'Unblock everyone', async () => {
                    setTanya(null)
                    setSibuk('semua')
                    try {
                      const n2 = await api.bukaBlokirSemua(ids[0])
                      beriTahu(`Unblocked ${n2} on ${pertama.alias}.`, 'benar')
                      await muatBlokir()
                    } catch (e) {
                      beriTahu(String(e), 'salah')
                    } finally {
                      setSibuk('')
                    }
                  })}>Unblock everyone on <span translate="no">{pertama.alias}</span></Button>
                </>
              )
            ) : null}
          </Kotak>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function HasilMassalView({ h, akunDipilih }: { h: Hasil; akunDipilih: Akun[] }) {
  const gagalPer = new Map(h.gagal.map((g) => {
    const i = g.indexOf(': ')
    return i > 0 ? [g.slice(0, i), g.slice(i + 2)] : [g, '']
  }))
  const bersih = !h.gagal.length && !h.dilewati
  return (
    <div role="status" className={cn('rounded-lg border p-3.5', bersih ? 'border-success/40 bg-success/[0.06]' : 'border-warning/40 bg-warning/[0.07]')}>
      <p className="flex items-center gap-2 text-sm font-semibold text-content-primary">
        {bersih ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
        {h.label}: {h.berhasil} succeeded · {h.gagal.length} failed{h.dilewati ? ` · ${h.dilewati} skipped` : ''}
      </p>
      {h.total > 1 ? (
        <ul className="mt-2 max-h-36 overflow-auto">
          {akunDipilih.slice(0, h.total).map((a) => {
            const galat = gagalPer.get(a.alias)
            return (
              <li key={a.id} className="flex items-start gap-2 py-0.5 text-xs">
                <span className="w-28 shrink-0 truncate text-content-primary" translate="no">{a.alias}</span>
                {galat !== undefined ? (
                  <span className="flex min-w-0 select-text items-start gap-1 text-error"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{galat || 'Failed'}</span>
                ) : (
                  <span className="flex items-center gap-1 text-content-muted"><CheckCircle2 className="h-3.5 w-3.5" />{h.dilewati ? 'No error reported' : 'Done'}</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : h.gagal.length ? (
        <p className="mt-1 select-text text-xs text-error">{h.gagal.join(' · ')}</p>
      ) : null}
    </div>
  )
}
