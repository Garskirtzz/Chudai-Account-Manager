import { create } from 'zustand'
import { api, tidur } from '@/api/api'
import type { KemajuanUpdate } from '@/api/types'
import { beriTahu } from '@/stores/cam'

export const usePasangUpdate = create<{ fase: 'diam' | 'mengunduh' | 'memasang'; versi: string; kemajuan: KemajuanUpdate | null }>(() => ({
  fase: 'diam',
  versi: '',
  kemajuan: null,
}))

export const BATAS = { JEDA: 400, DIAM_MAKS: 25, GAGAL_MAKS: 150, BACA_TERAKHIR: 2000 }

const baca = () => api.statusUpdate().catch(() => null)

export async function pasangUpdate(versi: string): Promise<void> {
  if (usePasangUpdate.getState().fase !== 'diam') return
  usePasangUpdate.setState({ fase: 'mengunduh', versi, kemajuan: null })
  try {
    await api.pasangUpdate()
  } catch (e) {
    usePasangUpdate.setState({ fase: 'diam', kemajuan: null })
    beriTahu(String(e), 'salah')
    return
  }
  beriTahu(`Downloading ${versi}…`)
  let diam = 0
  let gagal = 0
  for (;;) {
    await tidur(BATAS.JEDA)
    let k: KemajuanUpdate | null = await baca()
    if (!k) {
      if (++gagal < BATAS.GAGAL_MAKS) continue
      await tidur(BATAS.BACA_TERAKHIR)
      k = await baca()
      if (!k) {
        usePasangUpdate.setState({ fase: 'diam', kemajuan: null })
        beriTahu('Couldn’t read the update’s progress. If it’s still downloading, press the download button again to follow it.', 'salah')
        return
      }
    }
    if (k.tahap === 'diam') {
      gagal = 0
      if (++diam < BATAS.DIAM_MAKS) continue
      usePasangUpdate.setState({ fase: 'diam', kemajuan: null })
      beriTahu('Couldn’t read the update’s progress. Try again from About.', 'salah')
      return
    }
    diam = 0
    gagal = 0
    if (k.tahap === 'galat') {
      usePasangUpdate.setState({ fase: 'diam', kemajuan: null })
      beriTahu(k.pesan || 'Update failed.', 'salah')
      return
    }
    usePasangUpdate.setState({ fase: k.tahap === 'memasang' ? 'memasang' : 'mengunduh', kemajuan: k })
  }
}
