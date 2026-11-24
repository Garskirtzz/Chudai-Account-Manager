import { useId } from 'react'
import { cn } from '@/utils/cn'

type SparkTone = 'accent' | 'success' | 'warning' | 'error' | 'info' | 'muted'

const toneVar: Record<SparkTone, string> = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  info: 'var(--info)',
  muted: 'var(--text-muted)',
}

export function Sparkline({
  data,
  tone = 'accent',
  className,
  height = 32,
  strokeWidth = 1.4,
  fill = true,
}: {
  data: number[]
  tone?: SparkTone
  className?: string
  height?: number
  strokeWidth?: number
  fill?: boolean
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(1, max - min)
  const width = 100
  const pad = 2
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: pad + (1 - (value - min) / range) * (height - pad * 2),
  }))

  const line = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      const prev = points[i - 1]
      const cx = (prev.x + p.x) / 2
      return `C ${cx.toFixed(2)} ${prev.y.toFixed(2)}, ${cx.toFixed(2)} ${p.y.toFixed(2)}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    })
    .join(' ')

  const area = `${line} L ${width} ${height} L 0 ${height} Z`
  const color = toneVar[tone]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('block w-full overflow-visible', className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.22" />
          <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {fill ? <path d={area} fill={`url(#spark-${id})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={`rgb(${color})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="1.6"
        fill={`rgb(${color})`}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
