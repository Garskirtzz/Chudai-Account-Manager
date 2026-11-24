import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { skalaRem } from '@/hooks/useLebar'
import { useUIStore } from '@/stores/uiStore'

export const LEBAR_RAIL = 64
export const LEBAR_DETAIL = 256
export const LEBAR_DETAIL_LIPAT = 0
export const KONTEN_MIN = 640

export interface SubHalaman {
  id: string
  label: string
}

export interface Halaman {
  path: string
  label: string
  deskripsi: string
  pintas: string
  sub?: SubHalaman[]
}

export const HALAMAN: Halaman[] = [
  { path: '/accounts', label: 'Accounts', deskripsi: 'Launch Roblox accounts and choose how each one runs.', pintas: 'Ctrl 1' },
  { path: '/dashboard', label: 'Dashboard', deskripsi: 'The selected account in 3D, its session and resources, and every client.', pintas: 'Ctrl 9' },
  {
    path: '/servers',
    label: 'Servers',
    deskripsi: 'Find a game in the Roblox charts, pick a server, and it becomes the launch target.',
    pintas: 'Ctrl 2',
    sub: [
      { id: 'discover', label: 'Discover' },
      { id: 'browse', label: 'Browse servers' },
      { id: 'saved', label: 'Saved servers' },
      { id: 'pribadi', label: 'Private servers' },
    ],
  },
  {
    path: '/history',
    label: 'History',
    deskripsi: 'Games your accounts joined from this app, and every disconnect or crash.',
    pintas: 'Ctrl 3',
    sub: [
      { id: 'games', label: 'Games' },
      { id: 'disconnects', label: 'Disconnects & crashes' },
    ],
  },
  {
    path: '/monitor',
    label: 'Monitor',
    deskripsi: 'Roblox clients on this PC: what they use, how they are doing, and their windows.',
    pintas: 'Ctrl 4',
    sub: [
      { id: 'clients', label: 'Clients' },
      { id: 'windows', label: 'Windows' },
    ],
  },
  {
    path: '/client-versions',
    label: 'Client versions',
    deskripsi: 'Which Roblox version CAM launches, versions on disk, and downloads from Roblox.',
    pintas: 'Ctrl 5',
    sub: [
      { id: 'versions', label: 'Installed versions' },
      { id: 'download', label: 'Download a version' },
      { id: 'arguments', label: 'Launch arguments' },
    ],
  },
  { path: '/fast-flags', label: 'Fast Flags', deskripsi: 'Roblox ClientAppSettings that CAM writes before every launch.', pintas: 'Ctrl 6' },
  {
    path: '/settings',
    label: 'Settings',
    deskripsi: 'How Chudai Account Manager looks and behaves, backups, maintenance, and updates.',
    pintas: 'Ctrl ,',
    sub: [
      { id: 'general', label: 'General' },
      { id: 'appearance', label: 'Appearance' },
      { id: 'behavior', label: 'Behavior' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'security', label: 'Security' },
      { id: 'backup', label: 'Backup' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'about', label: 'About' },
    ],
  },
]

export const halamanDari = (pathname: string) => HALAMAN.find((h) => pathname === h.path || pathname.startsWith(`${h.path}/`)) ?? HALAMAN[0]

export function useTabHalaman<T extends string>(path: string): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams()
  const sub = HALAMAN.find((h) => h.path === path)?.sub ?? []
  const diminta = params.get('tab') || ''
  const tab = (sub.some((s) => s.id === diminta) ? diminta : sub[0]?.id ?? '') as T
  const pilih = useCallback(
    (t: T) => {
      const p = new URLSearchParams(params)
      p.set('tab', t)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )
  return [tab, pilih]
}

export function useLebarJendela() {
  const baca = () => (typeof window === 'undefined' ? 1280 : window.innerWidth)
  const [lebar, setLebar] = useState(baca)
  useEffect(() => {
    const ubah = () => setLebar(baca())
    ubah()
    window.addEventListener('resize', ubah)
    const pengamat = new MutationObserver(ubah)
    pengamat.observe(document.documentElement, { attributes: true, attributeFilter: ['data-font', 'style', 'class'] })
    return () => {
      window.removeEventListener('resize', ubah)
      pengamat.disconnect()
    }
  }, [])
  return lebar
}

export function useSidebarSebaris() {
  return useLebarJendela() - LEBAR_RAIL - LEBAR_DETAIL >= KONTEN_MIN * skalaRem()
}

export function useLebarKonten() {
  const lebar = useLebarJendela()
  const lipat = useUIStore((s) => s.sidebarCollapsed)
  const sebaris = lebar - LEBAR_RAIL - LEBAR_DETAIL >= KONTEN_MIN * skalaRem()
  return lebar - LEBAR_RAIL - (sebaris && !lipat ? LEBAR_DETAIL : LEBAR_DETAIL_LIPAT)
}
