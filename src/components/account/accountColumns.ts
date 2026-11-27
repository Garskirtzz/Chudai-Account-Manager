import type { AccountColumn, AccountColumnDef } from '@/types'

export const ACCOUNT_COLUMNS: AccountColumnDef[] = [
  { key: 'account', label: 'Account', track: 'minmax(10rem,1.6fr)', showFrom: 0, sortKey: 'name', locked: true },
  { key: 'status', label: 'Status', track: 'minmax(8rem,1fr)', showFrom: 0, sortKey: 'status', locked: true },
  { key: 'client', label: 'Client', track: 'minmax(7rem,0.9fr)', showFrom: 540, sortKey: 'client' },
  { key: 'folder', label: 'Folder', track: 'minmax(6rem,0.8fr)', showFrom: 700, sortKey: 'folder' },
]

export const columnByKey = Object.fromEntries(ACCOUNT_COLUMNS.map((column) => [column.key, column])) as Record<AccountColumn, AccountColumnDef>

export const DEFAULT_VISIBLE_COLUMNS: AccountColumn[] = ACCOUNT_COLUMNS.map((c) => c.key)
