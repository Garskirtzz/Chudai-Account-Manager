import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppWindow,
  ArrowRight,
  CircleHelp,
  Eraser,
  FileClock,
  Flag,
  Keyboard,
  LayoutDashboard,
  Monitor,
  MonitorCog,
  Maximize2,
  PanelLeft,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  SlidersHorizontal,
  TerminalSquare,
  UserRound,
  Users,
  Info,
} from '@/components/ikon'
import { api } from '@/api/api'
import { bersihkanLog, useCam } from '@/stores/cam'
import { fokusCariAkun } from './fokusCari'
import { useUIStore } from '@/stores/uiStore'
import { toast } from '@/stores/toastStore'
import { cn } from '@/utils/cn'
import { Kbd } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'

interface CommandItem {
  id: string
  label: string
  group: string
  icon: React.ReactNode
  keywords: string
  shortcut?: string
  run: () => void
}

export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen)
  const setOpen = useUIStore((s) => s.setPaletteOpen)
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen)
  const toggleConsole = useUIStore((s) => s.toggleConsole)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const jumlahLog = useCam((s) => s.log.length)
  const accounts = useCam((s) => s.akun)
  const folder = useCam((s) => s.folder)
  const sembunyi = useCam((s) => s.sembunyikanUsername)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  const commands = useMemo<CommandItem[]>(() => {
    const run = (fn: () => void) => () => {
      setOpen(false)
      fn()
    }
    return [
      {
        id: 'nav-accounts',
        label: 'Go to Accounts',
        group: 'Navigate',
        icon: <Users className="h-4 w-4" />,
        shortcut: 'Ctrl 1',
        keywords: 'account management launch roblox folders identities',
        run: run(() => navigate('/accounts')),
      },
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        group: 'Navigate',
        icon: <LayoutDashboard className="h-4 w-4" />,
        shortcut: 'Ctrl 9',
        keywords: 'dashboard avatar 3d overview playing now clients resources',
        run: run(() => navigate('/dashboard')),
      },
      {
        id: 'nav-servers',
        label: 'Go to Servers',
        group: 'Navigate',
        icon: <Server className="h-4 w-4" />,
        shortcut: 'Ctrl 2',
        keywords: 'public private server browser job id saved servers',
        run: run(() => navigate('/servers')),
      },
      {
        id: 'nav-history',
        label: 'Go to History',
        group: 'Navigate',
        icon: <FileClock className="h-4 w-4" />,
        shortcut: 'Ctrl 3',
        keywords: 'disconnects crashes launch history games',
        run: run(() => navigate('/history')),
      },
      {
        id: 'nav-monitor',
        label: 'Go to Monitor',
        group: 'Navigate',
        icon: <Monitor className="h-4 w-4" />,
        shortcut: 'Ctrl 4',
        keywords: 'running roblox clients cpu ram gpu limits memory',
        run: run(() => navigate('/monitor')),
      },
      {
        id: 'nav-versions',
        label: 'Go to Client versions',
        group: 'Navigate',
        icon: <AppWindow className="h-4 w-4" />,
        shortcut: 'Ctrl 5',
        keywords: 'roblox versions logs shutdown launch arguments',
        run: run(() => navigate('/client-versions')),
      },
      {
        id: 'nav-fast-flags',
        label: 'Go to Fast Flags',
        group: 'Navigate',
        icon: <Flag className="h-4 w-4" />,
        shortcut: 'Ctrl 6',
        keywords: 'clientappsettings flags roblox settings',
        run: run(() => navigate('/fast-flags')),
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        group: 'Navigate',
        icon: <Settings className="h-4 w-4" />,
        shortcut: 'Ctrl ,',
        keywords: 'preferences appearance theme about version',
        run: run(() => navigate('/settings')),
      },
      {
        id: 'action-new-account',
        label: 'Add a new account',
        group: 'Actions',
        icon: <Plus className="h-3.5 w-3.5" />,
        keywords: 'create new identity account',
        run: run(() => navigate('/accounts?new=1')),
      },
      {
        id: 'action-console',
        label: 'Show or hide Output',
        group: 'Actions',
        icon: <TerminalSquare className="h-3.5 w-3.5" />,
        keywords: 'logs panel dock bottom',
        shortcut: 'Ctrl J',
        run: run(toggleConsole),
      },
      {
        id: 'action-sidebar',
        label: 'Collapse or expand the sidebar',
        group: 'Actions',
        icon: <PanelLeft className="h-3.5 w-3.5" />,
        keywords: 'navigation collapse expand rail',
        shortcut: 'Ctrl B',
        run: run(toggleSidebar),
      },
      {
        id: 'action-fullscreen',
        label: 'Full screen',
        group: 'Actions',
        icon: <Maximize2 className="h-3.5 w-3.5" />,
        keywords: 'fullscreen borderless window f11',
        shortcut: 'F11',
        run: run(() => void api.jendelaAksi('layar_penuh').catch(() => undefined)),
      },
      {
        id: 'action-search',
        label: 'Filter accounts',
        group: 'Actions',
        icon: <Search className="h-3.5 w-3.5" />,
        keywords: 'find search accounts alias username notes',
        shortcut: 'Ctrl F',
        run: run(fokusCariAkun),
      },
       {
        id: 'action-refresh-monitor',
        label: 'Refresh monitor data',
        group: 'Actions',
        icon: <RefreshCw className="h-3.5 w-3.5" />,
        keywords: 'monitor telemetry reload update roblox clients',
        run: run(() => navigate('/monitor?refresh=1')),
      },
      {
        id: 'action-clear-console',
        label: 'Clear Output',
        group: 'Actions',
        icon: <Eraser className="h-3.5 w-3.5" />,
        keywords: 'erase empty terminal logs',
        run: run(() => {
          bersihkanLog()
          toast('Output cleared', jumlahLog > 0 ? 'Output was cleared.' : 'The Output panel was already empty.', 'default')
        }),
      },
      {
        id: 'settings-appearance',
        label: 'Appearance settings',
        group: 'Preferences',
        icon: <Palette className="h-3.5 w-3.5" />,
        keywords: 'theme accent colour dark light mode language density font size animations columns',
        run: run(() => navigate('/settings?tab=appearance')),
      },
      {
        id: 'settings-behavior',
        label: 'Behavior settings',
        group: 'Preferences',
        icon: <MonitorCog className="h-3.5 w-3.5" />,
        keywords: 'light graphics trim memory tray close button',
        run: run(() => navigate('/settings?tab=behavior')),
      },
      {
        id: 'settings-backup',
        label: 'Back up or restore accounts',
        group: 'Preferences',
        icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
        keywords: 'backup restore cambak password export',
        run: run(() => navigate('/settings?tab=backup')),
      },
      {
        id: 'settings-maintenance',
        label: 'Maintenance: Roblox logs and shutdown timer',
        group: 'Preferences',
        icon: <Info className="h-3.5 w-3.5" />,
        keywords: 'logs crash dumps clean shut down timer afk',
        run: run(() => navigate('/settings?tab=maintenance')),
      },
      {
        id: 'help-shortcuts',
        label: 'View keyboard shortcuts',
        group: 'Help',
        icon: <Keyboard className="h-3.5 w-3.5" />,
        keywords: 'hotkeys keys help',
        shortcut: '?',
        run: run(() => setShortcutsOpen(true)),
      },
      {
        id: 'help-about',
        label: 'About Chudai Account Manager',
        group: 'Help',
        icon: <CircleHelp className="h-3.5 w-3.5" />,
        keywords: 'version build update changelog documentation diagnostics',
        run: run(() => navigate('/settings?tab=about')),
      },
    ]
  }, [jumlahLog, navigate, setOpen, setShortcutsOpen, toggleConsole, toggleSidebar])

  const accountCommands = useMemo<CommandItem[]>(
    () =>
      accounts
        .map((a) => ({
          id: `account-${a.id}`,
          label: sembunyi || !a.username ? a.alias : `${a.alias}  ·  @${a.username}`,
          group: 'Accounts',
          icon: <UserRound className="h-4 w-4" />,
          keywords: `${sembunyi ? '' : `${a.username} ${a.display_name}`} ${a.catatan || ''} ${folder.find((f) => f.id === a.folder_id)?.nama ?? ''}`,
          run: () => {
            setOpen(false)
            navigate(`/accounts?account=${a.id}`)
          },
        })),
    [accounts, folder, sembunyi, navigate, setOpen],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return [...accountCommands, ...commands].filter((command) =>
      `${command.label} ${command.group} ${command.keywords}`.toLowerCase().includes(q),
    )
  }, [accountCommands, commands, query])

  const grouped = useMemo(() => {
    const groups: { name: string; items: CommandItem[] }[] = []
    for (const command of filtered) {
      const existing = groups.find((g) => g.name === command.group)
      if (existing) existing.items.push(command)
      else groups.push({ name: command.group, items: [command] })
    }
    return groups
  }, [filtered])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const execute = (command?: CommandItem) => {
    const target = command ?? filtered[activeIndex]
    if (target) target.run()
  }

  let indexCursor = -1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="lg" showClose={false} className="w-[min(620px,calc(100vw-32px))]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-line-subtle px-3.5 py-3">
          <Search className="h-4 w-4 shrink-0 text-content-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((i) => Math.max(0, i - 1))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                execute()
              }
            }}
            placeholder="Search accounts, pages and commands…"
            aria-label="Command palette"
            className="min-w-0 flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-muted focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <CommandGlyph muted />
              <p className="mt-2 text-xs font-medium text-content-secondary">No commands found</p>
              <p className="mt-1 text-sm text-content-muted">Try an account name, “monitor” or “settings”.</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.name} className="mb-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-content-muted">
                  {group.name}
                </div>
                {group.items.map((command) => {
                  indexCursor += 1
                  const index = indexCursor
                  const active = index === activeIndex
                  return (
                    <button
                      key={command.id}
                      type="button"
                      data-active={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => execute(command)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
                        active ? 'bg-surface-3' : 'hover:bg-surface-2/70',
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-line-subtle bg-app/40 text-content-muted">
                        {command.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-content-primary">{command.label}</span>
                      {command.shortcut ? (
                        <Kbd>{command.shortcut}</Kbd>
                      ) : null}
                      <ArrowRight className={cn('h-3.5 w-3.5 text-content-muted transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-line-subtle bg-surface-1 px-3.5 py-2 text-xs text-content-muted">
          <span className="flex items-center gap-2.5">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>Enter</Kbd> run</span>
            <span className="hidden items-center gap-1 sm:flex"><Kbd>Ctrl K</Kbd> toggle</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandGlyph({ muted = false }: { muted?: boolean }) {
  return <Search className={muted ? 'h-5 w-5 text-content-muted/60' : 'h-4 w-4'} />
}
