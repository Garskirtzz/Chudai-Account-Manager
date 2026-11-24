import type { ReactNode } from 'react'
import type { LucideIcon } from '@/components/ikon'
import { cn } from '@/utils/cn'
import { Tooltip } from '@/components/ui/Tooltip'

export const GERAK = 'duration-500 ease-pegas'

export function ItemMenu({
  ikon: Ikon,
  ikonNode,
  label,
  jumlah,
  aktif,
  lipat,
  onClick,
  nada,
  title,
  akhir,
}: {
  ikon?: LucideIcon
  ikonNode?: ReactNode
  label: string
  jumlah?: number
  aktif: boolean
  lipat: boolean
  onClick: () => void
  nada?: 'error'
  title?: string
  akhir?: ReactNode
}) {
  return (
    <Tooltip side="right" disabled={!lipat} content={<span>{label}{jumlah != null ? ` · ${jumlah}` : ''}</span>}>
      <button
        type="button"
        onClick={onClick}
        title={lipat ? undefined : title}
        aria-current={aktif ? 'page' : undefined}
        className={cn(
          'relative flex h-10 shrink-0 items-center overflow-hidden rounded-lg text-sm transition-all',
          GERAK,
          lipat ? 'w-10 justify-center px-0' : 'w-full px-3',
          aktif ? 'bg-surface-3 text-content-primary' : 'text-content-secondary hover:bg-surface-2 hover:text-content-primary',
        )}
      >
        <span className={cn('flex size-4 shrink-0 items-center justify-center', aktif ? 'text-content-primary' : 'text-content-muted')}>{Ikon ? <Ikon className="h-4 w-4" /> : ikonNode}</span>
        <span className={cn('min-w-0 overflow-hidden whitespace-nowrap text-left transition-all', GERAK, lipat ? 'ml-0 w-0 opacity-0' : 'ml-3 flex-1 opacity-100')}>{label}</span>
        {jumlah != null ? (
          <span className={cn('tnum text-xs transition-opacity', GERAK, lipat ? 'w-0 opacity-0' : 'ml-2 opacity-100', nada === 'error' && jumlah ? 'font-semibold text-error' : 'text-content-muted')}>{jumlah}</span>
        ) : null}
        {akhir}
        {lipat && nada === 'error' && jumlah ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-error" aria-hidden /> : null}
      </button>
    </Tooltip>
  )
}
