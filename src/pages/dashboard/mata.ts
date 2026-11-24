import type * as THREE from 'three'

export interface Mata { x: number; y: number; z: number; n: [number, number, number]; w: number; h: number; sel: number }
export interface HasilMata { kiri: Mata; kanan: Mata; lebarKepala: number }

interface Sel { cx: number; cy: number; n: number; s: number[] }

export function deteksiMata(mesh: THREE.Mesh, kanvas: HTMLCanvasElement | null | undefined, kulit: [number, number, number]): HasilMata | null {
  const geo = mesh.geometry, pos = geo.attributes.position, uv = geo.attributes.uv
  if (!pos || !uv || !kanvas) return null
  const W = kanvas.width, H = kanvas.height
  const g2 = kanvas.getContext('2d', { willReadFrequently: true })
  if (!g2 || !W || !H) return null
  const piksel = g2.getImageData(0, 0, W, H).data
  geo.computeBoundingBox()
  const b = geo.boundingBox!
  const lebar = b.max.x - b.min.x, tinggi = b.max.y - b.min.y, tengahX = (b.min.x + b.max.x) / 2, tengahY = (b.min.y + b.max.y) / 2
  if (!(lebar > 0) || !(tinggi > 0)) return null
  const [sr, sg, sb] = kulit
  const tanda: number[][] = []
  const A = [0, 0, 0], B = [0, 0, 0], C = [0, 0, 0], V = [A, B, C]
  for (let i = 0; i + 2 < pos.count; i += 3) {
    for (let k = 0; k < 3; k++) { const v = V[k]; v[0] = pos.getX(i + k); v[1] = pos.getY(i + k); v[2] = pos.getZ(i + k) }
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1
    if (nz / nl > -0.55) continue 
    const ua = [uv.getX(i) * W, (1 - uv.getY(i)) * H], ub = [uv.getX(i + 1) * W, (1 - uv.getY(i + 1)) * H], uc = [uv.getX(i + 2) * W, (1 - uv.getY(i + 2)) * H]
    const luas = Math.abs((ub[0] - ua[0]) * (uc[1] - ua[1]) - (uc[0] - ua[0]) * (ub[1] - ua[1])) / 2
    const langkah = Math.max(2, Math.min(48, Math.round(Math.sqrt(luas) * 1.4)))
    for (let p = 0; p <= langkah; p++) for (let q = 0; q <= langkah - p; q++) {
      const w1 = p / langkah, w2 = q / langkah, w0 = 1 - w1 - w2
      const px = Math.floor(ua[0] * w0 + ub[0] * w1 + uc[0] * w2), py = Math.floor(ua[1] * w0 + ub[1] * w1 + uc[1] * w2)
      if (px < 0 || py < 0 || px >= W || py >= H) continue
      const o = (py * W + px) * 4
      if (Math.max(Math.abs(piksel[o] - sr), Math.abs(piksel[o + 1] - sg), Math.abs(piksel[o + 2] - sb)) < 72) continue
      tanda.push([A[0] * w0 + B[0] * w1 + C[0] * w2, A[1] * w0 + B[1] * w1 + C[1] * w2, A[2] * w0 + B[2] * w1 + C[2] * w2, nx / nl, ny / nl, nz / nl])
    }
  }
  if (tanda.length < 6) return null
  const G = 96, sel = lebar / G, kolom = G, baris = Math.ceil(tinggi / sel) + 1
  const isi = new Int32Array(kolom * baris).fill(-1), titik: Sel[] = []
  for (const t of tanda) {
    const cx = Math.min(kolom - 1, Math.max(0, Math.floor((t[0] - b.min.x) / sel))), cy = Math.min(baris - 1, Math.max(0, Math.floor((t[1] - b.min.y) / sel)))
    const k = cy * kolom + cx
    if (isi[k] < 0) { isi[k] = titik.length; titik.push({ cx, cy, n: 0, s: [0, 0, 0, 0, 0, 0] }) }
    const s = titik[isi[k]]; s.n++; for (let a = 0; a < 6; a++) s.s[a] += t[a]
  }
  const label = new Int32Array(titik.length).fill(-1), gumpal: Sel[][] = []
  for (let i = 0; i < titik.length; i++) {
    if (label[i] >= 0) continue
    const daftar: Sel[] = [], antre = [i]
    label[i] = gumpal.length
    while (antre.length) {
      const s = titik[antre.pop()!]
      daftar.push(s)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = s.cx + dx, ny = s.cy + dy
        if (nx < 0 || ny < 0 || nx >= kolom || ny >= baris) continue
        const k = isi[ny * kolom + nx]
        if (k >= 0 && label[k] < 0) { label[k] = gumpal.length; antre.push(k) }
      }
    }
    gumpal.push(daftar)
  }
  const pecah = (daftar: Sel[]): Sel[][] => {
    let y0 = Infinity, y1 = -Infinity
    for (const s of daftar) { y0 = Math.min(y0, s.cy); y1 = Math.max(y1, s.cy) }
    if (y1 - y0 < 4) return [daftar]
    const hist = new Array<number>(y1 - y0 + 1).fill(0)
    for (const s of daftar) hist[s.cy - y0]++
    let terbaik = -1, nilai = Infinity
    for (let r = 2; r <= hist.length - 3; r++) {
      const rasio = hist[r] / Math.min(Math.max(...hist.slice(0, r)), Math.max(...hist.slice(r + 1)))
      if (rasio <= 0.34 && rasio < nilai) { nilai = rasio; terbaik = r }
    }
    if (terbaik < 0) return [daftar]
    const batas = y0 + terbaik
    return [daftar.filter((s) => s.cy < batas), daftar.filter((s) => s.cy > batas)]
  }
  const ringkas = (daftar: Sel[]): Mata => {
    let n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    const s = [0, 0, 0, 0, 0, 0]
    for (const c of daftar) { n += c.n; for (let a = 0; a < 6; a++) s[a] += c.s[a]; x0 = Math.min(x0, c.cx); x1 = Math.max(x1, c.cx); y0 = Math.min(y0, c.cy); y1 = Math.max(y1, c.cy) }
    const nl = Math.hypot(s[3], s[4], s[5]) || 1
    return { x: s[0] / n, y: s[1] / n, z: s[2] / n, n: [s[3] / nl, s[4] / nl, s[5] / nl], sel: daftar.length, w: (x1 - x0 + 1) * sel, h: (y1 - y0 + 1) * sel }
  }
  const calon = gumpal.flatMap(pecah).filter((d) => d.length >= 2).map(ringkas)
    .filter((g) => g.y > tengahY - tinggi * 0.2 && g.y < tengahY + tinggi * 0.42 && g.w < lebar * 0.45 && g.h < tinggi * 0.45)
  const tipis = (g: Mata) => Math.min(1, (g.h / g.w) / 0.38) 
  let terbaik: [Mata, Mata] | null = null, skorTerbaik = 0
  for (let i = 0; i < calon.length; i++) for (let j = i + 1; j < calon.length; j++) {
    const a = calon[i], c = calon[j]
    const jarak = Math.abs(a.x - c.x), dy = Math.abs(a.y - c.y), tengah = (a.x + c.x) / 2
    if (jarak < lebar * 0.14 || jarak > lebar * 0.72 || dy > tinggi * 0.12 || Math.abs(tengah - tengahX) > lebar * 0.16) continue
    const rasio = Math.max(a.sel, c.sel) / Math.min(a.sel, c.sel)
    if (rasio > 3.5) continue
    const skor = (a.sel + c.sel) * tipis(a) * tipis(c) / rasio * (1 - dy / (tinggi * 0.12) * 0.5)
    if (skor > skorTerbaik) { skorTerbaik = skor; terbaik = a.x < c.x ? [a, c] : [c, a] }
  }
  if (!terbaik || skorTerbaik < 3) return null
  return { kiri: terbaik[0], kanan: terbaik[1], lebarKepala: lebar }
}
