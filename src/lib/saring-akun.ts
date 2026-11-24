import type { Akun, Folder } from '@/api/types'
import type { FilterStatus } from '@/stores/uiStore'
import { folderAkun } from './folder'
import { statusAkun } from './status-akun'

export function cocokCari(a: Akun, q: string, folder: Folder[]) {
  const t = q.trim().toLowerCase()
  if (!t) return true
  const namaFolder = folder.find((f) => f.id === folderAkun(a, folder))?.nama.toLowerCase() || ''
  return a.alias.toLowerCase().includes(t) || (a.catatan || '').toLowerCase().includes(t) || a.username.toLowerCase().includes(t) || a.display_name.toLowerCase().includes(t) || String(a.user_id).includes(t) || namaFolder.includes(t)
}

export const perluPerhatian = (a: Akun) => {
  const j = statusAkun(a).jenis
  return j === 'bad' || j === 'warn'
}

export function cocokStatus(a: Akun, f: FilterStatus, pidAkun: Record<string, number[]>) {
  switch (f) {
    case 'jalan': return !!pidAkun[a.id]?.length
    case 'sehat': return statusAkun(a).jenis === 'ok'
    case 'perhatian': return perluPerhatian(a)
    case 'belum': return statusAkun(a).jenis === 'idle'
    default: return true
  }
}
