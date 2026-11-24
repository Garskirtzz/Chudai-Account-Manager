import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { adaRuntime, api, pakaiMock } from '@/api/api'
import { mainkanIntro } from '@/components/shell/intro'
import { ErrorBoundary, RuntimeUnavailable } from '@/components/shell/RuntimeUnavailable'
import { bacaDensity, pasangDensity } from '@/lib/density'
import { bacaBahasa, pasangBahasa } from '@/lib/bahasa'
import './styles/globals.css'
import './styles/dropdown.css'

window.addEventListener('cam-bahasa', (e) => {
  if (adaRuntime() || pakaiMock()) void api.aturBahasa(String((e as CustomEvent).detail)).catch(() => undefined)
})

pasangDensity(bacaDensity(), false)
pasangBahasa(bacaBahasa())

function siapkanIntro() {
  const html = document.documentElement
  let buram = false
  const pekat = () => {
    if (buram) return
    buram = true
    html.classList.remove('cam-transparan')
    if (adaRuntime()) void api.jendelaAksi('bayangan').catch(() => undefined)
  }
  const akhiri = () => { pekat(); html.classList.remove('cam-intro', 'cam-intro-desktop', 'cam-intro-awal') }
  const pratinjau = pakaiMock() && /[?&]intro=1(?:&|$)/.test(location.search)
  let boleh = adaRuntime() || pratinjau
  try { if (localStorage.getItem('cam.intro') === 'off') boleh = false } catch {  }
  try { if (JSON.parse(localStorage.getItem('cam.preferensi') || '{}')?.state?.animations === false) boleh = false } catch {  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) boleh = false
  const root = document.getElementById('root')
  if (!boleh || !root) { akhiri(); return }
  html.classList.add('cam-intro')
  if (pratinjau) html.classList.add('cam-intro-desktop')
  void (async () => {
    if (adaRuntime()) {
      try {
        const terlihat = await Promise.race([api.jendelaAksi('terlihat'), new Promise<boolean>((ok) => setTimeout(() => ok(false), 1500))])
        if (!terlihat) { akhiri(); return }
      } catch { akhiri(); return }
    }
    try { mainkanIntro(root, pekat).selesai.then(akhiri, akhiri) } catch (e) { console.warn('intro skipped:', e); akhiri() }
  })()
}
siapkanIntro()

if (import.meta.env.PROD) {
  addEventListener('contextmenu', (e) => {
    const t = e.target instanceof Element ? e.target : null
    if (!t?.closest('input, textarea, [contenteditable=true], .select-text')) e.preventDefault()
  })
}

function Akar() {
  const [ada, setAda] = useState(() => adaRuntime() || pakaiMock())
  if (!ada) return <RuntimeUnavailable onRetry={() => setAda(adaRuntime() || pakaiMock())} />
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Akar />
  </StrictMode>,
)
