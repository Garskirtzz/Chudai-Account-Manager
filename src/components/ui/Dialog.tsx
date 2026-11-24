import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@/components/ikon'
import { cn } from '@/utils/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const sizeClasses = {
  sm: 'w-[min(420px,calc(100vw-32px))]',
  md: 'w-[min(520px,calc(100vw-32px))]',
  lg: 'w-[min(680px,calc(100vw-32px))]',
  xl: 'w-[min(820px,calc(100vw-32px))]',
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: keyof typeof sizeClasses
    showClose?: boolean
  }
>(({ className, children, size = 'md', showClose = true, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'dialog-panel fixed left-1/2 top-1/2 z-[91] flex max-h-[86vh] -translate-x-1/2 -translate-y-1/2 flex-col',
         'overflow-hidden rounded-lg border border-line-strong/80 bg-surface-1 shadow-overlay',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
      {showClose ? (
        <DialogPrimitive.Close
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-[5px] text-content-muted transition-colors hover:bg-surface-2 hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label="Close dialog"
        >
          <X className="h-3.5 w-3.5" />
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1 border-b border-line-subtle px-5 py-4 pr-12', className)} {...props}>
      {children}
    </div>
  )
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-md font-semibold tracking-[-0.01em] text-content-primary', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs leading-relaxed text-content-muted', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-end gap-2 border-t border-line-subtle bg-surface-1/80 px-5 py-3',
        className,
      )}
      {...props}
    />
  )
}
