import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type RefObject } from 'react'
import { Copy, KeyRound, RotateCcw, Wrench, Zap } from '@/components/ikon'
import type { Akun, Folder } from '@/api/types'
import { IkonFolder, folderAkun } from '@/lib/folder'
import { bukaDialog, pasangTargetSendiri, perbaruiCookie, pindahAkun, salinTeks, setDipilih, ubahHemat, ubahRejoin, useCam } from '@/stores/cam'
import { bukaRencana, pasangAnimasiHapus, setPilihKlik, usePilihKlik } from '@/stores/rencanaLuncur'
import { useUIStore } from '@/stores/uiStore'
import { Kbd } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import './bilah-pilihan.css'

export interface Pilihan {
  ids: string[]
  n: number
  label: string | null
}

let lepasHalus: ((tombol?: HTMLElement | null) => void) | null = null
export const lepasPilihanHalus = (tombol?: HTMLElement | null) => lepasHalus?.(tombol)

const tunggu = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const baris = (id: string) => document.querySelector<HTMLElement>(`[data-baris][data-id="${CSS.escape(id)}"]`)
const fx = (el: HTMLElement | null, nama: string, aktif: boolean) => {
  if (!el) return
  const set = new Set((el.dataset.fx || '').split(' ').filter(Boolean))
  if (aktif) set.add(nama)
  else set.delete(nama)
  if (set.size) el.dataset.fx = [...set].join(' ')
  else delete el.dataset.fx
}
const inisial = (s: string) => {
  const w = s.replace(/[_-]+/g, ' ').trim().split(/\s+/)
  return ((w[0]?.[0] || '?') + (w.length > 1 ? w[w.length - 1][0] : w[0]?.[1] || '')).toUpperCase()
}

function percikan(x: number, y: number, n = 5, warna = 'rgb(255 120 120)', jarak = 26) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div')
    p.className = 'fx-spark'
    const ukuran = 2.5 + Math.random() * 2.5
    Object.assign(p.style, { left: `${x}px`, top: `${y}px`, width: `${ukuran}px`, height: `${ukuran}px`, background: warna, boxShadow: `0 0 8px ${warna}` })
    document.body.appendChild(p)
    const sudut = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7
    const d = jarak * (0.55 + Math.random() * 0.6)
    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${(Math.cos(sudut) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(sudut) * d).toFixed(1)}px)) scale(0.1)`, opacity: 0 },
      ],
      { duration: 320 + Math.random() * 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
    ).onfinish = () => p.remove()
  }
}

function terbangKeTong(a: Akun, el: HTMLElement | null, tbl: DOMRect, tx: number, ty: number, onTelan: () => void) {
  return new Promise<void>((selesai) => {
    let sx: number, sy: number, sw: number, sh: number
    const r = el?.getBoundingClientRect()
    if (r && r.bottom > tbl.top + 8 && r.top < tbl.bottom - 8) {
      sx = r.left + 8
      sy = r.top + 2
      sw = Math.min(r.width - 16, 420)
      sh = r.height - 4
      fx(el, 'angkat', true)
    } else {
      sw = Math.min(tbl.width - 40, 320)
      sh = 44
      sx = tbl.left + (tbl.width - sw) / 2
      sy = r && r.top < tbl.top ? tbl.top + 8 : tbl.bottom - sh - 12
    }
    const hantu = document.createElement('div')
    hantu.className = 'suck-ghost'
    hantu.style.width = `${sw}px`
    hantu.style.height = `${sh}px`
    const av = document.createElement('span')
    av.className = 'sg-av'
    av.textContent = inisial(a.alias)
    const meta = document.createElement('div')
    meta.className = 'sg-meta'
    const nm = document.createElement('span')
    nm.className = 'sg-nm'
    nm.translate = false
    nm.textContent = a.alias
    const un = document.createElement('span')
    un.className = 'sg-un'
    un.textContent = a.username ? `@${a.username}` : ''
    meta.append(nm, un)
    const tag = document.createElement('span')
    tag.className = 'sg-tag'
    tag.textContent = 'Deleting'
    hantu.append(av, meta, tag)
    document.body.appendChild(hantu)

    const cx0 = sx + sw / 2
    const cy0 = sy + sh / 2
    const dx = tx - cx0
    const dy = ty - cy0
    const belok = (dx >= 0 ? -1 : 1) * Math.min(64, Math.max(24, Math.abs(dx) * 0.24))
    const kx = cx0 + dx * 0.48 + belok
    const ky = Math.min(cy0, ty) - Math.min(58, Math.max(20, Math.abs(dy) * 0.16))
    const durasi = 580
    const t0 = performance.now()
    let runtuh = false
    let telan = false
    const bingkai = (kini: number) => {
      const t = Math.min(1, (kini - t0) / durasi)
      const angkat = t < 0.16 ? Math.sin((t / 0.16) * Math.PI * 0.5) : 1
      const p = t < 0.16 ? 0 : Math.pow((t - 0.16) / 0.84, 2.15)
      if (p > 0.22 && !runtuh && el) {
        runtuh = true
        fx(el, 'runtuh', true)
      }
      const q = 1 - p
      const cx = q * q * cx0 + 2 * q * p * kx + p * p * tx
      const cy = q * q * cy0 + 2 * q * p * ky + p * p * ty - (1 - p) * angkat * 6
      const sxk = (1 + 0.025 * angkat * (1 - p)) * (1 - 0.93 * Math.pow(p, 1.3))
      const syk = (1 + 0.025 * angkat * (1 - p)) * (1 - 0.84 * Math.pow(p, 1.65))
      const putar = (dx >= 0 ? 1 : -1) * (10 * Math.sin(p * Math.PI) + 14 * p * p)
      const miring = (dx >= 0 ? -1 : 1) * 14 * Math.sin(p * Math.PI)
      hantu.style.transform = `translate3d(${(cx - sw / 2).toFixed(2)}px, ${(cy - sh / 2).toFixed(2)}px, 0) rotate(${putar.toFixed(2)}deg) skewX(${miring.toFixed(2)}deg) scale(${sxk.toFixed(3)}, ${syk.toFixed(3)})`
      hantu.style.borderRadius = `${(8 + 20 * p).toFixed(1)}px`
      hantu.style.opacity = (p < 0.82 ? 1 : Math.max(0, 1 - (p - 0.82) / 0.18)).toFixed(3)
      if (p >= 0.92 && !telan) {
        telan = true
        onTelan()
      }
      if (t < 1) requestAnimationFrame(bingkai)
      else {
        hantu.remove()
        selesai()
      }
    }
    requestAnimationFrame(bingkai)
  })
}

export function BilahPilihan({ sel, kartu, folder, onBersih }: { sel: Pilihan | null; kartu: RefObject<HTMLElement | null>; folder: Folder[]; onBersih: () => void }) {
  const akun = useCam((s) => s.akun)
  const antrean = useCam((s) => s.antrean)
  const konsol = useUIStore((s) => s.consoleOpen)
  const ref = useRef<HTMLDivElement>(null)
  const pil = useRef<HTMLDivElement>(null)
  const teks = useRef<HTMLSpanElement>(null)
  const tong = useRef<HTMLButtonElement>(null)
  const [paksa, setPaksa] = useState<Pilihan | null>(null)
  const [menuAlat, setMenuAlat] = useState(false)
  const [terbang, setTerbang] = useState(false)
  const [sempit, setSempit] = useState(false)
  const tampilRef = useRef(false)
  const menghapus = useRef(false)
  const pewaktu = useRef(new Set<number>())
  const nanti = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      pewaktu.current.delete(id)
      if (ref.current) fn()
    }, ms)
    pewaktu.current.add(id)
    return id
  }, [])
  useEffect(() => {
    const t = pewaktu.current
    return () => t.forEach((id) => window.clearTimeout(id))
  }, [])
  const lepasLandas = useRef(0)

  const kini = paksa ?? sel
  const terakhir = useRef<Pilihan | null>(kini)
  if (kini) terakhir.current = kini
  const isi = kini ?? terakhir.current
  const tampil = (!!sel && !konsol) || !!paksa
  const tampilKini = useRef(tampil)
  tampilKini.current = tampil
  const kunciPilihan = sel ? sel.ids.join('|') : ''
  const pilihanKini = useRef(kunciPilihan)
  pilihanKini.current = kunciPilihan

  const munculkan = useCallback(() => {
    const b = ref.current
    if (!b) return
    b.classList.remove('hide', 'leaving', 'entering', 'instant')
    void b.offsetWidth
    b.classList.add('entering')
    tampilRef.current = true
  }, [])
  useLayoutEffect(() => {
    const b = ref.current
    if (!b) return
    if (tampil && !tampilRef.current) {
      munculkan()
    } else if (!tampil && tampilRef.current && !b.classList.contains('leaving')) {
      b.classList.remove('entering', 'danger-hover')
      document.querySelectorAll<HTMLElement>('[data-baris][data-fx~="bahaya"]').forEach((el) => fx(el, 'bahaya', false))
      pil.current?.classList.remove('on', 'tone-tools')
      b.classList.add('hide')
    }
    if (!b.classList.contains('leaving')) tampilRef.current = tampil
  }, [tampil, munculkan])

  const kunci = isi ? (isi.label ? `1:${isi.label}` : `n:${isi.n}`) : ''
  const kunciLama = useRef(kunci)
  useEffect(() => {
    if (kunci === kunciLama.current) return
    kunciLama.current = kunci
    const t = teks.current
    if (!t || !tampilRef.current) return
    t.classList.remove('sb-swap')
    void t.offsetWidth
    t.classList.add('sb-swap')
  }, [kunci])

  const ukurNanti = useRef(() => {})
  useEffect(() => {
    const k = kartu.current
    const b = ref.current
    if (!k || !b) return
    let rf = 0
    const ukur = () => {
      b.classList.remove('tight')
      const muat = b.scrollWidth <= k.clientWidth - 24
      b.classList.toggle('tight', !muat)
      setSempit(!muat)
    }
    const nanti = () => {
      cancelAnimationFrame(rf)
      rf = requestAnimationFrame(ukur)
    }
    ukurNanti.current = nanti
    nanti()
    const ro = new ResizeObserver(nanti)
    ro.observe(k)
    return () => {
      cancelAnimationFrame(rf)
      ro.disconnect()
    }
  }, [kartu])
  useEffect(() => ukurNanti.current(), [kunci, !!antrean])

  const lepas = useCallback(
    (tombol?: HTMLElement | null) => {
      const b = ref.current
      if (!b || b.classList.contains('leaving') || menghapus.current) return
      pil.current?.classList.remove('on', 'tone-tools')
      if (tombol) {
        tombol.classList.remove('act-clear')
        void tombol.offsetWidth
        tombol.classList.add('act-clear')
      }
      window.clearTimeout(lepasLandas.current)
      setTerbang(false)
      for (const id of sel?.ids ?? []) {
        const el = baris(id)
        fx(el, 'lepas', true)
        window.setTimeout(() => fx(el, 'lepas', false), 220)
      }
      document.querySelectorAll<HTMLElement>('[data-baris][data-fx~="bahaya"]').forEach((el) => fx(el, 'bahaya', false))
      if (!tampilRef.current) return onBersih()
      b.classList.remove('entering')
      b.classList.add('leaving')
      onBersih()
      nanti(() => {
        tombol?.classList.remove('act-clear')
        b.classList.remove('leaving', 'danger-hover')
        if (tampilKini.current) return munculkan()
        b.classList.add('hide')
        tampilRef.current = false
      }, 240)
    },
    [sel, onBersih, munculkan, nanti],
  )
  useEffect(() => {
    lepasHalus = lepas
    return () => {
      if (lepasHalus === lepas) lepasHalus = null
    }
  }, [lepas])

  const isapKeTong = useCallback(
    async (ids: string[]) => {
      const daftar = ids.map((id) => akun.find((a) => a.id === id)).filter((a): a is Akun => !!a)
      const tbl = document.querySelector('[data-daftar-gulir]')?.getBoundingClientRect()
      if (!daftar.length || !tbl || menghapus.current) return
      menghapus.current = true
      window.clearTimeout(lepasLandas.current)
      setTerbang(false)
      const bersihkan = () => daftar.forEach((a) => ['angkat', 'runtuh', 'bahaya'].forEach((n) => fx(baris(a.id), n, false)))
      const lepasPilihan = () => {
        const s = useCam.getState()
        setDipilih(s.dipilih.filter((id) => !ids.includes(id)))
        if (usePilihKlik.getState().aktif && s.fokusId && ids.includes(s.fokusId)) setPilihKlik(false)
      }
      try {
        const sudahTampil = tampilRef.current && !useUIStore.getState().consoleOpen
        let b = ref.current
        if (!sudahTampil && useUIStore.getState().consoleOpen) {
          await Promise.all(daftar.map((a, i) => tunggu(i * Math.min(75, Math.round(520 / daftar.length))).then(() => terbangKeTong(a, baris(a.id), tbl, tbl.left + tbl.width / 2, tbl.bottom - 8, () => {}))))
          lepasPilihan()
          return
        }
        if (!sudahTampil) {
          setPaksa({ ids, n: ids.length, label: ids.length === 1 ? daftar[0].alias : null })
          await tunggu(420)
        }
        b = ref.current
        const del = tong.current
        if (!b || !del) return
        b.classList.add('is-sucking')
        del.classList.add('sucking')
        await tunggu(150)
        const bin = del.querySelector('.uv-bin-bottom')?.getBoundingClientRect() ?? del.getBoundingClientRect()
        const tx = bin.left + bin.width / 2
        const ty = bin.top + 4
        const telan = () => {
          del.classList.remove('gulp')
          void del.offsetWidth
          del.classList.add('gulp')
          percikan(tx, ty - 2)
        }
        const urut = akun.filter((a) => ids.includes(a.id))
        const jeda = urut.length <= 1 ? 0 : Math.min(75, Math.round(520 / urut.length))
        await Promise.all(urut.map((a, i) => tunggu(i * jeda).then(() => terbangKeTong(a, baris(a.id), tbl, tx, ty, telan))))
        await tunggu(80)
        del.classList.remove('sucking', 'gulp')
        del.classList.add('lid-slam')
        const cincin = document.createElement('div')
        cincin.className = 'fx-ring'
        cincin.style.left = `${tx}px`
        cincin.style.top = `${bin.top + bin.height / 2}px`
        document.body.appendChild(cincin)
        window.setTimeout(() => cincin.remove(), 400)
        await tunggu(380)
        b.classList.add('leaving')
        await tunggu(250)
        b.classList.add('hide')
        b.classList.remove('leaving', 'is-sucking', 'danger-hover', 'entering')
        del.classList.remove('lid-slam')
        tampilRef.current = false
        lepasPilihan()
      } finally {
        menghapus.current = false
        ref.current?.classList.remove('is-sucking', 'leaving', 'danger-hover')
        tong.current?.classList.remove('sucking', 'gulp', 'lid-slam')
        setPaksa(null)
        requestAnimationFrame(() => {
          const bb = ref.current
          if (!bb) return
          if (tampilKini.current && !tampilRef.current) munculkan()
          else if (!tampilKini.current && tampilRef.current) {
            bb.classList.add('hide')
            tampilRef.current = false
          }
        })
        nanti(bersihkan, 4000)
      }
    },
    [akun, munculkan, nanti],
  )
  useEffect(() => {
    pasangAnimasiHapus(isapKeTong)
    return () => pasangAnimasiHapus(null)
  }, [isapKeTong])

  const geserPil = (el: HTMLElement | null) => {
    const b = ref.current
    const p = pil.current
    if (!b || !p) return
    if (!el) return p.classList.remove('on', 'tone-tools')
    const br = b.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    p.style.setProperty('--px', `${r.left - br.left}px`)
    p.style.top = `${r.top - br.top}px`
    p.style.width = `${r.width}px`
    p.style.height = `${r.height}px`
    p.classList.toggle('tone-tools', el.classList.contains('sb-tools'))
    p.classList.add('on')
  }
  const bahayaBaris = (aktif: boolean) => {
    document.querySelectorAll<HTMLElement>('[data-baris][data-fx~="bahaya"]').forEach((el) => fx(el, 'bahaya', false))
    if (aktif) for (const id of isi?.ids ?? []) fx(baris(id), 'bahaya', true)
  }

  const ids = isi?.ids ?? []
  const n = ids.length
  const banyak = n > 1 ? `${n} accounts` : 'this account'
  const daftarAkun = ids.map((id) => akun.find((a) => a.id === id)).filter((a): a is Akun => !!a)
  const semuaHemat = daftarAkun.length > 0 && daftarAkun.every((a) => a.hemat)
  const semuaRejoin = daftarAkun.length > 0 && daftarAkun.every((a) => a.auto_rejoin)
  const kilatAlat = () => {
    for (const id of ids) {
      const el = baris(id)
      fx(el, 'alat', true)
      window.setTimeout(() => fx(el, 'alat', false), 560)
    }
  }
  const folderSama = daftarAkun.length && daftarAkun.every((a) => folderAkun(a, folder) === folderAkun(daftarAkun[0], folder)) ? folderAkun(daftarAkun[0], folder) : undefined

  const item = antrean ? antrean.item : []
  const selesai = item.filter((x) => x.status === 'launched' || x.status === 'failed' || x.status === 'cancelled').length
  const posisi = Math.min(item.length, item.filter((x) => x.status !== 'queued' && x.status !== 'cancelled').length)

  return (
    <div
      ref={ref}
      className="selbar hide"
      role="toolbar"
      aria-label="Selected accounts"
      data-bilah-pilihan
      aria-hidden={tampil ? undefined : true}
      {...(tampil ? {} : { inert: '' })}
      onAnimationEnd={(e) => {
        if (e.target === ref.current && e.animationName === 'sbDockReveal') ref.current?.classList.remove('entering')
      }}
      onMouseMove={(e) => {
        const b = ref.current
        if (!b) return
        const r = b.getBoundingClientRect()
        b.style.setProperty('--mx', `${e.clientX - r.left}px`)
        b.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      onMouseOver={(e) => {
        if (menghapus.current) return
        const t = (e.target as HTMLElement).closest<HTMLElement>('.sb-hover-target')
        geserPil(t && !(t as HTMLButtonElement).disabled ? t : null)
      }}
      onMouseLeave={() => geserPil(null)}
    >
      <div className="selbar-sheen" aria-hidden />
      <div ref={pil} className="sb-hover-pill" aria-hidden />
      <span className="selcount sb-item">
        <span className="selcount-badge">
          <span className="selcount-dot" />
          <span ref={teks} className="selcount-text" aria-live="polite">
            {isi?.label ? (
              <span className="nm" translate="no" title={isi.label}>{isi.label}</span>
            ) : (
              <span>{`${n} selected`}</span>
            )}
          </span>
        </span>
      </span>
      <Tooltip delay={45} content={<span className="inline-flex items-center gap-1.5"><span>Clear selection</span><Kbd>Esc</Kbd></span>}>
        <button type="button" className="sb-btn sb-clear sb-hover-target sb-item" aria-label="Clear selection" data-bersih-pilihan onClick={(e) => lepas(e.currentTarget)}>
          <span className="ic-wrap">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </span>
        </button>
      </Tooltip>
      <span className="vsep sb-item" />
      <span className="sb-item" style={{ position: 'relative', zIndex: 1, flex: 'none', display: 'inline-flex' }}>
        {antrean ? (
          <Tooltip delay={45} content="Show launch progress">
            <button type="button" className="sb-pill" onClick={() => bukaRencana(null)} data-progres-bilah>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin" aria-hidden>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>{antrean.fase === 'preparing' ? 'Preparing…' : `Launching ${Math.max(posisi, 1)} of ${item.length}`}</span>
              <span className="bar" style={{ width: `${item.length ? (selesai / item.length) * 100 : 0}%` }} />
            </button>
          </Tooltip>
        ) : (
          <Tooltip delay={45} content={<span className="inline-flex items-center gap-1.5"><span>{`Review and launch ${banyak}`}</span><Kbd>Ctrl ↵</Kbd></span>}>
            <TombolLuncur
              label="Launch"
              data-luncur-utama=""
              aria-label={n > 1 ? `Launch ${n} accounts` : 'Launch'}
              terbang={terbang}
              onClick={() => {
                if (terbang) return
                setTerbang(true)
                const untuk = pilihanKini.current
                lepasLandas.current = nanti(() => {
                  setTerbang(false)
                  if (!untuk || pilihanKini.current !== untuk || menghapus.current) return
                  bukaRencana(ids.length ? ids : null)
                }, 420)
              }}
            />
          </Tooltip>
        )}
      </span>
      <DropdownMenu open={menuAlat} onOpenChange={setMenuAlat}>
        <Tooltip delay={45} disabled={menuAlat} content={`Account tools for ${banyak}`}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={`sb-btn sb-tools sb-hover-target sb-item${menuAlat ? ' menu-open' : ''}`} aria-label={sempit ? 'Account tools' : undefined} data-alat-bilah>
              <span className="tools-ic-wrap" aria-hidden>
                <Wrench className="tools-wrench" />
                <svg className="tools-cog" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                </svg>
              </span>
              <span className="lbl">Account tools</span>
              <svg className="tools-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent side="top" align="center" sideOffset={10} className="w-[17.5rem]" aria-label={`Account tools for ${banyak}`}>
          <DropdownMenuCheckboxItem
            checked={semuaHemat}
            onCheckedChange={() => {
              void ubahHemat(daftarAkun, { hemat: !semuaHemat })
              kilatAlat()
            }}
          >
            <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" />Resource saver</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={semuaRejoin}
            onCheckedChange={() => {
              void ubahRejoin(daftarAkun, !semuaRejoin)
              kilatAlat()
            }}
          >
            <span className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5" />Auto-rejoin</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            icon={<KeyRound className="h-3.5 w-3.5" />}
            onSelect={() => {
              kilatAlat()
              void (async () => {
                for (const a of daftarAkun) await perbaruiCookie(a)
              })()
            }}
          >
            Refresh cookies
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /></svg>}
            onSelect={() => {
              kilatAlat()
              void pasangTargetSendiri(ids)
            }}
          >
            Own target: current launch target
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger icon={<IkonFolder f={null} size={14} />}>Move to folder</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[14rem]">
              {folder.map((f) => (
                <DropdownMenuItem key={f.id} icon={<IkonFolder f={f} size={14} />} disabled={folderSama === f.id} onSelect={() => { kilatAlat(); void pindahAkun(ids, f.id) }}>
                  <span translate="no">{f.nama}</span>{folderSama === f.id ? ' (current)' : ''}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem icon={<IkonFolder f={null} size={14} />} disabled={folderSama === null} onSelect={() => { kilatAlat(); void pindahAkun(ids, null) }}>
                Ungrouped{folderSama === null ? ' (current)' : ''}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            icon={<Copy className="h-3.5 w-3.5" />}
            disabled={!daftarAkun.some((a) => a.username)}
            onSelect={() => void salinTeks(daftarAkun.length === 1 ? 'Username' : 'Usernames', daftarAkun.map((a) => a.username).filter(Boolean).join('\n'))}
          >
            {daftarAkun.length === 1 ? 'Copy username' : 'Copy usernames'}
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<Wrench className="h-3.5 w-3.5" />}
            onSelect={() => {
              setDipilih(ids)
              bukaDialog({ jenis: 'alat' })
            }}
          >
            More account tools…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip delay={45} className="sb-tip-danger" content={`Delete ${banyak}`}>
        <button
          ref={tong}
          type="button"
          className="sb-del-uv sb-item"
          aria-label={n > 1 ? `Delete ${n} accounts` : 'Delete'}
          data-hapus-terpilih
          disabled={!!antrean}
          onMouseEnter={() => {
            if (menghapus.current) return
            geserPil(null)
            ref.current?.classList.add('danger-hover')
            bahayaBaris(true)
          }}
          onMouseLeave={() => {
            if (menghapus.current) return
            ref.current?.classList.remove('danger-hover')
            bahayaBaris(false)
          }}
          onClick={() => {
            bahayaBaris(false)
            if (ids.length) bukaDialog({ jenis: 'hapus', ids: [...ids] })
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 69 16" className="uv-bin-svg uv-bin-top" aria-hidden>
            <path fillRule="evenodd" clipRule="evenodd" d="M6 7.5H20L22.2 3.1C23.1 1.2 25 0 27.1 0H41.9C44 0 45.9 1.2 46.8 3.1L49 7.5H63C65.8 7.5 68 9.7 68 12.2C68 14.3 66.3 16 64.2 16H4.8C2.7 16 1 14.3 1 12.2C1 9.7 3.2 7.5 6 7.5ZM25.5 7.5H43.5L42.3 4.8C41.9 3.9 41 3.4 40 3.4H29C28 3.4 27.1 3.9 26.7 4.8L25.5 7.5Z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 69 58" className="uv-bin-svg uv-bin-bottom" aria-hidden>
            <path fillRule="evenodd" clipRule="evenodd" d="M8 2H61C62.7 2 64 3.4 63.8 5.1L59.4 50.2C58.9 54.6 55.2 58 50.8 58H18.2C13.8 58 10.1 54.6 9.6 50.2L5.2 5.1C5 3.4 6.3 2 8 2ZM20.5 13C18.8 13 17.5 14.3 17.6 16L19.6 45C19.7 46.7 21.1 48 22.8 48C24.5 48 25.8 46.7 25.7 45L23.7 16C23.6 14.3 22.2 13 20.5 13ZM34.5 13C32.8 13 31.5 14.3 31.5 16V45C31.5 46.7 32.8 48 34.5 48C36.2 48 37.5 46.7 37.5 45V16C37.5 14.3 36.2 13 34.5 13ZM48.5 13C46.8 13 45.4 14.3 45.3 16L43.3 45C43.2 46.7 44.5 48 46.2 48C47.9 48 49.3 46.7 49.4 45L51.4 16C51.5 14.3 50.2 13 48.5 13Z" />
          </svg>
        </button>
      </Tooltip>
    </div>
  )
}

export const TombolLuncur = forwardRef<HTMLButtonElement, { label: string; terbang: boolean } & ButtonHTMLAttributes<HTMLButtonElement> & Record<`data-${string}`, string>>(function TombolLuncur({ label, terbang, className = '', ...rest }, ref) {
  return (
    <button ref={ref} type="button" className={`sb-launch-uv${terbang ? ' flying' : ''} ${className}`} {...rest}>
      <span className="uv-icon" aria-hidden>
        <span className="uv-trail" />
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="uv-plane" viewBox="0 0 16 16">
          <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Z" />
        </svg>
      </span>
      <span className="uv-text">{label}</span>
    </button>
  )
})
