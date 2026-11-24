import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { Check, Minus } from '@/components/ikon'
import { cn } from '@/utils/cn'

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { indeterminate?: boolean }
>(({ className, indeterminate, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={indeterminate ? 'indeterminate' : checked}
    className={cn(
      'peer flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
      'border-line-strong bg-app/40 text-accent-fg',
      'hover:border-content-muted/70',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-app',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
      'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-accent-fg">
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
      'bg-surface-3 data-[state=checked]:bg-accent',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app',
      'disabled:cursor-not-allowed disabled:opacity-40',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-3.5 w-3.5 rounded-full bg-content-secondary shadow-sm ring-0 transition-[transform,background-color] duration-150',
        'translate-x-[2px] data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-accent-fg',
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
  size = 'md',
  ariaLabel,
  disabled,
}: {
  options: { value: T; label: React.ReactNode; title?: string }[]
  value: T
  onValueChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-md border border-line bg-app/50 p-[2px]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex select-none items-center justify-center gap-1.5 rounded-[5px] px-2.5 font-medium transition-colors',
               size === 'sm' ? 'min-h-6 px-2.5 py-1 text-xs' : 'min-h-7 px-2.5 py-1 text-xs',
              selected
                ? 'bg-surface-3 text-content-primary shadow-[0_1px_2px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/[0.04]'
                : 'text-content-muted hover:bg-surface-2/60 hover:text-content-secondary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'value'> & {
    value: number[]
    onValueChange: (value: number[]) => void
  }
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-surface-3">
      <SliderPrimitive.Range className="absolute h-full bg-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-accent/80 bg-content-primary shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app" />
  </SliderPrimitive.Root>
))
Slider.displayName = 'Slider'

export function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  id,
}: {
  title: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-content-primary">
          {title}
        </label>
        {description ? <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-content-muted">{description}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="mt-0.5" />
    </div>
  )
}
