import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccentName, PreviewSettings } from '@/types'

export const defaultSettings: PreviewSettings = {
  language: 'en',
  confirmDestructive: true,

  accent: 'ivory',
  density: 'comfortable',
  fontSize: 'md',
  sidebarBehavior: 'remember',
  animations: true,
  showGridTexture: false,

  accountView: 'table',
  accountDensity: 'comfortable',
  accountSort: { key: 'custom', direction: 'asc' },
  defaultGroup: 'all',
  visibleColumns: ['account', 'status', 'client', 'lastLaunched', 'fps', 'folder'],

  monitorAutoRefresh: true,
  monitorInterval: 30,
  monitorRange: '15m',
  showSparklines: true,
  cpuWarn: 70,
  cpuCrit: 88,
  memWarn: 78,
  memCrit: 90,

  consoleDefaultOpen: false,
  consoleAutoScroll: true,
  consoleWordWrap: false,
  timestampFormat: 'time',
  logRetention: 1000,
  defaultLogLevels: ['DEBUG', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'],

  reduceChartMotion: false,
  showPerfHints: true,
}

interface SettingsState extends PreviewSettings {
  update: (patch: Partial<PreviewSettings>) => void
  resetAll: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      update: (patch) => set(patch),
      resetAll: () => set(defaultSettings),
    }),
    {
      name: 'cam.preferensi',
      version: 2,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>
        const known: AccentName[] = ['ivory', 'sand', 'slate', 'sage', 'clay']
        const accent = known.includes(saved.accent as AccentName) ? (saved.accent as AccentName) : current.accent
        return { ...current, ...saved, accent }
      },
    },
  ),
)
