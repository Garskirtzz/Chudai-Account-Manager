import { useEffect } from 'react'
import { create } from 'zustand'
import { ChevronRight, Play, UserRound, X } from '@/components/ikon'
import { useCam } from '@/stores/cam'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { GERAK } from '@/components/shell/ItemMenu'
import { TabGaris } from '@/components/ui/TabGaris'
import { Tooltip } from '@/components/ui/Tooltip'
import { TabLuncur } from './TabLuncur'
import { TabAkun } from './TabAkun'

type Tab = 'luncur' | 'akun'

export const LEBAR_STRIP = 44

export const usePanel = create<{ tab: Tab; buka: boolean; instan: boolean }>(() => ({ tab: 'luncur', buka: false, instan: false }))
let pemicu: HTMLElement | null = null
const diPanel = (el: Element | null) => !!el?.closest('[data-panel-kanan]')

export const bukaPanel = (tab: Tab, { instan = false }: { instan?: boolean } = {}) => {
  const aktif = document.activeElement as HTMLElement | null
  if (aktif && aktif !== document.body && !diPanel(aktif)) pemicu = aktif
  usePanel.setState({ tab, buka: true, instan })
  useUIStore.getState().setPanelAkunTutup(false)
}
export const tutupLaci = (instan = false) => {
  const aktif = document.activeElement
  const kembali = pemicu
  pemicu = null
  usePanel.setState({ buka: false, instan })
  if (kembali?.isConnected && (!aktif || aktif === document.body || diPanel(aktif))) kembali.focus({ preventScroll: true })
}

const TAB = [
  { id: 'luncur' as const, label: 'Launch', Ikon: Play },
  { id: 'akun' as const, label: 'Account', Ikon: UserRound },
]

const BAYANGAN = 40
const LACI_BUKA = 'pointer-events-auto translate-x-0 opacity-100 duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]'
const LACI_TUTUP = 'pointer-events-none translate-x-3 opacity-0 duration-[180ms] ease-out motion-reduce:translate-x-0'

export function PanelKanan({ muat, lebar }: { muat: boolean; lebar: number }) {
  const tab = usePanel((s) => s.tab)
  const buka = usePanel((s) => s.buka)
  const instan = usePanel((s) => s.instan)
  const tutup = useUIStore((s) => s.panelAkunTutup)
  const fokusId = useCam((s) => s.fokusId)
  const antrean = useCam((s) => s.antrean)

  useEffect(() => {
    if (fokusId) usePanel.setState({ tab: 'akun' })
  }, [fokusId])
  useEffect(() => {
    if (antrean) usePanel.setState({ tab: 'luncur' })
  }, [antrean])
  useEffect(() => {
    if (usePanel.getState().buka) tutupLaci(true)
  }, [muat])
  const laciBuka = !muat && buka
  useEffect(() => {
    if (!laciBuka) return
    const kunci = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const aktif = document.activeElement as HTMLElement | null
      if (aktif?.closest('[role="dialog"], [role="menu"], [role="listbox"]')) return
      if (aktif?.closest('input, textarea, select, [contenteditable="true"]') && !diPanel(aktif)) return
      tutupLaci(true)
    }
    window.addEventListener('keydown', kunci)
    return () => window.removeEventListener('keydown', kunci)
  }, [laciBuka])

  if (!muat) {
    return (
      <aside
        aria-label="Launch and account details"
        data-panel-kanan={buka ? 'laci' : 'tutup'}
        aria-hidden={buka ? undefined : true}
        style={{ width: lebar + BAYANGAN }}
        className="pointer-events-none absolute inset-y-0 right-0 z-20 overflow-hidden"
      >
        <div
          style={{ width: lebar }}
          className={cn(
            'absolute inset-y-0 right-0 flex min-h-0 flex-col border-l border-line bg-surface-1 shadow-overlay transition-[transform,opacity]',
            buka ? LACI_BUKA : LACI_TUTUP,
            instan && 'duration-0',
          )}
          aria-hidden={buka ? undefined : true}
          {...(buka ? {} : { inert: '' })}
        >
          <div className="flex h-11 shrink-0 items-stretch border-b border-line-subtle pl-2 pr-11">
            <TabGaris label="Side panel" item={TAB.map(({ id, label, Ikon }) => ({ id, label, ikon: <Ikon className="h-4 w-4" /> }))} nilai={tab} onPilih={(t) => usePanel.setState({ tab: t })} className="min-w-0 flex-1" />
          </div>
          <Tooltip side="left" content={<span>Close <span className="text-content-muted">Esc</span></span>}>
            <button
              type="button"
              onClick={() => tutupLaci()}
              aria-label="Close side panel"
              className="absolute right-1 top-1 z-30 flex size-9 items-center justify-center rounded-lg text-content-muted transition-[color,background-color,transform] duration-150 hover:bg-surface-2 hover:text-content-primary active:scale-[0.97]"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
          <div key={tab} className="min-h-0 flex-1" role="tabpanel">
            {tab === 'luncur' ? <TabLuncur /> : <TabAkun />}
          </div>
        </div>
      </aside>
    )
  }

  const terbuka = !tutup
  const lipat = () => useUIStore.getState().setPanelAkunTutup(true)
  const bentang = (t?: Tab) => {
    if (t) usePanel.setState({ tab: t })
    useUIStore.getState().setPanelAkunTutup(false)
  }

  return (
    <aside
      aria-label="Launch and account details"
      data-panel-kanan={terbuka ? 'buka' : 'lipat'}
      style={{ width: terbuka ? lebar : LEBAR_STRIP }}
      className={cn('relative flex h-full shrink-0 overflow-hidden border-l border-line-subtle bg-surface-1/40 transition-[width]', GERAK)}
    >
      <Tooltip side="left" content={terbuka ? 'Collapse panel' : 'Expand panel'}>
        <button
          type="button"
          onClick={() => (terbuka ? lipat() : bentang())}
          aria-label={terbuka ? 'Collapse side panel' : 'Expand side panel'}
          aria-expanded={terbuka}
          className="absolute right-1 top-1 z-30 flex size-9 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-surface-2 hover:text-content-primary"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', GERAK, !terbuka && 'rotate-180')} />
        </button>
      </Tooltip>

      <div className={cn('absolute inset-y-0 right-0 flex flex-col items-center gap-1 pt-12 transition-opacity', GERAK, terbuka ? 'pointer-events-none opacity-0' : 'opacity-100')} style={{ width: LEBAR_STRIP }} aria-hidden={terbuka}>
        {TAB.map(({ id, label, Ikon }) => (
          <Tooltip key={id} side="left" content={label}>
            <button
              type="button"
              tabIndex={terbuka ? -1 : 0}
              onClick={() => bentang(id)}
              aria-label={`${label} panel`}
              className={cn('relative flex size-9 items-center justify-center rounded-lg transition-colors', tab === id ? 'bg-surface-3 text-content-primary' : 'text-content-muted hover:bg-surface-2 hover:text-content-secondary')}
            >
              <Ikon className="h-4 w-4" />
              {id === 'luncur' && antrean ? <span className="absolute right-1 top-1 size-1.5 animate-pulse rounded-full bg-info" aria-hidden /> : null}
            </button>
          </Tooltip>
        ))}
      </div>

      <div
        style={{ width: lebar }}
        className={cn('absolute inset-y-0 right-0 flex min-h-0 flex-col bg-surface-1/40 transition-[opacity,transform]', GERAK, terbuka ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0')}
        aria-hidden={terbuka ? undefined : true}
        {...(terbuka ? {} : { inert: '' })}
      >
        <div className="flex h-11 shrink-0 items-stretch border-b border-line-subtle pl-2 pr-11">
          <TabGaris label="Side panel" item={TAB.map(({ id, label, Ikon }) => ({ id, label, ikon: <Ikon className="h-4 w-4" /> }))} nilai={tab} onPilih={(t) => usePanel.setState({ tab: t })} className="min-w-0 flex-1" />
        </div>
        <div key={tab} className="min-h-0 flex-1 animate-fade-up" role="tabpanel">
          {tab === 'luncur' ? <TabLuncur /> : <TabAkun />}
        </div>
      </div>
    </aside>
  )
}
