import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from '@/components/ikon'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'quiet'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg border border-transparent hover:bg-accent-hover active:brightness-95',
  secondary:
    'bg-transparent text-content-primary border border-line hover:bg-surface-2 hover:border-line-strong active:bg-surface-2',
  ghost:
    'bg-transparent text-content-secondary border border-transparent hover:bg-surface-2 hover:text-content-primary',
  outline:
    'bg-transparent text-content-primary border border-line hover:bg-surface-2 hover:border-line-strong',
  danger:
    'bg-error/10 text-error border border-error/25 hover:bg-error/15 hover:border-error/40',
  quiet: 'bg-transparent text-content-muted border border-transparent hover:text-content-primary hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2 text-2xs gap-1 rounded-[5px]',
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  lg: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  icon: 'h-8 w-8 rounded-md',
  'icon-sm': 'h-7 w-7 rounded-md',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading = false, asChild = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(
          'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150',
           'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app active:scale-[0.96]',
          'disabled:pointer-events-none disabled:opacity-45',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {asChild ? <span className="contents">{children}</span> : children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(
  ({ label, className, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn('text-content-muted hover:text-content-primary', className)}
      {...props}
    >
      {children}
    </Button>
  ),
)
IconButton.displayName = 'IconButton'
