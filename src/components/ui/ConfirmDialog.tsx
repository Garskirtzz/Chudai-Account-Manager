import { AlertTriangle, Trash2 } from '@/components/ikon'
import { Button } from './Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './Dialog'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  tone = 'danger',
  loading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  tone?: 'danger' | 'warning'
  loading?: boolean
}) {
  const Icon = tone === 'danger' ? Trash2 : AlertTriangle
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span
              className={
                tone === 'danger'
                  ? 'flex h-8 w-8 items-center justify-center rounded-md border border-error/25 bg-error/10 text-error'
                  : 'flex h-8 w-8 items-center justify-center rounded-md border border-warning/25 bg-warning/10 text-warning'
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-5 py-4">
          <DialogDescription className="text-sm leading-relaxed text-content-secondary">{description}</DialogDescription>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
