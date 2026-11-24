import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

export function ResizeHandle({
  orientation,
  onDelta,
  label,
  className,
  invert = false,
  onReset,
  valueNow,
  min,
  max,
  disabled,
}: {
  orientation: 'vertical' | 'horizontal'
  onDelta: (delta: number) => void
  label: string
  className?: string
  invert?: boolean
  onReset?: () => void
  valueNow?: number
  min?: number
  max?: number
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const last = useRef(0)
  const handler = useRef(onDelta)
  handler.current = onDelta

  const finish = useCallback(() => {
    setDragging(false)
    delete document.body.dataset.resizing
  }, [])

  const start = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    setDragging(true)
    last.current = orientation === 'vertical' ? event.clientX : event.clientY
    document.body.dataset.resizing = orientation === 'vertical' ? 'col' : 'row'
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (event: PointerEvent) => {
      const current = orientation === 'vertical' ? event.clientX : event.clientY
      const raw = current - last.current
      last.current = current
      if (raw !== 0) handler.current(invert ? -raw : raw)
    }
    const onUp = () => finish()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, orientation, invert, finish])

  useEffect(() => () => { delete document.body.dataset.resizing }, [])

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      aria-valuenow={valueNow}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={disabled ? -1 : 0}
      data-dragging={dragging}
      onPointerDown={start}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (disabled) return
        const increase = orientation === 'vertical' ? 'ArrowRight' : 'ArrowUp'
        const decrease = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowDown'
        if (event.key === increase) {
          event.preventDefault()
          onDelta(event.shiftKey ? 40 : 16)
        } else if (event.key === decrease) {
          event.preventDefault()
          onDelta(event.shiftKey ? -40 : -16)
        }
      }}
      className={cn(
        orientation === 'vertical' ? 'resize-handle-x h-full w-[5px] shrink-0' : 'resize-handle-y h-[5px] w-full shrink-0',
        'z-20 -mx-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70',
        disabled && 'pointer-events-none opacity-0',
        className,
      )}
    />
  )
}
