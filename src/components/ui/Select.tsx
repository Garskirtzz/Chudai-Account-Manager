import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from '@/components/ikon'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  data?: boolean
}

const KOSONG = '__kosong__'
const masuk = (v: string) => (v === '' ? KOSONG : v)
const keluar = (v: string) => (v === KOSONG ? '' : v)

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  className,
  contentClassName,
  size = 'md',
  disabled,
  ariaLabel,
  title,
  id,
  labelLain,
}: {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  contentClassName?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  ariaLabel?: string
  title?: string
  id?: string
  labelLain?: (value: string) => string
}) {
  const ada = options.some((o) => o.value === value)
  const daftar = ada || value === '' ? options : [...options, { value, label: labelLain ? labelLain(value) : value }]
  const kini = daftar.find((o) => o.value === value)
  return (
    <SelectPrimitive.Root value={masuk(value)} onValueChange={(v) => onValueChange(keluar(v))} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        title={title}
        className={cn('dd-tombol justify-between select-none', size === 'sm' && 'dd-tombol-kecil', className)}
      >
        <span className="min-w-0 truncate" translate={kini?.data ? 'no' : undefined}><SelectPrimitive.Value placeholder={<span className="text-content-muted">{placeholder}</span>} /></span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="dd-chev h-3.5 w-3.5 text-content-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={10}
          className={cn('dd-panel z-[100] max-h-[min(var(--radix-select-content-available-height,60vh),360px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden', contentClassName)}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-content-muted">
            <ChevronUp className="h-3.5 w-3.5" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-0">
            {daftar.map((option) => (
              <SelectPrimitive.Item key={option.value || KOSONG} value={masuk(option.value)} disabled={option.disabled} className="dd-opsi">
                <span className="dd-centang"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
                <span className="min-w-0 flex-1 truncate" translate={option.data ? 'no' : undefined}><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText></span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-content-muted">
            <ChevronDown className="h-3.5 w-3.5" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
