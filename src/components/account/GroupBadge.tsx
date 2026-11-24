import { cn } from '@/utils/cn'

const GROUP_TONES: Record<string, string> = {
  Main: 'bg-[#E8E8E8]',
  Alts: 'bg-[#C8C8C8]',
  Farm: 'bg-[#A8A8A8]',
  Test: 'bg-[#8C8C8C]',
  Spare: 'bg-[#767676]',
  Old: 'bg-[#5E5E5E]',
}

export function GroupBadge({ group, className }: { group: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-sm text-content-secondary', className)}>
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-[2px]', GROUP_TONES[group] ?? 'bg-content-muted')}
        aria-hidden
      />
      <span className="truncate">{group}</span>
    </span>
  )
}

export function groupColor(group: string) {
  return GROUP_TONES[group] ?? 'bg-content-muted'
}
