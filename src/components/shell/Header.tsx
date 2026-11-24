import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from '@/components/ikon'
import { api } from '@/api/api'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { Kbd } from '@/components/ui/Badge'
import { Brand } from '@/components/shared/Logo'
import { useLebar, skalaRem } from '@/hooks/useLebar'
import { PilSesi } from './JudulHalaman'

export function Header() {
  const navigate = useNavigate()
  const sidebarLipat = useUIStore((s) => s.sidebarCollapsed)
  const [refCari, lebarCari] = useLebar<HTMLButtonElement>()
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)
  const [maks, setMaks] = useState(false)
  const [fokus, setFokus] = useState(true)

  useEffect(() => {
    const baca = () => api.jendelaMaks().then(setMaks, () => undefined)
    baca()
    const onFocus = () => setFokus(true)
    const onBlur = () => setFokus(false)
    window.addEventListener('resize', baca)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('resize', baca)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const diHeader = (e: MouseEvent) => e.currentTarget instanceof Node && e.currentTarget.contains(e.target as Node)
  const seret = (e: MouseEvent) => {
    if (e.button !== 0 || e.detail > 1 || !diHeader(e)) return
    if ((e.target as HTMLElement).closest('button, a, input, [data-tanpa-seret]')) return
    void api.jendelaAksi('seret').catch(() => undefined)
  }
  const maksimal = (e: MouseEvent) => {
    if (!diHeader(e)) return
    if ((e.target as HTMLElement).closest('button, a, input, [data-tanpa-seret]')) return
    void api.jendelaAksi('maks').then(setMaks, () => undefined)
  }

  return (
    <header onMouseDown={seret} onDoubleClick={maksimal} className="relative z-40 grid h-[var(--header-h)] shrink-0 select-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-line-subtle bg-chrome">
      <div className="flex min-w-0 items-center">
        <button type="button" onClick={() => navigate('/accounts')} className={cn('flex shrink-0 items-center rounded-md pl-5 text-left transition-opacity', !fokus && 'opacity-60')} aria-label="Chudai Account Manager — go to Accounts">
          <Brand />
        </button>
      </div>

      <button
        ref={refCari}
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search accounts, pages and commands"
        className="group flex h-8 w-[clamp(14rem,38vw,30rem)] items-center gap-2 rounded-md border border-line-subtle bg-app/40 px-2.5 text-left transition-colors hover:border-line-strong"
      >
        <Search className="h-4 w-4 shrink-0 text-content-muted" />
        <span className="min-w-0 flex-1 truncate text-sm text-content-muted" aria-hidden>{lebarCari === 0 || lebarCari / skalaRem() >= 336 ? 'Search accounts, pages and commands…' : 'Search…'}</span>
        <Kbd>Ctrl K</Kbd>
      </button>

      <div className="flex h-full min-w-0 items-stretch justify-end" data-kolom-kanan>
        {sidebarLipat ? <div className="flex items-center" data-tanpa-seret><PilSesi /></div> : null}
        <button type="button" aria-label="Minimize" title="Minimize" onClick={() => void api.jendelaAksi('kecilkan').catch(() => undefined)} className="flex w-[46px] shrink-0 items-center justify-center text-content-secondary transition-colors hover:bg-surface-2 hover:text-content-primary">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button type="button" aria-label={maks ? 'Restore' : 'Maximize'} title={maks ? 'Restore' : 'Maximize'} onClick={() => void api.jendelaAksi('maks').then(setMaks, () => undefined)} className="flex w-[46px] shrink-0 items-center justify-center text-content-secondary transition-colors hover:bg-surface-2 hover:text-content-primary">
          {maks ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden><path d="M2.5 2.5V0.5h7v7h-2" stroke="currentColor" /><rect x="0.5" y="2.5" width="7" height="7" stroke="currentColor" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" /></svg>
          )}
        </button>
        <button type="button" aria-label="Close" title="Close" onClick={() => void api.jendelaAksi('tutup').catch(() => undefined)} className="flex w-[46px] shrink-0 items-center justify-center text-content-secondary transition-colors hover:bg-[#c42b1c] hover:text-white">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
      </div>
    </header>
  )
}
