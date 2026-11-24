import { useLayoutEffect, useState } from 'react'

export function useLebar<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [lebar, setLebar] = useState(0)
  useLayoutEffect(() => {
    if (!el) return
    setLebar(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([e]) => setLebar(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, lebar] as const
}

export const skalaRem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1
