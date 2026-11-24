import * as THREE from 'three'
import { deteksiMata, type Mata } from './mata'

const keluar3 = (p: number) => 1 - Math.pow(1 - p, 3)
const mulus = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2 
const halusL = (p: number) => p * p * (3 - 2 * p)

export interface Rig {
  sendi: Record<string, THREE.Object3D>
  posisiAkar: THREE.Vector3
  kepala: { b: THREE.Box3; j: THREE.Vector3; m: THREE.Mesh }
  aksesori: THREE.Mesh[]
}

interface Bagian { m: THREE.Mesh; b: THREE.Box3; c: THREE.Vector3; u: THREE.Vector3 }

export function pasangRig(o: THREE.Object3D): Rig | null {
  const bagian: Bagian[] = [], aksesori: Bagian[] = []
  for (const x of [...o.children]) {
    const m = x as THREE.Mesh
    if (!m.isMesh) continue
    m.geometry.computeBoundingBox()
    const b = m.geometry.boundingBox!.clone()
    ;(/^Player/i.test(m.name) ? bagian : aksesori).push({ m, b, c: b.getCenter(new THREE.Vector3()), u: b.getSize(new THREE.Vector3()) })
  }
  if (bagian.length !== 15) return null
  bagian.sort((a, b) => b.c.y - a.c.y)
  const kepala = bagian[0], tengah = kepala.c.x, sisa = bagian.slice(1)
  sisa.sort((a, b) => Math.abs(b.c.x - tengah) - Math.abs(a.c.x - tengah))
  const lengan = sisa.slice(0, 6), kaki = sisa.slice(6, 12), [atas, bawah] = sisa.slice(12).sort((a, b) => b.c.y - a.c.y)
  const sisiKu = (arr: Bagian[], kanan: boolean) => arr.filter((p) => (p.c.x > tengah) === kanan).sort((a, b) => b.c.y - a.c.y)
  const J = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const akar = new THREE.Group(), jAkar = bawah.c.clone()
  akar.position.copy(jAkar); o.add(akar)
  const pasang = (p: Bagian, pv: THREE.Object3D, jAbs: THREE.Vector3) => { pv.add(p.m); p.m.position.copy(jAbs).negate() }
  const pivot = (induk: THREE.Object3D, jInduk: THREE.Vector3, jAbs: THREE.Vector3) => { const p = new THREE.Group(); p.position.copy(jAbs).sub(jInduk); induk.add(p); return p }
  const sendi: Record<string, THREE.Object3D> = { akar }, posisi = new Map<Bagian, [THREE.Object3D, THREE.Vector3]>()
  pasang(bawah, akar, jAkar); posisi.set(bawah, [akar, jAkar])
  const jPinggang = J(tengah, atas.b.min.y, atas.c.z), pinggang = pivot(akar, jAkar, jPinggang); pasang(atas, pinggang, jPinggang); posisi.set(atas, [pinggang, jPinggang])
  const jLeher = J(tengah, atas.b.max.y, atas.c.z), leher = pivot(pinggang, jPinggang, jLeher); pasang(kepala, leher, jLeher); posisi.set(kepala, [leher, jLeher])
  Object.assign(sendi, { pinggang, leher })
  for (const kanan of [true, false]) {
    const ak = kanan ? 'Ka' : 'Ki', [lA, lB, tangan] = sisiKu(lengan, kanan), [kA, kB, telapak] = sisiKu(kaki, kanan)
    if (!lA || !lB || !tangan || !kA || !kB || !telapak) return null
    const jBahu = J(lA.c.x, lA.b.max.y - Math.min(lA.u.x * 0.5, lA.u.y * 0.25), lA.c.z), bahu = pivot(pinggang, jPinggang, jBahu); pasang(lA, bahu, jBahu); posisi.set(lA, [bahu, jBahu])
    const jSiku = J(lB.c.x, lB.b.max.y, lB.c.z), siku = pivot(bahu, jBahu, jSiku); pasang(lB, siku, jSiku); posisi.set(lB, [siku, jSiku])
    const jTangan = J(tangan.c.x, tangan.b.max.y, tangan.c.z), pt = pivot(siku, jSiku, jTangan); pasang(tangan, pt, jTangan); posisi.set(tangan, [pt, jTangan])
    const jPanggul = J(kA.c.x, kA.b.max.y - kA.u.y * 0.08, kA.c.z), panggul = pivot(akar, jAkar, jPanggul); pasang(kA, panggul, jPanggul); posisi.set(kA, [panggul, jPanggul])
    const jLutut = J(kB.c.x, kB.b.max.y, kB.c.z), lutut = pivot(panggul, jPanggul, jLutut); pasang(kB, lutut, jLutut); posisi.set(kB, [lutut, jLutut])
    const jKaki = J(telapak.c.x, telapak.b.max.y, telapak.c.z), pk = pivot(lutut, jLutut, jKaki); pasang(telapak, pk, jKaki); posisi.set(telapak, [pk, jKaki])
    Object.assign(sendi, { ['bahu' + ak]: bahu, ['siku' + ak]: siku, ['tangan' + ak]: pt, ['panggul' + ak]: panggul, ['lutut' + ak]: lutut, ['kaki' + ak]: pk })
  }
  for (const a of aksesori) {
    let terbaik: Bagian | null = null, d = Infinity
    for (const [p] of posisi) { const x = p.b.distanceToPoint(a.c); if (x < d) { d = x; terbaik = p } }
    const [pv, j] = posisi.get(terbaik!)!
    pasang(a, pv, j)
  }
  return { sendi, posisiAkar: jAkar.clone(), kepala: { b: kepala.b.clone(), j: jLeher.clone(), m: kepala.m }, aksesori: aksesori.map((a) => a.m) }
}

type Pose = Partial<Record<string, [number, number, number]>>
const POSE: Record<'berdiri' | 'jongkok' | 'kuasa' | 'menoleh', Pose> = {
  berdiri: { bahuKa: [0, 0, -0.06], bahuKi: [0, 0, 0.06] },
  jongkok: { akar: [-0.12, 0, 0], pinggang: [-0.5, 0, 0], leher: [-0.55, 0, 0], panggulKa: [1.35, 0, -0.08], panggulKi: [1.35, 0, 0.08], lututKa: [-2.15, 0, 0], lututKi: [-2.15, 0, 0], kakiKa: [0.8, 0, 0], kakiKi: [0.8, 0, 0], bahuKa: [0.45, 0, -0.18], bahuKi: [0.45, 0, 0.18], sikuKa: [0.5, 0, 0], sikuKi: [0.5, 0, 0] },
  kuasa: { pinggang: [0, -0.18, 0], leher: [0.1, -0.12, 0], bahuKa: [1.5, 0.15, -0.1], sikuKa: [0.25, 0, 0], tanganKa: [-0.35, 0, 0], bahuKi: [0.05, 0, 0.1], sikuKi: [0.15, 0, 0] },
  menoleh: { pinggang: [0, -0.14, 0], leher: [0.04, -0.5, 0], bahuKa: [0, 0, -0.08], bahuKi: [0.08, 0, 0.1], sikuKi: [0.12, 0, 0] },
}
const TURUN_JONGKOK = 1.25
const SENDI = ['akar', 'pinggang', 'leher', 'bahuKa', 'bahuKi', 'sikuKa', 'sikuKi', 'tanganKa', 'tanganKi', 'panggulKa', 'panggulKi', 'lututKa', 'lututKi', 'kakiKa', 'kakiKi']
const nilaiPose = (p: Pose, n: string, v: THREE.Vector3) => v.fromArray(p[n] ?? POSE.berdiri[n] ?? [0, 0, 0])

export interface KeadaanPose {
  kasus: number
  detail: number
  masuk: number | null
  nafas: number
  t: number
}
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vJ = new THREE.Vector3(), vH = new THREE.Vector3()
export function gerakkanRig(rig: Rig, k: KeadaanPose) {
  const wKasus = mulus(THREE.MathUtils.clamp((k.kasus - 0.5) / 0.5, 0, 1)), wDetail = mulus(THREE.MathUtils.clamp((k.detail - 0.12) / 0.88, 0, 1))
  let bangkit = 1, angkatKepala = 1
  if (k.masuk !== null) { bangkit = mulus(THREE.MathUtils.clamp((k.masuk - 0.4) / 1.0, 0, 1)); angkatKepala = mulus(THREE.MathUtils.clamp((k.masuk - 0.8) / 0.6, 0, 1)) }
  const s = rig.sendi
  for (const n of SENDI) {
    const o = s[n]; if (!o) continue
    nilaiPose(POSE.berdiri, n, vH)
    vH.lerp(nilaiPose(POSE.kuasa, n, vA), wKasus).lerp(nilaiPose(POSE.menoleh, n, vB), wDetail)
    if (k.masuk !== null) vH.lerpVectors(vJ.fromArray(POSE.jongkok[n] ?? [0, 0, 0]), vH, n === 'leher' ? angkatKepala : bangkit)
    o.rotation.set(vH.x, vH.y, vH.z)
  }
  const nafas = k.nafas * Math.sin(k.t * 1.7)
  s.pinggang.rotation.x += nafas * 0.018; s.leher.rotation.x -= nafas * 0.012
  if (s.bahuKa) s.bahuKa.rotation.z -= nafas * 0.012
  if (s.bahuKi) s.bahuKi.rotation.z += nafas * 0.012
  s.akar.position.copy(rig.posisiAkar); s.akar.position.y -= TURUN_JONGKOK * (1 - bangkit)
}
export const turunMasuk = (u: number) => 1 - mulus(THREE.MathUtils.clamp((u - 0.4) / 1.0, 0, 1))

let halaTex: THREE.Texture | null = null, kilauTex: THREE.Texture | null = null
function teksturBersama() {
  if (!halaTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,215,205,.9)'); gr.addColorStop(0.38, 'rgba(255,50,30,.55)'); gr.addColorStop(1, 'rgba(200,0,0,0)')
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
    halaTex = new THREE.CanvasTexture(c); halaTex.userData.bersama = true
  }
  if (!kilauTex) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 32
    const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 256, 0)
    gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(0.35, 'rgba(255,40,30,.7)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.65, 'rgba(255,40,30,.7)'); gr.addColorStop(1, 'rgba(255,0,0,0)')
    g.fillStyle = gr; g.fillRect(0, 13, 256, 6)
    kilauTex = new THREE.CanvasTexture(c); kilauTex.userData.bersama = true
  }
  return { hala: halaTex, kilau: kilauTex }
}

const alphaCache = new WeakMap<object, { w: number; h: number; a: Uint8ClampedArray }>()
function padat(bahan: THREE.Material | undefined, uv: THREE.Vector2 | undefined) {
  const img = (bahan as THREE.MeshStandardMaterial | undefined)?.map?.image as (HTMLImageElement | HTMLCanvasElement | undefined)
  if (!img || !uv || !img.width) return true
  let d = alphaCache.get(img)
  if (!d) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return true
    g.drawImage(img, 0, 0); d = { w: c.width, h: c.height, a: g.getImageData(0, 0, c.width, c.height).data }; alphaCache.set(img, d)
  }
  const u = ((uv.x % 1) + 1) % 1, v = ((uv.y % 1) + 1) % 1
  const x = Math.min(d.w - 1, Math.floor(u * d.w)), y = Math.min(d.h - 1, Math.floor((1 - v) * d.h))
  return d.a[(y * d.w + x) * 4 + 3] >= 128
}
function penghalang(e: { x: number; y: number; z: number }, aksesori: THREE.Mesh[]) {
  const ray = new THREE.Raycaster(new THREE.Vector3(e.x, e.y, e.z - 10), new THREE.Vector3(0, 0, 1))
  let terdekat: { distance: number; point: THREE.Vector3; m: THREE.Mesh } | null = null
  for (const m of aksesori) {
    for (const h of ray.intersectObject(new THREE.Mesh(m.geometry, m.material), false)) {
      if (h.distance > 10 - 0.004) break
      const bahan = Array.isArray(m.material) ? m.material[h.face?.materialIndex ?? 0] : m.material
      if (!padat(bahan, h.uv)) continue
      if (!terdekat || h.distance < terdekat.distance) terdekat = { distance: h.distance, point: h.point.clone(), m }
      break
    }
  }
  return terdekat
}
function permukaan(kepala: THREE.Mesh, x: number, y: number, zDepan: number): Mata {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, y, zDepan - 10), new THREE.Vector3(0, 0, 1))
  const h = ray.intersectObject(new THREE.Mesh(kepala.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), false)[0]
  const n = h?.face?.normal.clone() ?? new THREE.Vector3(0, 0, -1)
  if (n.z > 0) n.negate()
  return { x, y, z: h ? h.point.z : zDepan, n: [n.x, n.y, n.z], w: 0, h: 0, sel: 0 }
}
function wajahBisaHilang(kepala: THREE.Mesh, bahan: THREE.MeshStandardMaterial, kulit: THREE.Color) {
  if (Array.isArray(kepala.material) || !bahan.map) return null
  const wajah = { value: 1 }, warnaKulit = { value: new THREE.Color().setRGB(kulit.r, kulit.g, kulit.b, THREE.SRGBColorSpace) }
  const salinan = bahan.clone()
  salinan.userData = { kulit, kanvas: bahan.userData.kanvas }
  const asal = bahan.onBeforeCompile
  salinan.onBeforeCompile = (sh, r) => {
    asal.call(salinan, sh, r)
    sh.uniforms.wajahCampur = wajah; sh.uniforms.wajahKulit = warnaKulit
    sh.fragmentShader = 'uniform float wajahCampur; uniform vec3 wajahKulit;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n  diffuseColor.rgb = mix(wajahKulit * diffuse, diffuseColor.rgb, wajahCampur);')
  }
  salinan.customProgramCacheKey = () => 'cam-wajah-campur'
  kepala.material = salinan
  return wajah
}

export interface MataEfek {
  kelopak: THREE.Object3D[]; nyala: THREE.Object3D[]; hala: THREE.Object3D[]
  bIris: THREE.MeshBasicMaterial; bInti: THREE.MeshBasicMaterial; bHala: THREE.MeshBasicMaterial; bKilau: THREE.MeshBasicMaterial
  wajah: { value: number } | null
}
export function pasangMata(rig: Rig | null): MataEfek | null {
  if (!rig) return null
  const { j, m: kepala, b } = rig.kepala
  const bahanKepala = (Array.isArray(kepala.material) ? kepala.material[0] : kepala.material) as THREE.MeshStandardMaterial
  const kulit: THREE.Color = bahanKepala.userData.kulit ?? new THREE.Color(0.8, 0.65, 0.5)
  const det = deteksiMata(kepala, bahanKepala.userData.kanvas, [kulit.r, kulit.g, kulit.b].map((v) => Math.round(v * 255)) as [number, number, number])
  const u = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), lebar = u.x
  const mata = det ? [det.kiri, det.kanan] : [-1, 1].map((sisi) => ({ ...permukaan(kepala, c.x + sisi * lebar * 0.21, c.y + u.y * 0.06, b.min.z), w: lebar * 0.15, h: lebar * 0.11 }))
  const wajah = wajahBisaHilang(kepala, bahanKepala, kulit)
  const tex = teksturBersama()
  const grup = new THREE.Group()
  const warnaKelopak = new THREE.Color().setRGB(kulit.r, kulit.g, kulit.b, THREE.SRGBColorSpace).multiply(bahanKepala.map ? bahanKepala.color : new THREE.Color(1, 1, 1)).multiplyScalar(0.8)
  const bKelopak = new THREE.MeshStandardMaterial({ color: warnaKelopak, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  const bBulu = new THREE.MeshBasicMaterial({ color: 0x0b0606, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
  const bIris = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.35, 0.25), toneMapped: false, transparent: true, depthWrite: false, opacity: 0 })
  const bInti = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 6.6, 6.4), toneMapped: false, transparent: true, depthWrite: false, opacity: 0 })
  const bHala = new THREE.MeshBasicMaterial({ map: tex.hala, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 })
  const bKilau = new THREE.MeshBasicMaterial({ map: tex.kilau, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 })
  const efek: MataEfek = { kelopak: [], nyala: [], hala: [], bIris, bInti, bHala, bKilau, wajah }
  const halangan = mata.map((e) => penghalang(e, rig.aksesori))
  const kacamata = !!(halangan[0] && halangan[1] && halangan[0].m === halangan[1].m)
  const lingkaran = new THREE.CircleGeometry(1, 32), cincin = new THREE.RingGeometry(0.87, 1, 32, 1, Math.PI * 1.12, Math.PI * 0.76)
  mata.forEach((e, i) => {
    const ew = Math.max(e.w, lebar * 0.05), eh = Math.max(e.h, lebar * 0.05)
    const g = new THREE.Group()
    const n = kacamata ? [0, 0, -1] : e.n
    const p = kacamata ? halangan[i]!.point : e
    g.position.set(p.x - j.x, p.y - j.y, p.z - j.z)
    g.rotation.set(-Math.asin(THREE.MathUtils.clamp(n[1], -1, 1)), Math.atan2(n[0], n[2]), 0, 'YXZ')
    grup.add(g)
    const taruh = <T extends THREE.Object3D>(o: T, d: number) => { o.position.z = d * lebar; o.renderOrder = 5; g.add(o); return o }
    if (!kacamata) {
      const W = Math.max(ew, lebar * 0.14), rx = W * 0.6, ry = Math.max(W * 0.3, eh * 0.35)
      const kp = taruh(new THREE.Group(), 0.008)
      const lid = new THREE.Mesh(lingkaran, bKelopak); lid.scale.set(rx, ry, 1); kp.add(lid)
      const sy = Math.min(ry * 0.55, lebar * 0.045)
      const garis = new THREE.Mesh(cincin, bBulu); garis.scale.set(rx * 0.9, sy, 1); garis.position.set(0, sy * 0.35, 0.001 * lebar); kp.add(garis)
      efek.kelopak.push(kp)
    }
    const ir = taruh(new THREE.Mesh(lingkaran, bIris), 0.012); ir.scale.set(ew * 0.42, eh * 0.42, 1)
    const it = taruh(new THREE.Mesh(lingkaran, bInti), 0.014); it.scale.set(ew * 0.2, eh * 0.2, 1)
    efek.nyala.push(ir, it)
    const s = Math.max(ew, eh) * 1.6 + lebar * 0.22
    efek.hala.push(taruh(new THREE.Mesh(new THREE.PlaneGeometry(s, s), bHala), 0.016))
    if (kacamata || !halangan[i]) taruh(new THREE.Mesh(new THREE.PlaneGeometry(lebar * 1.7, lebar * 0.07), bKilau), 0.018)
  })
  rig.sendi.leher.add(grup)
  return efek
}

export const BUKA = 1.25
export function aturMata(m: MataEfek | null, u: number | null, t: number) {
  if (!m) return
  let tutup = 0, nyala = 0, ledak = 0
  if (u !== null) {
    if (u < BUKA) tutup = 1
    else {
      tutup = Math.max(0, 1 - keluar3(Math.min(1, (u - BUKA) / 0.14)))
      ledak = Math.max(0, 1 - (u - BUKA) / 0.6)
      nyala = u < 3.0 ? 1 : Math.max(0, 1 - (u - 3.0) / 1.5)
    }
  }
  if (m.wajah) m.wajah.value = u === null ? 1 : u < 3.0 ? 0 : halusL(Math.min(1, (u - 3.0) / 1.2))
  for (const kp of m.kelopak) { kp.visible = tutup > 0.01; kp.scale.set(1, Math.max(0.001, tutup), 1) }
  const denyut = 0.9 + Math.sin(t * 11) * 0.06 + Math.sin(t * 27) * 0.04, buka = 1 - tutup
  m.bIris.opacity = nyala * buka * denyut
  m.bInti.opacity = nyala * buka
  m.bHala.opacity = Math.min(1, nyala * buka * (0.75 + ledak * 0.6)) * denyut
  m.bKilau.opacity = Math.min(1, nyala * buka * (0.55 + ledak * 0.9))
  for (const h of m.hala) h.scale.setScalar(0.85 + ledak * 0.9)
  const tampak = m.bInti.opacity > 0.01
  for (const o of m.nyala) o.visible = tampak
}
