import { useLocation, useNavigate } from 'react-router-dom'
import { Layers, Lock, EyeOff, PanelLeftOpen } from '@/components/ikon'
import { toggleMulti, toggleProteksi, toggleSembunyikan, useCam } from '@/stores/cam'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { Kbd } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { TabGaris } from '@/components/ui/TabGaris'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { halamanDari } from './navigasi'

export function TombolSidebar({ className }: { className?: string }) {
  const toggle = useUIStore((s) => s.toggleSidebar)
  return (
    <Tooltip side="bottom" content={<span>Expand sidebar <Kbd className="ml-1 border-line-strong/70 bg-surface-2">Ctrl B</Kbd></span>}>
      <button
        type="button"
        data-buka-sidebar
        onClick={toggle}
        aria-label="Expand sidebar"
        aria-expanded={false}
        className={cn('flex size-8 shrink-0 items-center justify-center rounded-md text-content-muted transition-[color,background-color,transform] duration-150 hover:bg-surface-2 hover:text-content-primary active:scale-[0.97]', className)}
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}

export function JudulHalaman() {
  const location = useLocation()
  const navigate = useNavigate()
  const halaman = halamanDari(location.pathname)
  const sub = halaman.sub ?? []
  const diminta = new URLSearchParams(location.search).get('tab') || ''
  const aktif = sub.some((s) => s.id === diminta) ? diminta : sub[0]?.id ?? ''
  const berjalan = useCam((s) => Object.keys(s.pidAkun).length)
  const tersimpan = useCam((s) => s.serverTersimpan.length)
  const masalah = useCam((s) => s.masalah.length)
  const jumlah: Record<string, number | undefined> = { saved: tersimpan, clients: berjalan, disconnects: halaman.path === '/history' ? masalah : undefined }

  return (
    <div data-judul-halaman className="flex min-h-11 shrink-0 items-stretch gap-3 border-b border-line-subtle pl-2 pr-3">
      <div className="flex h-11 shrink-0 items-center gap-1.5">
        <TombolSidebar />
        <h1 className="whitespace-nowrap text-md font-semibold tracking-[-0.01em] text-content-primary">{halaman.label}</h1>
      </div>
      {sub.length ? (
        <TabGaris
          bungkus
          label={`${halaman.label} sections`}
          className="min-w-0 flex-1"
          nilai={aktif}
          onPilih={(id) => navigate(`${halaman.path}?tab=${id}`, { replace: true })}
          item={sub.map((s) => ({ id: s.id, label: s.label, jumlah: jumlah[s.id] }))}
        />
      ) : null}
    </div>
  )
}

export function PilSesi() {
  const multi = useCam((s) => s.multiAktif)
  const proteksi = useCam((s) => s.proteksi)
  const sembunyikan = useCam((s) => s.sembunyikanUsername)
  const aktif = [multi && 'Multi-instance', proteksi?.setelan && (proteksi.aktif ? 'Protected' : 'Protection on'), sembunyikan && 'Names hidden'].filter(Boolean) as string[]
  const ikon = [multi && Layers, proteksi?.setelan && Lock, sembunyikan && EyeOff].filter(Boolean) as (typeof Layers)[]
  const peringatan = !!proteksi?.aktif && proteksi.berkas < proteksi.total

  return (
    <DropdownMenu>
      <Tooltip side="bottom" content={aktif.length ? aktif.join(' · ') : 'Session: nothing on'}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-pil-sesi
            aria-label={`Session: ${aktif.length ? aktif.join(', ') : 'nothing on'}`}
            className="mr-2 flex h-7 shrink-0 items-center gap-2 self-center whitespace-nowrap rounded-full border border-line px-2.5 text-xs text-content-secondary transition-[color,border-color,transform] duration-150 hover:border-line-strong hover:text-content-primary active:scale-[0.97] data-[state=open]:border-line-strong"
          >
            <span className={cn('size-1.5 shrink-0 rounded-full', aktif.length ? (peringatan ? 'bg-warning' : 'bg-success') : 'bg-content-muted')} aria-hidden />
            {ikon.length ? ikon.map((Ikon, i) => <Ikon key={i} className="h-3.5 w-3.5 shrink-0" aria-hidden />) : <span className="text-content-muted">Session</span>}
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-[18rem]" onCloseAutoFocus={(e) => { if (useCam.getState().konfirmasi) e.preventDefault() }}>
        <DropdownMenuLabel>Session</DropdownMenuLabel>
        <DropdownMenuCheckboxItem sakelar icon={<Layers className="h-3.5 w-3.5" />} checked={multi} onCheckedChange={() => void toggleMulti()} onSelect={(e) => { if (multi) e.preventDefault() }}>
          Multi-instance
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem sakelar icon={<Lock className="h-3.5 w-3.5" />} checked={!!proteksi?.setelan} disabled={!proteksi} onCheckedChange={() => void toggleProteksi()} onSelect={(e) => e.preventDefault()}>
          Sign-in protection{proteksi?.aktif ? <span className={peringatan ? 'text-warning' : 'text-success'}> · Active</span> : null}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem sakelar icon={<EyeOff className="h-3.5 w-3.5" />} checked={sembunyikan} onCheckedChange={() => void toggleSembunyikan()} onSelect={(e) => e.preventDefault()}>
          Hide usernames
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
