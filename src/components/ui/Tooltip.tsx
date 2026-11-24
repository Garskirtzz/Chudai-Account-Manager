import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/utils/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delay = 350,
  disabled,
  className,
}: {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delay?: number
  disabled?: boolean
  className?: string
}) {
  const [buka, setBuka] = React.useState(false)
  if (content === null || content === undefined || content === '') return <>{children}</>
  return (
    <TooltipPrimitive.Root delayDuration={delay} open={!disabled && buka} onOpenChange={setBuka}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={10}
          className={cn(
            'z-[100] max-w-[280px] rounded-md border border-line-strong bg-surface-3 px-2 py-1.5 text-xs leading-relaxed text-content-secondary shadow-popover',
            'animate-[fade-up_120ms_ease-out]',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-surface-3" width={9} height={4} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
