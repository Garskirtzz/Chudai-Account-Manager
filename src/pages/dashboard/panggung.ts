import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import type { Avatar3d } from '@/api/types'
import { BUKA, aturMata, gerakkanRig, pasangMata, pasangRig, turunMasuk, type MataEfek, type Rig } from './karakter'

const gerakMati = () => document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches

export function webglAda() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface InfoMtl { kd: [number, number, number]; peta: string | null }

export function uraiMtl(mtl: string): Map<string, InfoMtl> {
  const peta = new Map<string, InfoMtl>()
  let kini: InfoMtl | null = null
  for (const baris of mtl.split(/\r?\n/)) {
    const [k, ...isi] = baris.trim().split(/\s+/)
    if (k === 'newmtl') { kini = { kd: [1, 1, 1], peta: null }; peta.set(isi.join(' '), kini) }
    else if (kini && k === 'Kd' && isi.length >= 3) kini.kd = [Number(isi[0]), Number(isi[1]), Number(isi[2])]
    else if (kini && k === 'map_Kd' && isi.length) kini.peta = isi.join(' ')
  }
  return peta
}

const muatGambar = (src: string) => new Promise<HTMLImageElement>((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = gagal; i.src = src })

export interface ModelSiap {
  grup: THREE.Group
  rig: Rig | null
  mata: MataEfek | null
  rim: { value: THREE.Color }
  kuatRim: { value: number }
}

const WARNA = { sorot: 0xff3b2e, area: 0xff6a5a, tepi: 0xff2d1e, partikel: 0xffc2c2, gelombang: 0xff9494, ramp: [[0, 0xf4806f], [5, 0xe0483a], [12, 0xa8160d], [21, 0x4a0503], [30, 0x0a0000]] as [number, number][] }

export async function bangunModel(a: Avatar3d): Promise<ModelSiap> {
  const info = uraiMtl(a.mtl)
  const rim = { value: new THREE.Color(WARNA.tepi) }, kuatRim = { value: 0.8 }
  const bahan = new Map<string, THREE.Material>()
  for (const [nama, m] of info) {
    const tubuh = /^Player/i.test(nama)
    const indeks = m.peta?.match(/^tex(\d+)$/)?.[1]
    const src = indeks != null ? a.tekstur[Number(indeks)] : undefined
    let map: THREE.Texture | null = null, kanvas: HTMLCanvasElement | null = null
    if (src) {
      const img = await muatGambar(src)
      if (tubuh) {
        kanvas = document.createElement('canvas'); kanvas.width = img.width; kanvas.height = img.height
        const g = kanvas.getContext('2d', { willReadFrequently: true })!
        g.fillStyle = `rgb(${m.kd.map((x) => Math.round(x * 255)).join(',')})`
        g.fillRect(0, 0, kanvas.width, kanvas.height)
        g.drawImage(img, 0, 0)
        map = new THREE.CanvasTexture(kanvas)
      } else {
        map = new THREE.Texture(img); map.needsUpdate = true
      }
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = 4
    }
    const b = new THREE.MeshStandardMaterial({
      map, color: map ? 0x8c8c8c : new THREE.Color(...m.kd).multiplyScalar(0.55), roughness: 0.8, metalness: 0,
      alphaTest: map && !tubuh ? 0.5 : 0, side: tubuh ? THREE.FrontSide : THREE.DoubleSide,
    })
    b.userData.kulit = new THREE.Color(...m.kd); b.userData.kanvas = kanvas
    b.onBeforeCompile = (sh) => {
      sh.uniforms.rimWarna = rim; sh.uniforms.rimKuat = kuatRim
      sh.fragmentShader = 'uniform vec3 rimWarna; uniform float rimKuat;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 3.0);\n  totalEmissiveRadiance += rimWarna * rimF * rimKuat;')
    }
    bahan.set(nama, b)
  }
  const obj = new OBJLoader().parse(a.obj)
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const ganti = (m: THREE.Material) => bahan.get(m.name) ?? m
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(ganti) : ganti(mesh.material)
  })
  const kotak = new THREE.Box3().setFromObject(obj), uk = kotak.getSize(new THREE.Vector3())
  const sk = 2.1 / Math.max(uk.y, 1e-6)
  const rig = pasangRig(obj) 
  const mata = pasangMata(rig)
  obj.scale.setScalar(sk)
  obj.position.set(-(kotak.min.x + uk.x / 2) * sk, -kotak.min.y * sk, -(kotak.min.z + uk.z / 2) * sk)
  const hadap = new THREE.Group(); hadap.rotation.y = Math.PI; hadap.add(obj) 
  const grup = new THREE.Group(); grup.add(hadap)
  return { grup, rig, mata, rim, kuatRim }
}

export function buangModel(m: ModelSiap) {
  m.grup.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const b of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const map = (b as THREE.MeshBasicMaterial).map
      if (map && !map.userData.bersama) map.dispose()
      b.dispose()
    }
  })
}

export type ModePanggung = 'beranda' | 'kasus' | 'detail' | 'ganti'
export interface GamePanggung { nama: string; gambar: string }

const mulus = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2 
const keluar3 = (p: number) => 1 - Math.pow(1 - p, 3)
const lebihMulus = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }
const acak = (n: number) => { const t = Math.sin(n * 127.1 + 311.7) * 43758.5453; return t - Math.floor(t) }
const TUNDA_UKUR_MS = 140
const ASPEK_DASAR = 1.9
const LEBAR_KERTAS = (w: number) => Math.min(560, Math.max(340, w * 0.4))
const KERTAS_DASAR = 0.38
const P = { cincin: 3, radius: 4, tumbuhRadius: 2, tinggiDasar: 1, langkahTinggi: 2, putar: 0.1, skalaDiam: 1.6, cincinTinggi: 1.4, cincinRadius: 1.35, cincinSkala: 0.3, miringX: 0.3884, miringZ: -0.2315, cincinKec: 0.18, hambur: 14, jauh: 26 }
const KAMERA: Record<'beranda' | 'kasus' | 'detail', { pos: THREE.Vector3; lihat: THREE.Vector3 }> = {
  beranda: { pos: new THREE.Vector3(0.1, 10.5, 14.5), lihat: new THREE.Vector3(0, 2.0, 0) },
  kasus: { pos: new THREE.Vector3(0.25, 1.0, 2.1), lihat: new THREE.Vector3(0.05, 1.5, 0) },
  detail: { pos: new THREE.Vector3(-1.05, 1.82, 1.75), lihat: new THREE.Vector3(0.18, 1.72, 0) },
}
const DEKAT = { pos: new THREE.Vector3(0.32, 1.05, 2.05), lihat: new THREE.Vector3(0, 1.72, 0) }
const LAMA_KAMERA = 2.2
const vsBiasa = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }'

interface Panel extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  userData: { l: number; i: number; game: number; skala: number; sudut: number; r: number; y: number; miring: number; yHambur: number; dalamCincin: boolean }
}
interface Masuk { t0: number; baru: ModelSiap | null | undefined; games: GamePanggung[]; ditukar: boolean; tSwap: number; dari: { pos: THREE.Vector3; lihat: THREE.Vector3 }; awal: boolean; gelombang: boolean; mataBuka: boolean }

export class Panggung {
  readonly kanvas: HTMLCanvasElement
  onMode: ((m: ModePanggung) => void) | null = null
  onFokusGame: ((i: number) => void) | null = null
  onMulaiGeser: (() => void) | null = null

  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private shock: ShaderPass
  private grade: ShaderPass
  private glitch: ShaderPass
  private fxaa: ShaderPass
  private scene = new THREE.Scene()
  private cam = new THREE.PerspectiveCamera(45, 1, 0.05, 400)
  private geoPlanet: THREE.SphereGeometry
  private planet: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
  private sorot: THREE.SpotLight
  private area: THREE.DirectionalLight
  private isi: THREE.DirectionalLight
  private langit: THREE.HemisphereLight
  private isiWajah: THREE.PointLight
  private bayangan = new THREE.Group()
  private pasanganBayangan: [THREE.Object3D, THREE.Mesh][] = []
  private bahanBayangan: THREE.MeshBasicMaterial
  private gelombang: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  private ledakPos: Float32Array
  private ledakVel: THREE.Vector3[] = []
  private ledakGeo = new THREE.BufferGeometry()
  private ledakBahan: THREE.PointsMaterial
  private ambienPos: Float32Array
  private ambienAsal: THREE.Vector3[] = []
  private ambienDorong: THREE.Vector3[] = []
  private ambienGeo = new THREE.BufferGeometry()
  private titikTex: THREE.CanvasTexture
  private layar = new THREE.Group()
  private geoPanel: THREE.BufferGeometry
  private texCache = new Map<string, THREE.Texture>()
  private panel: Panel[] = []
  private putaranCincin: { kec: number; goyang: number; frek: number; fase: number; dasar: number }[] = []
  private nGame = 0
  private karakter: ModelSiap | null = null
  private masuk: Masuk | null = null
  private mode: ModePanggung = 'ganti'
  private timeline = 0
  private timelineTarget = 0
  private majuDetail = 0
  private jauh = 0
  private jamPanel = 0
  private fasePutar = 0
  private offsetPutar = 0
  private offsetLalu = 0
  private kecPutar = 0
  private sudutTahan = 0
  private putarTahan: { t0: number; dari: number } | null = null
  private tahan = 0
  private seret: { x: number; x0: number } | null = null
  private tmx = 0
  private tmy = 0
  private goyang = new THREE.Vector2()
  private goyangTujuan = new THREE.Vector2()
  private chroma = 0
  private denyutChroma = 0
  private denyutBloom = 0
  private glitchT = 0
  private burst = -1
  private cahaya = 1
  private gelombangT = -1
  private ledakT = -1
  private mataSejak = 0
  private kamDari: { pos: THREE.Vector3; lihat: THREE.Vector3 } | null = null
  private kamSejak = 0
  private lihatKini = new THREE.Vector3(0, 2, 0)
  private fokusLalu = -1
  private ditunjuk: number | null = null
  private sinar = new THREE.Raycaster()
  private titikSinar = new THREE.Vector2()
  private raf = 0
  private lalu = 0
  private gambarTerakhir = 0
  private dijeda = false
  private terlihat = true
  private dibuang = false
  private ro: ResizeObserver
  private io: IntersectionObserver
  private mqGerak: MediaQueryList
  private moGerak: MutationObserver
  private ukuranKini = { w: 0, h: 0 }
  private tundaUkur = 0
  private fovDasar = 1
  private v = new THREE.Vector3()
  private proj = new THREE.Vector3()
  private eRing = new THREE.Euler()
  private qRing = new THREE.Quaternion()
  private qDiam = new THREE.Quaternion()
  private qPlane = new THREE.Quaternion()
  private qGoyang = new THREE.Quaternion()
  private eGoyang = new THREE.Euler()
  private boneka = new THREE.Object3D()

  constructor(private wadah: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, stencil: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.kanvas = this.renderer.domElement
    this.kanvas.className = 'dash-3d'
    wadah.prepend(this.kanvas)
    const sc = this.scene
    sc.background = new THREE.Color(0x000000)
    sc.fog = new THREE.FogExp2(0x000000, 0.024)

    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, stencilBuffer: true }))
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.addPass(new RenderPass(sc, this.cam))
    this.shock = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uProgress: { value: -1 }, uAspect: { value: 1 }, uCenter: { value: new THREE.Vector2(0.5, 0.55) } },
      vertexShader: vsBiasa,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uProgress, uAspect; uniform vec2 uCenter; varying vec2 vUv;
        void main(){
          vec2 d = vUv - uCenter; d.x *= uAspect; float r = length(d);
          float x = (r - uProgress * 1.5) / 0.1; float w = exp(-x * x * 3.) * (1. - uProgress);
          vec2 dir = r > 0. ? d / r : vec2(0.); dir.x /= uAspect;
          vec4 c = texture2D(tDiffuse, vUv - dir * w * 0.035);
          gl_FragColor = c + vec4(vec3(w * 0.05), 0.);
        }`,
    })
    this.shock.enabled = false
    this.composer.addPass(this.shock)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.08, 0)
    this.composer.addPass(this.bloom)
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uWaktu: { value: 0 } },
      vertexShader: vsBiasa,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmount, uWaktu; uniform vec2 uCenter; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        vec3 grade(vec3 c){ float g = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(g), c, 1.01); return (c - .5) * 1.02 + .5; }
        void main(){
          vec2 o = (vUv - uCenter) * uAmount;
          vec4 m = texture2D(tDiffuse, vUv);
          vec3 c = vec3(grade(texture2D(tDiffuse, vUv - o).rgb).r, grade(m.rgb).g, grade(texture2D(tDiffuse, vUv + o).rgb).b);
          c *= mix(.62, 1., smoothstep(1.2, .35, length((vUv - .5) * vec2(1.2, 1.))));
          c += (h(vUv * 1000. + fract(uWaktu)) - .5) * .022;
          gl_FragColor = vec4(c, m.a);
        }`,
    })
    this.composer.addPass(this.grade)
    this.glitch = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uKuat: { value: 0 }, uWaktu: { value: 0 } },
      vertexShader: vsBiasa,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uKuat, uWaktu; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          float f = floor(uWaktu * 20.), pita = floor(vUv.y * 32.);
          float on = step(.7, h(vec2(pita, f))) * uKuat;
          vec2 uv = vUv + vec2((h(vec2(pita * 3.1, f)) - .5) * .12 * on, 0.);
          vec4 c = texture2D(tDiffuse, uv);
          c.r = texture2D(tDiffuse, uv + vec2(.012 * on, 0.)).r; c.b = texture2D(tDiffuse, uv - vec2(.012 * on, 0.)).b;
          gl_FragColor = c;
        }`,
    })
    this.glitch.enabled = false
    this.composer.addPass(this.glitch)
    this.composer.addPass(new OutputPass())
    this.fxaa = new ShaderPass(FXAAShader)
    this.composer.addPass(this.fxaa)

    this.titikTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c) })()
    {
      const n = 1800, p = new Float32Array(n * 3), v = new THREE.Vector3()
      for (let i = 0; i < n; i++) { v.randomDirection().multiplyScalar(120 + Math.random() * 60); if (v.y < -20) v.y = -v.y; p.set([v.x, v.y, v.z], i * 3) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3))
      sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, map: this.titikTex, transparent: true, opacity: 0.5, depthWrite: false, fog: false })))
    }
    const R = 38
    this.geoPlanet = new THREE.SphereGeometry(R, 160, 80)
    {
      const pos = this.geoPlanet.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), a = new THREE.Color(), b = new THREE.Color(), ramp = WARNA.ramp
      for (let i = 0; i < pos.count; i++) {
        const jarak = Math.acos(THREE.MathUtils.clamp(pos.getY(i) / R, -1, 1)) * R
        let k = 0; while (k < ramp.length - 2 && jarak > ramp[k + 1][0]) k++
        const p = THREE.MathUtils.clamp((jarak - ramp[k][0]) / (ramp[k + 1][0] - ramp[k][0]), 0, 1)
        c.copy(a.set(ramp[k][1])).lerp(b.set(ramp[k + 1][1]), p * p * (3 - 2 * p))
        col.set([c.r, c.g, c.b], i * 3)
      }
      this.geoPlanet.setAttribute('color', new THREE.BufferAttribute(col, 3))
    }
    this.planet = new THREE.Mesh(this.geoPlanet, new THREE.MeshBasicMaterial({ vertexColors: true }))
    this.planet.position.y = -R; sc.add(this.planet)
    this.sorot = new THREE.SpotLight(WARNA.sorot, 0, 14, 0.42, 0.55, 1.2); this.sorot.position.set(0, 6.5, 0.6); this.sorot.target.position.set(0, 1, 0); sc.add(this.sorot, this.sorot.target)
    this.area = new THREE.DirectionalLight(WARNA.area, 1.2); this.area.position.set(0.5, 4, 5); sc.add(this.area)
    const belakang = new THREE.DirectionalLight(WARNA.tepi, 1.3); belakang.position.set(-1.2, 3, -6); sc.add(belakang)
    this.isi = new THREE.DirectionalLight(0xe8ecff, 0.9); this.isi.position.set(2, 2.5, 6); sc.add(this.isi)
    this.langit = new THREE.HemisphereLight(0xc8d0ff, 0x2a0606, 0.5); sc.add(this.langit)
    this.isiWajah = new THREE.PointLight(0xffd9cf, 0, 3.2, 1.6); this.isiWajah.position.set(0.15, 1.55, 1.1); sc.add(this.isiWajah)

    const L = new THREE.Vector3(0.18, 1, -0.55)
    this.bayangan.matrixAutoUpdate = false
    this.bayangan.matrix.set(1, -L.x / L.y, 0, 0, 0, 0, 0, 0.01, 0, -L.z / L.y, 1, 0, 0, 0, 0, 1)
    this.bahanBayangan = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp })
    sc.add(this.bayangan)

    this.gelombang = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 128), new THREE.MeshBasicMaterial({ color: WARNA.gelombang, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
    this.gelombang.rotation.x = -Math.PI / 2; this.gelombang.position.y = 0.03; sc.add(this.gelombang)
    const LEDAK = 600
    this.ledakPos = new Float32Array(LEDAK * 3)
    for (let i = 0; i < LEDAK; i++) { const v = new THREE.Vector3().randomDirection(); v.y *= 0.5; this.ledakVel.push(v.normalize().multiplyScalar(12 * (0.35 + Math.random() * 0.65))) }
    this.ledakGeo.setAttribute('position', new THREE.BufferAttribute(this.ledakPos, 3))
    this.ledakBahan = new THREE.PointsMaterial({ color: WARNA.partikel, size: 0.16, map: this.titikTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    sc.add(new THREE.Points(this.ledakGeo, this.ledakBahan))
    const AMBIEN = 200
    this.ambienPos = new Float32Array(AMBIEN * 3)
    for (let i = 0; i < AMBIEN; i++) { const r = Math.sqrt(Math.random()) * 8, a = Math.random() * Math.PI * 2; this.ambienAsal.push(new THREE.Vector3(Math.cos(a) * r, 0.2 + Math.random() * 6, Math.sin(a) * r)); this.ambienDorong.push(new THREE.Vector3()) }
    this.ambienGeo.setAttribute('position', new THREE.BufferAttribute(this.ambienPos, 3))
    sc.add(new THREE.Points(this.ambienGeo, new THREE.PointsMaterial({ color: WARNA.partikel, size: 0.12, map: this.titikTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })))

    this.geoPanel = (() => { const g = new THREE.PlaneGeometry(1.15, 1.15, 20, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, x * x * 0.16) } p.needsUpdate = true; return g })()
    sc.add(this.layar)

    this.kanvas.addEventListener('pointerdown', this.tekan)
    this.kanvas.addEventListener('pointermove', this.gerakKanvas)
    this.kanvas.addEventListener('pointerup', this.lepas)
    this.kanvas.addEventListener('pointercancel', this.lepas)
    wadah.addEventListener('pointerleave', this.keluarWadah)
    wadah.addEventListener('wheel', this.roda, { passive: false })
    document.addEventListener('pointermove', this.gerakDokumen)
    document.addEventListener('visibilitychange', this.mintaJalan)

    this.ro = new ResizeObserver(() => this.ukurNanti())
    this.ro.observe(wadah)
    this.io = new IntersectionObserver(([e]) => { this.terlihat = !!e?.isIntersecting; this.mintaJalan() })
    this.io.observe(wadah)
    this.mqGerak = matchMedia('(prefers-reduced-motion: reduce)')
    this.mqGerak.addEventListener('change', this.mintaJalan)
    this.moGerak = new MutationObserver(this.mintaJalan)
    this.moGerak.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    this.ukur()
    this.mintaJalan()
  }

  private ukurNanti() {
    if (!this.ukuranKini.w) { this.ukur(); return }
    window.clearTimeout(this.tundaUkur)
    this.tundaUkur = window.setTimeout(() => this.ukur(), TUNDA_UKUR_MS)
  }
  private ukur() {
    const w = this.wadah.clientWidth, h = this.wadah.clientHeight
    if (!w || !h || (w === this.ukuranKini.w && h === this.ukuranKini.h)) return
    this.ukuranKini = { w, h }
    this.renderer.setSize(w, h, true)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w / 2, h / 2)
    const pr = this.renderer.getPixelRatio()
    this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr))
    this.shock.uniforms.uAspect.value = w / h
    this.cam.aspect = w / h
    this.fovDasar = Math.pow(Math.max(1, ASPEK_DASAR / (w / h)), 0.75)
    this.mintaJalan()
  }

  private get boleh() { return !this.dijeda && this.terlihat && !document.hidden && !this.dibuang }
  private mintaJalan = () => {
    if (this.raf || !this.boleh) return
    this.lalu = 0
    this.raf = requestAnimationFrame(this.lingkar)
  }
  set jeda(v: boolean) { this.dijeda = v; this.mintaJalan() }

  private tekan = (e: PointerEvent) => {
    if (this.mode === 'ganti' || this.mode === 'detail' || e.button !== 0) return
    this.seret = { x: e.clientX, x0: e.clientX }
    this.onMulaiGeser?.()
    if (this.mode === 'beranda' && !gerakMati()) this.tahan = window.setTimeout(() => { if (this.seret && Math.abs(this.seret.x - this.seret.x0) < 6) this.putarTahan = { t0: performance.now(), dari: this.sudutTahan } }, 220)
    this.kanvas.setPointerCapture(e.pointerId)
    this.mintaJalan()
  }
  private gerakKanvas = (e: PointerEvent) => {
    const r = this.wadah.getBoundingClientRect()
    this.tmx = (e.clientX - r.left) / r.width - 0.5; this.tmy = (e.clientY - r.top) / r.height - 0.5
    this.tunjuk(e)
    if (this.mode === 'kasus') this.mintaJalan()
    if (!this.seret) return
    this.offsetPutar += (e.clientX - this.seret.x) * 0.004
    this.seret.x = e.clientX
  }
  private lepas = () => { window.clearTimeout(this.tahan); this.seret = null }
  private keluarWadah = () => { this.tmx = this.tmy = 0; this.goyangTujuan.set(0, 0) }
  private gerakDokumen = (e: PointerEvent) => {
    const r = this.wadah.getBoundingClientRect()
    if (e.clientY > r.bottom + 60 || e.clientY < r.top - 60) { this.goyangTujuan.set(0, 0); return }
    this.mintaJalan() 
    this.goyangTujuan.set(THREE.MathUtils.clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), THREE.MathUtils.clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1))
  }
  private rodaKumpul = 0
  private rodaSejak = 0
  private roda = (e: WheelEvent) => {
    if (this.mode === 'ganti' || this.mode === 'detail' || (e.target as HTMLElement | null)?.closest?.('.dash-kertas, .dash-apung')) return
    if (this.mode === 'beranda') {
      if ((this.wadah.parentElement?.scrollTop ?? 0) > 0 || e.deltaY <= 0) return
      e.preventDefault()
      const kini = performance.now()
      if (kini - this.rodaSejak > 250) this.rodaKumpul = 0
      this.rodaSejak = kini
      this.rodaKumpul += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      if (this.rodaKumpul >= 50) { this.rodaKumpul = 0; this.setMode('kasus') }
      return
    }
    e.preventDefault()
    this.kecPutar -= e.deltaY * 0.0008
    this.mintaJalan()
  }
  putarKasus(arah: 1 | -1) { if (this.mode === 'kasus') { this.kecPutar += arah * -0.09; this.mintaJalan() } }

  private tunjuk(e: PointerEvent) {
    if (this.mode !== 'kasus' || this.timeline < 0.9) { this.ditunjuk = null; this.kanvas.style.cursor = ''; return }
    const r = this.kanvas.getBoundingClientRect()
    this.titikSinar.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.sinar.setFromCamera(this.titikSinar, this.cam)
    const kena = this.sinar.intersectObjects(this.panel.filter((m) => m.visible), false)[0]
    this.ditunjuk = kena ? (kena.object as Panel).userData.game : null
    this.kanvas.style.cursor = this.ditunjuk != null ? 'pointer' : ''
  }
  private fokusKasus() {
    if (this.ditunjuk != null) return this.ditunjuk
    let terbaik = 0, z = -1e9
    for (const m of this.panel) if (m.userData.dalamCincin && m.position.z > z) { z = m.position.z; terbaik = m.userData.game }
    return terbaik
  }

  get modeKini() { return this.mode }
  setMode(m: 'beranda' | 'kasus' | 'detail') {
    if (this.dibuang || this.mode === m || this.mode === 'ganti') return
    this.mode = m
    this.kamDari = { pos: this.cam.position.clone(), lihat: this.lihatKini.clone() }
    this.kamSejak = performance.now()
    this.timelineTarget = m === 'kasus' ? 1 : 0
    this.fokusLalu = -1
    if (gerakMati()) { this.kamDari = null; this.timeline = this.timelineTarget; this.majuDetail = m === 'detail' ? 1 : 0 }
    this.onMode?.(m)
    this.mintaJalan()
  }

  private texGame(g: GamePanggung) {
    const kunci = g.gambar || `#${g.nama}`
    let t = this.texCache.get(kunci)
    if (t) return t
    const c = document.createElement('canvas'); c.width = c.height = 256
    const x = c.getContext('2d')!
    const gr = x.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#3a1512'); gr.addColorStop(1, '#120606')
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256)
    x.fillStyle = 'rgba(255,220,214,.85)'; x.font = '700 120px "Inter Variable", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.fillText((g.nama.trim()[0] || '?').toUpperCase(), 128, 136)
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    this.texCache.set(kunci, t)
    if (g.gambar) {
      const tex = t
      new THREE.ImageLoader().setCrossOrigin('anonymous').load(g.gambar, (img) => {
        if (this.dibuang || this.texCache.get(kunci) !== tex) return
        tex.image = img; tex.needsUpdate = true
        this.mintaJalan()
      }, undefined, () => {  })
    }
    t.anisotropy = 8
    return t
  }
  private pasangPanel(games: GamePanggung[]) {
    for (const m of this.panel) { this.layar.remove(m); m.material.dispose() }
    this.nGame = games.length
    this.putaranCincin = Array.from({ length: P.cincin }, (_, l) => ({ kec: (l % 2 ? -1 : 1) * (0.6 + acak(l * 17.3) * 0.8), goyang: 0.35 + acak(l * 23.1) * 0.5, frek: 0.4 + acak(l * 31.7) * 0.5, fase: acak(l * 41.9) * Math.PI * 2, dasar: l * 0.35 }))
    const n = games.length ? Math.max(13, games.length) : 0
    const perCincin = new Array<number>(P.cincin).fill(0)
    for (let i = 0; i < n; i++) perCincin[i % P.cincin]++
    this.panel = []
    let k = 0
    for (let l = 0; l < P.cincin; l++) for (let d = 0; d < perCincin[l]; d++, k++) {
      const gi = k % games.length
      const m = new THREE.Mesh(this.geoPanel, new THREE.MeshBasicMaterial({ map: this.texGame(games[gi]), side: THREE.DoubleSide, toneMapped: false, transparent: true })) as unknown as Panel
      m.userData = {
        l, i: k, game: gi, skala: 1 + (acak(k * 3.1) - 0.5) * 0.2,
        sudut: d / perCincin[l] * Math.PI * 2 + (acak(k * 12.9) - 0.5) * 0.15, r: P.radius + l * P.tumbuhRadius + (acak(k * 7.7) - 0.5) * 0.5,
        y: P.tinggiDasar + l * P.langkahTinggi + (acak(k * 5.3) - 0.5) * 0.4, miring: (acak(k * 9.2) - 0.5) * 0.15, yHambur: (acak(k * 6.7) - 0.5) * P.hambur * 0.9, dalamCincin: false,
      }
      this.layar.add(m); this.panel.push(m)
    }
    const dipakai = new Set(games.map((g) => g.gambar || `#${g.nama}`))
    for (const [k, t] of this.texCache) if (!dipakai.has(k)) { t.dispose(); this.texCache.delete(k) }
  }
  gantiGames(games: GamePanggung[]) { if (!this.masuk) { this.pasangPanel(games); this.mintaJalan() } }

  mulaiGanti(awal = false) {
    if (this.dibuang || gerakMati()) return
    this.masuk = { t0: performance.now(), baru: undefined, games: [], ditukar: false, tSwap: 0, dari: { pos: this.cam.position.clone(), lihat: this.lihatKini.clone() }, awal: awal || !this.karakter, gelombang: false, mataBuka: false }
    if (this.mode !== 'ganti') { this.mode = 'ganti'; this.onMode?.('ganti') }
    this.timelineTarget = 0
    this.mintaJalan()
  }
  tampilkan(m: ModelSiap | null, games: GamePanggung[]) {
    if (this.dibuang) return
    if (this.masuk && !this.masuk.ditukar && !gerakMati()) { this.masuk.baru = m; this.masuk.games = games; this.mintaJalan(); return }
    this.tukar(m, games)
    this.masuk = null
    this.cahaya = 1
    this.timeline = this.timelineTarget = 0
    this.kamDari = null
    if (this.mode !== 'beranda') { this.mode = 'beranda'; this.onMode?.('beranda') }
    this.mintaJalan()
  }
  private tukar(m: ModelSiap | null, games: GamePanggung[]) {
    if (this.karakter && this.karakter !== m) this.scene.remove(this.karakter.grup)
    this.karakter = m
    this.bayangan.clear(); this.pasanganBayangan = []
    if (m) {
      m.rim.value.set(WARNA.tepi)
      this.scene.add(m.grup)
      m.grup.updateMatrixWorld(true)
      m.grup.traverse((x) => { const mesh = x as THREE.Mesh; if (mesh.isMesh) { const s = new THREE.Mesh(mesh.geometry, this.bahanBayangan); s.matrixAutoUpdate = false; s.matrix.copy(mesh.matrixWorld); this.bayangan.add(s); this.pasanganBayangan.push([mesh, s]) } })
    }
    this.pasangPanel(games)
  }

  private lingkar = (t: number) => {
    this.raf = 0
    if (!this.boleh) return
    this.raf = requestAnimationFrame(this.lingkar)
    if (this.gambarTerakhir && t - this.gambarTerakhir < (document.hasFocus() ? 1000 / 62 : 1000 / 31)) return
    this.gambarTerakhir = t
    const dt = this.lalu ? Math.min(0.05, (t - this.lalu) / 1000) : 1 / 60
    this.lalu = t
    this.langkah(t, dt)
    this.composer.render(dt)
    if (gerakMati() && this.tenang()) { cancelAnimationFrame(this.raf); this.raf = 0 }
  }
  private tenang() {
    return !this.seret && !this.masuk && !this.kamDari && !this.putarTahan && Math.abs(this.kecPutar) < 1e-4 &&
      this.gelombangT < 0 && this.ledakT < 0 && this.glitchT <= 0 && this.burst < 0 &&
      this.timeline === this.timelineTarget && this.majuDetail === (this.mode === 'detail' ? 1 : 0) && this.goyang.lengthSq() < 1e-6
  }

  private langkah(t: number, dt: number) {
    const diam = gerakMati()
    if (diam) {
      this.kamDari = null; this.timeline = this.timelineTarget; this.majuDetail = this.mode === 'detail' ? 1 : 0; this.putarTahan = null
      if (this.masuk) {
        const m = this.masuk
        this.masuk = null; this.cahaya = 1; this.jauh = 0
        if (m.baru !== undefined) {
          if (!m.ditukar) this.tukar(m.baru, m.games)
          this.mataSejak = m.ditukar ? m.tSwap : t
          this.mode = 'beranda'; this.onMode?.('beranda')
        }
      }
      if (this.gelombangT >= 0) { this.gelombangT = -1; this.gelombang.material.opacity = 0; this.shock.enabled = false }
      if (this.ledakT >= 0) { this.ledakT = -1; this.ledakBahan.opacity = 0 }
      if (this.burst >= 0) this.burst = -1
      this.glitchT = 0
    }
    this.goyang.lerp(diam ? this.goyangTujuan.set(0, 0) : this.goyangTujuan, 1 - Math.pow(1 - 0.06, dt * 60))
    this.timeline += Math.sign(this.timelineTarget - this.timeline) * Math.min(Math.abs(this.timelineTarget - this.timeline), dt / 2.2)
    { const tujuan = this.mode === 'detail' ? 1 : 0; this.majuDetail += Math.sign(tujuan - this.majuDetail) * Math.min(Math.abs(tujuan - this.majuDetail), dt / LAMA_KAMERA) }
    const masuk = this.masuk
    this.jauh += (((this.mode === 'detail' || (masuk && !masuk.ditukar)) ? 1 : 0) - this.jauh) * Math.min(1, dt * (this.mode === 'detail' ? 0.9 : 3))
    const dekatJauh = mulus(THREE.MathUtils.clamp(this.jauh, 0, 1))
    if (!this.seret && !diam) { this.jamPanel += dt; this.fasePutar += dt }
    if (this.seret) this.kecPutar = (this.offsetPutar - this.offsetLalu) * 0.6 + this.kecPutar * 0.4
    else if (Math.abs(this.kecPutar) > 1e-5) { this.offsetPutar += this.kecPutar * dt * 60; this.kecPutar *= Math.pow(0.8, dt * 60) }
    const kecSpin = (this.offsetPutar - this.offsetLalu) / Math.max(dt, 1e-3); this.offsetLalu = this.offsetPutar
    if (this.putarTahan) { const p = Math.min(1, (t - this.putarTahan.t0) / 1600); this.sudutTahan = this.putarTahan.dari + Math.PI * 2 * 3 * mulus(p); if (p >= 1) this.putarTahan = null }

    let kam: { pos: THREE.Vector3; lihat: THREE.Vector3 } | null = null
    let uMasuk: number | null = null
    let chromaMasuk = 0
    const v = this.v
    if (masuk) {
      const s = (t - masuk.t0) / 1000
      if ((!masuk.awal && s < 0.5) || masuk.baru === undefined) {
        const p = masuk.awal ? 1 : Math.pow(Math.min(1, s / 0.5), 3)
        kam = { pos: masuk.dari.pos.clone().lerp(DEKAT.pos, p), lihat: masuk.dari.lihat.clone().lerp(DEKAT.lihat, p) }
        this.cahaya = 1 - p; chromaMasuk = p * 0.6
      } else {
        if (!masuk.ditukar) { masuk.ditukar = true; masuk.tSwap = t; this.tukar(masuk.baru, masuk.games); this.jauh = 0; this.burst = -2 }
        const u = (t - masuk.tSwap) / 1000
        uMasuk = u
        const turun = turunMasuk(u)
        if (u < 1.75) { const p = u / 1.75; kam = { pos: DEKAT.pos.clone().add(v.set(0, -0.08 * p - 0.42 * turun, -0.28 * p)), lihat: DEKAT.lihat.clone().add(v.set(0, -0.62 * turun, 0)) }; this.cahaya = 0 }
        else if (u < 3.45) {
          const p = mulus((u - 1.75) / 1.7), b = KAMERA.beranda
          kam = { pos: DEKAT.pos.clone().add(v.set(0, -0.08 - 0.42 * turun, -0.28)).lerp(b.pos, p), lihat: DEKAT.lihat.clone().add(v.set(0, -0.62 * turun, 0)).lerp(b.lihat, p) }
          kam.pos.x += Math.sin(Math.PI * p) * 2.2; this.cahaya = p
        } else {
          this.cahaya = 1; this.mataSejak = masuk.tSwap; this.masuk = null; this.kamDari = null
          this.mode = 'beranda'; this.onMode?.('beranda')
        }
        if (this.masuk && u >= BUKA && !masuk.mataBuka) { masuk.mataBuka = true; this.denyutChroma = 1; this.glitchT = 0.35; this.denyutBloom = Math.max(this.denyutBloom, 0.6) }
        if (this.burst === -2 && u >= 1.75) this.burst = 0
        if (this.masuk && !masuk.gelombang && u >= 2.6) { masuk.gelombang = true; this.gelombangT = 0; this.ledakT = 0; this.denyutBloom = 1; for (let i = 0; i < this.ledakVel.length; i++) this.ledakPos.set([0, 1, 0], i * 3) }
      }
    }
    if (this.burst >= 0) { this.burst += dt / 3.5; if (this.burst >= 1) this.burst = -1 }
    const menunggu = this.burst === -2

    if (!kam) {
      const tujuan = KAMERA[this.mode === 'ganti' ? 'beranda' : this.mode]
      if (this.kamDari) {
        const p = mulus(Math.min(1, (t - this.kamSejak) / 1000 / LAMA_KAMERA))
        kam = { pos: this.kamDari.pos.clone().lerp(tujuan.pos, p), lihat: this.kamDari.lihat.clone().lerp(tujuan.lihat, p) }
        if (this.mode === 'kasus') kam.pos.x -= Math.sin(Math.PI * p) * 2.5
        if (p >= 1) this.kamDari = null
      } else kam = tujuan
    }
    const cam = this.cam
    cam.position.copy(kam.pos); this.lihatKini.copy(kam.lihat); cam.lookAt(this.lihatKini)
    { 
      const a = this.goyang.x, b = this.goyang.y, kuat = (this.mode === 'beranda' || this.mode === 'ganti' ? 0.045 : 0.06) * (masuk ? 0.3 : 1)
      v.set(-a * kuat * 3, b * kuat * 3, 0).applyQuaternion(cam.quaternion); cam.position.add(v)
      cam.quaternion.multiply(this.qGoyang.setFromEuler(this.eGoyang.set(-b * kuat, -a * kuat, a * kuat * 0.15, 'YXZ')))
    }
    cam.updateMatrixWorld()
    const fovMode = THREE.MathUtils.lerp(45, 58, mulus(this.timeline))
    cam.fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fovMode) / 2) * this.fovDasar)))
    { 
      const { w, h } = this.ukuranKini, kertas = w ? LEBAR_KERTAS(w) : 0
      const geser = w ? mulus(this.timeline) * kertas / 2 + mulus(this.majuDetail) * (kertas - w * KERTAS_DASAR) / 2 : 0
      if (Math.abs(geser) > 0.5) cam.setViewOffset(w, h, geser, 0, w, h); else cam.clearViewOffset()
    }
    cam.updateProjectionMatrix()

    const cahaya = this.cahaya
    this.sorot.intensity = 120 * (1 - Math.min(cahaya / 0.82, 1))
    this.area.intensity = 1.2 * Math.max(0, (cahaya - 0.5) / 0.5) + 0.15
    this.isi.intensity = 0.25 + 0.65 * cahaya; this.langit.intensity = 0.15 + 0.35 * cahaya
    this.planet.material.color.setScalar(0.18 + 0.82 * cahaya)
    const k = this.karakter
    if (k) {
      k.kuatRim.value = 0.8 + (1 - cahaya) * 0.9
      if (k.rig) gerakkanRig(k.rig, { kasus: this.timeline, detail: this.majuDetail, masuk: uMasuk, nafas: diam ? 0 : this.mode === 'kasus' ? 0.2 : this.mode === 'detail' ? 0.45 : 1, t: t / 1000 })
      const sisa = this.mataSejak && t - this.mataSejak < 5000 ? (t - this.mataSejak) / 1000 : null
      aturMata(k.mata, uMasuk ?? sisa, t / 1000)
      this.isiWajah.intensity = (1 - cahaya) * 3.2
      k.grup.updateMatrixWorld(true)
      for (const [x, s] of this.pasanganBayangan) s.matrix.copy(x.matrixWorld)
    } else this.isiWajah.intensity = 0

    const tl = this.timeline, kumpul = mulus(Math.min(tl / 0.5, 1)), bentuk = mulus(THREE.MathUtils.clamp((tl - 0.5) / 0.5, 0, 1))
    const g = this.burst >= 0 ? this.burst : -1, gE = g >= 0 ? keluar3(g) : 1
    const gM = g >= 0 ? (gE + 1.5 * Math.sin(Math.PI * g)) * (1 - lebihMulus(0.6, 1, g)) + lebihMulus(0.6, 1, g) : 1
    const spinBurst = g >= 0 ? Math.PI * 2 * 3 * gE : 0, tampak = g >= 0 ? Math.min(g / 0.2, 1) : 1
    const offsetCincin = this.putaranCincin.map((c) => { const gy = (mulus((Math.sin(this.jamPanel * c.frek + c.fase) + 1) / 2) - 0.5) * 2 * c.goyang; return c.dasar + this.fasePutar * c.kec * P.putar + gy + (spinBurst + this.sudutTahan) * Math.sign(c.kec) })
    const sudutRing = this.jamPanel * P.cincinKec
    const eRing = this.eRing.set(P.miringX, 0, P.miringZ); this.qPlane.setFromEuler(eRing)
    const nRing = this.panel.length, tersembunyi = !!masuk && !masuk.ditukar, boneka = this.boneka
    for (const m of this.panel) {
      const u = m.userData, arah = u.l % 2 ? -1 : 1
      const a = u.sudut + (offsetCincin[u.l] ?? 0) + this.offsetPutar * arah
      const ix = Math.cos(a) * u.r, iz = Math.sin(a) * u.r, iy = u.y
      const ra = u.i / Math.max(nRing, 1) * Math.PI * 2 + sudutRing + this.offsetPutar
      v.set(Math.cos(ra) * P.cincinRadius, 0, Math.sin(ra) * P.cincinRadius).applyEuler(eRing)
      const rx = v.x, ry = P.cincinTinggi + v.y, rz = v.z
      const hb = Math.hypot(ix, iz) || 1, hx = ix / hb * P.hambur, hz = iz / hb * P.hambur, hy = iy + u.yHambur
      let x: number, y: number, z: number
      if (tl <= 0.5) { x = THREE.MathUtils.lerp(ix, hx, kumpul); y = THREE.MathUtils.lerp(iy, hy, kumpul); z = THREE.MathUtils.lerp(iz, hz, kumpul) }
      else { x = THREE.MathUtils.lerp(hx, rx, bentuk); y = THREE.MathUtils.lerp(hy, ry, bentuk); z = THREE.MathUtils.lerp(hz, rz, bentuk) }
      if (dekatJauh > 1e-4) { const d = Math.hypot(x, z) || 1; x += x / d * dekatJauh * P.jauh; z += z / d * dekatJauh * P.jauh }
      boneka.position.set(ix, iy, iz); boneka.up.set(0, 1, 0); boneka.lookAt(0, iy, 0); boneka.rotateZ(u.miring); this.qDiam.copy(boneka.quaternion)
      if (g >= 0 && tl < 0.01) { 
        m.position.set(ix * gM, THREE.MathUtils.lerp(0, iy, gE), iz * gM); m.quaternion.copy(this.qDiam); m.scale.setScalar(u.skala * P.skalaDiam * tampak * (1 - dekatJauh))
      } else {
        m.position.set(x, y, z)
        boneka.position.set(Math.cos(ra) * P.cincinRadius, 0, Math.sin(ra) * P.cincinRadius); boneka.lookAt(0, 0, 0); this.qRing.copy(boneka.quaternion).premultiply(this.qPlane)
        m.quaternion.slerpQuaternions(this.qDiam, this.qRing, bentuk)
        m.scale.setScalar(THREE.MathUtils.lerp(u.skala * P.skalaDiam, u.skala * P.cincinSkala, bentuk) * (1 - dekatJauh))
      }
      if (tersembunyi || menunggu) m.scale.multiplyScalar(0)
      u.dalamCincin = bentuk > 0.9
      m.material.opacity = THREE.MathUtils.smoothstep(m.position.distanceTo(cam.position), 0.55, 1.5)
      m.visible = m.scale.x > 1e-3 && m.material.opacity > 0.01
    }
    if (this.mode === 'kasus' && tl > 0.9 && this.nGame) { const f = this.fokusKasus(); if (f !== this.fokusLalu) { this.fokusLalu = f; this.onFokusGame?.(f) } }

    if (this.gelombangT >= 0) {
      this.gelombangT += dt / 3.7
      const r = 0.2 + keluar3(this.gelombangT) * 10
      this.gelombang.scale.setScalar(r); this.gelombang.material.opacity = 0.9 * (1 - this.gelombangT)
      this.shock.enabled = this.gelombangT < 0.5; this.shock.uniforms.uProgress.value = this.gelombangT * 2
      if (this.gelombangT >= 1) { this.gelombangT = -1; this.gelombang.material.opacity = 0; this.shock.enabled = false }
    }
    if (this.ledakT >= 0) {
      this.ledakT += dt
      const f = Math.exp(-this.ledakT * 1.1), lp = this.ledakPos
      for (let i = 0; i < this.ledakVel.length; i++) { const kk = i * 3, vel = this.ledakVel[i]; lp[kk] += vel.x * f * dt; lp[kk + 1] += vel.y * f * dt; lp[kk + 2] += vel.z * f * dt }
      this.ledakGeo.attributes.position.needsUpdate = true
      this.ledakBahan.opacity = Math.max(0, 1 - this.ledakT / 5)
      if (this.ledakT > 5) { this.ledakT = -1; this.ledakBahan.opacity = 0 }
    }
    const sd = diam ? 0 : t / 1000, ap = this.ambienPos
    for (let i = 0; i < this.ambienAsal.length; i++) {
      const a = this.ambienAsal[i], kk = i * 3, dor = this.ambienDorong[i]
      const x = a.x + Math.sin(sd * 0.4 + i) * 0.35, y = a.y + Math.sin(sd * 0.52 + i * 2.1) * 0.35, z = a.z + Math.cos(sd * 0.4 + i * 0.7) * 0.35
      this.proj.set(x, y, z).project(cam)
      const dx = this.proj.x - this.tmx * 2, dy = this.proj.y + this.tmy * 2, dist = Math.hypot(dx, dy)
      if (!diam && dist < 0.25 && (this.tmx || this.tmy)) { const f = (1 - dist / 0.25) * 6 * dt; dor.x += dx / (dist || 1) * f; dor.y += dy / (dist || 1) * f }
      dor.multiplyScalar(Math.pow(0.1, dt))
      ap[kk] = x + dor.x; ap[kk + 1] = y + dor.y; ap[kk + 2] = z
    }
    this.ambienGeo.attributes.position.needsUpdate = true

    const chromaTarget = Math.min(1, Math.abs(kecSpin) * 0.35 + (this.putarTahan ? 0.6 : 0) + chromaMasuk)
    this.chroma += (chromaTarget - this.chroma) * 0.12
    this.denyutChroma *= Math.pow(0.02, dt); this.denyutBloom *= Math.pow(0.08, dt)
    this.grade.uniforms.uAmount.value = diam ? 0 : this.chroma * 0.03 + this.denyutChroma * 0.04
    this.grade.uniforms.uWaktu.value = sd
    this.bloom.strength = 0.2 + this.denyutBloom * 0.5
    if (this.glitchT > 0 && !diam) { this.glitchT -= dt; this.glitch.enabled = true; this.glitch.uniforms.uKuat.value = Math.max(0, this.glitchT / 0.35); this.glitch.uniforms.uWaktu.value = sd }
    else { this.glitchT = 0; this.glitch.enabled = false }
  }

  dispose() {
    this.dibuang = true
    cancelAnimationFrame(this.raf); this.raf = 0
    window.clearTimeout(this.tundaUkur); window.clearTimeout(this.tahan)
    this.ro.disconnect(); this.io.disconnect(); this.moGerak.disconnect()
    this.mqGerak.removeEventListener('change', this.mintaJalan)
    document.removeEventListener('pointermove', this.gerakDokumen)
    document.removeEventListener('visibilitychange', this.mintaJalan)
    this.wadah.removeEventListener('pointerleave', this.keluarWadah)
    this.wadah.removeEventListener('wheel', this.roda)
    if (this.karakter) this.scene.remove(this.karakter.grup)
    this.karakter = null; this.masuk = null
    this.bayangan.clear()
    for (const m of this.panel) m.material.dispose()
    for (const t of this.texCache.values()) t.dispose()
    this.texCache.clear()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!(m.isMesh || (o as THREE.Points).isPoints)) return
      if (m.geometry !== this.geoPanel) m.geometry.dispose()
      for (const b of Array.isArray(m.material) ? m.material : [m.material]) b.dispose()
    })
    this.geoPanel.dispose(); this.titikTex.dispose(); this.bahanBayangan.dispose()
    for (const p of this.composer.passes) p.dispose()
    this.composer.dispose()
    this.renderer.dispose()
    this.kanvas.remove()
  }
}
