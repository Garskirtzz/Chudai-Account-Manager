import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Check } from '@/components/ikon'
import { cn } from '@/utils/cn'

export function Bagian({ judul, ket, kanan, children, id }: { judul: string; ket?: ReactNode; kanan?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} aria-label={judul} className="overflow-hidden rounded-lg border border-line-subtle bg-surface-1/30">
      <header className="flex items-start gap-3 border-b border-line-subtle px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-content-primary">{judul}</h3>
          {ket ? <p className="mt-0.5 text-sm leading-relaxed text-content-muted">{ket}</p> : null}
        </div>
        {kanan ? <div className="shrink-0 pt-0.5 text-sm text-content-muted">{kanan}</div> : null}
      </header>
      <div className="divide-y divide-line-subtle/70">{children}</div>
    </section>
  )
}

export function Baris({ judul, ket, children, htmlFor }: { judul: ReactNode; ket?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3">
      <div className="min-w-[14rem] flex-1">
        {htmlFor ? <label htmlFor={htmlFor} className="text-sm font-medium text-content-primary">{judul}</label> : <p className="text-sm font-medium text-content-primary">{judul}</p>}
        {ket ? <p className="mt-0.5 max-w-[34rem] text-sm leading-relaxed text-content-muted">{ket}</p> : null}
      </div>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Isi({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3 text-sm leading-relaxed text-content-muted', className)}>{children}</div>
}

export interface Pilihan<T extends string> {
  nilai: T
  judul: ReactNode
  ket?: ReactNode
  awal?: ReactNode
  lang?: string
  noTranslate?: boolean
}

export function DaftarPilihan<T extends string>({ label, pilihan, nilai, onPilih, disabled }: { label: string; pilihan: Pilihan<T>[]; nilai: T; onPilih: (v: T) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const adaAktif = pilihan.some((p) => p.nilai === nilai)
  const geser = (e: KeyboardEvent, i: number) => {
    const maju = e.key === 'ArrowDown' || e.key === 'ArrowRight'
    const mundur = e.key === 'ArrowUp' || e.key === 'ArrowLeft'
    if (!maju && !mundur) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPilih(pilihan[i].nilai)
      }
      return
    }
    e.preventDefault()
    const j = (i + (maju ? 1 : -1) + pilihan.length) % pilihan.length
    onPilih(pilihan[j].nilai)
    ref.current?.querySelectorAll<HTMLElement>('[role=radio]')[j]?.focus()
  }
  return (
    <div ref={ref} role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} className={cn(disabled && 'pointer-events-none opacity-50')}>
      {pilihan.map((p, i) => {
        const aktif = p.nilai === nilai
        return (
          <div
            key={p.nilai}
            role="radio"
            aria-checked={aktif}
            tabIndex={aktif || (!adaAktif && i === 0) ? 0 : -1}
            onClick={() => onPilih(p.nilai)}
            onKeyDown={(e) => geser(e, i)}
            className={cn(
              'flex cursor-pointer items-center gap-3 border-b border-line-subtle/70 px-4 py-2.5 outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60',
              aktif ? 'bg-accent/[0.10]' : 'hover:bg-surface-2/50',
            )}
          >
            <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', aktif ? 'border-accent' : 'border-line-strong')} aria-hidden>
              {aktif ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
            </span>
            {p.awal}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-content-primary" lang={p.lang} translate={p.noTranslate ? 'no' : undefined}>{p.judul}</span>
              {p.ket ? <span className="mt-0.5 block text-sm leading-relaxed text-content-muted">{p.ket}</span> : null}
            </span>
            {aktif ? <span className="inline-flex shrink-0 items-center gap-1 text-sm text-content-secondary" aria-hidden><Check className="h-3.5 w-3.5" />Active</span> : null}
          </div>
        )
      })}
    </div>
  )
}

export function Status({ nada = 'muted', children }: { nada?: 'muted' | 'success' | 'warning' | 'error'; children: ReactNode }) {
  const warna = { muted: 'text-content-muted', success: 'text-success', warning: 'text-warning', error: 'text-error' }[nada]
  return <p role={nada === 'error' ? 'alert' : 'status'} className={cn('text-sm leading-relaxed', warna)}>{children}</p>
}
