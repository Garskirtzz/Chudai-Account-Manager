import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Compass, LayoutDashboard, ScrollText, Search, Users } from '@/components/ikon'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Badge'
import { useUIStore } from '@/stores/uiStore'
import { fokusCariAkun } from '@/components/shell/fokusCari'

const links = [
  { label: 'Accounts', description: 'Launch accounts and change how they run', href: '/accounts', icon: Users },
  { label: 'Monitor', description: 'Running Roblox clients', href: '/monitor', icon: ScrollText },
  { label: 'Settings', description: 'Appearance, behavior and about', href: '/settings', icon: LayoutDashboard },
]

export function NotFoundPage() {
  const navigate = useNavigate()
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-[560px]">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.08] text-accent">
            <Compass className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-content-muted">404</p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-content-primary">Page not found</h1>
          </div>
        </div>

        <p className="max-w-prose text-xs leading-relaxed text-content-muted">
          This page doesn't exist. Pick a page below to continue.
        </p>

        <div className="mt-5 overflow-hidden rounded-lg border border-line-subtle bg-surface-1">
          {links.map((link, index) => {
            const Icon = link.icon
            return (
              <button
                key={link.href}
                type="button"
                onClick={() => navigate(link.href)}
                className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/40 ${
                  index !== 0 ? 'border-t border-line-subtle' : ''
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-app/40 text-content-muted group-hover:text-content-secondary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-content-primary">{link.label}</span>
                  <span className="block truncate text-xs text-content-muted">{link.description}</span>
                </span>
                <ArrowLeft className="h-3 w-3 rotate-180 text-content-muted opacity-0 transition-opacity group-hover:opacity-70" />
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setPaletteOpen(true)}>
            <Search className="h-3 w-3" />
            Command palette
            <Kbd className="ml-1 border-black/10 bg-black/15 text-accent-fg">Ctrl K</Kbd>
          </Button>
          <Button size="sm" variant="secondary" onClick={fokusCariAkun}>
            Search accounts
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/accounts')} className="text-content-secondary">
            Back to Accounts
          </Button>
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-content-muted/70">
          <span className="h-1 w-1 rounded-full bg-accent" />
          Chudai Account Manager
        </p>
      </div>
    </div>
  )
}
