import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowUpCircle, BookOpen, CircleCheck, ClipboardCopy, Download, Loader2, RefreshCw, Save, ScrollText } from '@/components/ikon'
import { api } from '@/api/api'
import type { InfoUpdate } from '@/api/types'
import { beriTahu, useCam } from '@/stores/cam'
import { pasangUpdate, usePasangUpdate } from '@/stores/pembaruan'
import { VERSI_APP, tanggalBuild } from '@/lib/rilis'
import { Button } from '@/components/ui/Button'
import { StatusLabel } from '@/components/ui/Badge'
import { Dialog, DialogBody, DialogContent } from '@/components/ui/Dialog'
import { JudulDialog } from '@/components/dialog/kecil'
import { Logo } from '@/components/shared/Logo'
import { Bagian, Baris, Isi, Status } from './bagian'
import './tentang.css'
import panduan from '../../../docs/USER_GUIDE.md?raw'
import changelog from '../../../CHANGELOG.md?raw'

const MB = (b: number) => (b / 1048576).toFixed(1)

type Update =
  | { status: 'belum' | 'memeriksa' | 'terbaru' }
  | { status: 'galat'; pesan: string }
  | ({ status: 'ada' } & InfoUpdate)

function IkonGithub() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

export function Tentang() {
  const updateAwal = useCam((s) => s.updateAwal)
  const [dok, setDok] = useState<{ judul: 'Documentation' | 'Changelog'; isi: string } | null>(null)
  const [update, setUpdate] = useState<Update>(() => (updateAwal ? { status: 'ada', ...updateAwal } : { status: 'belum' }))
  const [klien, setKlien] = useState(0)
  const fase = usePasangUpdate((s) => s.fase)
  const kemajuan = usePasangUpdate((s) => s.kemajuan)
  const versiPasang = usePasangUpdate((s) => s.versi)
  const st = fase !== 'diam' ? fase : update.status
  const versi = fase !== 'diam' ? versiPasang : 'versi' in update ? update.versi : ''
  const [diag, setDiag] = useState<null | 'memuat' | { ok: boolean; teks: string }>(null)

  useEffect(() => {
    if (updateAwal && update.status === 'belum') setUpdate({ status: 'ada', ...updateAwal })
  }, [updateAwal, update.status])

  useEffect(() => {
    if (st !== 'ada') return
    let hidup = true
    const baca = () => api.jumlahKlien().then((n) => hidup && setKlien(Number(n) || 0)).catch(() => {})
    void baca()
    const h = window.setInterval(baca, 2000)
    return () => { hidup = false; window.clearInterval(h) }
  }, [st])

  const periksa = async () => {
    setUpdate({ status: 'memeriksa' })
    try {
      const info = await api.cekUpdate()
      useCam.setState({ updateAwal: info && info.versi ? info : null })
      if (info && info.versi) {
        setUpdate({ status: 'ada', ...info })
        beriTahu(`Update available: ${info.versi}.`, 'benar')
      } else {
        setUpdate({ status: 'terbaru' })
        beriTahu(`Chudai Account Manager ${VERSI_APP} is up to date.`, 'benar')
      }
    } catch (e) {
      setUpdate({ status: 'galat', pesan: String(e) })
      beriTahu(`Couldn’t check for updates: ${e}`, 'salah')
    }
  }

  const salinDiagnosa = async () => {
    setDiag('memuat')
    try {
      const teks = await api.diagnosa()
      setDiag({ ok: true, teks: `Copied ${teks.split('\n').length} lines. Paste them into your bug report.` })
      beriTahu('Diagnostics copied to the clipboard.', 'benar')
    } catch (e) {
      setDiag({ ok: false, teks: `Couldn’t collect diagnostics: ${e}` })
      beriTahu(`Couldn’t collect diagnostics: ${e}`, 'salah')
    }
  }
  const simpanDiagnosa = async () => {
    setDiag('memuat')
    try {
      const jalur = await api.simpanDiagnosa()
      setDiag({ ok: true, teks: `Saved to ${jalur}` })
      beriTahu('Diagnostics saved.', 'benar')
    } catch (e) {
      if (String(e) === '__BATAL__') return setDiag(null)
      setDiag({ ok: false, teks: `Couldn’t save diagnostics: ${e}` })
      beriTahu(`Couldn’t save diagnostics: ${e}`, 'salah')
    }
  }

  const statusUpdate: ReactNode = {
    belum: <span className="text-content-muted">Not checked</span>,
    memeriksa: <span className="inline-flex items-center gap-1.5 text-content-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</span>,
    terbaru: <StatusLabel tone="success">Up to date</StatusLabel>,
    ada: <StatusLabel tone="warning">Update available{'versi' in update ? `: ${update.versi}` : ''}</StatusLabel>,
    mengunduh: <span className="inline-flex items-center gap-1.5 text-content-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Downloading {versi}…</span>,
    memasang: <span className="inline-flex items-center gap-1.5 text-content-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Installing {versi}…</span>,
    galat: <StatusLabel tone="error">Couldn’t check for updates</StatusLabel>,
  }[st]
  const persen = kemajuan?.total ? Math.min(100, Math.round((kemajuan.diunduh / kemajuan.total) * 100)) : null
  const sibukUpdate = st === 'memeriksa' || st === 'mengunduh' || st === 'memasang'

  return (
    <div className="space-y-4">
      <section aria-label="About" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-line-subtle bg-surface-1/30 px-4 py-4">
        <span className="flex items-center gap-4"><Logo size={72} /><span className="text-lg font-semibold text-content-primary">Chudai Account Manager</span></span>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2"><dt className="text-content-muted">Version</dt><dd className="tnum select-text text-content-primary">{VERSI_APP}</dd></div>
          <div className="flex gap-2"><dt className="text-content-muted">Build date</dt><dd className="select-text text-content-primary">{tanggalBuild()}</dd></div>
        </dl>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="md" variant="secondary" onClick={() => setDok({ judul: 'Documentation', isi: panduan })}><BookOpen className="h-4 w-4" />Documentation</Button>
          <Button size="md" variant="secondary" onClick={() => setDok({ judul: 'Changelog', isi: changelog })}><ScrollText className="h-4 w-4" />Changelog</Button>
          <button
            type="button"
            className="tombol-github"
            title="Open the Chudai Account Manager repository on GitHub"
            onClick={() => void api.bukaRepo().catch((e) => beriTahu(`Couldn’t open GitHub: ${e}`, 'salah'))}
          >
            <IkonGithub />
            <span className="text">GitHub</span>
          </button>
        </div>
      </section>

      <Bagian judul="Updates" kanan={<span aria-live="polite" data-status-update>{statusUpdate}</span>}>
        {update.status === 'galat' && update.pesan ? <Isi><Status nada="error">{update.pesan}</Status></Isi> : null}
        {update.status === 'ada' || fase !== 'diam' ? (
          <Isi aria-label="Update details">
            <p className="flex items-center gap-2 text-sm">
              <ArrowUpCircle className="h-4 w-4 shrink-0 text-warning" />
              <span className="font-semibold text-content-primary">Version {versi}</span>
              {update.status === 'ada' && update.tanggal ? <span className="text-content-muted">· {update.tanggal}</span> : null}
            </p>
            {update.status === 'ada' && update.catatan ? <p className="mt-1.5 max-h-40 select-text overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-content-secondary">{update.catatan}</p> : null}
            {st === 'ada' && update.status === 'ada' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button size="md" variant="primary" onClick={() => void pasangUpdate(update.versi)} disabled={klien > 0}><Download className="h-4 w-4" />Install update</Button>
                <span role="status" className={klien > 0 ? 'text-sm text-warning' : 'text-sm text-content-muted'}>
                  {klien > 0
                    ? `Close all Roblox clients first (${klien} running): installing restarts this app, which would close them.`
                    : 'Downloads, verifies the signature, installs, and restarts Chudai Account Manager.'}
                </span>
              </div>
            ) : (
              <div className="mt-3" role="status">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden>
                  <div className="h-full bg-accent transition-[width]" style={{ width: `${persen ?? 5}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-content-muted">
                  {kemajuan?.tahap === 'memasang'
                    ? 'Installing… Chudai Account Manager will close and reopen.'
                    : kemajuan?.total
                      ? `Downloading ${MB(kemajuan.diunduh)} of ${MB(kemajuan.total)} MB (${persen}%)`
                      : 'Downloading…'}
                </p>
              </div>
            )}
          </Isi>
        ) : null}
        <Baris judul="Check for updates" ket="Also checked once when the app starts.">
          <Button size="md" variant="secondary" onClick={() => void periksa()} disabled={sibukUpdate}>
            <RefreshCw className={update.status === 'memeriksa' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{update.status === 'memeriksa' ? 'Checking…' : 'Check now'}
          </Button>
        </Baris>
      </Bagian>

      <Bagian
        judul="Diagnostics"
        ket="A report for bug reports: Windows and graphics driver versions, recent crashes, blue screens and graphics resets, this app's state, and the end of the last 3 Roblox client logs. Read-only. Tickets, cookies, server codes, IP addresses, job IDs, user IDs, account names and your Windows user name are removed."
      >
        <Isi className="flex flex-wrap items-center gap-2">
          <Button size="md" variant="secondary" onClick={() => void salinDiagnosa()} disabled={diag === 'memuat'}>
            {diag === 'memuat' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCopy className="h-4 w-4" />}{diag === 'memuat' ? 'Collecting…' : 'Copy diagnostics'}
          </Button>
          <Button size="md" variant="secondary" onClick={() => void simpanDiagnosa()} disabled={diag === 'memuat'}><Save className="h-4 w-4" />Save to file…</Button>
          {diag && diag !== 'memuat' ? <span role="status" className={diag.ok ? 'text-sm text-success' : 'text-sm text-error'}>{diag.teks}</span> : null}
        </Isi>
      </Bagian>

      <Dialog open={!!dok} onOpenChange={(o) => { if (!o) setDok(null) }}>
        <DialogContent size="lg">
          <JudulDialog ikon={dok?.judul === 'Changelog' ? <ScrollText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />} judul={dok?.judul || ''} />
          <DialogBody>
            <Dokumen isi={dok?.isi} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Dokumen({ isi }: { isi?: string }) {
  if (!isi || !String(isi).trim()) {
    return <p role="alert" className="flex items-center gap-2 text-sm text-error"><AlertTriangle className="h-4 w-4" />This document is missing from this build.</p>
  }
  const blok: ReactNode[] = []
  const baris = String(isi).replace(/\r/g, '').split('\n')
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i]
    if (b.startsWith('```')) {
      const kode: string[] = []
      for (i++; i < baris.length && !baris[i].startsWith('```'); i++) kode.push(baris[i])
      blok.push(<pre key={i} className="my-2 select-text overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs leading-5 text-content-secondary" translate="no">{kode.join('\n')}</pre>)
    } else if (/^#{1,3} /.test(b)) {
      const lv = (b.match(/^#+/) as RegExpMatchArray)[0].length
      const teks = sebaris(b.replace(/^#+ /, ''))
      blok.push(lv === 1
        ? <h2 key={i} className="mb-2 text-lg font-semibold text-content-primary">{teks}</h2>
        : <h3 key={i} className="mb-1.5 mt-5 text-md font-semibold text-content-primary">{teks}</h3>)
    } else if (/^\s*(-|\d+\.) /.test(b)) {
      const urut = /^\s*\d+\. /.test(b)
      const item: ReactNode[] = []
      for (; i < baris.length && /^\s*(-|\d+\.) /.test(baris[i]); i++) {
        const dalam = /^\s{2,}/.test(baris[i])
        item.push(<li key={i} className={dalam ? 'ml-4' : ''}>{sebaris(baris[i].replace(/^\s*(-|\d+\.) /, ''))}</li>)
      }
      i--
      const Tag = urut ? 'ol' : 'ul'
      blok.push(<Tag key={`l${i}`} className={`my-1.5 space-y-1 pl-5 ${urut ? 'list-decimal' : 'list-disc'}`}>{item}</Tag>)
    } else if (b.trim()) {
      const para = [b]
      for (; i + 1 < baris.length && baris[i + 1].trim() && !/^(#|```|\s*(-|\d+\.) )/.test(baris[i + 1]); i++) para.push(baris[i + 1])
      blok.push(<p key={i} className="my-2">{sebaris(para.join(' '))}</p>)
    }
  }
  return (
    <div className="max-h-[60vh] select-text overflow-y-auto pr-1 text-sm leading-relaxed text-content-secondary" translate="no">
      {blok}
      <p className="mt-5 flex items-center gap-1.5 text-sm text-content-muted"><CircleCheck className="h-3.5 w-3.5" />Bundled with version {VERSI_APP}.</p>
    </div>
  )
}

function sebaris(teks: string) {
  return teks.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, i) =>
    s.startsWith('**') ? <strong key={i} className="font-semibold text-content-primary">{s.slice(2, -2)}</strong>
      : s.startsWith('`') ? <code key={i} className="rounded bg-surface-2 px-1 font-mono text-xs text-content-primary">{s.slice(1, -1)}</code>
        : s,
  )
}
