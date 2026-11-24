import { cn } from '@/utils/cn'
import logoChudai from '@/assets/chudai-logo-256.png'
import { BENTUK, LEBAR_RETAK, LOGO_H, LOGO_W, NAGA, URUTAN, garisRetak } from './logo-chudai'

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return <img src={logoChudai} alt="" aria-hidden width={size} height={size} draggable={false} className={cn('shrink-0 select-none object-contain', className)} />
}

export function Wordmark({ tinggi = 18, className }: { tinggi?: number; className?: string }) {
  return (
    <svg data-merek viewBox={`0 0 ${LOGO_W} ${LOGO_H}`} height={tinggi} width={(tinggi * LOGO_W) / LOGO_H} className={cn('block shrink-0', className)} aria-hidden>
      <g className="merek-huruf">
        {URUTAN.map((h) => <path key={h} d={BENTUK[h]} />)}
        <path d={NAGA.badan} fillRule="evenodd" />
        <path d={NAGA.mata} fillRule="evenodd" />
      </g>
      <g className="merek-detail">
        <path d={NAGA.alis} />
        <ellipse cx={NAGA.hidung.cx} cy={NAGA.hidung.cy} rx={NAGA.hidung.rx} ry={NAGA.hidung.ry} transform={`rotate(${NAGA.hidung.putar} ${NAGA.hidung.cx} ${NAGA.hidung.cy})`} />
      </g>
      <path className="merek-retak" d={URUTAN.map(garisRetak).join('')} fill="none" strokeWidth={LEBAR_RETAK} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Brand(_: { compact?: boolean }) {
  return (
    <div className="flex items-center whitespace-nowrap">
      <Wordmark />
    </div>
  )
}
