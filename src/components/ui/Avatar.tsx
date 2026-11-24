import { avatarTone, cn, initials } from '@/utils/cn'
import type { AccountStatus } from '@/types'

const sizes = {
  xs: 'h-5 w-5 rounded-[4px] text-[0.5625rem]',
  sm: 'h-7 w-7 rounded-[5px] text-2xs',
  md: 'h-9 w-9 rounded-md text-xs',
  lg: 'h-11 w-11 rounded-lg text-sm',
  xl: 'h-14 w-14 rounded-lg text-lg',
}

export function Avatar({
  name,
  size = 'md',
  className,
  status,
  square = false,
}: {
  name: string
  size?: keyof typeof sizes
  className?: string
  status?: AccountStatus
  square?: boolean
}) {
  const tone = avatarTone(name)
  const statusColor = status === 'running' ? 'bg-success' : status === 'attention' ? 'bg-error' : undefined

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex select-none items-center justify-center font-semibold tracking-[0.02em] ring-1 ring-inset ring-white/[0.07]',
          sizes[size],
          square && 'rounded-md',
        )}
        style={{ backgroundColor: tone.bg, color: tone.fg }}
        aria-hidden
      >
        {initials(name)}
      </span>
      {statusColor ? (
        <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[2px] border-surface-1', statusColor)} />
      ) : null}
    </span>
  )
}
