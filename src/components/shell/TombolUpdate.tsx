import { useState } from 'react'
import { Download } from '@/components/ikon'
import { Tooltip } from '@/components/ui/Tooltip'
import { useCam } from '@/stores/cam'
import { pasangUpdate, usePasangUpdate } from '@/stores/pembaruan'
import './tombol-update.css'

const KELILING = 264

export function TombolUpdate() {
  const info = useCam((s) => s.updateAwal)
  const fase = usePasangUpdate((s) => s.fase)
  const kemajuan = usePasangUpdate((s) => s.kemajuan)
  const versiPasang = usePasangUpdate((s) => s.versi)
  const [tekan, setTekan] = useState(0)
  if (!info && fase === 'diam') return null

  const versi = fase === 'diam' ? info?.versi ?? '' : versiPasang
  const bagian = kemajuan?.total ? Math.min(1, kemajuan.diunduh / kemajuan.total) : null
  const sibuk = fase !== 'diam'
  const offset = fase === 'memasang' ? 0 : fase === 'mengunduh' && bagian != null ? KELILING * (1 - bagian) : undefined
  const label = fase === 'memasang'
    ? `Installing ${versi}… Chudai Account Manager will close and reopen.`
    : fase === 'mengunduh'
      ? bagian != null ? `Downloading ${versi}: ${Math.round(bagian * 100)}%` : `Downloading ${versi}…`
      : `Update ${versi} is available. Download and install it (the app restarts).`

  return (
    <Tooltip side="bottom" content={label}>
      <button
        type="button"
        className="install-btn"
        aria-label={label}
        aria-disabled={sibuk || undefined}
        data-fase={fase}
        data-tak-tentu={fase === 'mengunduh' && bagian == null ? '' : undefined}
        data-tombol-update
        onClick={() => {
          if (sibuk || !versi) return
          setTekan((n) => n + 1)
          void pasangUpdate(versi)
        }}
      >
        <svg className="install-btn__svg" viewBox="0 0 100 100" aria-hidden>
          <circle className="install-btn__track" cx="50" cy="50" r="42" />
          <circle className="install-btn__fill" cx="50" cy="50" r="42" style={offset != null ? { strokeDashoffset: offset } : undefined} />
        </svg>
        <Download key={tekan} className="install-btn__icon" data-mantul={tekan ? '' : undefined} />
      </button>
    </Tooltip>
  )
}
