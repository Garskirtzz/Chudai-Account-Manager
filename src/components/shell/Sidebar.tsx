import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  AppWindow,
  Bell,
  ChevronLeft,
  CircleHelp,
  Download,
  Flag,
  HardDriveDownload,
  History,
  Info,
  LayoutDashboard,
  LayoutGrid,
  Palette,
  Bookmark,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Users,
  Wrench,
  XCircle,
  Zap,
  Globe,
  type LucideIcon,
} from '@/components/ikon'
import { statusAkun } from '@/lib/status-akun'
import { useCam } from '@/stores/cam'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { Tooltip } from '@/components/ui/Tooltip'
import { Kbd } from '@/components/ui/Badge'
import { HALAMAN, LEBAR_DETAIL, LEBAR_DETAIL_LIPAT, LEBAR_RAIL, halamanDari, useSidebarSebaris } from './navigasi'
import { NavAkun } from '@/pages/akun/RailFolder'
import { GERAK, ItemMenu } from './ItemMenu'

const IKON_HALAMAN: Record<string, LucideIcon> = {
  '/accounts': Users,
  '/dashboard': LayoutDashboard,
  '/servers': Server,
  '/history': History,
  '/monitor': Activity,
  '/client-versions': AppWindow,
  '/fast-flags': Flag,
  '/settings': Settings,
}

const IKON_SUB: Record<string, LucideIcon> = {
  browse: Globe,
  saved: Bookmark,
  games: LayoutGrid,
  disconnects: XCircle,
  clients: Activity,
  windows: AppWindow,
  versions: AppWindow,
  download: Download,
  arguments: Terminal,
  general: SlidersHorizontal,
  appearance: Palette,
  behavior: Zap,
  notifications: Bell,
  security: ShieldCheck,
  backup: HardDriveDownload,
  maintenance: Wrench,
  about: Info,
}

export function Sidebar() {
  const lipat = useUIStore((s) => s.sidebarCollapsed)
  const setLipat = useUIStore((s) => s.setSidebarCollapsed)
  const sebaris = useSidebarSebaris()
  const melayang = !sebaris
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!melayang || lipat) return
    const luar = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if ((t as HTMLElement).closest?.('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]')) return
      setLipat(true)
    }
    document.addEventListener('pointerdown', luar)
    return () => document.removeEventListener('pointerdown', luar)
  }, [melayang, lipat, setLipat])

  return (
    <div className="relative z-30 flex h-full shrink-0" style={melayang ? { width: LEBAR_RAIL + LEBAR_DETAIL_LIPAT } : undefined}>
      <Rail />
      <PanelDetail akarRef={panelRef} lipat={lipat} melayang={melayang} />
    </div>
  )
}

function Rail() {
  const location = useLocation()
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen)
  const akun = useCam((s) => s.akun)
  const pidAkun = useCam((s) => s.pidAkun)
  const update = useCam((s) => s.updateAwal)
  const railRef = useRef<HTMLElement>(null)
  const [penanda, setPenanda] = useState<number | null>(null)

  const aktif = halamanDari(location.pathname).path
  const berjalan = Object.keys(pidAkun).length
  const perhatian = akun.filter((a) => {
    const j = statusAkun(a).jenis
    return j === 'bad' || j === 'warn'
  }).length

  useLayoutEffect(() => {
    const el = railRef.current?.querySelector<HTMLElement>(`[data-rail="${aktif}"]`)
    setPenanda(el ? el.offsetTop : null)
  }, [aktif])

  const atas = HALAMAN.filter((h) => h.path !== '/settings')
  const pengaturan = HALAMAN.find((h) => h.path === '/settings')!

  const tombol = (path: string, label: string, pintas: string, titik?: 'error' | 'success' | 'info', judulTitik?: string, ke?: string) => {
    const Ikon = IKON_HALAMAN[path]
    const ya = aktif === path
    return (
      <Tooltip key={path} side="right" content={<span>{label}{judulTitik ? ` · ${judulTitik}` : ''} <Kbd className="ml-1 border-line-strong/70 bg-surface-2">{pintas}</Kbd></span>}>
        <Link
          to={ke ?? path}
          data-rail={path}
          aria-current={ya ? 'page' : undefined}
          className={cn(
            'relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
            GERAK,
            ya ? 'text-content-primary' : 'text-content-muted hover:bg-surface-2 hover:text-content-secondary',
          )}
        >
          <Ikon className="h-[18px] w-[18px]" />
          <span className="sr-only">{label}</span>
          {titik ? <span className={cn('absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-chrome', titik === 'error' ? 'bg-error' : titik === 'info' ? 'bg-info' : 'bg-success')} aria-hidden /> : null}
        </Link>
      </Tooltip>
    )
  }

  return (
    <nav ref={railRef} aria-label="Pages" className="relative flex h-full shrink-0 flex-col items-center gap-2 border-r border-line-subtle bg-chrome py-3" style={{ width: LEBAR_RAIL }}>
      {penanda !== null ? (
        <span aria-hidden className={cn('absolute left-1/2 top-0 size-10 rounded-lg bg-surface-3 transition-transform', GERAK)} style={{ transform: `translate(-50%, ${penanda}px)` }} />
      ) : null}
      {atas.map((h) =>
        tombol(
          h.path,
          h.label,
          h.pintas,
          h.path === '/accounts' && perhatian ? 'error' : h.path === '/monitor' && berjalan ? 'success' : undefined,
          h.path === '/accounts' && perhatian ? `${perhatian} need attention` : h.path === '/monitor' && berjalan ? `${berjalan} clients running` : undefined,
        ),
      )}
      <div className="mt-auto flex flex-col items-center gap-2">
        <Tooltip side="right" content={<span>Keyboard shortcuts <Kbd className="ml-1 border-line-strong/70 bg-surface-2">?</Kbd></span>}>
          <button type="button" onClick={() => setShortcutsOpen(true)} className={cn('relative z-[1] flex size-10 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-surface-2 hover:text-content-secondary', GERAK)}>
            <CircleHelp className="h-[18px] w-[18px]" />
            <span className="sr-only">Keyboard shortcuts</span>
          </button>
        </Tooltip>
        {tombol(pengaturan.path, pengaturan.label, pengaturan.pintas, update ? 'info' : undefined, update ? `update ${update.versi} available in About` : undefined, update ? '/settings?tab=about' : undefined)}
      </div>
    </nav>
  )
}

function PanelDetail({ lipat, melayang, akarRef }: { lipat: boolean; melayang: boolean; akarRef: React.Ref<HTMLElement> }) {
  const location = useLocation()
  const halaman = halamanDari(location.pathname)
  const toggle = useUIStore((s) => s.toggleSidebar)

  return (
    <aside
      ref={akarRef}
      data-sidebar
      data-collapsed={lipat ? 'true' : 'false'}
      data-boleh-potong={lipat ? '' : undefined}
      aria-label={`${halaman.label} navigation`}
      aria-hidden={lipat || undefined}
      {...(lipat ? { inert: '' } : {})}
      style={{ width: lipat ? LEBAR_DETAIL_LIPAT : LEBAR_DETAIL, left: melayang ? LEBAR_RAIL : undefined }}
      className={cn(
        'flex h-full shrink-0 flex-col gap-4 overflow-hidden bg-chrome py-3 transition-[width,box-shadow,padding]',
        GERAK,
        lipat ? 'px-0' : 'border-r border-line-subtle px-3',
        melayang && 'absolute inset-y-0 z-30',
        melayang && !lipat && 'shadow-overlay',
      )}
    >
      <div className="flex h-10 shrink-0 items-center">
        <div className={cn('min-w-0 overflow-hidden transition-[opacity,width,flex-grow]', GERAK, lipat ? 'w-0 grow-0 opacity-0' : 'grow opacity-100')}>
          <h1 key={halaman.path} className="animate-geser-masuk whitespace-nowrap pl-1 text-lg font-semibold tracking-[-0.02em] text-content-primary">{halaman.label}</h1>
        </div>
        <Tooltip side="right" content={<span><span>{lipat ? 'Expand sidebar' : 'Collapse sidebar'}</span> <Kbd className="ml-1 border-line-strong/70 bg-surface-2">Ctrl B</Kbd></span>}>
          <button
            type="button"
            onClick={toggle}
            aria-label={lipat ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!lipat}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-2 hover:text-content-primary"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', GERAK, lipat && 'rotate-180')} />
          </button>
        </Tooltip>
      </div>

      <div key={halaman.path} className="no-scrollbar -mx-1 flex min-h-0 flex-1 animate-geser-masuk flex-col gap-4 overflow-y-auto overflow-x-hidden px-1">
        <p className={cn('shrink-0 overflow-hidden pl-1 text-sm leading-relaxed text-content-muted transition-[opacity,max-height]', GERAK, lipat ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100')} style={{ width: LEBAR_DETAIL - 24 }}>
          {halaman.deskripsi}
        </p>
        {halaman.path === '/accounts' ? <NavAkun lipat={lipat} /> : halaman.sub ? <NavSub path={halaman.path} sub={halaman.sub} lipat={lipat} /> : null}
      </div>
    </aside>
  )
}

function NavSub({ path, sub, lipat }: { path: string; sub: { id: string; label: string }[]; lipat: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const diminta = new URLSearchParams(location.search).get('tab') || ''
  const aktif = sub.some((s) => s.id === diminta) ? diminta : sub[0].id
  const tersimpan = useCam((s) => s.serverTersimpan.length)
  const berjalan = useCam((s) => Object.keys(s.pidAkun).length)
  const masalah = useCam((s) => s.masalah.length)
  const jumlah: Record<string, number | undefined> = { saved: tersimpan, clients: berjalan, disconnects: path === '/history' ? masalah : undefined }
  return (
    <nav aria-label={`${HALAMAN.find((h) => h.path === path)?.label} sections`} className="flex min-h-0 flex-col gap-1 overflow-y-auto overflow-x-hidden no-scrollbar">
      {sub.map((s) => (
        <ItemMenu key={s.id} ikon={IKON_SUB[s.id] ?? LayoutGrid} label={s.label} jumlah={jumlah[s.id]} aktif={aktif === s.id} lipat={lipat} onClick={() => navigate(`${path}?tab=${s.id}`, { replace: true })} />
      ))}
    </nav>
  )
}
