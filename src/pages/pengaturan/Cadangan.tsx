import { useState } from 'react'
import { AlertTriangle, Archive, ArchiveRestore, FileArchive, Loader2, ShieldCheck } from '@/components/ikon'
import { api } from '@/api/api'
import { beriTahu, muat, muatFolder, muatServerTersimpan } from '@/stores/cam'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { JudulDialog, kelasInput } from '@/components/dialog/kecil'
import { Select } from '@/components/ui/Select'
import { Bagian, Isi } from './bagian'

const SANDI_MIN = 8

export function Cadangan() {
  const [mode, setMode] = useState<null | 'buat' | 'pulih'>(null)
  return (
    <div className="space-y-4">
      <Bagian
        judul="Backup"
        ket="The accounts file only opens on this PC and Windows user. A backup is protected by a password instead, so it also works after reinstalling Windows or on another PC. It holds every account with its cookie, folders with their presets, and saved servers."
      >
        <Isi className="flex flex-wrap items-center gap-2">
          <Button size="md" variant="secondary" onClick={() => setMode('buat')}><Archive className="h-4 w-4" />Back up accounts…</Button>
          <Button size="md" variant="secondary" onClick={() => setMode('pulih')}><ArchiveRestore className="h-4 w-4" />Restore from backup…</Button>
        </Isi>
      </Bagian>
      <BuatCadangan buka={mode === 'buat'} onTutup={() => setMode(null)} />
      <PulihkanCadangan buka={mode === 'pulih'} onTutup={() => setMode(null)} />
    </div>
  )
}

function Sandi({ id, label, nilai, onUbah, otomatis }: { id: string; label: string; nilai: string; onUbah: (v: string) => void; otomatis: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-content-secondary">{label}</label>
      <input id={id} type="password" value={nilai} onChange={(e) => onUbah(e.target.value)} autoComplete={otomatis} className={kelasInput} />
    </div>
  )
}

function BuatCadangan({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const tutup = () => {
    if (sibuk) return
    setSandi('')
    setUlang('')
    setGalat('')
    onTutup()
  }
  const panjang = [...sandi].length
  const pendek = sandi.length > 0 && panjang < SANDI_MIN
  const beda = ulang.length > 0 && ulang !== sandi
  const siap = panjang >= SANDI_MIN && ulang === sandi
  const buat = async () => {
    setSibuk(true)
    setGalat('')
    try {
      const [jalur, n] = await api.cadanganBuat(sandi)
      beriTahu(`Backed up ${n} account${n === 1 ? '' : 's'} to ${jalur}.`, 'benar')
      setSibuk(false)
      setSandi('')
      setUlang('')
      onTutup()
    } catch (e) {
      if (String(e) !== '__BATAL__') setGalat(String(e))
      setSibuk(false)
    }
  }
  return (
    <Dialog open={buka} onOpenChange={(o) => { if (!o) tutup() }}>
      <DialogContent size="sm">
        <JudulDialog ikon={<Archive className="h-4 w-4" />} judul="Back up accounts" />
        <form onSubmit={(e) => { e.preventDefault(); if (siap && !sibuk) void buat() }}>
          <DialogBody className="space-y-3">
            <Sandi id="cadangan-sandi" label="Backup password" nilai={sandi} onUbah={setSandi} otomatis="new-password" />
            <Sandi id="cadangan-ulang" label="Repeat the password" nilai={ulang} onUbah={setUlang} otomatis="new-password" />
            {pendek || beda ? <p role="status" className="text-sm text-warning">{pendek ? `Use at least ${SANDI_MIN} characters.` : "The passwords don't match."}</p> : null}
            <p className="flex gap-2 text-sm leading-relaxed text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Anyone with the file and the password can sign in to every account in it. The password can't be recovered: without it the backup is useless.</span>
            </p>
            {galat ? <p role="alert" className="text-sm leading-relaxed text-error">{galat}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" size="md" variant="ghost" onClick={tutup} disabled={sibuk}>Cancel</Button>
            <Button type="submit" size="md" variant="primary" disabled={sibuk || !siap}>{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{sibuk ? 'Saving…' : 'Choose where to save…'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PulihkanCadangan({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const [jalur, setJalur] = useState('')
  const [sandi, setSandi] = useState('')
  const [ganti, setGanti] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const bersih = () => {
    setJalur('')
    setSandi('')
    setGanti(false)
    setGalat('')
  }
  const tutup = () => {
    if (sibuk) return
    bersih()
    onTutup()
  }
  const pilih = async () => {
    setGalat('')
    try {
      setJalur(await api.cadanganPilih())
    } catch (e) {
      if (String(e) !== '__BATAL__') setGalat(String(e))
    }
  }
  const pulihkan = async () => {
    setSibuk(true)
    setGalat('')
    try {
      const l = await api.cadanganPulihkan(jalur, sandi, ganti)
      const bagian = [
        `${l.ditambah} added`,
        l.diganti && `${l.diganti} replaced`,
        l.dilewati && `${l.dilewati} kept as they were`,
        l.gagal && `${l.gagal} not restored${ganti ? " (the backup's cookie no longer signs in, or the entry was damaged)" : ' (damaged entries)'}`,
        l.folder_baru && `${l.folder_baru} new folder${l.folder_baru === 1 ? '' : 's'}`,
        l.server_baru && `${l.server_baru} new saved server${l.server_baru === 1 ? '' : 's'}`,
      ].filter(Boolean)
      beriTahu(`Restored: ${bagian.join(', ')}.`, l.gagal ? 'salah' : 'benar')
      await Promise.allSettled([muat(), muatFolder(), muatServerTersimpan()])
      setSibuk(false)
      bersih()
      onTutup()
    } catch (e) {
      setGalat(String(e))
      setSibuk(false)
    }
  }
  const nama = jalur.split(/[\\/]/).pop()
  return (
    <Dialog open={buka} onOpenChange={(o) => { if (!o) tutup() }}>
      <DialogContent size="sm">
        <JudulDialog ikon={<ArchiveRestore className="h-4 w-4" />} judul="Restore from backup" />
        <form onSubmit={(e) => { e.preventDefault(); if (jalur && sandi && !sibuk) void pulihkan() }}>
          <DialogBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Button type="button" size="md" variant="secondary" onClick={() => void pilih()} disabled={sibuk}><FileArchive className="h-4 w-4" />Choose backup file…</Button>
              <span className="min-w-0 flex-1 break-all text-sm text-content-muted" title={jalur} translate={nama ? 'no' : undefined}>{nama || 'No file chosen'}</span>
            </div>
            <Sandi id="pulih-sandi" label="Backup password" nilai={sandi} onUbah={setSandi} otomatis="current-password" />
            <div>
              <label className="mb-1 block text-sm text-content-secondary">Accounts already in the list</label>
              <Select
                value={ganti ? 'ganti' : 'simpan'}
                onValueChange={(v) => setGanti(v === 'ganti')}
                options={[{ value: 'simpan', label: 'Keep mine' }, { value: 'ganti', label: 'Replace with the backup' }]}
                ariaLabel="Accounts already in the list"
                className="w-full"
              />
            </div>
            <p className="flex gap-2 text-sm leading-relaxed text-content-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                {ganti
                  ? "An account is replaced only if the backup's cookie still signs in as that account, so a working cookie is never overwritten by an expired one."
                  : 'Accounts you already have stay exactly as they are; only missing ones are added.'}{' '}
                Cookies are stored encrypted with Windows DPAPI again.
              </span>
            </p>
            {galat ? <p role="alert" className="text-sm leading-relaxed text-error">{galat}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" size="md" variant="ghost" onClick={tutup} disabled={sibuk}>Cancel</Button>
            <Button type="submit" size="md" variant="primary" disabled={sibuk || !jalur || !sandi}>{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{sibuk ? 'Restoring…' : 'Restore'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
