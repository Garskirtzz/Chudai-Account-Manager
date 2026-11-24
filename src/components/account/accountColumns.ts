import type { AccountColumn, AccountColumnDef } from '@/types'

export const ACCOUNT_COLUMNS: AccountColumnDef[] = [
  { key: 'account', label: 'Account', track: 'minmax(11rem,1.5fr)', showFrom: 0, sortKey: 'name', locked: true },
  { key: 'status', label: 'Status', track: 'minmax(9.5rem,1fr)', showFrom: 0, sortKey: 'status', locked: true },
  { key: 'client', label: 'Client', track: 'minmax(7.5rem,0.9fr)', showFrom: 600, sortKey: 'client' },
  { key: 'lastLaunched', label: 'Last launched', track: '7rem', showFrom: 720, sortKey: 'lastLaunched', align: 'right' },
  { key: 'fps', label: 'FPS', track: '4.5rem', showFrom: 820, sortKey: 'fps', align: 'right' },
  { key: 'folder', label: 'Folder', track: 'minmax(6rem,0.7fr)', showFrom: 920, sortKey: 'folder' },
]

export const columnByKey = Object.fromEntries(ACCOUNT_COLUMNS.map((column) => [column.key, column])) as Record<AccountColumn, AccountColumnDef>

export const DEFAULT_VISIBLE_COLUMNS: AccountColumn[] = ACCOUNT_COLUMNS.map((c) => c.key)
