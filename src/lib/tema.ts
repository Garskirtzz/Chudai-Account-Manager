import type { Tema } from '@/api/types'

type Warna = Pick<Tema, 'aksen' | 'latar' | 'kartu' | 'sisi'>

export const BAWAAN: Warna = { aksen: '#f0f0f0', latar: '#080808', kartu: '#101010', sisi: '#0b0b0b' }
export const BAWAAN_TERANG: Warna = { aksen: '#161616', latar: '#f4f4f4', kartu: '#fbfbfb', sisi: '#ececec' }

const BAWAAN_LAMA: Warna[] = [
  { aksen: '#0f5db0', latar: '#2a2a2a', kartu: '#2e2e2e', sisi: '#353535' }, 
  { aksen: '#4a68c8', latar: '#101216', kartu: '#191c22', sisi: '#14161b' }, 
  { aksen: '#60a5fa', latar: '#0a0c10', kartu: '#141820', sisi: '#0d1015' }, 
]
const BAWAAN_TERANG_LAMA: Warna[] = [{ aksen: '#0f5db0', latar: '#f3f3f3', kartu: '#fafafa', sisi: '#e4e4e4' }]

export const PRESET: (Warna & { nama: string })[] = [
  { nama: 'Black', ...BAWAAN },
  { nama: 'Graphite', aksen: '#e6e6e6', latar: '#141414', kartu: '#1a1a1a', sisi: '#111111' },
  { nama: 'Dim', aksen: '#ececec', latar: '#1c1c1e', kartu: '#232326', sisi: '#18181a' },
  { nama: 'Forest', aksen: '#4ade80', latar: '#0a0f0b', kartu: '#111813', sisi: '#0c120e' },
]
export const PRESET_TERANG: (Warna & { nama: string })[] = [
  { nama: 'Paper', ...BAWAAN_TERANG },
  { nama: 'Studio Light', aksen: '#0f5db0', latar: '#f3f3f3', kartu: '#fafafa', sisi: '#e4e4e4' },
  { nama: 'Mist', aksen: '#2f62b5', latar: '#eef1f5', kartu: '#f7f9fb', sisi: '#dfe4eb' },
  { nama: 'Sage', aksen: '#1f7a45', latar: '#f2f5f2', kartu: '#fafcfa', sisi: '#e3e9e4' },
]

const KUNCI: (keyof Warna)[] = ['aksen', 'latar', 'kartu', 'sisi']
const modeSah = (m?: string) => (m === 'terang' ? 'terang' : '')
export const bawaanMode = (m?: string) => (modeSah(m) === 'terang' ? BAWAAN_TERANG : BAWAAN)
export const presetMode = (m?: string) => (modeSah(m) === 'terang' ? PRESET_TERANG : PRESET)

const sama = (a: Warna, b: Warna) => KUNCI.every((k) => String(a[k]).toLowerCase() === b[k])

export function normalkan(t: Partial<Tema> | null | undefined): Tema {
  const mode = modeSah(t?.mode) as Tema['mode']
  const isi: Tema = { mode, ...bawaanMode(mode) }
  for (const k of KUNCI) if (t?.[k]) isi[k] = t[k] as string
  const lama = mode === 'terang' ? BAWAAN_TERANG_LAMA : BAWAAN_LAMA
  if (lama.some((b) => sama(isi, b))) return { mode, ...bawaanMode(mode) }
  return isi
}

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const triplet = (hex: string) => (rgb(hex) ?? [0, 0, 0]).join(' ')

export function luminans(hex: string): number {
  const c = rgb(hex)
  if (!c) return 1
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const kontras = (a: string, b: string) => {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

function geser(hex: string, persen: number): string {
  const c = rgb(hex)
  if (!c) return hex
  const t = persen > 0 ? 255 : 0
  const p = Math.abs(persen) / 100
  return '#' + c.map((v) => Math.round(v + (t - v) * p).toString(16).padStart(2, '0')).join('')
}

export function pasangTema(t: Partial<Tema> | null | undefined) {
  const akar = document.documentElement
  const pakai = normalkan(t)
  const terang = pakai.mode === 'terang'
  if (terang) akar.dataset.mode = 'terang'
  else delete akar.dataset.mode
  const lapis = terang ? -3 : 3
  akar.style.setProperty('--bg-app', triplet(pakai.latar))
  akar.style.setProperty('--bg-chrome', triplet(pakai.sisi))
  akar.style.setProperty('--surface-1', triplet(pakai.kartu))
  akar.style.setProperty('--surface-2', triplet(geser(pakai.kartu, lapis)))
  akar.style.setProperty('--surface-3', triplet(geser(pakai.kartu, lapis * 2.2)))
  akar.style.setProperty('--accent', triplet(pakai.aksen))
  akar.style.setProperty('--accent-hover', triplet(geser(pakai.aksen, terang ? -10 : 12)))
  akar.style.setProperty('--accent-fg', luminans(pakai.aksen) > 0.4 ? '8 8 8' : '255 255 255')
}
