import { create } from 'zustand'
import type { ToastItem } from '@/types'

type Arah = NonNullable<ToastItem['keluar']>

interface ToastState {
  toasts: ToastItem[]
  ditahan: string[]
  push: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string, arah?: Arah) => void
  tahan: (id: string, ya: boolean) => void
}

export const DURASI_KELUAR = 220

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  ditahan: [],
  push: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    set((state) => {
      const toasts = [...state.toasts.slice(-3), { ...toast, id }]
      return { toasts, ditahan: state.ditahan.filter((x) => toasts.some((t) => t.id === x)) }
    })
    const habis = () => {
      if (!get().toasts.some((t) => t.id === id)) return
      if (get().ditahan.includes(id)) window.setTimeout(habis, 1500)
      else get().dismiss(id)
    }
    window.setTimeout(habis, toast.duration ?? 3800)
    return id
  },
  dismiss: (id, arah = 'kanan') => {
    const t = get().toasts.find((x) => x.id === id)
    if (!t || t.keluar) return
    set((state) => ({ toasts: state.toasts.map((x) => (x.id === id ? { ...x, keluar: arah } : x)) }))
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((x) => x.id !== id), ditahan: state.ditahan.filter((x) => x !== id) })), DURASI_KELUAR)
  },
  tahan: (id, ya) => set((state) => ({ ditahan: ya ? [...new Set([...state.ditahan, id])] : state.ditahan.filter((x) => x !== id) })),
}))

export const toast = (title: string, description?: string, variant: ToastItem['variant'] = 'default') =>
  useToastStore.getState().push({ title, description, variant })
