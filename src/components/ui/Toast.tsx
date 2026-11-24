import { useRef, useState, type PointerEvent } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@/components/ikon'
import { DURASI_KELUAR, useToastStore } from '@/stores/toastStore'
import { useUIStore } from '@/stores/uiStore'
import type { ToastItem } from '@/types'
import { cn } from '@/utils/cn'

const icons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const iconTones = {
  default: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

const JARAK_LEPAS = 64
const LAJU_LEPAS = 0.5

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const consoleOpen = useUIStore((s) => s.consoleOpen)
  const consoleHeight = useUIStore((s) => s.consoleHeight)

  return (
    <div
      className="pointer-events-none fixed right-4 z-[110] flex w-[340px] flex-col gap-2"
      style={{ bottom: (consoleOpen ? consoleHeight : 34) + 12 }}
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => <KartuToast key={t.id} toast={t} />)}
    </div>
  )
}

function KartuToast({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const tahan = useToastStore((s) => s.tahan)
  const Icon = icons[toast.variant]
  const [geser, setGeser] = useState<{ x: number; y: number; seret: boolean }>({ x: 0, y: 0, seret: false })
  const awal = useRef<{ x: number; y: number; t: number; sumbu: 'x' | 'y' | null; id: number } | null>(null)

  const turun = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    awal.current = { x: e.clientX, y: e.clientY, t: performance.now(), sumbu: null, id: e.pointerId }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {  }
    tahan(toast.id, true)
  }
  const gerak = (e: PointerEvent<HTMLDivElement>) => {
    const a = awal.current
    if (!a || a.id !== e.pointerId) return
    const dx = e.clientX - a.x
    const dy = e.clientY - a.y
    if (!a.sumbu && Math.hypot(dx, dy) > 6) a.sumbu = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (a.sumbu === 'x') setGeser({ x: dx > 0 ? dx : dx / 4, y: 0, seret: true })
    else if (a.sumbu === 'y') setGeser({ x: 0, y: dy, seret: true })
  }
  const lepas = (e: PointerEvent<HTMLDivElement>) => {
    const a = awal.current
    if (!a || a.id !== e.pointerId) return
    awal.current = null
    const dt = Math.max(1, performance.now() - a.t)
    const { x, y } = geser
    if (a.sumbu === 'x' && (x > JARAK_LEPAS || x / dt > LAJU_LEPAS)) return dismiss(toast.id, 'kanan')
    if (a.sumbu === 'y' && (Math.abs(y) > JARAK_LEPAS / 1.5 || Math.abs(y) / dt > LAJU_LEPAS)) return dismiss(toast.id, y < 0 ? 'atas' : 'bawah')
    setGeser({ x: 0, y: 0, seret: false })
    tahan(toast.id, false)
  }
  const batal = (e: PointerEvent<HTMLDivElement>) => {
    if (!awal.current || awal.current.id !== e.pointerId) return
    awal.current = null
    setGeser({ x: 0, y: 0, seret: false })
    tahan(toast.id, false)
  }

  const jarak = Math.max(geser.x, Math.abs(geser.y))
  const keluar = toast.keluar
  const transform = keluar === 'kanan' ? 'translateX(115%)' : keluar === 'atas' ? 'translateY(-140%)' : keluar === 'bawah' ? 'translateY(140%)' : `translate(${geser.x}px, ${geser.y}px)`
  return (
    <div
      data-toast={toast.id}
      className={cn(
        'pointer-events-auto flex touch-none select-none items-start gap-2.5 rounded-lg border border-line-strong/80 bg-surface-2/95 px-3 py-2.5 shadow-overlay backdrop-blur',
        !keluar && !geser.seret && 'animate-toast-in',
        geser.seret ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={{
        transform,
        opacity: keluar ? 0 : Math.max(0.25, 1 - jarak / 220),
        transition: geser.seret ? 'none' : keluar ? `transform ${DURASI_KELUAR}ms cubic-bezier(0.4, 0, 1, 1), opacity ${DURASI_KELUAR}ms ease-in` : 'transform 320ms cubic-bezier(0.25, 1.1, 0.4, 1), opacity 320ms ease-out',
      }}
      title="Swipe up, down or right to dismiss"
      onPointerDown={turun}
      onPointerMove={gerak}
      onPointerUp={lepas}
      onPointerCancel={batal}
      onPointerEnter={() => tahan(toast.id, true)}
      onPointerLeave={() => { if (!awal.current) tahan(toast.id, false) }}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconTones[toast.variant])} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-content-primary">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-xs leading-relaxed text-content-muted">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="-mr-1 -mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-content-muted transition-colors hover:bg-surface-3 hover:text-content-primary"
        aria-label="Dismiss notification"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
