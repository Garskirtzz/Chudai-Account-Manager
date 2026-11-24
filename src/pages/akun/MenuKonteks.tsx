import { useEffect } from 'react'
import { CheckSquare, Copy, FolderPlus, Gauge, KeyRound, Pencil, Play, RefreshCw, Square, Trash2, UserRound, Wrench } from '@/components/ikon'
import type { Akun, Folder } from '@/api/types'
import { luncurSatu, luncurTerpilih } from '@/logic/luncur'
import { IkonFolder, folderAkun } from '@/lib/folder'
import { bukaDialog, hapusAkun, perbaruiCookie, pindahAkun, salinCookie, segarkan, setDipilih, setFokus, useCam } from '@/stores/cam'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { bukaPanel } from './PanelKanan'

export interface Konteks {
  x: number
  y: number
  ids: string[]
  asal: string
  centang: boolean
}

export function konteksDari(target: EventTarget | null, wadah: HTMLElement, x: number, y: number, dipilih: string[]): Konteks | null {
  const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-id]')
  if (!el || !wadah.contains(el) || !el.dataset.id) return null
  const id = el.dataset.id
  const centang = dipilih.includes(id)
  return { x, y, ids: centang ? [...dipilih] : [id], asal: id, centang }
}

export function MenuKonteks({ k, folder, onTutup, onPilihSemua, semuaDipilih }: { k: Konteks; folder: Folder[]; onTutup: () => void; onPilihSemua: () => void; semuaDipilih: boolean }) {
  const akun = useCam((s) => s.akun)
  const dipilih = useCam((s) => s.dipilih)
  const sibukLuncur = useCam((s) => !!s.statusLuncur || !!s.antrean)
  const daftar = k.ids.map((id) => akun.find((a) => a.id === id)).filter((a): a is Akun => !!a)
  const n = daftar.length
  useEffect(() => {
    if (n) return
    onTutup()
    requestAnimationFrame(() => (document.querySelector<HTMLElement>('[data-baris]') ?? document.querySelector<HTMLElement>('[title="Add account (Ctrl+N)"]'))?.focus())
  }, [n, onTutup])
  if (!n) return null
  const satu = n === 1 ? daftar[0] : null
  const label = (s: string) => (n === 1 ? s : `${s} (${n} accounts)`)
  const folderSama = daftar.every((a) => folderAkun(a, folder) === folderAkun(daftar[0], folder)) ? folderAkun(daftar[0], folder) : undefined
  const ids = daftar.map((a) => a.id)
  const berurutan = async (fn: (a: Akun) => Promise<unknown>) => {
    for (const a of daftar) await fn(a)
  }

  return (
    <DropdownMenu open onOpenChange={(o) => { if (!o) onTutup() }}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden style={{ position: 'fixed', left: k.x, top: k.y, width: 0, height: 0 }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={2}
        className="w-[16rem]"
        aria-label={satu ? `Actions for ${satu.alias}` : `Actions for ${n} accounts`}
        data-menu-konteks
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          ;(document.querySelector<HTMLElement>(`[data-id="${CSS.escape(k.asal)}"]`) ?? document.querySelector<HTMLElement>('[data-baris]'))?.focus()
        }}
      >
        <DropdownMenuItem
          icon={<Play className="h-3.5 w-3.5" />}
          disabled={sibukLuncur}
          onSelect={() => (satu && !k.centang ? void luncurSatu(satu) : void luncurTerpilih())}
        >
          {n === 1 ? 'Launch' : `Launch ${n} accounts`}
        </DropdownMenuItem>
        {satu ? (
          <DropdownMenuItem icon={<UserRound className="h-3.5 w-3.5" />} onSelect={() => { setFokus(satu.id); bukaPanel('akun') }}>Details</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<RefreshCw className="h-3.5 w-3.5" />} onSelect={() => void berurutan((a) => segarkan(a.id))}>{label('Refresh data')}</DropdownMenuItem>
        <DropdownMenuItem icon={<KeyRound className="h-3.5 w-3.5" />} onSelect={() => void berurutan((a) => perbaruiCookie(a))}>{label('Refresh cookie')}</DropdownMenuItem>
        {satu ? (
          <>
            <DropdownMenuItem icon={<Pencil className="h-3.5 w-3.5" />} onSelect={() => bukaDialog({ jenis: 'alias', akun: satu })}>Rename</DropdownMenuItem>
            <DropdownMenuItem icon={<Gauge className="h-3.5 w-3.5" />} onSelect={() => bukaDialog({ jenis: 'fps', akun: satu })}>{satu.fps_cap ? `FPS limit (${satu.fps_cap})` : 'FPS limit'}</DropdownMenuItem>
            <DropdownMenuItem icon={<Copy className="h-3.5 w-3.5" />} onSelect={() => salinCookie(satu)}>Copy cookie</DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem icon={<Wrench className="h-3.5 w-3.5" />} onSelect={() => { setDipilih(ids); bukaDialog({ jenis: 'alat' }) }}>Account tools…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger icon={<IkonFolder f={null} size={14} />}>{n === 1 ? 'Move to folder' : `Move ${n} accounts to folder`}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[14rem]">
            {folder.map((f) => (
              <DropdownMenuItem key={f.id} icon={<IkonFolder f={f} size={14} />} disabled={folderSama === f.id} onSelect={() => void pindahAkun(ids, f.id)}>
                <span translate="no">{f.nama}</span>{folderSama === f.id ? ' (current)' : ''}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem icon={<IkonFolder f={null} size={14} />} disabled={folderSama === null} onSelect={() => void pindahAkun(ids, null)}>
              Ungrouped{folderSama === null ? ' (current)' : ''}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<FolderPlus className="h-3.5 w-3.5" />} onSelect={() => bukaDialog({ jenis: 'folder', folder: null, pindahkan: ids })}>New folder…</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        {semuaDipilih ? (
          <DropdownMenuItem icon={<Square className="h-3.5 w-3.5" />} onSelect={() => setDipilih([])}>Clear selection</DropdownMenuItem>
        ) : (
          <DropdownMenuItem icon={<CheckSquare className="h-3.5 w-3.5" />} onSelect={onPilihSemua}>Select all</DropdownMenuItem>
        )}
        {dipilih.length && !semuaDipilih ? <DropdownMenuItem icon={<Square className="h-3.5 w-3.5" />} onSelect={() => setDipilih([])}>Clear selection</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="danger"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          disabled={sibukLuncur}
          shortcut="Del"
          onSelect={() => (satu ? hapusAkun(satu) : bukaDialog({ jenis: 'hapus', ids }))}
        >
          {n === 1 ? 'Delete account…' : `Delete ${n} accounts…`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
