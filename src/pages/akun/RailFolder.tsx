import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, CheckSquare, EyeOff, FileOutput, FolderOpen, FolderPlus, Layers, Lock, MoreHorizontal, Palette, Pencil, Play, Trash2 } from '@/components/ikon'
import type { Akun, Folder } from '@/api/types'
import { DND_AKUN, IkonFolder, folderAkun, labelPreset } from '@/lib/folder'
import { cocokCari } from '@/lib/saring-akun'
import { folderAksi, pindahAkun, toggleMulti, toggleProteksi, toggleSembunyikan, useCam } from '@/stores/cam'
import { luncurFolder, sedangLuncur } from '@/logic/luncur'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { Checkbox } from '@/components/ui/Controls'
import { Tooltip } from '@/components/ui/Tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { GERAK, ItemMenu } from '@/components/shell/ItemMenu'

function bacaIds(e: DragEvent): string[] {
  try {
    const v = JSON.parse(e.dataTransfer.getData(DND_AKUN))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const pudar = (lipat: boolean, buka: string) => cn('transition-all', GERAK, lipat ? 'pointer-events-none w-0 opacity-0' : cn('opacity-100', buka))

export function NavAkun({ lipat }: { lipat: boolean }) {
  const akun = useCam((s) => s.akun)
  const folder = useCam((s) => s.folder)
  const filter = useCam((s) => s.filterFolder)
  const dipilih = useCam((s) => s.dipilih)
  const cari = useUIStore((s) => s.cariAkun)
  const [seret, setSeret] = useState(false)

  const anggota = (id: string | null) => akun.filter((a) => folderAkun(a, folder) === id)
  const tanpa = anggota(null)
  const cocok = (id: string | null) => anggota(id).filter((a) => cocokCari(a, cari, folder)).length
  const setFilter = (v: string) => useCam.setState({ filterFolder: filter === v && v !== 'semua' ? 'semua' : v })
  const filterSah = filter === 'semua' || filter === 'tanpa' || folder.some((f) => f.id === filter) ? filter : 'semua'

  return (
    <>
      <nav
        aria-label="Folders"
        className="-mx-1 flex min-h-[8.5rem] flex-col gap-1 overflow-y-auto overflow-x-hidden px-1 no-scrollbar"
        onDragEnter={(e) => { if (e.dataTransfer.types.includes(DND_AKUN)) setSeret(true) }}
        onDragEnd={() => setSeret(false)}
        onDrop={() => setSeret(false)}
      >
        <div className={cn('flex shrink-0 items-center overflow-hidden pl-1 transition-all', GERAK, lipat ? 'h-0 opacity-0' : 'h-8 opacity-100')}>
          <span className="flex-1 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">Folders</span>
          <button type="button" tabIndex={lipat ? -1 : 0} className="flex size-8 items-center justify-center rounded-md text-content-muted hover:bg-surface-2 hover:text-content-primary" aria-label="New folder" title="New folder" onClick={folderAksi.baru}>
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        <ItemMenu ikon={FolderOpen} label="All accounts" jumlah={akun.length} aktif={filterSah === 'semua'} lipat={lipat} onClick={() => setFilter('semua')} />
        {folder.map((f, i) => (
          <BarisFolder key={f.id} f={f} anggota={anggota(f.id)} cocok={cocok(f.id)} dipilih={dipilih} aktif={filterSah === f.id} lipat={lipat} pertama={i === 0} terakhir={i === folder.length - 1} onFilter={() => setFilter(f.id)} />
        ))}
        {tanpa.length || seret ? (
          <BarisFolder f={null} anggota={tanpa} cocok={cocok(null)} dipilih={dipilih} aktif={filterSah === 'tanpa'} lipat={lipat} onFilter={() => setFilter('tanpa')} />
        ) : null}
        {!folder.length ? (
          <p className={cn('overflow-hidden pl-1 text-xs leading-relaxed text-content-muted transition-all', GERAK, lipat ? 'max-h-0 opacity-0' : 'mt-1 max-h-24 opacity-100')} style={{ width: 228 }}>
            Make folders to group accounts (Farming, Alts…). Drag accounts onto a folder to move them.
          </p>
        ) : null}
      </nav>
      <Sakelar lipat={lipat} />
    </>
  )
}

function Sakelar({ lipat }: { lipat: boolean }) {
  const multiAktif = useCam((s) => s.multiAktif)
  const proteksi = useCam((s) => s.proteksi)
  const sembunyikan = useCam((s) => s.sembunyikanUsername)
  const label = !proteksi?.setelan ? null : proteksi.aktif ? 'Active' : 'On'
  return (
    <div className="mt-auto flex shrink-0 flex-col gap-1 border-t border-line-subtle pt-3">
      <div className={cn('overflow-hidden whitespace-nowrap pl-1 text-xs font-semibold uppercase tracking-[0.08em] text-content-muted transition-all', GERAK, lipat ? 'h-0 opacity-0' : 'h-6 opacity-100')}>Session</div>
      <BarisSakelar lipat={lipat} ikon={<Layers className="h-4 w-4" />} label="Multi-instance" nyala={multiAktif} onClick={() => void toggleMulti()} title={multiAktif ? 'Multi-instance is on — more than one Roblox client can open' : 'Multi-instance is off (always off when the app starts)'} />
      <BarisSakelar
        lipat={lipat}
        ikon={<Lock className="h-4 w-4" />}
        label="Sign-in protection"
        nyala={!!proteksi?.setelan}
        disabled={!proteksi}
        onClick={() => void toggleProteksi()}
        nada={proteksi?.aktif ? (proteksi.berkas < proteksi.total ? 'text-warning' : 'text-success') : undefined}
        status={label}
        title={!proteksi ? undefined : !proteksi.setelan ? "Sign-in protection is off: Roblox clients share one sign-in file and can overwrite each other's session" : `Locks Roblox's shared sign-in files while this app's clients run${proteksi.aktif ? ` (${proteksi.berkas} of ${proteksi.total})` : ''}`}
      />
      <BarisSakelar lipat={lipat} ikon={<EyeOff className="h-4 w-4" />} label="Hide usernames" nyala={sembunyikan} onClick={() => void toggleSembunyikan()} title="Mask Roblox usernames for recordings and screenshots. Aliases and avatars stay visible." />
    </div>
  )
}

function BarisSakelar({ lipat, ikon, label, nyala, onClick, disabled, nada, status, title }: { lipat: boolean; ikon: ReactNode; label: string; nyala: boolean; onClick: () => void; disabled?: boolean; nada?: string; status?: string | null; title?: string }) {
  return (
    <Tooltip side="right" disabled={!lipat} content={<span className="flex items-center gap-1.5"><span>{label}</span><span className={nyala ? 'text-success' : 'text-content-muted'}>{status || (nyala ? 'On' : 'Off')}</span></span>}>
      <button
        type="button"
        role="switch"
        aria-checked={nyala}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        title={lipat ? undefined : [title, status].filter(Boolean).join(' · ') || undefined}
        className={cn(
          'relative flex h-10 shrink-0 items-center overflow-hidden rounded-lg text-sm transition-all disabled:opacity-50',
          GERAK,
          lipat ? 'w-10 justify-center px-0' : 'w-full px-3',
          nyala ? 'text-content-primary' : 'text-content-secondary',
          'hover:bg-surface-2',
        )}
      >
        <span className={cn('flex size-4 shrink-0 items-center justify-center', nada ?? (nyala ? 'text-content-primary' : 'text-content-muted'))}>{ikon}</span>
        <span className={cn('min-w-0 overflow-hidden truncate whitespace-nowrap text-left', pudar(lipat, 'ml-3 flex-1'))}>{label}</span>
        <span aria-hidden className={cn('relative h-5 shrink-0 rounded-full border transition-all', GERAK, lipat ? 'w-0 border-0 opacity-0' : 'ml-2 w-9 opacity-100', nyala ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3')}>
          <span className={cn('absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all', GERAK, nyala ? 'left-[18px] bg-accent-fg' : 'left-[2px] bg-content-muted')} />
        </span>
        {lipat ? <span className={cn('absolute right-1 top-1 size-1.5 rounded-full', nyala ? 'bg-success' : 'bg-transparent')} aria-hidden /> : null}
      </button>
    </Tooltip>
  )
}

function BarisFolder({ f, anggota, cocok, dipilih, aktif, lipat, pertama, terakhir, onFilter }: { f: Folder | null; anggota: Akun[]; cocok: number; dipilih: string[]; aktif: boolean; lipat: boolean; pertama?: boolean; terakhir?: boolean; onFilter: () => void }) {
  const [ubah, setUbah] = useState(false)
  const [nama, setNama] = useState(f?.nama ?? '')
  const [atas, setAtas] = useState(false)
  const label = f ? f.nama : 'Ungrouped'
  const bisaPilih = anggota.filter((a) => !a.utama)
  const terpilih = bisaPilih.filter((a) => dipilih.includes(a.id)).length
  const penuh = bisaPilih.length > 0 && terpilih === bisaPilih.length

  const simpan = () => {
    setUbah(false)
    const n = nama.trim()
    if (f && n && n !== f.nama) void folderAksi.ubahNama(f, n)
    else setNama(f?.nama ?? '')
  }
  const kunci = (e: KeyboardEvent) => {
    if (e.key === 'F2' && f) {
      e.preventDefault()
      setNama(f.nama)
      setUbah(true)
    }
  }
  const lepas = (e: DragEvent) => {
    setAtas(false)
    const ids = bacaIds(e)
    if (ids.length) void pindahAkun(ids, f?.id ?? null)
  }

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DND_AKUN)) { e.preventDefault(); setAtas(true) } }}
      onDragLeave={() => setAtas(false)}
      onDrop={lepas}
      className={cn(
        'group relative flex h-10 shrink-0 items-center overflow-hidden rounded-lg transition-all',
        GERAK,
        lipat ? 'w-10 justify-center' : 'w-full pl-2 pr-0.5',
        aktif ? 'bg-surface-3' : 'hover:bg-surface-2',
        atas && 'outline outline-2 outline-accent/70',
      )}
      title={f?.preset && !lipat ? `${f.nama} — ${labelPreset(f.preset)}` : undefined}
    >
      <span className={pudar(lipat, 'mr-2 w-5')}>
        <Checkbox
          className="h-5 w-5"
          tabIndex={lipat ? -1 : undefined}
          checked={penuh}
          indeterminate={terpilih > 0 && !penuh}
          disabled={!bisaPilih.length}
          onCheckedChange={() => folderAksi.pilihSemua(anggota, penuh)}
          aria-label={`Select all in ${label}`}
          title={bisaPilih.length < anggota.length ? 'Main accounts are left out' : undefined}
        />
      </span>
      {ubah && f && !lipat ? (
        <input
          autoFocus
          value={nama}
          maxLength={40}
          onChange={(e) => setNama(e.target.value)}
          onBlur={simpan}
          onKeyDown={(e) => {
            if (e.key === 'Enter') simpan()
            if (e.key === 'Escape') { setNama(f.nama); setUbah(false) }
          }}
          aria-label="Folder name"
          className="h-8 min-w-0 flex-1 rounded border border-accent/60 bg-app px-2 text-sm text-content-primary outline-none"
        />
      ) : (
        <Tooltip side="right" disabled={!lipat} content={<span>{label} · {anggota.length}</span>}>
          <button
            type="button"
            onClick={onFilter}
            onDoubleClick={() => { if (f && !lipat) { setNama(f.nama); setUbah(true) } }}
            onKeyDown={kunci}
            aria-current={aktif ? 'true' : undefined}
            aria-label={lipat ? label : undefined}
            className={cn('flex h-10 min-w-0 items-center text-left text-sm', lipat ? 'w-10 justify-center' : 'flex-1', aktif ? 'text-content-primary' : 'text-content-secondary hover:text-content-primary')}
          >
            <IkonFolder f={f} size={16} />
            <span className={cn('min-w-0 overflow-hidden truncate whitespace-nowrap', pudar(lipat, 'ml-2.5 flex-1'))} translate={f ? 'no' : undefined} title={f && !lipat ? label : undefined}>{label}</span>
            <span className={cn('tnum text-xs text-content-muted', pudar(lipat, 'ml-2'))} title={cocok !== anggota.length ? `${cocok} match the search` : undefined}>{anggota.length}</span>
          </button>
        </Tooltip>
      )}
      <span className={pudar(lipat, 'ml-0.5 w-8')}>
        <MenuFolder f={f} label={label} anggota={anggota} pertama={pertama} terakhir={terakhir} onUbahNama={() => { if (f) { setNama(f.nama); setUbah(true) } }} />
      </span>
    </div>
  )
}

function MenuFolder({ f, label, anggota, pertama, terakhir, onUbahNama }: { f: Folder | null; label: string; anggota: Akun[]; pertama?: boolean; terakhir?: boolean; onUbahNama: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${label} options`} title={`${label} options`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-content-muted opacity-0 hover:bg-surface-3 hover:text-content-primary focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[15rem]">
        <DropdownMenuItem icon={<CheckSquare className="h-3.5 w-3.5" />} onSelect={() => folderAksi.pilihSemua(anggota, false)}>Select all ({anggota.length})</DropdownMenuItem>
        <DropdownMenuItem icon={<Play className="h-3.5 w-3.5" />} disabled={!anggota.length || sedangLuncur()} onSelect={() => void luncurFolder(anggota, label)}>Launch folder</DropdownMenuItem>
        {f ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<Pencil className="h-3.5 w-3.5" />} onSelect={onUbahNama}>Rename</DropdownMenuItem>
            <DropdownMenuItem icon={<Palette className="h-3.5 w-3.5" />} onSelect={() => folderAksi.edit(f)}>Color, icon &amp; saver preset…</DropdownMenuItem>
            <DropdownMenuItem icon={<FileOutput className="h-3.5 w-3.5" />} onSelect={() => void folderAksi.ekspor(f)}>Export profile…</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<ArrowUp className="h-3.5 w-3.5" />} disabled={pertama} onSelect={() => void folderAksi.geser(f, -1)}>Move up</DropdownMenuItem>
            <DropdownMenuItem icon={<ArrowDown className="h-3.5 w-3.5" />} disabled={terakhir} onSelect={() => void folderAksi.geser(f, 1)}>Move down</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onSelect={() => folderAksi.hapus(f, anggota.length)}>Delete folder</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
