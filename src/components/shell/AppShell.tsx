import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { bukaDialog, mulaiCam, useCam } from '@/stores/cam'
import { luncurTerpilih, pasangTray } from '@/logic/luncur'
import { toast } from '@/stores/toastStore'
import { api } from '@/api/api'
import { bacaBahasa, terjemahkan } from '@/lib/bahasa'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Console } from './Console'
import { fokusCariAkun } from './fokusCari'
import { CommandPalette } from './CommandPalette'
import { ShortcutsDialog } from './ShortcutsDialog'
import { Konfirmasi } from './Konfirmasi'
import { PitaMuat } from './PitaMuat'
import { DialogHost } from '@/components/dialog/DialogHost'
import { ToastViewport } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'
import { JudulHalaman } from './JudulHalaman'


export const HALAMAN_PINTAS = ['/accounts', '/servers', '/history', '/monitor', '/client-versions', '/fast-flags', '/settings?tab=appearance', '/settings?tab=about', '/dashboard']

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const settings = useSettingsStore()
  const sidebarLipat = useUIStore((s) => s.sidebarCollapsed)
  const initialized = useRef(false)

  useEffect(() => mulaiCam(), [])
  useEffect(() => pasangTray(() => navigate('/accounts')), [navigate])

  useEffect(
    () =>
      useCam.subscribe((s, lama) => {
        if (s.log === lama.log || useUIStore.getState().consoleOpen) return
        const baru = s.log[s.log.length - 1]
        if (!baru || baru === lama.log[lama.log.length - 1] || baru.jenis === 'info') return
        toast(baru.pesan, undefined, baru.jenis === 'salah' ? 'error' : 'success')
      }),
    [],
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.font = settings.fontSize
    root.dataset.motion = settings.animations ? 'on' : 'off'
  }, [settings.fontSize, settings.animations])

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      useUIStore.getState().setConsoleOpen(settings.consoleDefaultOpen)
      if (window.innerWidth < 1280 && settings.sidebarBehavior === 'remember') useUIStore.getState().setSidebarCollapsed(true)
    }
  }, [])

  useEffect(() => {
    document.title = `${pageTitle(location.pathname)} · Chudai Account Manager`
    const kirim = () => {
      const judul = pageTitle(location.pathname)
      void api.kehadiranHalaman(bacaBahasa() === 'id' ? (terjemahkan(judul) ?? judul) : judul).catch(() => undefined)
    }
    kirim()
    window.addEventListener('cam-bahasa', kirim)
    return () => window.removeEventListener('cam-bahasa', kirim)
  }, [location.pathname, location.search])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      const target = event.target as HTMLElement | null
      const typing = !!target?.closest?.('textarea, input, select, [contenteditable]')
      const dialog = !!document.querySelector('[role="dialog"], [role="alertdialog"]')
      if (mod && event.altKey) return
      if (event.key === 'F11' && !mod && !event.altKey && !event.shiftKey) {
        event.preventDefault()
        void api.jendelaAksi('layar_penuh').then(() => api.jendelaPenuh()).then((penuh) => {
          if (penuh) toast('Full screen', 'Press F11 again to go back to the window.')
        }, () => undefined)
        return
      }

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const store = useUIStore.getState()
        store.setPaletteOpen(!store.paletteOpen)
        return
      }
      if (dialog) return
      if (mod && event.key.toLowerCase() === 'n' && !event.shiftKey) {
        event.preventDefault()
        bukaDialog({ jenis: 'tambah' })
        return
      }
      if (mod && event.key === 'Enter' && !typing) {
        event.preventDefault()
        if (window.location.hash.startsWith('#/accounts')) {
          void luncurTerpilih()
          return
        }
        navigate('/accounts')
        requestAnimationFrame(() => requestAnimationFrame(() => void luncurTerpilih()))
        return
      }
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        fokusCariAkun()
        return
      }
      if (mod && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        useUIStore.getState().toggleConsole()
        return
      }
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        const akar = document.documentElement
        akar.dataset.gerak = 'mati'
        useUIStore.getState().toggleSidebar()
        requestAnimationFrame(() => requestAnimationFrame(() => delete akar.dataset.gerak))
        return
      }
      if (mod && !event.shiftKey && !typing && /^[1-9]$/.test(event.key)) {
        event.preventDefault()
        navigate(HALAMAN_PINTAS[Number(event.key) - 1])
        return
      }
      if (mod && event.key === ',') {
        event.preventDefault()
        navigate('/settings')
        return
      }
      if (!mod && !typing && event.key === '?') {
        event.preventDefault()
        const store = useUIStore.getState()
        store.setShortcutsOpen(!store.shortcutsOpen)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app text-content-primary">
      <Header />
      <PitaMuat />
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main className={cn('app-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden')} data-grid={settings.showGridTexture}>
            {sidebarLipat && !location.pathname.startsWith('/accounts') ? <JudulHalaman /> : null}
            <div key={location.pathname} className="min-h-0 flex-1 animate-halaman">
              <Outlet />
            </div>
          </main>
          <Console />
        </div>
      </div>
      <CommandPalette />
      <ShortcutsDialog />
      <DialogHost />
      <Konfirmasi />
      <ToastViewport />
    </div>
  )
}

function pageTitle(pathname: string) {
  if (pathname.startsWith('/accounts')) return 'Accounts'
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/servers')) return 'Servers'
  if (pathname.startsWith('/history')) return 'History'
  if (pathname.startsWith('/client-versions')) return 'Client versions'
  if (pathname.startsWith('/fast-flags')) return 'Fast Flags'
  if (pathname.startsWith('/monitor')) return 'Monitor'
  if (pathname.startsWith('/settings')) return 'Settings'
  return 'Accounts'
}

