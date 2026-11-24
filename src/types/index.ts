export type Restriction = 'none' | 'banned' | 'locked' | 'cookieExpired'
export type ClientState = 'notRunning' | 'launching' | 'inGame' | 'rejoining' | 'crashed'
export type AccountStatus = 'ready' | 'running' | 'attention'
export type AccountView = 'table' | 'tiles'
export type Density = 'compact' | 'comfortable'
export type AccentName = 'ivory' | 'sand' | 'slate' | 'sage' | 'clay'
export type MonitorRange = '5m' | '15m' | '1h' | '6h'
export type MonitorPreviewState = 'normal' | 'warning' | 'critical' | 'inactive' | 'loading' | 'nodata'

export interface Account {
  id: string
  name: string
  username: string
  displayName: string
  userId: number
  group: string
  restriction: Restriction
  banDaysLeft?: number
  client: ClientState
  pid?: number
  game?: string
  premium: boolean
  robux: number
  fpsCap: number | null
  resourceSaver: boolean
  autoRejoin: boolean
  antiAfk: boolean
  lastLaunched: number | null
  createdAt: number
  note?: string
  archived?: boolean
}

export type AccountStatusFilter = 'all' | AccountStatus | 'archived'

export interface AccountDraft {
  name: string
  username: string
  group: string
  fpsCap: number | null
  resourceSaver: boolean
  autoRejoin: boolean
  antiAfk: boolean
  note?: string
}

export type AccountColumn = 'account' | 'status' | 'client' | 'lastLaunched' | 'fps' | 'folder'

export interface AccountColumnDef {
  key: AccountColumn
  label: string
  track: string
  showFrom: number
  sortKey: AccountSortKey
  align?: 'left' | 'right'
  locked?: boolean
}

export type AccountSortKey = 'custom' | 'name' | 'status' | 'client' | 'lastLaunched' | 'fps' | 'folder'

export type SortDirection = 'asc' | 'desc'

export interface AccountSort {
  key: AccountSortKey
  direction: SortDirection
}

export type ProcessStatus = 'inGame' | 'launching' | 'rejoining' | 'notResponding'

export interface ProcessInfo {
  id: string
  accountId: string
  pid: number
  status: ProcessStatus
  game: string
  cpu: number
  memoryMb: number
  commitMb: number
  compressedMb: number
  gpu: number
  gpuMemoryMb: number
  uptimeSec: number
  rejoins: number
  version: string
  fpsCap: number | null
  resourceSaver: boolean
  ramLimitMb: number | null
  startedAt: number
}

export type LogLevel = 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
export type LogCategory = 'account' | 'system' | 'app'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  category: LogCategory
  source: string
  message: string
}

export type ActivitySeverity = 'success' | 'info' | 'warning' | 'error'
export type ActivityCategory = 'session' | 'security' | 'automation' | 'profile' | 'system'

export interface ActivityEvent {
  id: string
  timestamp: number
  type: string
  category: ActivityCategory
  accountId: string
  description: string
  severity: ActivitySeverity
  source: string
  details: Record<string, string>
}

export interface AppNotification {
  id: string
  title: string
  description: string
  timestamp: number
  read: boolean
  tone: 'info' | 'warning' | 'success'
  href: string
}

export interface SeriesPoint {
  t: number
  label: string
  cpu: number
  memory: number
  gpu: number
}

export interface MonitorMetrics {
  cpu: number
  memory: number
  memoryUsedGb: number
  memoryTotalGb: number
  robloxGb: number
  compressedGb: number
  gpu: number
  clients: number
  budgetGb: number
  perClientGb: number
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'warning' | 'error'
  duration?: number
  keluar?: 'atas' | 'bawah' | 'kanan'
}

export interface PreviewSettings {
  language: string
  confirmDestructive: boolean

  accent: AccentName
  density: Density
  fontSize: 'sm' | 'md' | 'lg'
  sidebarBehavior: 'expanded' | 'collapsed' | 'remember'
  animations: boolean
  showGridTexture: boolean

  accountView: AccountView
  accountDensity: Density
  accountSort: AccountSort
  defaultGroup: string
  visibleColumns: AccountColumn[]

  monitorAutoRefresh: boolean
  monitorInterval: number
  monitorRange: MonitorRange
  showSparklines: boolean
  cpuWarn: number
  cpuCrit: number
  memWarn: number
  memCrit: number

  consoleDefaultOpen: boolean
  consoleAutoScroll: boolean
  consoleWordWrap: boolean
  timestampFormat: 'relative' | 'time' | 'absolute'
  logRetention: number
  defaultLogLevels: LogLevel[]

  reduceChartMotion: boolean
  showPerfHints: boolean
}
