import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface ItemTabGaris<T extends string> {
  id: T
  label: ReactNode
  ikon?: ReactNode
  jumlah?: number
  titik?: string
  title?: string
}

export function TabGaris<T extends string>({
  item,
  nilai,
  onPilih,
  label,
  peran = 'tab',
  className,
  akhir,
  bungkus = false,
}: {
  item: ItemTabGaris<T>[]
  nilai: T
  onPilih: (id: T) => void
  label: string
  peran?: 'tab' | 'filter'
  className?: string
  akhir?: ReactNode
  bungkus?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [garis, setGaris] = useState<{ x: number; y: number; w: number } | null>(null)
  const [luber, setLuber] = useState<{ kiri: boolean; kanan: boolean }>({ kiri: false, kanan: false })

  useLayoutEffect(() => {
    const ukur = () => {
      const akar = ref.current
      const el = akar?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(nilai)}"]`)
      setGaris(el ? { x: el.offsetLeft + 8, y: el.offsetTop + el.offsetHeight - 2, w: el.offsetWidth - 16 } : null)
      if (akar) setLuber({ kiri: akar.scrollLeft > 1, kanan: akar.scrollLeft + akar.clientWidth < akar.scrollWidth - 1 })
    }
    ukur()
    const akar = ref.current
    const el = akar?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(nilai)}"]`)
    if (akar && el) {
      if (el.offsetLeft < akar.scrollLeft) akar.scrollLeft = el.offsetLeft - 24
      else if (el.offsetLeft + el.offsetWidth > akar.scrollLeft + akar.clientWidth) akar.scrollLeft = el.offsetLeft + el.offsetWidth - akar.clientWidth + 24
    }
    const ro = new ResizeObserver(ukur)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [nilai, item.length, item.map((i) => i.jumlah).join(',')])

  return (
    <div
      ref={ref}
      role={peran === 'tab' ? 'tablist' : 'group'}
      aria-label={label}
      onScroll={(e) => { const a = e.currentTarget; setLuber({ kiri: a.scrollLeft > 1, kanan: a.scrollLeft + a.clientWidth < a.scrollWidth - 1 }) }}
      className={cn('no-scrollbar relative flex items-stretch gap-0.5', bungkus ? 'flex-wrap' : 'overflow-x-auto', className)}
      style={!bungkus && (luber.kiri || luber.kanan) ? { maskImage: `linear-gradient(to right, ${luber.kiri ? 'transparent, black 28px' : 'black'}, ${luber.kanan ? 'black calc(100% - 28px), transparent' : 'black'})` } : undefined}
    >
      {item.map((t) => {
        const ya = t.id === nilai
        return (
          <button
            key={t.id}
            type="button"
            data-tab-id={t.id}
            role={peran === 'tab' ? 'tab' : undefined}
            aria-selected={peran === 'tab' ? ya : undefined}
            aria-pressed={peran === 'filter' ? ya : undefined}
            title={t.title}
            onClick={() => onPilih(t.id)}
            className={cn('relative flex shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors duration-300', bungkus && 'h-10', ya ? 'text-content-primary' : 'text-content-muted hover:text-content-secondary')}
          >
            {t.titik ? <span className={cn('h-1.5 w-1.5 rounded-full', t.titik)} aria-hidden /> : null}
            {t.ikon}
            <span className="whitespace-nowrap">{t.label}</span>
            {t.jumlah != null ? (
              <span className={cn('tnum rounded px-1.5 text-xs leading-5 transition-colors duration-300', ya ? 'bg-surface-3 text-content-secondary' : 'bg-surface-2/60 text-content-muted')}>{t.jumlah}</span>
            ) : null}
          </button>
        )
      })}
      {garis ? (
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-[2px] rounded-t bg-accent transition-[transform,width] duration-500 ease-pegas" style={{ width: garis.w, transform: `translate(${garis.x}px, ${garis.y}px)` }} />
      ) : null}
      {akhir}
    </div>
  )
}
