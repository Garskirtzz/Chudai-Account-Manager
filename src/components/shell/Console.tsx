import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ChevronDown, ChevronUp, Copy, Eraser, Search, Terminal, WrapText } from '@/components/ikon'
import { bersihkanLog, tutupGalat, useCam, type BarisLog } from '@/stores/cam'
import { useUIStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/utils/cn'
import { Kbd } from '@/components/ui/Badge'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { Input } from '@/components/ui/Form'
import { Tooltip } from '@/components/ui/Tooltip'

type Tab = 'all' | 'errors'

const warna: Record<BarisLog['jenis'], string> = {
  info: 'text-content-secondary',
  benar: 'text-content-primary',
  salah: 'text-error',
}

export function Console() {
  const log = useCam((s) => s.log)
  const galatBaru = useCam((s) => s.galatBaru)
  const statusLuncur = useCam((s) => s.statusLuncur)
  const open = useUIStore((s) => s.consoleOpen)
  const height = useUIStore((s) => s.consoleHeight)
  const setOpen = useUIStore((s) => s.setConsoleOpen)
  const setHeight = useUIStore((s) => s.setConsoleHeight)
  const autoScroll = useSettingsStore((s) => s.consoleAutoScroll)
  const wordWrap = useSettingsStore((s) => s.consoleWordWrap)
  const updateSettings = useSettingsStore((s) => s.update)
  const [tab, setTab] = useState<Tab>('all')
  const [cari, setCari] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const tombolRef = useRef<HTMLButtonElement>(null)

  const jumlahGalat = useMemo(() => log.filter((l) => l.jenis === 'salah').length, [log])
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return log.filter((l) => (tab === 'all' || l.jenis === 'salah') && (!q || l.pesan.toLowerCase().includes(q)))
  }, [log, tab, cari])

  useEffect(() => {
    if (!open || !autoScroll || !bodyRef.current) return
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [tampil.length, statusLuncur, open, autoScroll])

  const salin = (l: BarisLog) => {
    void navigator.clipboard?.writeText(`[${l.jam}] ${l.pesan}`).catch(() => undefined)
  }

  return (
    <section
      aria-label="Output"
      data-console
      data-buka={open ? '' : undefined}
      className="relative z-30 flex shrink-0 flex-col border-t border-line-subtle bg-chrome"
      style={{ height: open ? height : 34 }}
      onKeyDown={(e) => { if (e.key === 'Escape' && open && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); setOpen(false); tombolRef.current?.focus() } }}
    >
      {open ? (
        <ResizeHandle
          orientation="horizontal"
          label="Resize Output"
          valueNow={height}
          min={120}
          max={520}
          invert
          onDelta={(d) => setHeight(Math.min(520, Math.max(120, useUIStore.getState().consoleHeight + d)))}
          onReset={() => setHeight(224)}
          className="absolute -top-[2px] left-0 right-0 z-40"
        />
      ) : null}

      {open ? (
        <>
          <div className="flex h-[34px] shrink-0 items-center border-b border-line-subtle pr-1.5">
            <div className="flex h-full items-center pl-1.5" role="tablist" aria-label="Output filter">
              <div className="mr-1 flex h-full items-center gap-1.5 px-1.5 text-content-muted">
                <Terminal className="h-4 w-4" />
                <span className="text-xs font-semibold text-content-secondary">Output</span>
              </div>
              {(['all', 'errors'] as Tab[]).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('relative flex h-full items-center gap-1.5 px-2.5 text-xs font-medium', tab === t ? 'text-content-primary' : 'text-content-muted hover:text-content-secondary')}>
                  {t === 'all' ? 'All' : 'Errors'}
                  <span className={cn('tnum text-2xs', t === 'errors' && jumlahGalat ? 'text-error' : 'text-content-muted')}>{t === 'all' ? log.length : jumlahGalat}</span>
                  {tab === t ? <span className="absolute inset-x-1.5 bottom-0 h-[2px] rounded-t bg-accent" /> : null}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="relative hidden items-center md:flex">
                <Search className="pointer-events-none absolute left-2 h-3 w-3 text-content-muted" />
                <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Filter Output…" aria-label="Filter Output" className="h-6 w-[11rem] rounded border-line-subtle bg-app/40 pl-7 text-xs" />
              </div>
              <Tooltip content={autoScroll ? 'Auto-scroll is on' : 'Auto-scroll is off'}>
                <button type="button" onClick={() => updateSettings({ consoleAutoScroll: !autoScroll })} aria-pressed={autoScroll} aria-label="Auto-scroll" className={cn('flex h-6 w-6 items-center justify-center rounded hover:bg-surface-2', autoScroll ? 'text-accent' : 'text-content-muted')}>
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip content={wordWrap ? 'Wrap long lines: on' : 'Wrap long lines: off'}>
                <button type="button" onClick={() => updateSettings({ consoleWordWrap: !wordWrap })} aria-pressed={wordWrap} aria-label="Wrap long lines" className={cn('flex h-6 w-6 items-center justify-center rounded hover:bg-surface-2', wordWrap ? 'text-accent' : 'text-content-muted')}>
                  <WrapText className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Clear Output">
                <button type="button" onClick={bersihkanLog} aria-label="Clear Output" className="flex h-6 w-6 items-center justify-center rounded text-content-muted hover:bg-surface-2 hover:text-content-primary">
                  <Eraser className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {galatBaru.n > 0 ? (
            <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-error/25 bg-error/[0.08] px-3 py-1 text-xs">
              <span className="font-semibold text-error">{galatBaru.n} {galatBaru.n === 1 ? 'error' : 'errors'}</span>
              <span className="min-w-0 flex-1 truncate text-content-secondary" title={galatBaru.pesan}>· latest: {galatBaru.pesan}</span>
              <button type="button" onClick={tutupGalat} className="shrink-0 font-medium text-content-secondary hover:text-content-primary hover:underline">Dismiss</button>
            </div>
          ) : null}

          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-app/80 py-1" role="log" aria-live="polite">
            {tampil.length === 0 && !statusLuncur ? (
              <p className="flex h-full min-h-[60px] items-center justify-center text-xs text-content-muted">
                {log.length === 0 ? 'Launch results and errors will appear here.' : 'No line matches the filter.'}
              </p>
            ) : (
              <>
                {tampil.map((l) => (
                  <div key={l.id} className="group flex items-start gap-2 px-3 py-[2px] font-mono text-xs leading-[18px] hover:bg-surface-1/60">
                    <time className="tnum w-[62px] shrink-0 text-content-muted">{l.jam}</time>
                    <span className={cn('min-w-0 flex-1 select-text', warna[l.jenis], wordWrap ? 'whitespace-pre-wrap break-words' : 'truncate')} title={wordWrap ? undefined : l.pesan}>{l.pesan}</span>
                    <button type="button" onClick={() => salin(l)} aria-label="Copy line" className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded text-content-muted opacity-0 hover:bg-surface-2 hover:text-content-primary focus:opacity-100 group-hover:opacity-100">
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {statusLuncur ? (
                  <div className="flex items-start gap-2 px-3 py-[2px] font-mono text-xs leading-[18px]">
                    <span className="w-[62px] shrink-0 text-info">now</span>
                    <span className="min-w-0 flex-1 text-info">{statusLuncur}</span>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}

      <button ref={tombolRef} type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Hide Output' : 'Show Output'} aria-expanded={open} className={cn('group flex h-[34px] w-full shrink-0 items-center gap-2 px-3 text-left hover:bg-surface-1/50', open && 'border-t border-line-subtle')}>
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-muted" /> : <ChevronUp className="h-3.5 w-3.5 shrink-0 text-content-muted" />}
        <Terminal className="h-3.5 w-3.5 shrink-0 text-content-muted" />
        <span className="text-xs font-medium text-content-secondary">Output</span>
        {!open && statusLuncur ? <span className="min-w-0 truncate text-xs text-info">{statusLuncur}</span> : null}
        {galatBaru.n > 0 ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-error/25 bg-error/10 px-1.5 py-px text-2xs font-medium text-error">
            <span className="h-1 w-1 rounded-full bg-error" />
            <span>{`${galatBaru.n} new ${galatBaru.n === 1 ? 'error' : 'errors'}`}</span>
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 text-xs text-content-muted">
          <span className="hidden md:inline">{open ? 'Hide' : 'Show'}</span>
          <Kbd className="hidden h-4 min-w-4 bg-transparent px-1 text-2xs md:inline">Ctrl</Kbd>
          <Kbd className="hidden h-4 min-w-4 bg-transparent px-1 text-2xs md:inline">J</Kbd>
        </span>
      </button>
    </section>
  )
}
