import type { LucideIcon } from '@/components/ikon'
import { Loader2 } from '@/components/ikon'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-16',
        className,
      )}
    >
       <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-2/70 text-content-muted">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </div>
      <p className="text-sm font-medium text-content-secondary">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[340px] text-xs leading-relaxed text-content-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-3.5 w-3.5 animate-spin', className)} aria-hidden />
}

export function ProgressBar({
  value,
  tone = 'accent',
  className,
  height = 'h-1.5',
  label,
}: {
  value: number
  tone?: 'accent' | 'success' | 'warning' | 'error' | 'info' | 'muted'
  className?: string
  height?: string
  label?: string
}) {
  const colors = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
    muted: 'bg-content-muted',
  }
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', height, className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
        aria-label={label || 'Progress'}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1 p-2" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-2.5 w-[22%]" />
          <Skeleton className="h-2.5 w-[14%]" />
          <Skeleton className="ml-auto h-2.5 w-[10%]" />
        </div>
      ))}
    </div>
  )
}
