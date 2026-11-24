import { BENTUK, KOTAK_HURUF, LEBAR_RETAK, LOGO_H, LOGO_W, NAGA, POTONG, RETAK, URUTAN, type Huruf } from '@/components/shared/logo-chudai'

type V2 = [number, number]
interface Tempat { k: number; x: number; y: number }

const kl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const acak = (n: number) => { const t = Math.sin(n * 127.1 + 311.7) * 43758.5453; return t - Math.floor(t) }
const keluar = (p: number) => 1 - Math.pow(1 - p, 3)
function pegas(t: number, x0: number, v0: number, w: number, z: number) {
  if (t <= 0) return x0
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z); return Math.exp(-z * w * t) * (x0 * Math.cos(wd * t) + (v0 + z * w * x0) / wd * Math.sin(wd * t)) }
  return Math.exp(-w * t) * (x0 + (v0 + w * x0) * t)
}
function bezDrawer(x: number) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let lo = 0, hi = 1, s = x
  for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; const bx = 3 * (1 - s) * (1 - s) * s * 0.32 + s * s * s; if (bx < x) lo = s; else hi = s }
  return 3 * (1 - s) * (1 - s) * s * 0.72 + 3 * (1 - s) * s * s + s * s * s
}

const GESER = 0.12
const T = {
  kotak: 0.32, muncul: 0.1, rakit: 0.42, jedaHuruf: [0, 0.1, 0.18, 0.24, 0.28],
  naga: 1.25 + GESER, apiMulai: 2.24 + GESER, apiAkhir: 2.92 + GESER, mendarat: 3.52 + GESER,
  lebar: [4.12, 4.57] as V2, pecah: 4.57, lepas: 4.72, jedaDok: [0, 0.06, 0.11, 0.15, 0.18],
  aDok: 5.56, selesai: 6.75,
  kedip: [3.85, 5.14, 5.31],
}
const KUNCI_NAGA: [number, number, number, number][] = [ 
  [1.25, NaN, NaN, 9], [1.55, 1350, -520, 2.4], [1.8, 420, -760, 1.0], [2.0, -80, -420, 0.72],
  [2.25, 600, -300, 0.66], [2.55, 1700, -360, 0.68], [2.85, 2800, -300, 0.72], [3.1, 3480, -760, 0.86], [3.3, 3600, -820, 0.94], [3.52, NAGA.pusat[0], NAGA.pusat[1], 1],
].map(([t, ...x]) => [t + GESER, x[0], x[1], x[2]] as [number, number, number, number])
const SEMBUR: V2[] = [[2.24, 2.45], [2.51, 2.7], [2.76, 2.92]].map(([a, b]) => [a + GESER, b + GESER])
const PUSAT_HURUF = Object.fromEntries(URUTAN.map((h) => [h, [(KOTAK_HURUF[h][0] + KOTAK_HURUF[h][2]) / 2, 512]])) as Record<Huruf, V2>

interface Keping {
  huruf: Huruf; hi: number; pi: number; jalur: Path2D; px: number; py: number; n: number
  mulai: number; tampil: number; ox: number; oy: number; curl: number; w: number; z: number; melayang: number
  z0: number; rot0: number; flip0: number; lepas: number; putarDok: number; kc1: V2
}
interface Partikel { x: number; y: number; vx: number; vy: number; u: number; hidup: number; uk: number; debu?: boolean; percik?: boolean; kena?: boolean }
interface Naga { x: number; y: number; s: number; sx: number; sy: number; r: number; hadap: number; kabur: number; o: number; lentur: number; kaki?: boolean; api?: boolean; vx?: number; kedip?: number }

export interface Intro { selesai: Promise<void>; lewati: () => void }

export function mainkanIntro(root: HTMLElement, onTerbuka?: () => void): Intro {
  const DPR = Math.max(0.75, Math.min(2, devicePixelRatio || 1, Math.sqrt(4.2e6 / Math.max(1, innerWidth * innerHeight))))
  const kanvas = document.createElement('canvas')
  kanvas.setAttribute('aria-hidden', 'true')
  kanvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483646;pointer-events:auto;cursor:default'
  const tutup = document.createElement('div') 
  tutup.setAttribute('aria-hidden', 'true')
  tutup.style.cssText = 'position:fixed;inset:0;z-index:2147483645;pointer-events:none;background:radial-gradient(60% 60% at 50% 45%,#1b1b1d 0%,#121213 70%)'
  const ctx: CanvasRenderingContext2D = kanvas.getContext('2d') ?? (() => { throw new Error('no 2D canvas') })()
  let W = 0, H = 0
  const ukur = () => { W = innerWidth; H = innerHeight; kanvas.width = Math.round(W * DPR); kanvas.height = Math.round(H * DPR) }
  ukur()

  const kotak = () => { const bw = Math.min(640, W * 0.6), bh = bw / 2; return { x: (W - bw) / 2, y: (H - bh) / 2, w: bw, h: bh } }
  const besar = (): Tempat => { const b = kotak(), k = (b.w * 0.8125) / LOGO_W; return { k, x: W / 2 - (LOGO_W / 2) * k, y: H / 2 - 512 * k } }
  const merekEl = () => document.querySelector<SVGSVGElement>('[data-merek]')
  const kecil = (): Tempat => { const r = merekEl()?.getBoundingClientRect(); return r && r.height > 0 ? { k: r.height / LOGO_H, x: r.left, y: r.top } : { k: 18 / LOGO_H, x: 20, y: 15 } }
  const keLayar = (t: Tempat, x: number, y: number): V2 => [t.x + x * t.k, t.y + y * t.k]

  let warnaMerek = { huruf: [217, 217, 217], retak: [11, 11, 11], detail: [76, 76, 76] }
  const bacaWarna = () => {
    const el = merekEl(); if (!el) return
    const rgb = (s: string | null | undefined, cad: number[]) => { const m = s?.match(/[\d.]+/g); return m && m.length >= 3 ? m.slice(0, 3).map(Number) : cad }
    const huruf = rgb(getComputedStyle(el.querySelector('.merek-huruf path') ?? el).fill, warnaMerek.huruf)
    const retak = rgb(getComputedStyle(el.querySelector('.merek-retak') ?? el).stroke, warnaMerek.retak)
    warnaMerek = { huruf, retak, detail: huruf.map((v, i) => lerp(v, retak[i], 0.6)) }
  }
  const css = (c: number[]) => `rgb(${c.map((v) => Math.round(v)).join(',')})`
  const campur = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t))

  const P2 = Object.fromEntries(URUTAN.map((k) => [k, new Path2D(BENTUK[k])])) as Record<Huruf, Path2D>
  const pBadan = new Path2D(NAGA.badan), pMata = new Path2D(NAGA.mata), pAlis = new Path2D(NAGA.alis), pSoket = new Path2D(NAGA.soket)
  const keping: Keping[] = []
  {
    const B = besar(), kb = kotak(), cxL = W / 2, cyL = H / 2
    URUTAN.forEach((huruf, hi) => {
      const [x0, y0, x1, y1] = KOTAK_HURUF[huruf]
      POTONG[huruf].forEach((poli, pi) => {
        const jalur = new Path2D(); poli.forEach(([x, y], i) => (i ? jalur.lineTo(x, y) : jalur.moveTo(x, y))); jalur.closePath()
        let sx = 0, sy = 0
        for (const [x, y] of poli) { sx += kl(x, x0, x1); sy += kl(y, y0, y1) }
        const px = sx / poli.length, py = sy / poli.length, n = hi * 10 + pi + 1
        const [hX, hY] = keLayar(B, px, py)
        const sudut = Math.atan2(hY - cyL, hX - cxL) + (acak(n * 15.7) - 0.5) * 1.9
        const keTepi = Math.min(kb.w / 2 / (Math.abs(Math.cos(sudut)) || 1e-6), kb.h / 2 / (Math.abs(Math.sin(sudut)) || 1e-6))
        const luar = keTepi + 50 + acak(n * 16.3) * Math.min(340, Math.min(W, H) * 0.3)
        const lX = kl(cxL + Math.cos(sudut) * luar, 30, W - 30), lY = kl(cyL + Math.sin(sudut) * luar, 30, H - 30)
        keping.push({ huruf, hi, pi, jalur, px, py, n,
          mulai: T.rakit + T.jedaHuruf[hi] + acak(n * 9.7) * 0.14, tampil: T.muncul + acak(n * 17.9) * 0.12,
          ox: (lX - hX) / B.k, oy: (lY - hY) / B.k, curl: (acak(n * 5.1) < 0.5 ? -1 : 1) * (0.5 + acak(n * 6.7) * 0.5),
          w: 8.5 + acak(n * 7.3) * 3.5, z: 0.62 + acak(n * 8.1) * 0.14, melayang: (acak(n * 18.3) - 0.5) * 1.4,
          z0: 1.15 + acak(n * 4.4) * 0.35, rot0: (acak(n * 1.7) - 0.5) * 5, flip0: acak(n * 2.9) * Math.PI * 2,
          lepas: T.lepas + T.jedaDok[hi] + acak(n * 11.3) * 0.05, putarDok: (acak(n * 12.7) - 0.5) * 9,
          kc1: [(acak(n * 13.1) - 0.5) * 380, -120 - acak(n * 14.3) * 220] })
      })
    })
  }
  const kunciHuruf = Object.fromEntries(URUTAN.map((h) => [h, Math.max(...keping.filter((k) => k.huruf === h).map((k) => k.mulai + Math.log((Math.hypot(k.ox, k.oy) + 200) / 15) / (k.z * k.w)))])) as Record<Huruf, number>
  const kunciDok = Object.fromEntries(URUTAN.map((h) => [h, Math.max(...keping.filter((k) => k.huruf === h).map((k) => k.lepas + 0.62))])) as Record<Huruf, number>

  const hanyut = (k: Keping, t: number): V2 => [Math.sin(t * 1.6 + k.n) * 160, Math.cos(t * 1.25 + k.n * 2) * 120]
  function rakitKeping(k: Keping, t: number) {
    if (t < k.tampil) return null
    const a = kl((t - k.tampil) / 0.2), u = t - k.mulai
    const tL = Math.min(t, k.mulai), [hx, hy] = hanyut(k, tL), rotL = k.rot0 + k.melayang * tL, flipL = k.flip0 + 1.3 * tL
    if (u <= 0) return { dx: k.ox + hx, dy: k.oy + hy, s: k.z0, rot: rotL, flip: Math.cos(flipL), a }
    const x0 = k.ox + hx, y0 = k.oy + hy, sisaFlip = flipL - Math.PI * 2 * Math.round(flipL / (Math.PI * 2)) + Math.PI * 2 * Math.sign(k.curl)
    return { dx: pegas(u, x0, -y0 * k.curl * k.w * 0.4, k.w, k.z), dy: pegas(u, y0, x0 * k.curl * k.w * 0.4, k.w, k.z), s: 1 + pegas(u, k.z0 - 1, 0, k.w * 0.9, 0.85),
      rot: pegas(u, rotL - Math.PI * 2 * Math.round(rotL / (Math.PI * 2)), 0, k.w * 0.75, 0.5), flip: Math.cos(pegas(u, sisaFlip, 0, k.w * 0.7, 0.9)), a }
  }

  function spline(t: number) {
    const Kn = KUNCI_NAGA.map((k, i) => (i === 0 ? [k[0], (W / 2 - besar().x) / besar().k, (H / 2 - besar().y) / besar().k, k[3]] : k))
    if (t <= Kn[0][0]) return { x: Kn[0][1], y: Kn[0][2], s: Kn[0][3], vx: 0, vy: 0 }
    let i = 0; while (i < Kn.length - 2 && t > Kn[i + 1][0]) i++
    const a = Kn[i], b = Kn[i + 1], h = b[0] - a[0], u = kl((t - a[0]) / h)
    const tan = (j: number, c: number) => { if (j === Kn.length - 1) return 0; const p = Kn[Math.max(0, j - 1)], q = Kn[Math.min(Kn.length - 1, j + 1)]; return (q[c] - p[c]) / (q[0] - p[0]) }
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2
    const d00 = 6 * u ** 2 - 6 * u, d10 = 3 * u ** 2 - 4 * u + 1, d01 = -6 * u ** 2 + 6 * u, d11 = 3 * u ** 2 - 2 * u
    const val = (c: number) => h00 * a[c] + h10 * h * tan(i, c) + h01 * b[c] + h11 * h * tan(i + 1, c)
    const der = (c: number) => (d00 * a[c] + d10 * h * tan(i, c) + d01 * b[c] + d11 * h * tan(i + 1, c)) / h
    return { x: val(1), y: val(2), s: val(3), vx: der(1), vy: der(2) }
  }
  function naga(t: number): Naga | null {
    if (t < T.naga) return null
    if (t >= T.mendarat) { const q = pegas(t - T.mendarat, 0.24, 0, 19, 0.32); return { x: NAGA.pusat[0], y: NAGA.pusat[1], s: 1, sx: 1 + q * 0.75, sy: 1 - q, r: 0, hadap: 1, kabur: 0, o: 1, lentur: 0, kaki: true } }
    const p = spline(t), laju = Math.hypot(p.vx, p.vy), tb = t - GESER
    let hadap = tb < 1.82 ? -1 : tb > 2.18 ? 1 : -Math.cos((tb - 1.82) / 0.36 * Math.PI)
    if (Math.abs(hadap) < 0.12) hadap = 0.12 * (Math.sign(hadap) || 1)
    const arah = Math.sign(hadap), s = SEMBUR.find(([a, b]) => t >= a && t < b), sentak = s ? Math.sin(kl((t - s[0]) / 0.12) * Math.PI) : 0
    const api = t >= T.apiMulai && t < T.apiAkhir, regang = Math.min(0.16, laju / 26000)
    const miring = kl(Math.atan2(p.vy, Math.abs(p.vx) + 1) * 0.65, -0.75, 0.75) * arah
    return { x: p.x + arah * sentak * 40, y: p.y, s: p.s, sx: 1 + regang, sy: 1 - regang * 0.7, r: miring + (api ? 0.24 * arah : 0) - sentak * 0.08 * arah, hadap,
      kabur: Math.max(0, (p.s - 1.2) * 1.7), o: kl((t - T.naga) / 0.18), lentur: Math.sin(t * 9) * 0.05 * (tb < 3.3 ? 1 : 0), api: !!s, vx: p.vx }
  }
  function kedipPada(t: number) {
    for (const b of T.kedip) {
      const u = t - b
      if (u < 0 || u > 0.2) continue
      if (u < 0.07) return 1 - Math.pow(1 - u / 0.07, 2)
      if (u < 0.09) return 1
      return 1 - keluar((u - 0.09) / 0.11)
    }
    return 0
  }

  const api: Partikel[] = [], debu: Partikel[] = [], percik: Partikel[] = []
  const sprite = (warna: string) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, warna); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c }
  const SPRITE = ['rgba(255,250,220,1)', 'rgba(255,214,110,1)', 'rgba(255,150,40,1)', 'rgba(240,80,20,.9)', 'rgba(170,30,10,.7)', 'rgba(70,40,30,.45)'].map(sprite)
  const panas = Object.fromEntries(URUTAN.map((k) => [k, 0])) as Record<Huruf, number>, kejut = { ...panas }
  const sudah = new Set<string>()
  const gerakPartikel = (d: Partikel[], dt: number, g: number, redam: number) => { for (let i = d.length - 1; i >= 0; i--) { const q = d[i]; q.u += dt; if (q.u >= q.hidup) { d.splice(i, 1); continue } q.x += q.vx * dt; q.y += q.vy * dt; q.vy += g * dt; q.vx *= Math.pow(redam, dt); q.vy *= Math.pow(redam, dt) } }

  const warnaHuruf = (h: Huruf, belakang: boolean, dok: number) => {
    const p = kl(panas[h]) * 0.55, g = belakang ? 0.72 : 1
    const box = [lerp(217, 255, p) * g, lerp(217, 140, p) * g, lerp(217, 70, p) * g]
    return css(campur(box, warnaMerek.huruf, dok))
  }
  function gambarKeping(kp: Keping, X: number, Y: number, k: number, rot: number, flip: number, alpha: number, dok = 0) {
    if (alpha <= 0.01) return
    const f = Math.abs(flip) < 0.06 ? 0.06 * (Math.sign(flip) || 1) : flip
    ctx.save(); ctx.globalAlpha = alpha
    ctx.translate(X, Y); ctx.rotate(rot); ctx.scale(k * f, k); ctx.translate(-kp.px, -kp.py)
    ctx.clip(kp.jalur)
    ctx.fillStyle = warnaHuruf(kp.huruf, f < 0, dok)
    ctx.fill(P2[kp.huruf])
    ctx.restore()
  }
  function gambarRetak(huruf: Huruf, t: Tempat, alpha: number, kilat: number, warna: string, geser: V2 = [0, 0], skala = 1) {
    if (alpha <= 0.01) return
    const [cx, cy] = PUSAT_HURUF[huruf]
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(t.x, t.y); ctx.scale(t.k, t.k)
    ctx.translate(cx + geser[0], cy + geser[1]); ctx.scale(skala, skala); ctx.translate(-cx, -cy)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const garis = () => { for (const g of RETAK[huruf]) { ctx.beginPath(); g.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke() } }
    if (kilat > 0.01) { ctx.strokeStyle = `rgba(255,236,200,${kilat})`; ctx.lineWidth = Math.max(26, 2 / t.k); garis() }
    ctx.strokeStyle = warna; ctx.lineWidth = Math.max(LEBAR_RETAK, 0.9 / t.k); garis()
    ctx.restore()
  }
  function gambarNaga(t: Tempat, n: Naga, dok = 0) {
    ctx.save(); ctx.globalAlpha = n.o
    if (n.kabur > 0.3) ctx.filter = `blur(${n.kabur.toFixed(1)}px)`
    ctx.translate(t.x, t.y); ctx.scale(t.k, t.k)
    if (n.kaki) { ctx.translate(NAGA.kaki[0], NAGA.kaki[1]); ctx.scale(n.sx, n.sy); ctx.translate(-NAGA.kaki[0], -NAGA.kaki[1]) }
    else { ctx.translate(n.x, n.y); ctx.rotate(n.r); ctx.scale(n.s * n.sx * n.hadap, n.s * n.sy); ctx.transform(1, 0, n.lentur, 1, 0, 0); ctx.translate(-NAGA.pusat[0], -NAGA.pusat[1]) }
    const kulit = campur(Math.abs(n.hadap) < 0.5 ? [189, 189, 189] : [217, 217, 217], warnaMerek.huruf, dok)
    ctx.fillStyle = css(kulit); ctx.fill(pBadan, 'evenodd'); ctx.fill(pMata, 'evenodd')
    if ((n.kedip ?? 0) > 0.01) { 
      ctx.save(); ctx.clip(pSoket)
      const bawah = 172 + (420 - 172) * (n.kedip ?? 0)
      ctx.fillStyle = css(kulit); ctx.fillRect(3400, 160, 230, bawah - 160)
      ctx.strokeStyle = '#4C4C4C'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(3400, bawah); ctx.lineTo(3630, bawah); ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = css(campur([76, 76, 76], warnaMerek.detail, dok)); ctx.fill(pAlis)
    const hd = NAGA.hidung; ctx.beginPath(); ctx.ellipse(hd.cx, hd.cy, hd.rx, hd.ry, hd.putar * Math.PI / 180, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  const titikMulut = (n: Naga): V2 => {
    const lx = (NAGA.mulut[0] - NAGA.pusat[0]) * n.s * n.sx * n.hadap, ly = (NAGA.mulut[1] - NAGA.pusat[1]) * n.s * n.sy, c = Math.cos(n.r), s = Math.sin(n.r)
    return [n.x + lx * c - ly * s, n.y + lx * s + ly * c]
  }
  function gambarPartikel(t: Tempat, d: Partikel[], modus: GlobalCompositeOperation = 'lighter') {
    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.k, t.k); ctx.globalCompositeOperation = modus
    for (const q of d) {
      const f = q.u / q.hidup, i = q.debu ? 5 : q.percik ? Math.min(2, Math.floor(f * 3)) : Math.min(SPRITE.length - 1, Math.floor(f * SPRITE.length)), uk = q.uk * (q.percik ? 1 - f * 0.6 : 0.5 + f * 1.4)
      ctx.globalAlpha = (1 - f) * (q.debu ? 0.55 : 0.95)
      ctx.drawImage(SPRITE[i], q.x - uk / 2, q.y - uk / 2, uk, uk)
    }
    ctx.restore()
  }

  let warnaDibaca = false, terbuka = false, dipotong = false
  function bingkai(t: number, dt: number) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H)
    const B = besar(), kb = kotak(), n = naga(t)
    if (t >= T.lebar[0] && !warnaDibaca) { warnaDibaca = true; bacaWarna() }

    if (n && n.api && dt > 0) {
      const [mx, my] = titikMulut(n), arah = n.r + (n.hadap < 0 ? Math.PI : 0) + 0.2 * Math.sign(n.hadap)
      for (let i = 0; i < 11; i++) { const a = arah + (Math.random() - 0.5) * 0.4, v = 2800 + Math.random() * 1600; api.push({ x: mx, y: my, vx: Math.cos(a) * v + (n.vx ?? 0) * 0.3, vy: Math.sin(a) * v, u: 0, hidup: 0.42 + Math.random() * 0.3, uk: 120 + Math.random() * 100 }) }
    }
    for (const q of api) {
      if (q.kena || q.y <= 110 || q.y >= 1000) continue
      const h = URUTAN.find((k) => q.x >= KOTAK_HURUF[k][0] && q.x <= KOTAK_HURUF[k][2])
      if (h) { q.kena = true; q.vy *= -0.12; q.vx *= 0.4; panas[h] = Math.min(1, panas[h] + 0.02); kejut[h] = Math.min(1, kejut[h] + 0.05) }
    }
    gerakPartikel(api, dt, -900, 0.4)
    for (const k of URUTAN) { panas[k] = Math.max(0, panas[k] - dt * 0.9); kejut[k] *= Math.pow(0.004, dt) }
    for (const h of URUTAN) {
      if (t >= kunciHuruf[h] && t < T.pecah && !sudah.has('kunci' + h)) {
        sudah.add('kunci' + h)
        for (const g of RETAK[h]) for (const [x, y] of g) { const a = Math.random() * Math.PI * 2, v = 500 + Math.random() * 900; percik.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 300, u: 0, hidup: 0.3 + Math.random() * 0.25, uk: 46 + Math.random() * 30, percik: true }) }
      }
    }
    if (t >= T.mendarat && !sudah.has('mendarat')) {
      sudah.add('mendarat'); kejut.D = 1; kejut.I = 1
      for (let i = 0; i < 30; i++) { const a = Math.PI + Math.random() * Math.PI; debu.push({ x: NAGA.kaki[0] + (Math.random() - 0.5) * 300, y: 1000, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 420, u: 0, hidup: 0.6 + Math.random() * 0.4, uk: 150, debu: true }) }
    }
    gerakPartikel(percik, dt, 1600, 0.2); gerakPartikel(debu, dt, 0, 0.1)

    const pl = kl((t - T.lebar[0]) / (T.lebar[1] - T.lebar[0])), el = bezDrawer(pl), kotakIn = keluar(kl(t / T.kotak))
    const ins = { t: lerp(kb.y, 0, el) + (1 - kotakIn) * 12, r: lerp(kb.x, 0, el) + (1 - kotakIn) * 12 }, rad = lerp(16, 0, el)
    const klip = `inset(${ins.t}px ${ins.r}px ${ins.t}px ${ins.r}px round ${rad}px)`
    root.style.clipPath = klip; tutup.style.clipPath = klip
    if (!dipotong) { dipotong = true; document.documentElement.classList.remove('cam-intro-awal') }
    tutup.style.opacity = String(kotakIn * (1 - kl((t - T.lebar[0] - 0.12) / 0.35)))
    root.style.opacity = t < T.lebar[0] ? '0' : ''
    if (el < 1) {
      ctx.save(); ctx.globalAlpha = kotakIn * (1 - el); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(ins.r + 0.5, ins.t + 0.5, W - ins.r * 2 - 1, H - ins.t * 2 - 1, rad); ctx.stroke(); ctx.restore()
    }
    kanvas.style.pointerEvents = t >= T.lebar[1] ? 'none' : 'auto'
    if (t >= T.lebar[1] && !terbuka) { terbuka = true; onTerbuka?.() }

    const K = kecil()
    for (const kp of keping) {
      const [cx, cy] = PUSAT_HURUF[kp.huruf]
      const denyut = t >= kunciHuruf[kp.huruf] ? pegas(t - kunciHuruf[kp.huruf], 0.06, 0, 20, 0.35) : 0
      const tekan = kejut[kp.huruf] * 26
      if (t < T.pecah) {
        const st = rakitKeping(kp, t)
        if (!st) continue
        const lalu = rakitKeping(kp, t - 0.035)
        if (lalu && Math.hypot(st.dx - lalu.dx, st.dy - lalu.dy) > 45) { const [lx, ly] = keLayar(B, kp.px + lalu.dx, kp.py + lalu.dy); gambarKeping(kp, lx, ly, B.k * lalu.s, lalu.rot, lalu.flip, st.a * 0.22) }
        const [X, Y] = keLayar(B, cx + (kp.px - cx) * (1 + denyut) + st.dx, cy + (kp.py - cy) * (1 + denyut) + tekan + st.dy)
        gambarKeping(kp, X, Y, B.k * st.s * (1 + denyut), st.rot, st.flip, st.a)
        continue
      }
      const pisah = 1 - pegas(t - T.pecah, 1, 0, 16, 0.6)
      const [Sx, Sy] = keLayar(B, kp.px + (kp.px - cx) * 0.14 * pisah, kp.py + (kp.py - cy) * 0.14 * pisah + 18 * pisah + tekan)
      const [Ex, Ey] = keLayar(K, kp.px, kp.py)
      const u = t - kp.lepas
      if (u <= 0) { gambarKeping(kp, Sx, Sy, B.k * (1 + 0.03 * pisah), 0, 1, 1); continue }
      const X = Ex + pegas(u, Sx - Ex, kp.kc1[0] * 3.2, 8.2, 1), Y = Ey + pegas(u, Sy - Ey, kp.kc1[1] * 4.2, 8.2, 0.8)
      const susut = pegas(u, 1, 0, 13, 1), k = K.k + (B.k - K.k) * susut
      gambarKeping(kp, X, Y, k, pegas(u, 0, kp.putarDok, 9, 0.5), Math.cos(Math.PI * 2 * (1 - pegas(u, 1, 0, 8.5, 0.82))), 1, 1 - susut)
    }
    for (const h of URUTAN) {
      const tekan = kejut[h] * 26
      if (t < T.pecah) { const u = t - kunciHuruf[h]; if (u > -0.05) gambarRetak(h, B, kl((u + 0.05) / 0.1), Math.max(0, 1 - u / 0.35), '#000', [0, tekan], 1 + (u > 0 ? pegas(u, 0.06, 0, 20, 0.35) : 0)) }
      else if (t < T.pecah + 0.06) gambarRetak(h, B, 1 - (t - T.pecah) / 0.06, 0, '#000', [0, tekan])
      else { const u = t - kunciDok[h]; gambarRetak(h, K, kl(u / 0.12), Math.max(0, 1 - u / 0.3) * 0.8, css(warnaMerek.retak)) }
    }
    if (n) {
      if (t < T.aDok) gambarNaga(B, { ...n, kedip: kedipPada(t) })
      else {
        const u = t - T.aDok
        if (u < 0.12) { const q = Math.sin(u / 0.12 * Math.PI / 2) * 0.16; gambarNaga(B, { ...n, kaki: true, sx: 1 + q * 0.5, sy: 1 - q }) }
        else {
          const v = u - 0.12
          const [Sx, Sy] = keLayar(B, NAGA.pusat[0], NAGA.pusat[1]), [Ex, Ey] = keLayar(K, NAGA.pusat[0], NAGA.pusat[1])
          const BAWAH = 58, LAMA = 0.46, Cx = Ex + 90, Cy = Sy - 60
          const posisi = (w: number): V2 => {
            if (w < LAMA) { const q = 1 - Math.pow(1 - w / LAMA, 2.2), a = 1 - q; return [a * a * Sx + 2 * a * q * Cx + q * q * Ex, a * a * Sy + 2 * a * q * Cy + q * q * (Ey + BAWAH)] }
            return [Ex, Ey + pegas(w - LAMA, BAWAH, -240, 13, 0.72)]
          }
          const [X, Y] = posisi(v), [X2, Y2] = posisi(v + 0.01), vx = (X2 - X) / 0.01, vy = (Y2 - Y) / 0.01
          const susut = Math.pow(1 - kl(v / LAMA), 2.4), k = K.k + (B.k - K.k) * susut, regang = Math.min(0.2, Math.hypot(vx, vy) / 9000)
          gambarNaga({ k, x: X - NAGA.pusat[0] * k, y: Y - NAGA.pusat[1] * k }, { x: NAGA.pusat[0], y: NAGA.pusat[1], s: 1, sx: 1 + regang, sy: 1 - regang * 0.7, r: kl(vx / 3200, -0.3, 0.3), hadap: 1, kabur: 0, o: 1, lentur: 0 }, 1 - susut)
        }
      }
    }
    gambarPartikel(B, api); gambarPartikel(B, percik); gambarPartikel(B, debu, 'source-over')
  }

  let selesaiFn: () => void = () => undefined
  const selesai = new Promise<void>((ok) => { selesaiFn = ok })
  let waktu = 0, lalu = 0, raf = 0, habis = false
  const tamat = () => {
    if (habis) return
    habis = true
    cancelAnimationFrame(raf); clearTimeout(cadangan)
    removeEventListener('resize', ukur); removeEventListener('keydown', tombol, true); kanvas.removeEventListener('pointerdown', lewati)
    kanvas.remove(); tutup.remove()
    root.style.clipPath = ''; root.style.opacity = ''
    if (!terbuka) { terbuka = true; onTerbuka?.() }
    selesaiFn()
  }
  const lewati = () => tamat()
  const tombol = (e: KeyboardEvent) => { if (e.key === 'Escape' && waktu < T.lebar[1]) { e.preventDefault(); tamat() } }
  document.body.append(tutup, kanvas)
  addEventListener('resize', ukur)
  kanvas.addEventListener('pointerdown', lewati)
  addEventListener('keydown', tombol, true)
  const cadangan = setTimeout(tamat, 15000)
  let berat = 0
  const putar = (ts: number) => {
    const mentah = lalu ? (ts - lalu) / 1000 : 0, dt = Math.min(0.05, mentah); lalu = ts
    if (mentah > 0.07 && waktu > 0.3 && ++berat >= 6) { tamat(); return }
    waktu += dt
    if (waktu >= T.selesai) { tamat(); return }
    try { bingkai(waktu, dt) } catch (e) { console.warn('intro:', e); tamat(); return }
    raf = requestAnimationFrame(putar)
  }
  raf = requestAnimationFrame(putar)
  return { selesai, lewati }
}
