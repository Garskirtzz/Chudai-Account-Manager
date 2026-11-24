import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import type { Account, AccountStatus, ClientState, ProcessStatus, Restriction } from '@/types'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'outline'

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-surface-3/55 text-content-secondary border-line-subtle',
  accent: 'bg-accent/8 text-accent border-accent/20',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  error: 'bg-error/10 text-error border-error/25',
  info: 'bg-info/10 text-info border-info/25',
  outline: 'bg-transparent text-content-secondary border-line-subtle',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot = false,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[20px] shrink-0 items-center gap-1.5 rounded-[3px] border px-1.5 text-xs font-medium leading-none tracking-[0.005em]',
        badgeTones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[20px] min-w-[20px] select-none items-center justify-center rounded-[4px] border border-line bg-surface-2 px-1 font-mono text-2xs font-medium leading-none text-content-secondary',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'muted'

const toneText: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  muted: 'text-content-muted',
}

const toneBg: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  muted: 'bg-content-muted/70',
}

export function StatusDot({ tone, className, pulse = false }: { tone: StatusTone; className?: string; pulse?: boolean }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden>
      {pulse ? <span className={cn('absolute inset-0 animate-ping rounded-full opacity-40', toneBg[tone])} /> : null}
      <span className={cn('relative h-2 w-2 rounded-full', toneBg[tone])} />
    </span>
  )
}

export function StatusLabel({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 text-sm font-medium', toneText[tone], className)}>
      <StatusDot tone={tone} />
      <span className="min-w-0">{children}</span>
    </span>
  )
}

export function restrictionText(restriction: Restriction, banDaysLeft?: number) {
  if (restriction === 'banned') return banDaysLeft ? `Banned · ${banDaysLeft} ${banDaysLeft === 1 ? 'day' : 'days'} left` : 'Banned'
  if (restriction === 'locked') return 'Locked'
  if (restriction === 'cookieExpired') return 'Sign-in expired'
  return 'OK'
}

const clientText: Record<ClientState, string> = {
  notRunning: 'Not running',
  launching: 'Launching…',
  inGame: 'In game',
  rejoining: 'Rejoining…',
  crashed: 'Crashed',
}

const clientTone: Record<ClientState, StatusTone> = {
  notRunning: 'muted',
  launching: 'info',
  inGame: 'success',
  rejoining: 'warning',
  crashed: 'error',
}

export function clientStateText(state: ClientState) {
  return clientText[state]
}

export function accountStateSummary(account: Pick<Account, 'restriction' | 'banDaysLeft' | 'client'>): { text: string; tone: StatusTone } {
  if (account.restriction === 'banned' || account.restriction === 'locked') {
    return { text: restrictionText(account.restriction, account.banDaysLeft), tone: 'error' }
  }
  if (account.restriction === 'cookieExpired') return { text: 'Sign-in expired', tone: 'warning' }
  return { text: clientText[account.client], tone: clientTone[account.client] }
}

export function AccountStateBadge({ account, className }: { account: Pick<Account, 'restriction' | 'banDaysLeft' | 'client'>; className?: string }) {
  const { text, tone } = accountStateSummary(account)
  return <StatusLabel tone={tone} className={className}>{text}</StatusLabel>
}

export function ClientStateBadge({ state }: { state: ClientState }) {
  return <StatusLabel tone={clientTone[state]}>{clientText[state]}</StatusLabel>
}

export function accountStatusTone(status: AccountStatus): StatusTone {
  return status === 'running' ? 'success' : status === 'attention' ? 'error' : 'muted'
}

const processText: Record<ProcessStatus, string> = {
  inGame: 'In game',
  launching: 'Launching…',
  rejoining: 'Rejoining…',
  notResponding: 'Not responding',
}

const processTone: Record<ProcessStatus, StatusTone> = {
  inGame: 'success',
  launching: 'info',
  rejoining: 'warning',
  notResponding: 'error',
}

export function processStatusText(status: ProcessStatus) {
  return processText[status]
}

export function processStatusTone(status: ProcessStatus) {
  return processTone[status]
}

export function ProcessStatusBadge({ status }: { status: ProcessStatus }) {
  return <StatusLabel tone={processTone[status]}>{processText[status]}</StatusLabel>
}
