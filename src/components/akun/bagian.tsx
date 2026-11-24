import { useState } from 'react'
import { Copy, Gauge, KeyRound, MoreHorizontal, Pencil, Play, RefreshCw, Trash2, UserRound } from '@/components/ikon'
import { luncurSatu } from '@/logic/luncur'
import type { Akun, Folder } from '@/api/types'
import { samarkan } from '@/api/api'
import { statusAkun } from '@/lib/status-akun'
import { avatarTone, cn, initials } from '@/utils/cn'
import { StatusLabel, type StatusTone } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { IkonFolder, folderAkun } from '@/lib/folder'
import { bukaDialog, hapusAkun, perbaruiCookie, pindahAkun, salinCookie, segarkan, useCam } from '@/stores/cam'

export const toneStatus = (jenis: string): StatusTone => (jenis === 'ok' ? 'success' : jenis === 'warn' ? 'warning' : jenis === 'bad' ? 'error' : 'muted')

export function LencanaStatus({ a, className }: { a: Akun; className?: string }) {
  const st = statusAkun(a)
  const tolak = !!a.last_error && !st.dibatasi
  return (
    <span title={st.rincian} aria-label={tolak ? `Cookie rejected: ${a.last_error}` : undefined} className={cn('min-w-0', className)}>
      <StatusLabel tone={toneStatus(st.jenis)}>
        <span className="line-clamp-2">{tolak ? 'Cookie rejected' : st.teks}</span>
      </StatusLabel>
    </span>
  )
}

export function LabelKlien({ pid, ringkas = false }: { pid?: number[]; ringkas?: boolean }) {
  if (!pid?.length) return <span className="text-content-muted">Not running</span>
  const judul = `${pid.length === 1 ? 'A Roblox client is running' : `${pid.length} Roblox clients are running for this account`} · PID ${pid.join(', ')}`
  return (
    <span title={judul}>
      <StatusLabel tone="success">
        Running{pid.length > 1 ? ` ×${pid.length}` : ''}
        {ringkas ? null : <span className="tnum font-normal text-content-muted"> · PID {pid.join(', ')}</span>}
      </StatusLabel>
    </span>
  )
}

const ukuranAvatar = { sm: 'h-7 w-7 text-2xs', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }

export function AvatarAkun({ a, size = 'md', berjalan = false, className }: { a: Pick<Akun, 'alias' | 'avatar_url'>; size?: keyof typeof ukuranAvatar; berjalan?: boolean; className?: string }) {
  const [gagal, setGagal] = useState(false)
  const tone = avatarTone(a.alias)
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {a.avatar_url && !gagal ? (
        <img src={a.avatar_url} alt="" onError={() => setGagal(true)} className={cn('rounded-md bg-surface-3 object-cover', ukuranAvatar[size])} />
      ) : (
        <span aria-hidden className={cn('inline-flex select-none items-center justify-center rounded-md font-semibold ring-1 ring-inset ring-white/[0.07]', ukuranAvatar[size])} style={{ backgroundColor: tone.bg, color: tone.fg }}>
          {initials(a.alias)}
        </span>
      )}
      {berjalan ? <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-1 bg-success" aria-hidden /> : null}
    </span>
  )
}

export function Username({ a }: { a: Akun }) {
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  if (!a.username) return <span className="text-content-muted">Not refreshed</span>
  return <span translate="no">@{sembunyi ? samarkan(a.username) : a.username}</span>
}

export function MenuAkun({ a, folder, className, onDetail }: { a: Akun; folder: Folder[]; className?: string; onDetail?: () => void }) {
  const sedangPerbarui = useCam((s) => s.sedangPerbarui.includes(a.id))
  const sibukLuncur = useCam((s) => !!s.statusLuncur || !!s.antrean)
  const segarkanSemuaJalan = useCam((s) => s.sedangSegarkan)
  const kini = folderAkun(a, folder)
  return (
    <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`More actions for ${a.alias}`} title="More actions" className={cn('flex h-7 w-7 items-center justify-center rounded text-content-muted hover:bg-surface-3 hover:text-content-primary data-[state=open]:bg-surface-3 data-[state=open]:text-content-primary', className)}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[15rem]">
          <DropdownMenuItem icon={<Play className="h-3.5 w-3.5" />} disabled={sibukLuncur} onSelect={() => void luncurSatu(a)}>Launch this account only</DropdownMenuItem>
          {onDetail ? <DropdownMenuItem icon={<UserRound className="h-3.5 w-3.5" />} onSelect={onDetail} shortcut="Enter">Details</DropdownMenuItem> : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<RefreshCw className="h-3.5 w-3.5" />} disabled={segarkanSemuaJalan} onSelect={() => void segarkan(a.id)}>{segarkanSemuaJalan ? 'Refresh data (Refresh all is running)' : 'Refresh data'}</DropdownMenuItem>
          <DropdownMenuItem icon={<KeyRound className="h-3.5 w-3.5" />} disabled={sedangPerbarui} onSelect={() => void perbaruiCookie(a)}>{sedangPerbarui ? 'Refreshing cookie…' : 'Refresh cookie'}</DropdownMenuItem>
          <DropdownMenuItem icon={<Pencil className="h-3.5 w-3.5" />} onSelect={() => bukaDialog({ jenis: 'alias', akun: a })}>Rename</DropdownMenuItem>
          <DropdownMenuItem icon={<Gauge className="h-3.5 w-3.5" />} onSelect={() => bukaDialog({ jenis: 'fps', akun: a })}>FPS limit{a.fps_cap ? ` (${a.fps_cap})` : ''}</DropdownMenuItem>
          <DropdownMenuItem icon={<Copy className="h-3.5 w-3.5" />} onSelect={() => salinCookie(a)}>Copy cookie</DropdownMenuItem>
          {folder.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Move to folder</DropdownMenuLabel>
              {folder.map((f) => (
                <DropdownMenuItem key={f.id} icon={<IkonFolder f={f} size={14} />} disabled={kini === f.id} onSelect={() => void pindahAkun([a.id], f.id)}>
                  <span translate="no">{f.nama}</span>{kini === f.id ? ' (current)' : ''}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem icon={<IkonFolder f={null} size={14} />} disabled={kini === null} onSelect={() => void pindahAkun([a.id], null)}>
                Ungrouped{kini === null ? ' (current)' : ''}
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onSelect={() => hapusAkun(a)}>Delete account</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
