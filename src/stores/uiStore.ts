import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LogLevel } from '@/types'

export type ConsoleTab = 'all' | 'account' | 'errors' | 'system'
export type FilterStatus = 'semua' | 'jalan' | 'sehat' | 'perhatian' | 'belum'

interface UIState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  consoleOpen: boolean
  consoleHeight: number
  consoleTab: ConsoleTab
  consoleWordWrap: boolean
  accountDetailOpen: boolean
  accountDetailWidth: number
  panelAkunTutup: boolean
  filterStatus: FilterStatus
  cariAkun: string
  folderRailOpen: boolean
  folderRailWidth: number
  monitorDetailOpen: boolean
  monitorDetailWidth: number
  monitorKolom: string[]
  paletteOpen: boolean
  shortcutsOpen: boolean
  consoleSearch: string
  consoleLevels: LogLevel[]

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  toggleConsole: () => void
  setConsoleOpen: (open: boolean) => void
  setConsoleHeight: (height: number) => void
  setConsoleTab: (tab: ConsoleTab) => void
  setAccountDetailOpen: (open: boolean) => void
  setAccountDetailWidth: (width: number) => void
  setPanelAkunTutup: (tutup: boolean) => void
  setFilterStatus: (f: FilterStatus) => void
  setCariAkun: (q: string) => void
  setFolderRailOpen: (open: boolean) => void
  setFolderRailWidth: (width: number) => void
  setMonitorDetailOpen: (open: boolean) => void
  setMonitorDetailWidth: (width: number) => void
  setMonitorKolom: (kolom: string[]) => void
  setPaletteOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  setConsoleSearch: (search: string) => void
  setConsoleLevels: (levels: LogLevel[]) => void
  toggleConsoleLevel: (level: LogLevel) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarWidth: 208,
      consoleOpen: false,
      consoleHeight: 224,
      consoleTab: 'all',
      consoleWordWrap: false,
      accountDetailOpen: false,
      accountDetailWidth: 320,
      panelAkunTutup: false,
      filterStatus: 'semua',
      cariAkun: '',
      folderRailOpen: true,
      folderRailWidth: 200,
      monitorDetailOpen: false,
      monitorDetailWidth: 360,
      monitorKolom: ['cpu', 'fisik', 'up', 'rejoin', 'gpu', 'batas', 'versi'],
      paletteOpen: false,
      shortcutsOpen: false,
      consoleSearch: '',
      consoleLevels: ['DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'],

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
      setConsoleOpen: (open) => set({ consoleOpen: open }),
      setConsoleHeight: (height) => set({ consoleHeight: height }),
      setConsoleTab: (tab) => set({ consoleTab: tab }),
      setAccountDetailOpen: (open) => set({ accountDetailOpen: open }),
      setAccountDetailWidth: (width) => set({ accountDetailWidth: width }),
      setPanelAkunTutup: (tutup) => set({ panelAkunTutup: tutup }),
      setFilterStatus: (f) => set({ filterStatus: f }),
      setCariAkun: (q) => set({ cariAkun: q }),
      setFolderRailOpen: (open) => set({ folderRailOpen: open }),
      setFolderRailWidth: (width) => set({ folderRailWidth: width }),
      setMonitorDetailOpen: (open) => set({ monitorDetailOpen: open }),
      setMonitorDetailWidth: (width) => set({ monitorDetailWidth: width }),
      setMonitorKolom: (kolom) => set({ monitorKolom: kolom }),
      setPaletteOpen: (open) => set({ paletteOpen: open }),
      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
      setConsoleSearch: (search) => set({ consoleSearch: search }),
      setConsoleLevels: (levels) => set({ consoleLevels: levels }),
      toggleConsoleLevel: (level) => {
        const current = get().consoleLevels
        const next = current.includes(level) ? current.filter((l) => l !== level) : [...current, level]
        set({ consoleLevels: next.length > 0 ? next : current })
      },
    }),
    {
      name: 'cam.tataLetak',
      version: 4,
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<UIState>
        return {
          sidebarCollapsed: old.sidebarCollapsed ?? false,
         sidebarWidth: 208,
          consoleHeight: old.consoleHeight ?? 224,
          consoleTab: old.consoleTab ?? 'all',
          accountDetailOpen: old.accountDetailOpen ?? false,
          accountDetailWidth: 320,
          panelAkunTutup: false,
          folderRailOpen: old.folderRailOpen ?? true,
          folderRailWidth: old.folderRailWidth ?? 200,
          monitorDetailOpen: old.monitorDetailOpen ?? false,
          monitorDetailWidth: old.monitorDetailWidth ?? 360,
        }
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        consoleHeight: state.consoleHeight,
        consoleTab: state.consoleTab,
        accountDetailOpen: state.accountDetailOpen,
        accountDetailWidth: state.accountDetailWidth,
        panelAkunTutup: state.panelAkunTutup,
        folderRailOpen: state.folderRailOpen,
        folderRailWidth: state.folderRailWidth,
        monitorDetailOpen: state.monitorDetailOpen,
        monitorDetailWidth: state.monitorDetailWidth,
        monitorKolom: state.monitorKolom,
      }),
    },
  ),
)
