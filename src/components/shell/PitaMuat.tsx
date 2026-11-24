import { AlertTriangle } from '@/components/ikon'
import { akuiStatusMuat, mulaiBaru, useCam } from '@/stores/cam'
import { Button } from '@/components/ui/Button'

const MAKS_JALUR = 6

export function PitaMuat() {
  const status = useCam((s) => s.berkasAkun)
  if (!status || status.jenis === 'baik') return null
  const salinan = status.cadangan ? (
    <>
      {' '}The original file was copied to <span className="select-text font-mono" translate="no">{status.cadangan}</span>.
    </>
  ) : null

  if (status.jenis === 'dipulihkan') {
    const jalur = status.hilang || []
    const tampil = jalur.slice(0, MAKS_JALUR).join(', ')
    const sisa = jalur.length > MAKS_JALUR ? ` and ${jalur.length - MAKS_JALUR} more` : ''
    return (
      <div role="status" data-pita-muat="dipulihkan" className="flex shrink-0 items-start gap-3 border-b border-warning/30 bg-warning/[0.08] px-4 py-2 text-sm text-content-primary">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="min-w-0 flex-1">
          Some saved values could not be read and were reset to their defaults: <span className="font-mono" translate="no">{tampil}</span>
          {sisa}. Your accounts were kept.{salinan}
        </p>
        <Button variant="ghost" size="sm" onClick={akuiStatusMuat}>Dismiss</Button>
      </div>
    )
  }

  return (
    <div role="alert" data-pita-muat="tak_terbaca" className="flex shrink-0 items-start gap-3 border-b border-error/30 bg-error/[0.08] px-4 py-2 text-sm text-content-primary">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
      <p className="min-w-0 flex-1">
        CAM could not read its accounts file ({status.sebab}), so it is not saving anything to avoid overwriting it.
        {salinan} Restore the file and restart CAM, or start with an empty account list.
      </p>
      <Button variant="danger" size="sm" onClick={mulaiBaru}>Start fresh…</Button>
    </div>
  )
}
