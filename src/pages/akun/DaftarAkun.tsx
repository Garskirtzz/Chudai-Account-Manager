import { memo, useState, type DragEvent, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp, StarFilled } from '@/components/ikon'
import type { Akun, Folder } from '@/api/types'
import type { AccountColumn, AccountSortKey } from '@/types'
import { DND_AKUN, IkonFolder, folderAkun, posisiDrop } from '@/lib/folder'
import { geserAkun, segarkan, setFokus, taruhAkun, toggle, useCam } from '@/stores/cam'
import { statusAkun } from '@/lib/status-akun'
import { cn } from '@/utils/cn'
import { Checkbox } from '@/components/ui/Controls'
import { AvatarAkun, LabelKlien, LencanaStatus, Username } from '@/components/akun/bagian'
import { setPilihKlik } from '@/stores/rencanaLuncur'

export interface KolomTampil {
  key: AccountColumn
  label: string
  track: string
  sortKey: AccountSortKey
  align?: 'left' | 'right'
}

interface Bersama {
  folder: Folder[]
  dipilih: string[]
  fokusId: string | null
  pidAkun: Record<string, number[]>
  sedangLuncur: boolean
  bisaSeret: boolean
}

function pindahBaris(e: KeyboardEvent<HTMLElement>) {
  const baris = [...document.querySelectorAll<HTMLElement>('[data-baris]')]
  const i = baris.indexOf(e.currentTarget)
  const j = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? baris.length - 1 : -1
  if (j < 0 || j >= baris.length || j === i) return false
  e.preventDefault()
  baris[j].focus()
  return true
}

function lepasIds(e: DragEvent): string[] {
  try {
    const v = JSON.parse(e.dataTransfer.getData(DND_AKUN))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const pilihBaris = (id: string) => {
  setFokus(id)
  setPilihKlik(true)
}

export function TabelAkun({
  akun,
  kolom,
  sort,
  onSort,
  semua,
  sebagian,
  onSemua,
  padat,
  onKosong,
  ...b
}: Bersama & {
  akun: Akun[]
  kolom: KolomTampil[]
  sort: { key: AccountSortKey; direction: 'asc' | 'desc' }
  onSort: (k: AccountSortKey) => void
  semua: boolean
  sebagian: boolean
  onSemua: () => void
  padat: boolean
  onKosong: () => void
}) {
  const template = `2.5rem ${kolom.map((k) => k.track).join(' ')}`
  const idTab = akun.some((a) => a.id === b.fokusId) ? b.fokusId : akun[0]?.id
  return (
    <div role="grid" aria-label="Accounts" aria-multiselectable="true" aria-rowcount={akun.length} className="flex min-h-0 flex-1 flex-col">
      <div role="row" className="grid shrink-0 items-center border-b border-line bg-surface-1 pl-2 pr-[18px] text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
        <div role="columnheader" className="flex items-center py-1.5">
          <Checkbox className="h-5 w-5" checked={semua} indeterminate={sebagian} onCheckedChange={onSemua} aria-label="Select all shown accounts" title="Select all (main accounts are left out)" />
        </div>
        {kolom.map((k) => (
          <div key={k.key} role="columnheader" aria-sort={sort.key === k.sortKey ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('px-2', k.align === 'right' && 'text-right')}>
            <button type="button" onClick={() => onSort(k.sortKey)} title="Sort (click again to reverse, a third time for your own order)" className={cn('inline-flex items-center gap-1 py-2 hover:text-content-primary', sort.key === k.sortKey && 'text-content-secondary')}>
              {k.label}
              {sort.key === k.sortKey ? sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
            </button>
          </div>
        ))}
      </div>
      <div
        role="rowgroup"
        data-daftar-gulir
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[76px] [scrollbar-gutter:stable]"
        onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-baris]')) onKosong() }}
      >
        {akun.map((a) => (
          <BarisAkun key={a.id} a={a} kolom={kolom} template={template} padat={padat} bisaTab={idTab === a.id} {...b} />
        ))}
      </div>
    </div>
  )
}

const BarisAkun = memo(function BarisAkun({ a, kolom, template, padat, bisaTab, folder, dipilih, fokusId, pidAkun, bisaSeret }: Bersama & { a: Akun; kolom: KolomTampil[]; template: string; padat: boolean; bisaTab: boolean }) {
  const [garis, setGaris] = useState<'atas' | 'bawah' | null>(null)
  const terpilih = dipilih.includes(a.id)
  const fokus = fokusId === a.id
  const pid = pidAkun[a.id]
  const fAkun = folder.find((f) => f.id === folderAkun(a, folder)) ?? null
  const adaKlien = kolom.some((k) => k.key === 'client')
  const tolak = !!a.last_error && !statusAkun(a).dibatasi
  const segarkanSemuaJalan = useCam((s) => s.sedangSegarkan)

  const kunci = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); pilihBaris(a.id) }
    else if (e.key === ' ' && !e.repeat) { e.preventDefault(); toggle(a.id) }
    else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); if (bisaSeret) geserAkun(a.id, e.key === 'ArrowDown' ? 1 : -1) }
    else pindahBaris(e)
  }

  return (
    <div
      role="row"
      data-baris
      data-id={a.id}
      tabIndex={bisaTab ? 0 : -1}
      aria-selected={terpilih}
      onClick={() => pilihBaris(a.id)}
      onKeyDown={kunci}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_AKUN, JSON.stringify(terpilih ? dipilih : [a.id]))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (!bisaSeret || !e.dataTransfer.types.includes(DND_AKUN)) return
        e.preventDefault()
        setGaris(posisiDrop(e) ? 'bawah' : 'atas')
      }}
      onDragLeave={() => setGaris(null)}
      onDrop={(e) => {
        setGaris(null)
        if (!bisaSeret) return
        const ids = lepasIds(e).filter((id) => id !== a.id)
        if (ids.length) void taruhAkun(ids, a.id, posisiDrop(e))
      }}
      style={{ gridTemplateColumns: template, boxShadow: [fokus && 'inset 3px 0 0 rgb(var(--text-primary))', garis === 'atas' && 'inset 0 2px 0 rgb(var(--accent))', garis === 'bawah' && 'inset 0 -2px 0 rgb(var(--accent))'].filter(Boolean).join(', ') || undefined }}
      className={cn(
        'group grid cursor-default items-center border-b border-line-subtle/70 px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60',
        padat ? 'py-1' : 'py-2',
        terpilih ? 'bg-accent/[0.16] hover:bg-accent/[0.2]' : fokus ? 'bg-surface-3/70' : 'hover:bg-surface-2/40',
      )}
    >
      <div role="gridcell" onClick={(e) => e.stopPropagation()} className="flex items-center">
        <Checkbox className="h-5 w-5" checked={terpilih} onCheckedChange={() => toggle(a.id)} aria-label={`Select ${a.alias}`} tabIndex={-1} />
      </div>
      {kolom.map((k) => {
        switch (k.key) {
          case 'account':
            return (
              <div role="gridcell" key={k.key} className="flex min-w-0 items-center gap-2.5 px-2">
                <AvatarAkun a={a} size={padat ? 'sm' : 'md'} berjalan={!!pid?.length} />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium text-content-primary" translate="no" title={a.alias}>{a.alias}</span>
                    {a.favorit ? <StarFilled className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Favourite" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-content-muted">
                    <span className="min-w-0 truncate"><Username a={a} /></span>
                    {a.utama ? <Tag title="Main account: left out of Select all, bulk saver and folder presets">Main</Tag> : null}
                    {a.plus ? <Tag title="Roblox Plus subscription">Plus</Tag> : a.premium ? <Tag title="Roblox Premium (legacy membership)">Premium</Tag> : null}
                    {a.hemat ? <Tag title={`Resource saver: ${a.hemat_fps || 10} FPS, low graphics, low priority`}>Saver</Tag> : null}
                  </span>
                </span>
              </div>
            )
          case 'status':
            return (
              <div role="gridcell" key={k.key} className="flex min-w-0 items-center gap-2 px-2">
                <LencanaStatus a={a} />
                {!adaKlien && pid?.length ? <span className="shrink-0 text-xs text-success" title={`Running · PID ${pid.join(', ')}`}>· Running</span> : null}
                {tolak ? (
                  <button type="button" disabled={segarkanSemuaJalan} onClick={(e) => { e.stopPropagation(); void segarkan(a.id) }} title={segarkanSemuaJalan ? 'Refresh all is checking every account' : "Check this account's sign-in again"} className="ml-auto shrink-0 rounded-md border border-warning/40 px-2 py-0.5 text-xs font-medium text-warning transition-[background-color,transform] duration-150 enabled:hover:bg-warning/10 enabled:active:scale-[0.97] disabled:opacity-50">
                    Refresh
                  </button>
                ) : null}
              </div>
            )
          case 'client':
            return <div role="gridcell" key={k.key} className="min-w-0 px-2 text-sm"><LabelKlien pid={pid} ringkas /></div>
          case 'folder':
            return (
              <div role="gridcell" key={k.key} className="flex min-w-0 items-center gap-1.5 px-2 text-content-secondary">
                <IkonFolder f={fAkun} size={14} />
                <span className="truncate" translate={fAkun ? 'no' : undefined}>{fAkun ? fAkun.nama : 'Ungrouped'}</span>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
})

function Tag({ children, title }: { children: string; title?: string }) {
  return <span title={title} className="shrink-0 rounded border border-line px-1 text-2xs font-medium leading-4 text-content-secondary">{children}</span>
}
