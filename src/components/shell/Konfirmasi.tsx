import { useLayoutEffect, useRef } from 'react'
import { AlertTriangle, HelpCircle } from '@/components/ikon'
import { useCam } from '@/stores/cam'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

export function Konfirmasi() {
  const k = useCam((s) => s.konfirmasi)
  const kembali = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (!k) return
    if (!k.asal) kembali.current = null
    else if (!k.asal.closest('[role=dialog], [role=alertdialog]')) kembali.current = k.asal
  }, [k])
  const tutup = () => useCam.setState({ konfirmasi: null })
  const batal = () => {
    const b = k?.batal
    tutup()
    void b?.()
  }
  const ya = () => {
    const aksi = k?.aksi
    tutup()
    void aksi?.()
  }
  const Ikon = k?.bahaya ? AlertTriangle : HelpCircle
  return (
    <Dialog open={!!k} onOpenChange={(o) => { if (!o) batal() }}>
      <DialogContent
        size="sm"
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-batal]')?.focus() }}
        onCloseAutoFocus={(e) => { const t = kembali.current; if (t?.isConnected) { e.preventDefault(); t.focus() } }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className={k?.bahaya ? 'flex h-8 w-8 items-center justify-center rounded-md border border-error/25 bg-error/10 text-error' : 'flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-2 text-content-secondary'}>
              <Ikon className="h-4 w-4" />
            </span>
            <DialogTitle>{k?.judul}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-5 py-4">
          <DialogDescription className="whitespace-pre-line text-sm leading-relaxed text-content-secondary">{k?.pesan}</DialogDescription>
        </div>
        <DialogFooter>
          <Button data-batal variant="ghost" size="md" onClick={batal}>Cancel</Button>
          <Button variant={k?.bahaya ? 'danger' : 'primary'} size="md" onClick={ya}>{k?.labelYa || 'Continue'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
