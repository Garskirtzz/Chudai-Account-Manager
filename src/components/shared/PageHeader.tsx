import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex min-h-[72px] shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line-subtle px-6 py-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1 basis-[220px]">
        {eyebrow ? <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.09em] text-content-secondary">{eyebrow}</div> : null}
        <div className="flex items-baseline gap-2.5">
          <h1 className="truncate text-xl font-semibold tracking-[-0.025em] text-content-primary">{title}</h1>
        </div>
        {description ? (
          <p className="mt-0.5 text-sm leading-relaxed text-content-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function BilahAksi({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-[3.25rem] shrink-0 flex-wrap items-center gap-2 border-b border-line-subtle px-4 py-2', className)}>{children}</div>
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
  bodyClassName,
  eyebrow,
}: {
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  eyebrow?: ReactNode
}) {
  return (
    <section className={cn('overflow-hidden border-y border-line-subtle bg-surface-1/25', className)}>
      {title ? (
          <header className="flex items-start justify-between gap-4 border-b border-line-subtle px-4 py-3.5">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.09em] text-content-muted">{eyebrow}</div>
            ) : null}
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-content-primary">{title}</h2>
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-content-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  )
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}
