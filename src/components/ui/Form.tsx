import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Search, X } from '@/components/ikon'
import { cn } from '@/utils/cn'
import { Kbd } from './Badge'

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-xs font-medium text-content-secondary', className)}
    {...props}
  />
))
Label.displayName = 'Label'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full rounded-md border border-line bg-app/50 px-2.5 text-sm text-content-primary',
        'transition-colors placeholder:text-content-muted/80',
        'hover:border-line-strong focus:border-accent/70 focus:bg-app/70 focus:outline-none focus:ring-2 focus:ring-accent/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-error/70 aria-[invalid=true]:focus:ring-error/15',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[72px] w-full resize-y rounded-md border border-line bg-app/50 px-2.5 py-2 text-sm leading-relaxed text-content-primary',
        'transition-colors placeholder:text-content-muted/80',
        'hover:border-line-strong focus:border-accent/70 focus:bg-app/70 focus:outline-none focus:ring-2 focus:ring-accent/15',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
  optional?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional ? <span className="text-xs text-content-muted">Optional</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-content-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export const SearchInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
    value: string
    onValueChange: (value: string) => void
    shortcut?: string
    inputClassName?: string
  }
>(({ className, inputClassName, value, onValueChange, placeholder = 'Search…', shortcut, ...props }, ref) => (
  <div className={cn('group relative flex items-center', className)}>
    <Search
      className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-content-muted transition-colors group-focus-within:text-content-secondary"
      aria-hidden
    />
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-8 w-full rounded-md border border-line bg-app/45 pl-8 pr-14 text-sm text-content-primary',
        'transition-colors placeholder:text-content-muted/80 hover:border-line-strong',
        'focus:border-accent/60 focus:bg-app/70 focus:outline-none focus:ring-2 focus:ring-accent/12',
        inputClassName,
      )}
      {...props}
    />
    {value ? (
      <button
        type="button"
        onClick={() => onValueChange('')}
        aria-label="Clear search"
        className="absolute right-2 flex h-5 w-5 items-center justify-center rounded text-content-muted transition-colors hover:bg-surface-2 hover:text-content-primary"
      >
        <X className="h-3 w-3" />
      </button>
    ) : shortcut ? (
      <Kbd className="absolute right-2 font-sans text-xs">{shortcut}</Kbd>
    ) : null}
  </div>
))
SearchInput.displayName = 'SearchInput'
