import * as React from 'react'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from '@/components/ikon'
import { cn } from '@/utils/cn'

export const DropdownMenu = DropdownPrimitive.Root
export const DropdownMenuTrigger = DropdownPrimitive.Trigger
export const DropdownMenuGroup = DropdownPrimitive.Group
export const DropdownMenuPortal = DropdownPrimitive.Portal
export const DropdownMenuSub = DropdownPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content> & { width?: string }
>(({ className, sideOffset = 6, align = 'end', width, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      collisionPadding={10}
      className={cn(
        'dd-panel z-[80] min-w-[200px]',
        'max-h-[min(var(--radix-dropdown-menu-content-available-height,70vh),460px)] overflow-y-auto',
        width,
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

export function DropdownMenuItem({
  className,
  variant = 'default',
  icon,
  shortcut,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & {
  variant?: 'default' | 'danger'
  icon?: React.ReactNode
  shortcut?: string
}) {
  return (
    <DropdownPrimitive.Item
      className={cn('dd-opsi', variant === 'danger' && 'dd-opsi-bahaya', className)}
      {...props}
    >
      {icon ? <span className="dd-ikon">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <span className="dd-tag">{shortcut}</span> : null}
    </DropdownPrimitive.Item>
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  icon,
  sakelar = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem> & { icon?: React.ReactNode; sakelar?: boolean }) {
  return (
    <DropdownPrimitive.CheckboxItem checked={checked} className={cn('dd-opsi', className)} {...props}>
      {sakelar ? null : <span className="dd-centang"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
      {icon ? <span className="dd-ikon">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {sakelar ? <span className="dd-sakelar" aria-hidden><i /></span> : null}
    </DropdownPrimitive.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem className={cn('dd-opsi', className)} {...props}>
      <span className="dd-centang"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </DropdownPrimitive.RadioItem>
  )
}

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Label
    ref={ref}
    className={cn('dd-kepala', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator ref={ref} className={cn('dd-pisah', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubTrigger> & { icon?: React.ReactNode }
>(({ className, children, icon, ...props }, ref) => (
  <DropdownPrimitive.SubTrigger
    ref={ref}
    className={cn('dd-opsi', className)}
    {...props}
  >
    {icon ? <span className="dd-ikon">{icon}</span> : null}
    <span className="min-w-0 flex-1 truncate">{children}</span>
    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-muted" />
  </DropdownPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.SubContent
      ref={ref}
      sideOffset={4}
      collisionPadding={10}
      className={cn('dd-panel z-[81] min-w-[180px] overflow-y-auto', className)}
      {...props}
    />
  </DropdownPrimitive.Portal>
))
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'
