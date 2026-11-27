import { create } from 'zustand'
import type { ModeServer } from '@/logic/luncur'

const KUNCI_MODE = 'cam.modeServerGame'
const bacaMode = (): Record<string, ModeServer> => {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI_MODE) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
export const useModeGame = create<{ mode: Record<string, ModeServer> }>(() => ({ mode: bacaMode() }))
export const setModeGame = (place: string, m: ModeServer) => {
  useModeGame.setState((s) => ({ mode: { ...s.mode, [place]: m } }))
  try { localStorage.setItem(KUNCI_MODE, JSON.stringify(useModeGame.getState().mode)) } catch {  }
}

export const useRencana = create<{ buka: boolean; ids: string[] | null; instan: boolean }>(() => ({ buka: false, ids: null, instan: false }))

export const bukaRencana = (ids: string[] | null = null, instan = false) => useRencana.setState({ buka: true, ids, instan })
export const tutupRencana = () => useRencana.setState({ buka: false, ids: null })

export const usePilihKlik = create<{ aktif: boolean }>(() => ({ aktif: false }))
export const setPilihKlik = (aktif: boolean) => usePilihKlik.setState({ aktif })

let animasiHapus: ((ids: string[]) => Promise<void>) | null = null
export const pasangAnimasiHapus = (f: typeof animasiHapus) => {
  animasiHapus = f
}
export const jalankanAnimasiHapus = (ids: string[]) => (animasiHapus ? animasiHapus(ids).catch(() => undefined) : Promise.resolve())
