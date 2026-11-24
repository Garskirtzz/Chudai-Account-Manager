import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { avatarTone, cn, initials } from '@/utils/cn'

export interface KartuKarusel {
  id: string
  nama: string
  username: string
  baris3: string
  baris3Data: boolean
  foto: string
  titik: 'ok' | 'info' | 'warn' | 'mati'
}

const WARNA_TITIK = { ok: 'rgb(var(--success))', info: 'rgb(var(--info))', warn: 'rgb(var(--warning))', mati: 'rgb(var(--text-muted))' }

export function Karusel({ kartu, pilih, onPilih }: { kartu: KartuKarusel[]; pilih: number; onPilih: (i: number) => void }) {
  const n = kartu.length
  const [lebarkan, setLebarkan] = useState(false)
  const [geserPx, setGeserPx] = useState(0)
  const [seret, setSeret] = useState(false)
  const mulai = useRef<{ x: number; t: number; id: number; jauh: boolean } | null>(null)
  const roda = useRef(0)
  const JARAK = lebarkan ? 214 : 196

  const abaikanKlik = useRef(false)
  useEffect(() => { if (!seret) setGeserPx(0) }, [seret])

  const turun = (e: PointerEvent<HTMLDivElement>) => { mulai.current = { x: e.clientX, t: performance.now(), id: e.pointerId, jauh: false }; abaikanKlik.current = false }
  const gerak = (e: PointerEvent<HTMLDivElement>) => {
    const m = mulai.current
    if (!m || m.id !== e.pointerId) return
    const dx = e.clientX - m.x
    if (!m.jauh && Math.abs(dx) > 6) { m.jauh = true; setSeret(true); try { e.currentTarget.setPointerCapture(e.pointerId) } catch {  } }
    if (m.jauh) setGeserPx(dx)
  }
  const naik = (e: PointerEvent<HTMLDivElement>) => {
    const m = mulai.current
    if (!m || m.id !== e.pointerId) return
    mulai.current = null
    if (!m.jauh) return
    abaikanKlik.current = true
    const dx = e.clientX - m.x, laju = dx / Math.max(1, performance.now() - m.t)
    let tujuan = Math.round(pilih - dx / JARAK)
    if (tujuan === pilih && Math.abs(laju) > 0.45) tujuan = pilih - Math.sign(dx)
    setSeret(false)
    onPilih(((tujuan % n) + n) % n)
  }
  const batal = (e: PointerEvent<HTMLDivElement>) => { if (mulai.current?.id === e.pointerId) { mulai.current = null; setSeret(false) } }
  const putar = (e: WheelEvent<HTMLDivElement>) => {
    const now = performance.now()
    if (now < roda.current) return
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(d) < 4) return
    roda.current = now + 260
    onPilih((pilih + Math.sign(d) + n) % n)
  }
  const kunci = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); onPilih((pilih + 1) % n) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); onPilih((pilih - 1 + n) % n) }
  }

  const posisi = pilih - geserPx / JARAK
  return (
    <div
      className={cn('dash-karusel', seret && 'seret')}
      role="listbox"
      aria-label="Accounts"
      aria-activedescendant={kartu[pilih] ? `dash-kartu-${kartu[pilih].id}` : undefined}
      tabIndex={0}
      onPointerEnter={() => setLebarkan(true)}
      onPointerLeave={() => setLebarkan(false)}
      onPointerDown={turun}
      onPointerMove={gerak}
      onPointerUp={naik}
      onPointerCancel={batal}
      onWheel={putar}
      onKeyDown={kunci}
    >
      {kartu.map((k, i) => {
        let d = i - posisi
        d = ((d % n) + n) % n
        if (d > n / 2) d -= n 
        const ad = Math.abs(d)
        const x = Math.sign(d) * (ad <= 1 ? ad * JARAK : JARAK + (ad - 1) * JARAK * 0.62)
        const tone = avatarTone(k.nama)
        return (
          <div
            key={k.id}
            id={`dash-kartu-${k.id}`}
            role="option"
            aria-selected={i === pilih}
            data-dash-kartu={k.id}
            className="dash-kartu"
            onClick={() => { if (abaikanKlik.current) { abaikanKlik.current = false; return } onPilih(i) }}
            style={{
              transform: `translateX(calc(-50% + ${x}px)) translateY(calc(${Math.min(ad, 2) * 7}px + var(--angkat))) scale(${Math.max(0.7, 1 - ad * 0.1)})`,
              zIndex: 100 - Math.round(ad * 10),
              opacity: ad > 3.2 ? 0 : Math.max(0.25, 1 - ad * 0.26),
              pointerEvents: ad > 3.2 ? 'none' : undefined,
              filter: ad > 0.5 ? `brightness(${Math.max(0.55, 1 - ad * 0.18)})` : undefined,
            }}
          >
            <span className="dash-av2d">
              {k.foto ? <img src={k.foto} alt="" draggable={false} /> : <span className="dash-av2d-inisial" style={{ background: tone.bg, color: tone.fg }}>{initials(k.nama)}</span>}
              <i style={{ background: WARNA_TITIK[k.titik] }} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold" translate="no">{k.nama}</span>
              <span className="block truncate text-xs text-content-muted" translate="no">@{k.username || '—'}</span>
              <span className="block truncate text-2xs text-content-secondary" translate={k.baris3Data ? 'no' : undefined}>{k.baris3}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
