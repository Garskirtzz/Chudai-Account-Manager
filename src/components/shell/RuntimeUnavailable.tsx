import { Component, useState, type ReactNode } from 'react'
import { AlertTriangle, Copy, RotateCw } from '@/components/ikon'
import { samarkanRahasia } from '@/api/api'

export function HalamanGalat({ judul, teks, petunjuk, detail, aksi, labelAksi = 'Retry' }: { judul: string; teks: string; petunjuk?: ReactNode; detail: string; aksi: () => void; labelAksi?: string }) {
  const [tersalin, setTersalin] = useState(false)
  const [buka, setBuka] = useState(false)
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(samarkanRahasia(detail))
      setTersalin(true)
      setTimeout(() => setTersalin(false), 1500)
    } catch {
      setBuka(true)
    }
  }
  return (
    <div role="alert" className="flex h-screen items-center justify-center bg-app p-6 text-content-primary">
      <div className="w-full max-w-[30rem] rounded-lg border border-line bg-surface-1 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-md font-semibold">{judul}</h1>
            <p className="mt-2 text-sm leading-6 text-content-secondary">{teks}</p>
            {petunjuk ? <p className="mt-2 text-sm leading-6 text-content-secondary">{petunjuk}</p> : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 pl-8">
          <button type="button" autoFocus onClick={aksi} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover">
            <RotateCw className="h-4 w-4" aria-hidden /> {labelAksi}
          </button>
          <button type="button" onClick={salin} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-content-primary hover:bg-surface-2">
            <Copy className="h-4 w-4" aria-hidden /> {tersalin ? 'Copied' : 'Copy technical details'}
          </button>
          <button type="button" aria-expanded={buka} onClick={() => setBuka((b) => !b)} className="inline-flex h-8 items-center rounded-md px-3 text-sm text-content-secondary hover:bg-surface-2">
            {buka ? 'Hide details' : 'Show details'}
          </button>
        </div>
        {buka ? <pre className="ml-8 mt-4 max-h-48 select-text overflow-auto whitespace-pre-wrap break-all rounded bg-app p-3 text-xs text-content-secondary">{samarkanRahasia(detail)}</pre> : null}
      </div>
    </div>
  )
}

function detailRuntime() {
  return [
    'Chudai Account Manager — desktop runtime unavailable',
    `window.__TAURI__: ${typeof window.__TAURI__}`,
    `__TAURI__.core.invoke: ${typeof window.__TAURI__?.core?.invoke}`,
    `URL origin: ${location.origin}`,
    `User agent: ${navigator.userAgent}`,
    `Time: ${new Date().toISOString()}`,
  ].join('\n')
}

export function RuntimeUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <HalamanGalat
      judul="Desktop runtime unavailable"
      teks="Chudai Account Manager is running outside the Tauri desktop app. The web preview cannot access local accounts, Roblox processes, or Windows features."
      petunjuk={<>Run <code className="text-content-primary">npm run dev</code> for desktop development, or open the built Chudai Account Manager <code className="text-content-primary">.exe</code>.</>}
      detail={detailRuntime()}
      aksi={onRetry}
    />
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { galat: Error | null; kunci: number }> {
  state = { galat: null as Error | null, kunci: 0 }
  private stackKomponen = ''

  static getDerivedStateFromError(galat: Error) {
    return { galat }
  }

  componentDidCatch(galat: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', samarkanRahasia(galat?.message), info?.componentStack)
    this.stackKomponen = info?.componentStack || ''
  }

  render() {
    const { galat, kunci } = this.state
    if (!galat) return <div key={kunci} className="contents">{this.props.children}</div>
    const detail = [
      'Chudai Account Manager — render error',
      `${galat.name || 'Error'}: ${galat.message || String(galat)}`,
      '',
      (galat.stack || '').split('\n').slice(0, 12).join('\n'),
      this.stackKomponen ? `\nComponent stack:${this.stackKomponen}` : '',
      `\nTime: ${new Date().toISOString()}`,
    ].join('\n')
    return (
      <HalamanGalat
        judul="Something went wrong"
        teks="Part of the interface failed to render. Your accounts are stored on disk and were not changed. Try again, or reload the application if the problem repeats."
        detail={detail}
        aksi={() => this.setState({ galat: null, kunci: kunci + 1 })}
      />
    )
  }
}
