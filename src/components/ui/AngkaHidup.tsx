import { useEffect, useRef, useState } from 'react'

export const gerakMati = () =>
  document.documentElement.dataset.motion === 'off' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)

export function AngkaHidup({ nilai, format, className }: { nilai: number | null | undefined; format: (v: number) => string; className?: string }) {
  const [tampil, setTampil] = useState<number | null>(nilai ?? null)
  const kini = useRef<number | null>(nilai ?? null)

  useEffect(() => {
    if (nilai == null) {
      kini.current = null
      setTampil(null)
      return
    }
    const awal = kini.current
    if (awal == null || awal === nilai || gerakMati()) {
      kini.current = nilai
      setTampil(nilai)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const langkah = (t: number) => {
      const p = Math.min(1, (t - t0) / 600)
      const e = 1 - Math.pow(1 - p, 3)
      const v = awal + (nilai - awal) * e
      kini.current = v
      setTampil(v)
      if (p < 1) raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [nilai])

  return <span translate="no" className={className}>{tampil == null ? '—' : format(tampil)}</span>
}
