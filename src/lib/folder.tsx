import type { CSSProperties } from 'react'
import { Bot, Briefcase, Coins, Crown, Folder as FolderIcon, Gamepad2, Ghost, Heart, Shield, Star, Users, Zap, type LucideIcon } from '@/components/ikon'
import type { Akun, Folder, PresetHemat } from '@/api/types'

export const WARNA_FOLDER = [
  { kunci: '', label: 'Default', hex: '' },
  { kunci: 'biru', label: 'Blue', hex: '#3b82f6' },
  { kunci: 'hijau', label: 'Green', hex: '#16a34a' },
  { kunci: 'teal', label: 'Teal', hex: '#0d9488' },
  { kunci: 'kuning', label: 'Amber', hex: '#d97706' },
  { kunci: 'oranye', label: 'Orange', hex: '#ea580c' },
  { kunci: 'merah', label: 'Red', hex: '#dc2626' },
  { kunci: 'ungu', label: 'Purple', hex: '#9333ea' },
  { kunci: 'pink', label: 'Pink', hex: '#db2777' },
]

export const IKON_FOLDER: { kunci: string; label: string; ikon: LucideIcon }[] = [
  { kunci: '', label: 'Folder', ikon: FolderIcon },
  { kunci: 'bot', label: 'Bot', ikon: Bot },
  { kunci: 'koper', label: 'Briefcase', ikon: Briefcase },
  { kunci: 'game', label: 'Gamepad', ikon: Gamepad2 },
  { kunci: 'koin', label: 'Coins', ikon: Coins },
  { kunci: 'mahkota', label: 'Crown', ikon: Crown },
  { kunci: 'bintang', label: 'Star', ikon: Star },
  { kunci: 'petir', label: 'Bolt', ikon: Zap },
  { kunci: 'perisai', label: 'Shield', ikon: Shield },
  { kunci: 'hantu', label: 'Ghost', ikon: Ghost },
  { kunci: 'orang', label: 'People', ikon: Users },
  { kunci: 'hati', label: 'Heart', ikon: Heart },
]

type FolderLike = Pick<Folder, 'warna' | 'ikon'> | null | undefined

export const warnaFolder = (f: FolderLike) => WARNA_FOLDER.find((w) => w.kunci === (f?.warna || ''))?.hex || ''
export const ikonFolder = (f: FolderLike) => IKON_FOLDER.find((i) => i.kunci === (f?.ikon || ''))?.ikon || FolderIcon

export function IkonFolder({ f, size = 14, className = '' }: { f: FolderLike; size?: number; className?: string }) {
  const Ikon = ikonFolder(f)
  const hex = warnaFolder(f)
  const style: CSSProperties | undefined = hex ? { color: hex } : undefined
  return <Ikon size={size} aria-hidden className={`flex-none ${hex ? '' : 'text-content-muted'} ${className}`} style={style} />
}

export const UKURAN_KECIL = [160, 240, 320, 400, 480, 640]
export const tinggiKecil = (w: number) => Math.ceil((w * 9) / 16)
export const labelKecil = (w: number) => (w ? `${w}×${tinggiKecil(w)}` : 'Off')

export function labelPreset(p: PresetHemat | null | undefined): string {
  if (!p) return ''
  const rejoin = p.auto_rejoin && 'auto-rejoin'
  const afk = p.anti_afk && 'anti-AFK'
  const kecil = p.mulai_kecil && `tiny ${labelKecil(p.mulai_kecil)}`
  if (!p.hemat) return ['Saver off', rejoin, afk, kecil].filter(Boolean).join(' · ')
  return ['Saver on', `${p.fps || 10} FPS`, p.ram_mb ? `${p.ram_mb} MB` : 'RAM limit off', p.minimize && 'minimize', rejoin, afk, kecil]
    .filter(Boolean)
    .join(' · ')
}

export function sesuaiPreset(a: Akun, p: PresetHemat | null | undefined): boolean {
  if (!p) return true
  const fps = p.fps ? Math.min(240, Math.max(3, p.fps)) : 0
  const ram = p.ram_mb ? Math.min(4096, Math.max(128, p.ram_mb)) : 0
  return (
    !!a.hemat === !!p.hemat &&
    !!a.hemat_minimize === !!p.minimize &&
    (a.hemat_ram_mb || 0) === ram &&
    (a.hemat_fps || 0) === fps &&
    !!a.auto_rejoin === !!p.auto_rejoin &&
    !!a.anti_afk === !!p.anti_afk &&
    (a.mulai_kecil || 0) === (p.mulai_kecil ? Math.min(1280, Math.max(160, p.mulai_kecil)) : 0)
  )
}

export const folderAkun = (a: Akun, folder: Folder[]) => (a.folder_id && folder.some((f) => f.id === a.folder_id) ? a.folder_id : null)

export function cocokFilter(a: Akun, filter: string, folder: Folder[]): boolean {
  if (!filter || filter === 'semua') return true
  const f = folderAkun(a, folder)
  return filter === 'tanpa' ? f === null : f === filter
}

export function bacaLokal<T>(kunci: string, bawaan: T): T {
  try {
    const v = localStorage.getItem(kunci)
    return v === null ? bawaan : (JSON.parse(v) as T)
  } catch {
    return bawaan
  }
}
export function tulisLokal(kunci: string, nilai: unknown) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai))
  } catch {
  }
}

export const DND_AKUN = 'application/x-cam-akun'

export function posisiDrop(e: { currentTarget: EventTarget; clientY: number }): boolean {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  return e.clientY > r.top + r.height / 2
}
