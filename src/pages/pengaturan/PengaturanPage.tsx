import { useEffect, type ComponentType } from 'react'
import { Bell, HardDriveDownload, Info, Palette, ShieldCheck, SlidersHorizontal, Wrench, Zap, type LucideIcon } from '@/components/ikon'
import { useTabHalaman } from '@/components/shell/navigasi'
import { Tampilan } from './Tampilan'
import { Keamanan, Notifikasi, Perilaku, Umum } from './Perilaku'
import { Cadangan } from './Cadangan'
import { Pemeliharaan } from './Pemeliharaan'
import { Tentang } from './Tentang'

type Tab = 'general' | 'appearance' | 'behavior' | 'notifications' | 'security' | 'backup' | 'maintenance' | 'about'

const TAB: { id: Tab; label: string; ket: string; ikon: LucideIcon; Isi: ComponentType }[] = [
  { id: 'general', label: 'General', ket: 'Startup and keyboard', ikon: SlidersHorizontal, Isi: Umum },
  { id: 'appearance', label: 'Appearance', ket: 'Language, theme and layout', ikon: Palette, Isi: Tampilan },
  { id: 'behavior', label: 'Behavior', ket: 'Graphics, memory and the close button', ikon: Zap, Isi: Perilaku },
  { id: 'notifications', label: 'Notifications', ket: 'Discord status and messages', ikon: Bell, Isi: Notifikasi },
  { id: 'security', label: 'Security', ket: 'Windows Hello and cookies', ikon: ShieldCheck, Isi: Keamanan },
  { id: 'backup', label: 'Backup', ket: 'Back up and restore accounts', ikon: HardDriveDownload, Isi: Cadangan },
  { id: 'maintenance', label: 'Maintenance', ket: 'Roblox logs and PC shutdown', ikon: Wrench, Isi: Pemeliharaan },
  { id: 'about', label: 'About', ket: 'Version, updates and diagnostics', ikon: Info, Isi: Tentang },
]

export function PengaturanPage() {
  const [tab] = useTabHalaman<Tab>('/settings')
  const aktif = TAB.find((t) => t.id === tab) ?? TAB[0]
  useEffect(() => {
    document.getElementById('isi-pengaturan')?.scrollTo({ top: 0 })
  }, [tab])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div id="isi-pengaturan" className="min-h-0 flex-1 overflow-y-auto">
        <div key={aktif.id} className="w-full max-w-[52rem] animate-halaman px-6 py-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-content-primary">{aktif.label}</h2>
            <p className="mt-0.5 text-sm text-content-muted">{aktif.ket}</p>
          </div>
          <aktif.Isi />
        </div>
      </div>
    </div>
  )
}
