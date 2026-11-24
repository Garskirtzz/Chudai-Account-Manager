import { atributGame } from '@/utils/namaGame'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppWindow, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Columns, OctagonX, Play, Power, X } from '@/components/ikon'
import { api } from '@/api/api'
import type { Kapasitas, KlienAkun, LaporanSumber, StatusKlienKebijakan, StatusMonitor, SumberKlien } from '@/api/types'
import { beriTahu, useCam } from '@/stores/cam'
import { useUIStore } from '@/stores/uiStore'
import { clamp, cn } from '@/utils/cn'
import { BilahAksi } from '@/components/shared/PageHeader'
import { AngkaHidup } from '@/components/ui/AngkaHidup'
import { useTabHalaman } from '@/components/shell/navigasi'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Controls'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { StatusLabel, type StatusTone } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Feedback'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { KapasitasRam, STATUS_PANTAU, StatusKebijakan, TombolTahan, Tren, laju, lamaJalan, mb, persen } from './bagian'
import { JendelaKlien } from './JendelaKlien'
import { useLebar } from '@/hooks/useLebar'

const SIMPAN = 40
type Tren = { per: Record<number, { cpu: number[]; fisik: number[] }>; cpu: number[]; fisik: number[] }
interface Baris { pid: number; s: SumberKlien; a?: KlienAkun; p?: StatusMonitor }
interface Versi { peta: Record<string, string>; asal: Record<string, string>; saatIni: string; dipin: string }

type KunciKolom = 'cpu' | 'fisik' | 'privat' | 'bersama' | 'kompresi' | 'commit' | 'luar' | 'gpu' | 'vram' | 'baca' | 'tulis' | 'up' | 'rejoin'
const NILAI: Record<KunciKolom, (b: Baris) => number | null | undefined> = {
  cpu: (b) => b.s.cpu, fisik: (b) => b.s.fisik_perkiraan_mb, privat: (b) => b.s.ram_privat_mb, bersama: (b) => b.s.ram_bersama_mb, kompresi: (b) => b.s.kompresi_perkiraan_mb,
  commit: (b) => b.s.privat_mb, luar: (b) => b.s.di_luar_ram_mb, gpu: (b) => b.s.gpu, vram: (b) => b.s.vram_mb, baca: (b) => b.s.baca_bps, tulis: (b) => b.s.tulis_bps,
  up: (b) => (b.s.mulai_unix ? -b.s.mulai_unix : null), rejoin: (b) => b.p?.rejoin ?? null,
}

type Sorot = { jenis: 'status'; label: string } | { jenis: 'cpu' } | { jenis: 'ram' } | null

export function MonitorPage() {
  const [tab] = useTabHalaman<'clients' | 'windows'>('/monitor')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div key={tab} className="flex min-h-0 flex-1 animate-halaman flex-col">
        {tab === 'clients' ? <Klien /> : <div className="min-h-0 flex-1 overflow-y-auto"><JendelaKlien aktif /></div>}
      </div>
    </div>
  )
}

function Klien() {
  const navigate = useNavigate()
  const [sumber, setSumber] = useState<LaporanSumber | null>(null)
  const [akun, setAkun] = useState<KlienAkun[]>([])
  const [pantau, setPantau] = useState<StatusMonitor[]>([])
  const [kebijakan, setKebijakan] = useState<Record<number, StatusKlienKebijakan>>({})
  const [kapasitas, setKapasitas] = useState<Kapasitas | null>(null)
  const [tren, setTren] = useState<Tren>({ per: {}, cpu: [], fisik: [] })
  const [galat, setGalat] = useState('')
  const [kini, setKini] = useState(() => Date.now() / 1000)
  const [urut, setUrut] = useState<{ k: KunciKolom; arah: 'turun' | 'naik' } | null>(null)
  const [beku, setBeku] = useState<number[] | null>(null)
  const [versi, setVersi] = useState<Versi>({ peta: {}, asal: {}, saatIni: '', dipin: '' })
  const [hotkey, setHotkey] = useState(false)
  const [pilih, setPilih] = useState<number | null>(null)
  const [catatanBuka, setCatatanBuka] = useState(false)
  const [sorot, setSorot] = useState<Sorot>(null)
  const kolomPilihan = useUIStore((s) => s.monitorKolom)
  const setKolomPilihan = useUIStore((s) => s.setMonitorKolom)
  const urutanTampil = useRef<number[]>([])
  const muatKebijakanRef = useRef<() => void>(() => undefined)
  const lebarDetail = useUIStore((s) => s.monitorDetailWidth)
  const setLebarDetail = useUIStore((s) => s.setMonitorDetailWidth)
  const [badanRef, lebarBadan] = useLebar<HTMLDivElement>()
  const skala = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1
  const dok = lebarBadan - lebarDetail >= 520 * skala

  useEffect(() => {
    api.hotkeyDarurat().then((v) => setHotkey(!!v), () => undefined)
    Promise.all([api.daftarVersiRoblox(), api.klienPath()]).then(([d, dipin]) =>
      setVersi({
        peta: Object.fromEntries((d || []).map((k) => [k.path.toLowerCase(), k.versi || k.folder])),
        asal: Object.fromEntries((d || []).filter((k) => !k.bawaan).map((k) => [k.path.toLowerCase(), k.diunduh ? 'downloaded' : 'added folder'])),
        saatIni: ((d || []).find((k) => k.protokol)?.path || '').toLowerCase(),
        dipin: (dipin || '').toLowerCase(),
      }), () => undefined)
  }, [])

  useEffect(() => {
    let hidup = true
    const muat = async () => {
      try {
        const [l, a, p] = await Promise.all([api.sumberKlien(), api.klienAkun(), api.statusPantau()])
        if (!hidup) return
        setSumber(l)
        setAkun(a || [])
        setPantau(p || [])
        setGalat('')
        setKini(Date.now() / 1000)
        setTren((lama) => {
          const per: Tren['per'] = {}
          for (const k of l.klien || []) {
            const t = lama.per[k.pid] || { cpu: [], fisik: [] }
            per[k.pid] = { cpu: [...t.cpu, k.cpu || 0].slice(-SIMPAN), fisik: [...t.fisik, k.fisik_perkiraan_mb || 0].slice(-SIMPAN) }
          }
          if (!(l.klien || []).length) return { per, cpu: [], fisik: [] }
          const cpu = l.klien.reduce((n, k) => n + (k.cpu || 0), 0)
          return { per, cpu: [...lama.cpu, cpu].slice(-SIMPAN), fisik: [...lama.fisik, l.fisik_semua_perkiraan_mb || 0].slice(-SIMPAN) }
        })
      } catch (e) {
        if (hidup) setGalat(String(e))
      }
    }
    const muatKebijakan = async () => {
      try {
        const s = await api.statusKebijakan()
        if (!hidup) return
        setKebijakan(Object.fromEntries((s.klien || []).map((k) => [k.pid, k])))
        setKapasitas(s.kapasitas || null)
      } catch {
      }
    }
    muatKebijakanRef.current = () => void muatKebijakan()
    void muat()
    void muatKebijakan()
    const t = window.setInterval(muat, 3000)
    const k = window.setInterval(muatKebijakan, 10000)
    return () => { hidup = false; window.clearInterval(t); window.clearInterval(k) }
  }, [])

  const klien = sumber?.klien || []
  const perPid = Object.fromEntries(akun.map((a) => [a.pid, a]))
  const perAkun = Object.fromEntries(pantau.map((p) => [p.akun_id, p]))
  const barisPerAkun: Record<string, number> = {}
  for (const s of klien) {
    const id = perPid[s.pid]?.akun_id
    if (id) barisPerAkun[id] = (barisPerAkun[id] || 0) + 1
  }
  const baris: Baris[] = klien.map((s) => {
    const a = perPid[s.pid]
    const p = a?.akun_id ? perAkun[a.akun_id] : undefined
    const cocok = p && (p.pid === s.pid || (p.pid == null && barisPerAkun[a!.akun_id] === 1))
    return { pid: s.pid, s, a, p: cocok ? p : undefined }
  })
  let terurut = baris
  if (urut) {
    const f = NILAI[urut.k]
    const arah = urut.arah === 'turun' ? -1 : 1
    terurut = [...baris].sort((x, y) => {
      const [a, b] = [f(x), f(y)]
      if (a == null || b == null) return Number(a == null) - Number(b == null)
      return (a - b) * arah
    })
  }
  if (beku) {
    const posisi = new Map(beku.map((pid, i) => [pid, i]))
    terurut = [...terurut].sort((x, y) => (posisi.get(x.pid) ?? beku.length) - (posisi.get(y.pid) ?? beku.length))
  }
  urutanTampil.current = terurut.map((b) => b.pid)
  const klikUrut = (k: KunciKolom) => {
    setBeku(null)
    setUrut((u) => (!u || u.k !== k ? { k, arah: 'turun' } : u.arah === 'turun' ? { k, arah: 'naik' } : null))
  }

  const jumlah = (f: (k: SumberKlien) => number | null | undefined) => (klien.length ? klien.reduce((n, k) => n + (f(k) ?? 0), 0) : null)
  const m = sumber?.memori
  const terpakai = m?.total_mb != null && m?.tersedia_mb != null ? m.total_mb - m.tersedia_mb : null
  const dipilih = terurut.find((b) => b.pid === pilih) ?? null

  const versiTeks = (a?: KlienAkun) => {
    const exe = (a?.exe || '').toLowerCase()
    const v = versi.peta[exe] || (exe ? exe.split(/[\\/]/).at(-2) || exe : '—')
    if (!exe) return { teks: v, tone: 'text-content-muted' }
    if (!versi.dipin) {
      if (versi.asal[exe]) return { teks: `${v} · ${versi.asal[exe]}`, tone: 'text-content-muted' }
      if (!versi.saatIni) return { teks: v, tone: 'text-content-muted' }
      const kiniV = exe === versi.saatIni
      return { teks: `${v} · ${kiniV ? 'current' : 'old'}`, tone: kiniV ? 'text-content-muted' : 'text-warning' }
    }
    const sama = exe === versi.dipin
    return { teks: `${v} · ${sama ? 'pinned' : 'not pinned'}`, tone: sama ? 'text-success' : 'text-warning' }
  }

  const labelStatus = (b: Baris) => (b.p ? STATUS_PANTAU[b.p.status]?.[1] ?? b.p.status : 'Not tracked')
  const ringkasStatus = Object.entries(
    baris.reduce<Record<string, { n: number; tone: StatusTone }>>((r, b) => {
      const l = labelStatus(b)
      const tone = (b.p ? STATUS_PANTAU[b.p.status]?.[0] ?? 'muted' : 'muted') as StatusTone
      r[l] = { n: (r[l]?.n ?? 0) + 1, tone }
      return r
    }, {}),
  )
  const teratas = (f: (b: Baris) => number | null | undefined) => new Set([...baris].filter((b) => (f(b) ?? 0) > 0).sort((x, y) => (f(y) ?? 0) - (f(x) ?? 0)).slice(0, 3).map((b) => b.pid))
  const disorot: Set<number> | null = !sorot ? null
    : sorot.jenis === 'status' ? new Set(baris.filter((b) => labelStatus(b) === sorot.label).map((b) => b.pid))
      : sorot.jenis === 'cpu' ? teratas((b) => b.s.cpu)
        : teratas((b) => b.s.fisik_perkiraan_mb)
  const ganti = (x: Exclude<Sorot, null>) => setSorot((l) => (l && l.jenis === x.jenis && (l.jenis !== 'status' || (x.jenis === 'status' && l.label === x.label)) ? null : x))
  useEffect(() => {
    if (sorot?.jenis === 'status' && !ringkasStatus.some(([l]) => l === sorot.label)) setSorot(null)
  })

  const tutupSatu = (b: Baris) =>
    api.tutupSatuKlien(b.pid).then(() => beriTahu(`Closed ${b.a?.alias || `PID ${b.pid}`}.`, 'benar'), (e) => beriTahu(String(e), 'salah'))

  const detail = dipilih ? (
    <DetailKlien b={dipilih} tren={tren.per[dipilih.pid]} kini={kini} kebijakan={kebijakan[dipilih.pid]} versi={versiTeks(dipilih.a)} onTutup={() => setPilih(null)} onTutupKlien={() => void tutupSatu(dipilih)} onAkun={() => dipilih.a?.akun_id && navigate(`/accounts?account=${dipilih.a.akun_id}`)} />
  ) : null

  const waktu = kini * 1000
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BilahAksi>
        <TombolTahan ikon={<Power className="h-3.5 w-3.5" />} label="Close all" title="Hold to ask every Roblox client to close (ended after 5 s if it doesn't). Pending auto-rejoins are cancelled." disabled={!klien.length} onSelesai={async () => {
          try {
            const n = await api.tutupSemuaKlien(false)
            beriTahu(`Closed ${n} Roblox client${n === 1 ? '' : 's'}; pending rejoins cancelled.`, 'benar')
          } catch (e) { beriTahu(String(e), 'salah') }
        }} />
        <TombolTahan ikon={<OctagonX className="h-3.5 w-3.5" />} label="End all Roblox" bahaya title="Hold to end every Roblox process at once, also Roblox's tray process. Pending auto-rejoins are cancelled." onSelesai={async () => {
          try {
            const n = await api.tutupSemuaKlien(true)
            beriTahu(`Ended ${n} Roblox client${n === 1 ? '' : 's'}; pending rejoins cancelled.`, 'benar')
          } catch (e) { beriTahu(String(e), 'salah') }
        }} />
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-content-secondary" title="A global shortcut that works even while a game is in front. Off by default.">
          <Checkbox className="h-5 w-5" checked={hotkey} aria-label="Emergency hotkey Ctrl+Alt+End" onCheckedChange={async (v) => {
            try {
              setHotkey(await api.setHotkeyDarurat(v === true))
              beriTahu(v ? 'Emergency hotkey on: Ctrl+Alt+End ends every Roblox client.' : 'Emergency hotkey off.', 'benar')
            } catch (e) { beriTahu(String(e), 'salah') }
          }} />
          Emergency hotkey <kbd className="rounded border border-line px-1 font-mono text-xs text-content-primary">Ctrl+Alt+End</kbd>
        </label>
      </BilahAksi>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex min-h-full flex-col">
      <div className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-3 px-4 pt-4">
        <Kartu judul="Memory" nilai={terpakai != null ? <><AngkaHidup nilai={terpakai / 1024} format={(v) => v.toFixed(1)} /> <span className="text-base font-normal text-content-muted">of {((m?.total_mb ?? 0) / 1024).toFixed(0)} GB</span></> : '—'} sub="PC RAM in use">
          {terpakai != null && m?.total_mb ? <BatangRam total={m.total_mb} terpakai={terpakai} roblox={klien.length ? sumber!.fisik_semua_perkiraan_mb : 0} anggaran={kapasitas?.anggaran_mb ?? null} /> : null}
        </Kartu>
        <Kartu judul="CPU" nilai={<AngkaHidup nilai={sumber?.cpu_sistem} format={persen} />} sub={`Whole PC · Roblox clients ${persen(jumlah((k) => k.cpu))}`} aktif={sorot?.jenis === 'cpu'} onKlik={klien.length ? () => ganti({ jenis: 'cpu' }) : undefined} petunjuk="Highlight the 3 clients using the most CPU">
          <Tren nilai={tren.cpu} nol lantai={10} label="CPU of all clients, last 2 minutes" satuan={(v) => `${v.toFixed(1)}%`} waktu={waktu} />
        </Kartu>
        <Kartu judul="Physical RAM (est.), all clients" nilai={<AngkaHidup nilai={klien.length ? sumber?.fisik_semua_perkiraan_mb : null} format={mb} />} sub={`${klien.length} client${klien.length === 1 ? '' : 's'} running`} aktif={sorot?.jenis === 'ram'} onKlik={klien.length ? () => ganti({ jenis: 'ram' }) : undefined} petunjuk="Highlight the 3 clients using the most RAM">
          <Tren nilai={tren.fisik} lantai={64} label="Physical RAM of all clients, last 2 minutes" satuan={(v) => mb(v)} waktu={waktu} />
        </Kartu>
      </div>

      <details className="mx-4 mt-3 rounded-lg border border-line-subtle bg-surface-1/30">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-xs font-semibold text-content-secondary"><ChevronRight className="h-3.5 w-3.5" />PC details</summary>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-x-4 gap-y-3 border-t border-line-subtle px-4 py-3">
          <Angka judul="CPU, all clients" nilai={persen(jumlah((k) => k.cpu))} rincian="Share of the whole CPU used by all Roblox clients together." />
          <Angka judul="PC CPU" nilai={persen(sumber?.cpu_sistem)} rincian="How busy the whole PC is." />
          <Angka judul="Physical RAM (est.), all clients" nilai={mb(klien.length ? sumber?.fisik_semua_perkiraan_mb : null)} rincian="Estimated RAM all Roblox clients really occupy together; shared pages are counted once per Roblox version." />
          <Angka judul="PC RAM in use" nilai={terpakai != null ? `${mb(terpakai)} of ${mb(m?.total_mb)}` : '—'} rincian="Physical RAM in use on the whole PC." />
          <Angka judul="Compressed (all programs)" nilai={mb(m?.kompresi_mb)} rincian="RAM Windows uses to hold compressed memory of every program. Windows doesn't report each program's part." />
          <Angka judul="Private in RAM" nilai={mb(jumlah((k) => k.ram_privat_mb))} rincian="Private pages in RAM of all clients (Task Manager's Memory column, summed)." />
          <Angka judul="Commit, all clients" nilai={mb(jumlah((k) => k.privat_mb))} rincian="Memory all clients have reserved." />
          <Angka judul="GPU memory, all clients" nilai={mb(klien.some((k) => k.vram_mb != null) ? jumlah((k) => k.vram_mb) : null)} rincian="Dedicated graphics memory of all clients." />
          <Angka judul="Read + write, all clients" nilai={laju(klien.some((k) => k.baca_bps != null) ? jumlah((k) => (k.baca_bps ?? 0) + (k.tulis_bps ?? 0)) : null)} rincian="Disk and network reads and writes per second of all clients." />
          <Angka judul="PC commit" nilai={m?.commit_terpakai_mb != null ? `${mb(m.commit_terpakai_mb)} of ${mb(m.commit_batas_mb)}` : '—'} rincian="Memory reserved by every program, against RAM + page file." />
        </div>
      </details>

      <section className="mt-4 flex min-h-[24rem] flex-1 flex-col border-t border-line-subtle" aria-label="Clients">
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2">
          <h2 className="text-sm font-semibold text-content-primary">Roblox clients <span className="font-normal text-content-muted">· {klien.length ? `${klien.length} running` : 'none'}</span></h2>
          <PilihKolom pilihan={kolomPilihan} onUbah={setKolomPilihan} tersembunyi={kolomMuat(kolomPilihan, dok && dipilih ? lebarBadan - lebarDetail : lebarBadan).tersembunyi} />
          {ringkasStatus.length ? (
            <div className="ml-auto flex flex-wrap items-center gap-1.5" role="group" aria-label="Highlight clients by status">
              {ringkasStatus.map(([l, { n, tone }]) => {
                const ya = sorot?.jenis === 'status' && sorot.label === l
                return (
                  <button key={l} type="button" aria-pressed={ya} onClick={() => ganti({ jenis: 'status', label: l })} title={ya ? 'Show every client normally' : `Highlight clients that are ${l.toLowerCase()}`} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all duration-300 ease-pegas', ya ? 'border-accent/70 bg-accent/15 text-content-primary' : 'border-line-subtle text-content-secondary hover:border-line-strong hover:bg-surface-2')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', TITIK_NADA[tone])} aria-hidden />{l}<span className="tnum text-content-muted">{n}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
        {galat ? <p className="border-t border-line-subtle px-4 py-1.5 text-sm text-error">Couldn’t read the clients: {galat}</p> : null}
        <div ref={badanRef} className="relative flex min-h-0 flex-1 border-t border-line-subtle">
          <div className="min-w-0 flex-1">
            {!sumber ? (
              <EmptyState icon={Play} title="Measuring…" compact />
            ) : !klien.length ? (
              <EmptyState icon={Play} title="No Roblox client is running." description="Launch accounts from the Accounts page; they show up here." action={<Button size="sm" variant="secondary" onClick={() => navigate('/accounts')}>Go to Accounts</Button>} />
            ) : (
              <TabelKlien baris={terurut} lebar={dok && dipilih ? lebarBadan - lebarDetail : lebarBadan} urut={urut} onUrut={klikUrut} pilih={pilih} onPilih={(pid) => setPilih(pid === pilih ? null : pid)} tren={tren} kini={kini} kebijakan={kebijakan} versiTeks={versiTeks} onTahan={(ya) => setBeku(ya ? urutanTampil.current : null)} onTutup={(b) => void tutupSatu(b)} disorot={disorot} pilihan={kolomPilihan} />
            )}
          </div>
          {dipilih && dok ? (
            <>
              <ResizeHandle orientation="vertical" label="Resize client details" invert valueNow={lebarDetail} min={300} max={520} onDelta={(d) => setLebarDetail(clamp(useUIStore.getState().monitorDetailWidth + d, 300, 520))} onReset={() => setLebarDetail(360)} />
              <aside style={{ width: lebarDetail }} className="flex min-h-0 shrink-0 flex-col bg-surface-1/40" aria-label="Client details">{detail}</aside>
            </>
          ) : dipilih ? (
            <aside style={{ width: Math.min(lebarDetail, lebarBadan - 32) }} className="absolute inset-y-0 right-0 z-20 flex min-h-0 flex-col border-l border-line bg-surface-1 shadow-overlay" aria-label="Client details" onKeyDown={(e) => { if (e.key === 'Escape') setPilih(null) }}>{detail}</aside>
          ) : null}
        </div>
      </section>

      <div className="space-y-3 px-4 py-4">
        <KapasitasRam k={kapasitas} onUbah={() => muatKebijakanRef.current()} />
        <section className="rounded-lg border border-line-subtle">
          <button type="button" aria-expanded={catatanBuka} onClick={() => setCatatanBuka((b) => !b)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-content-secondary">
            {catatanBuka ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}How Physical RAM is estimated
          </button>
          {catatanBuka ? (
            <div className="space-y-1.5 border-t border-line-subtle px-4 py-3 text-sm leading-relaxed text-content-muted">
              <p>Task Manager's Memory column counts only a client's private pages; its Working set counts shared pages in full in every client. Neither is the RAM a client really takes from the PC.</p>
              <p>Physical RAM here = private pages in RAM (exactly this client's) + pages it shares, split across the running Roblox clients of the same Roblox version (they share the Roblox program) + its share of Windows' compressed memory.</p>
              <p>Windows doesn't report how much of the compressed memory belongs to each program, so that part is split in proportion to each program's memory that is not in RAM. A client with a RAM limit keeps most of its memory compressed, so this part can be large. The total for all clients counts shared pages once per Roblox version.</p>
              <p>In one test (one client with a 512 MB RAM limit, one game, 3 minutes) the estimate was 877 MB, about 15 % below a rough comparison of about 1,030 MB (working set plus the growth of Windows' compressed memory), while Task Manager showed 379 MB. Results can differ by game and by the other programs running.</p>
              <p>CAM reads these numbers without opening the Roblox process: the same system snapshot Task Manager uses.</p>
            </div>
          ) : null}
        </section>
      </div>
      </div>
      </div>
    </div>
  )
}

const TITIK_NADA: Record<StatusTone, string> = { success: 'bg-success', error: 'bg-error', warning: 'bg-warning', info: 'bg-info', muted: 'bg-content-muted' }

function Kartu({ judul, nilai, sub, children, aktif, onKlik, petunjuk }: { judul: string; nilai: React.ReactNode; sub?: string; children?: React.ReactNode; aktif?: boolean; onKlik?: () => void; petunjuk?: string }) {
  const isi = (
    <>
      <h2 className="flex items-center gap-2 text-xs font-semibold text-content-secondary">
        {judul}
        {onKlik ? <span className={cn('ml-auto rounded px-1.5 text-2xs font-medium transition-colors', aktif ? 'bg-accent/20 text-content-primary' : 'text-content-muted opacity-0 group-hover:opacity-100')}>{aktif ? 'Highlighting' : 'Click to highlight'}</span> : null}
      </h2>
      <p className="tnum mt-1 text-2xl font-semibold text-content-primary">{nilai}</p>
      {sub ? <p className="mt-0.5 text-xs text-content-muted">{sub}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </>
  )
  const kelas = cn('group flex min-w-0 flex-col rounded-lg border bg-surface-1/50 p-4 text-left transition-[border-color,box-shadow,transform] duration-300 ease-pegas', aktif ? 'border-accent/60 shadow-[0_0_0_1px_rgb(var(--accent)/0.35)]' : 'border-line-subtle')
  if (!onKlik) return <section className={kelas}>{isi}</section>
  return (
    <section role="button" tabIndex={0} aria-pressed={!!aktif} title={petunjuk} onClick={onKlik} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKlik() } }} className={cn(kelas, 'cursor-pointer hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60')}>
      {isi}
    </section>
  )
}

function Angka({ judul, nilai, rincian }: { judul: string; nilai: string; rincian: string }) {
  return (
    <div className="min-w-0" title={rincian}>
      <p className="text-xs text-content-muted">{judul}</p>
      <p className="tnum text-sm font-semibold text-content-primary">{nilai}</p>
    </div>
  )
}

function BatangRam({ total, terpakai, roblox, anggaran }: { total: number; terpakai: number; roblox: number; anggaran: number | null }) {
  const lain = Math.max(0, terpakai - roblox)
  const bebas = Math.max(0, total - terpakai)
  const p = (v: number) => `${(v / total) * 100}%`
  return (
    <div>
      <div className="relative">
        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`Roblox clients ${mb(roblox)}, other programs ${mb(lain)}, free ${mb(bebas)} of ${mb(total)}`}>
          <span style={{ width: p(roblox), background: '#3987e5' }} />
          <span style={{ width: p(lain), background: '#8F8F8F' }} />
        </div>
        {anggaran ? <span className="absolute -top-1 h-5 w-[2px] rounded bg-content-primary" style={{ left: `calc(${p(Math.min(total, anggaran))} - 1px)` }} title={`RAM budget for Roblox clients: ${mb(anggaran)}`} aria-hidden /> : null}
      </div>
      <dl className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="flex items-center gap-1.5 text-content-muted"><span className="h-2 w-2 rounded-sm bg-[#3987e5]" />Roblox</dt><dd className="tnum mt-0.5 text-content-primary">{mb(roblox)}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-content-muted"><span className="h-2 w-2 rounded-sm bg-[#8F8F8F]" />Other</dt><dd className="tnum mt-0.5 text-content-primary">{mb(lain)}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-content-muted"><span className="h-2 w-2 rounded-sm border border-line-strong bg-surface-3" />Free</dt><dd className="tnum mt-0.5 text-content-primary">{mb(bebas)}</dd></div>
      </dl>
    </div>
  )
}

type KunciTampil = KunciKolom | 'akun' | 'status' | 'versi' | 'batas'
const KOLOM: { k: KunciTampil; label: string; track: string; min: number; kanan?: boolean; ket?: string }[] = [
  { k: 'akun', label: 'Account', track: 'minmax(9rem,1.3fr)', min: 144 },
  { k: 'status', label: 'Status', track: 'minmax(8rem,1fr)', min: 128 },
  { k: 'cpu', label: 'CPU', track: 'minmax(6.5rem,0.8fr)', min: 104, ket: 'Share of the whole CPU (all cores), like Task Manager.' },
  { k: 'fisik', label: 'Physical RAM (est.)', track: 'minmax(8rem,0.9fr)', min: 128, ket: 'Estimated RAM this client really occupies: its private pages in RAM, plus its share of shared pages (split across Roblox clients), plus its share of Windows\' compressed memory. An estimate; see the note below.' },
  { k: 'privat', label: 'Private', track: '5.5rem', min: 88, kanan: true, ket: "Private pages in RAM: exactly this client's, nobody else's (Task Manager's Memory column)." },
  { k: 'bersama', label: 'Shared', track: '5.5rem', min: 88, kanan: true, ket: 'Pages in RAM shared with other processes (the Roblox program and Windows DLLs), counted in full.' },
  { k: 'kompresi', label: 'Compressed', track: '6rem', min: 96, kanan: true, ket: "Estimated share of RAM used by Windows' compressed memory for this client." },
  { k: 'commit', label: 'Commit', track: '5.5rem', min: 88, kanan: true, ket: 'Memory the client has reserved (private bytes), in RAM or not.' },
  { k: 'luar', label: 'Not in RAM', track: '6rem', min: 96, kanan: true, ket: 'Reserved memory that is not in RAM: compressed, in the page file, or never used yet.' },
  { k: 'gpu', label: 'GPU', track: '4rem', min: 64, kanan: true, ket: "The client's busiest graphics engine, like Task Manager." },
  { k: 'vram', label: 'GPU memory', track: '6rem', min: 96, kanan: true, ket: 'Dedicated graphics memory this client uses.' },
  { k: 'baca', label: 'Read', track: '5.5rem', min: 88, kanan: true, ket: 'Disk and network reads per second.' },
  { k: 'tulis', label: 'Write', track: '5.5rem', min: 88, kanan: true, ket: 'Disk and network writes per second.' },
  { k: 'up', label: 'Up', track: '4.5rem', min: 72, kanan: true, ket: 'How long this client has been running.' },
  { k: 'rejoin', label: 'Rejoins', track: '4.5rem', min: 72, kanan: true, ket: 'Automatic rejoins of this account since CAM was opened.' },
  { k: 'batas', label: 'Limits', track: 'minmax(7.5rem,0.8fr)', min: 120 },
  { k: 'versi', label: 'Version', track: 'minmax(11rem,1fr)', min: 176, ket: 'The Roblox version this client runs; pinned or not, when a version is pinned in Client versions.' },
]
const KOLOM_PILIHAN = KOLOM.filter((c) => c.k !== 'akun' && c.k !== 'status')

function kolomMuat(pilihan: string[], lebar: number) {
  const skala = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1
  let pakai = (40 + 16 + 144 + 128) * skala
  const tampil = KOLOM.slice(0, 2)
  const tersembunyi: string[] = []
  for (const c of KOLOM_PILIHAN) {
    if (!pilihan.includes(c.k)) continue
    if (!lebar || pakai + c.min * skala <= lebar) { tampil.push(c); pakai += c.min * skala } else tersembunyi.push(c.k)
  }
  return { tampil, tersembunyi }
}

const GRUP_KOLOM: { judul: string; kunci: string[] }[] = [
  { judul: 'Memory', kunci: ['fisik', 'privat', 'bersama', 'kompresi', 'commit', 'luar'] },
  { judul: 'CPU and GPU', kunci: ['cpu', 'gpu', 'vram'] },
  { judul: 'Disk and network', kunci: ['baca', 'tulis'] },
  { judul: 'Client', kunci: ['up', 'rejoin', 'batas', 'versi'] },
]

function PilihKolom({ pilihan, onUbah, tersembunyi }: { pilihan: string[]; onUbah: (k: string[]) => void; tersembunyi: string[] }) {
  const item = (k: string) => {
    const c = KOLOM_PILIHAN.find((x) => x.k === k)!
    const tanpaRuang = tersembunyi.includes(c.k)
    return (
      <DropdownMenuCheckboxItem
        key={c.k}
        checked={pilihan.includes(c.k)}
        onSelect={(e) => e.preventDefault()}
        onCheckedChange={(v) => onUbah(KOLOM_PILIHAN.filter((x) => (x.k === c.k ? v === true : pilihan.includes(x.k))).map((x) => x.k))}
        title={tanpaRuang ? 'No room in this window size: it shows when the window is wider.' : c.ket}
        className={tanpaRuang ? 'h-auto min-h-[30px] py-1' : undefined}
      >
        <span className="block truncate">{c.label}</span>
        {tanpaRuang ? <span className="block text-2xs text-warning">no room</span> : null}
      </DropdownMenuCheckboxItem>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" title={tersembunyi.length ? 'Choose the columns of the client table. Hidden columns have no room in this window size and show when the window is wider.' : 'Choose the columns of the client table'}><Columns className="h-3.5 w-3.5" />Columns{tersembunyi.length ? <span className="text-xs text-warning">{`· ${tersembunyi.length} hidden`}</span> : null}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[26rem] max-w-[calc(100vw-20px)]">
        <div className="grid grid-cols-2 gap-x-2">
          {[[GRUP_KOLOM[0], GRUP_KOLOM[2]], [GRUP_KOLOM[1], GRUP_KOLOM[3]]].map((kolom, i) => (
            <div key={i}>
              {kolom.map((g) => (
                <div key={g.judul}>
                  <DropdownMenuLabel>{g.judul}</DropdownMenuLabel>
                  {g.kunci.map(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TabelKlien({ baris, lebar, urut, onUrut, pilih, onPilih, kini, kebijakan, versiTeks, onTahan, onTutup, disorot, pilihan }: {
  baris: Baris[]; lebar: number; urut: { k: KunciKolom; arah: 'turun' | 'naik' } | null; onUrut: (k: KunciKolom) => void; pilih: number | null; onPilih: (pid: number) => void
  tren: Tren; kini: number; kebijakan: Record<number, StatusKlienKebijakan>; versiTeks: (a?: KlienAkun) => { teks: string; tone: string }; onTahan: (ya: boolean) => void; onTutup: (b: Baris) => void
  disorot: Set<number> | null
  pilihan: string[]
}) {
  const statusLama = useRef<Record<number, string>>({})
  const kilat = useRef<Record<number, number>>({})
  for (const b of baris) {
    const st = b.p?.status ?? '-'
    const lama = statusLama.current[b.pid]
    if (lama !== undefined && lama !== st) kilat.current[b.pid] = (kilat.current[b.pid] ?? 0) + 1
    statusLama.current[b.pid] = st
  }
  const kolom = kolomMuat(pilihan, lebar).tampil
  const template = `${kolom.map((c) => c.track).join(' ')} 2.5rem`
  const maksCpu = Math.max(1, ...baris.map((b) => b.s.cpu || 0))
  const maksRam = Math.max(1, ...baris.map((b) => b.s.fisik_perkiraan_mb || 0))
  const bisaUrut = (k: string): k is KunciKolom => k in NILAI
  return (
    <div role="grid" aria-label="Running Roblox clients" onPointerEnter={() => onTahan(true)} onPointerLeave={() => onTahan(false)} onFocus={() => onTahan(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onTahan(false) }}>
      <div role="row" className="sticky top-0 z-10 grid border-b border-line bg-surface-1 px-2 text-xs font-medium text-content-muted" style={{ gridTemplateColumns: template }}>
        {kolom.map((c) => (
          <div key={c.k} role="columnheader" aria-sort={urut?.k === c.k ? (urut.arah === 'turun' ? 'descending' : 'ascending') : 'none'} className={cn('px-2', c.kanan && 'text-right')}>
            {bisaUrut(c.k) ? (
              <button type="button" title={c.ket} onClick={() => onUrut(c.k as KunciKolom)} className={cn('inline-flex items-center gap-1 py-2 hover:text-content-primary', urut?.k === c.k && 'text-content-secondary')}>
                {c.label}{urut?.k === c.k ? urut.arah === 'turun' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : null}
              </button>
            ) : <span className="inline-block py-2">{c.label}</span>}
          </div>
        ))}
        <div />
      </div>
      {baris.map((b) => {
        const nama = b.a?.alias || ''
        const [tone, label] = (b.p ? STATUS_PANTAU[b.p.status] ?? ['muted', b.p.status] : ['muted', 'Not tracked']) as [StatusTone, string]
        const v = versiTeks(b.a)
        return (
          <div key={b.pid} role="row" tabIndex={0} aria-selected={pilih === b.pid} data-disorot={disorot?.has(b.pid) ? 'ya' : undefined} onClick={() => onPilih(b.pid)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onPilih(b.pid) } }} className={cn('group relative grid cursor-default items-center border-b border-line-subtle/70 px-2 py-2 text-sm outline-none transition-[opacity,background-color,box-shadow] duration-500 ease-pegas focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60', pilih === b.pid ? 'bg-surface-3/70' : disorot?.has(b.pid) ? 'bg-accent/[0.09] shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-surface-2/40', disorot && !disorot.has(b.pid) && 'opacity-40')} style={{ gridTemplateColumns: template }}>
            {kilat.current[b.pid] ? <span key={kilat.current[b.pid]} aria-hidden className="pointer-events-none absolute inset-0 animate-kilat" /> : null}
            {kolom.map((c) => {
              switch (c.k) {
                case 'akun':
                  return <span key={c.k} className="min-w-0 px-2" title={`${nama || 'unknown account'} · PID ${b.pid}${b.a?.exe ? ` · ${b.a.exe}` : ''}`}><span className={cn('block truncate font-medium', nama ? 'text-content-primary' : 'italic text-content-muted')} translate="no">{nama || 'unknown account'}</span><span className="tnum block text-xs text-content-muted">PID {b.pid}</span></span>
                case 'status':
                  return <span key={c.k} className="min-w-0 px-2" title={b.p?.alasan || (b.p ? undefined : "Started outside CAM or before CAM was opened: CAM doesn't follow its log.")}><StatusLabel tone={tone}>{label}</StatusLabel></span>
                case 'cpu':
                  return <Batang key={c.k} nilai={b.s.cpu} maks={maksCpu} format={persen} />
                case 'fisik':
                  return <Batang key={c.k} nilai={b.s.fisik_perkiraan_mb} maks={maksRam} format={mb} />
                case 'up':
                  return <span key={c.k} className="tnum px-2 text-right text-content-muted">{lamaJalan(b.s.mulai_unix ? kini - b.s.mulai_unix : null)}</span>
                case 'rejoin':
                  return <span key={c.k} className="tnum px-2 text-right text-content-secondary">{b.p ? b.p.rejoin : '—'}</span>
                case 'gpu':
                  return <span key={c.k} className="tnum px-2 text-right text-content-secondary">{persen(b.s.gpu)}</span>
                case 'privat': case 'bersama': case 'kompresi': case 'commit': case 'luar': case 'vram':
                  return <AngkaHidup key={c.k} nilai={NILAI[c.k](b)} format={mb} className="tnum px-2 text-right text-content-secondary" />
                case 'baca': case 'tulis':
                  return <AngkaHidup key={c.k} nilai={NILAI[c.k](b)} format={laju} className="tnum px-2 text-right text-content-secondary" />
                case 'batas':
                  return <span key={c.k} className="min-w-0 px-2"><StatusKebijakan k={kebijakan[b.pid]} /></span>
                case 'versi':
                  return <span key={c.k} className={cn('min-w-0 truncate px-2 text-xs', v.tone)} title={b.a?.exe || '(path unreadable)'}>{v.teks}</span>
                default:
                  return null
              }
            })}
            <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <button type="button" aria-label={`Close ${nama || `PID ${b.pid}`} (not rejoined)`} title={`Close ${nama || `PID ${b.pid}`} (not rejoined)`} onClick={() => onTutup(b)} className="flex h-7 w-7 items-center justify-center rounded text-content-muted opacity-0 hover:bg-surface-3 hover:text-error focus:opacity-100 group-hover:opacity-100"><X className="h-4 w-4" /></button>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Batang({ nilai, maks, format }: { nilai: number | null | undefined; maks: number; format: (v: number | null | undefined) => string }) {
  return (
    <span className="flex items-center gap-2 px-2">
      <span className="relative h-1.5 w-full min-w-[2rem] overflow-hidden rounded-full bg-surface-3" aria-hidden><span className="absolute inset-y-0 left-0 rounded-full bg-[#3987e5] transition-[width] duration-700 ease-pegas" style={{ width: `${Math.min(100, ((nilai ?? 0) / maks) * 100)}%` }} /></span>
      <AngkaHidup nilai={nilai} format={format} className="tnum w-16 shrink-0 text-right text-content-secondary" />
    </span>
  )
}

function DetailKlien({ b, tren, kini, kebijakan, versi, onTutup, onTutupKlien, onAkun }: { b: Baris; tren?: { cpu: number[]; fisik: number[] }; kini: number; kebijakan?: StatusKlienKebijakan; versi: { teks: string; tone: string }; onTutup: () => void; onTutupKlien: () => void; onAkun: () => void }) {
  const nama = b.a?.alias || 'unknown account'
  const [tone, label] = (b.p ? STATUS_PANTAU[b.p.status] ?? ['muted', b.p.status] : ['muted', 'Not tracked']) as [StatusTone, string]
  const [hwnd, setHwnd] = useState<number | null>(null)
  const akunAda = useCam((s) => s.akun.some((a) => a.id === b.a?.akun_id))
  useEffect(() => {
    let hidup = true
    api.daftarJendela().then((d) => { if (hidup) setHwnd(d.find((w) => w.pid === b.pid)?.hwnd ?? null) }, () => undefined)
    return () => { hidup = false }
  }, [b.pid])
  const s = b.s
  const komposisi = [
    { k: 'Private in RAM', v: s.ram_privat_mb, c: 'bg-[#3987e5]' },
    { k: 'Shared', v: s.ram_bersama_mb, c: 'bg-[#8F8F8F]' },
    { k: 'Not in RAM', v: s.di_luar_ram_mb, c: 'bg-surface-3' },
  ]
  const totalK = komposisi.reduce((n, x) => n + (x.v || 0), 0) || 1
  const Baris2 = ({ l, v, t }: { l: string; v: string; t?: string }) => <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 py-1 text-sm" title={t}><span className="text-content-muted">{l}</span><span className="tnum min-w-0 break-words text-right text-content-primary">{v}</span></div>
  return (
    <>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line-subtle pl-4 pr-2">
        <span className="text-xs font-semibold text-content-secondary">Client details</span>
        <button type="button" onClick={onTutup} aria-label="Close client details" title="Close (Esc)" className="flex h-7 w-7 items-center justify-center rounded text-content-muted hover:bg-surface-2 hover:text-content-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-line-subtle px-4 py-4">
          <h2 className="truncate text-lg font-semibold text-content-primary" translate="no">{nama}</h2>
          <p className="truncate text-sm text-content-muted"><span translate={atributGame(b.p?.game_name)}>{b.p?.game_name || '—'}</span> · PID {b.pid}</p>
          <div className="mt-2" title={b.p?.alasan || undefined}><StatusLabel tone={tone}>{label}</StatusLabel></div>
          {b.p?.alasan ? <p className="mt-1 text-xs text-content-muted">{b.p.alasan}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={hwnd == null} onClick={() => hwnd != null && void api.fokusJendela(hwnd).catch((e) => beriTahu(String(e), 'salah'))}><AppWindow className="h-3.5 w-3.5" />Bring to front</Button>
            <Button size="sm" variant="ghost" onClick={onTutupKlien}><X className="h-3.5 w-3.5" />Close (not rejoined)</Button>
            {akunAda ? <Button size="sm" variant="ghost" onClick={onAkun}>Open account</Button> : null}
          </div>
        </div>
        <div className="space-y-4 border-b border-line-subtle px-4 py-3">
          <div><p className="mb-1 flex justify-between text-xs font-medium text-content-secondary"><span>CPU (of whole PC)</span><span className="tnum text-content-primary">{persen(s.cpu)}</span></p><Tren nilai={tren?.cpu ?? []} nol lantai={5} label="CPU, last 2 minutes" satuan={(v) => `${v.toFixed(1)}%`} waktu={kini * 1000} /></div>
          <div><p className="mb-1 flex justify-between text-xs font-medium text-content-secondary"><span>Physical RAM (est.)</span><span className="tnum text-content-primary">{mb(s.fisik_perkiraan_mb)}</span></p><Tren nilai={tren?.fisik ?? []} lantai={64} label="Physical RAM, last 2 minutes" satuan={(v) => mb(v)} waktu={kini * 1000} /></div>
        </div>
        <div className="border-b border-line-subtle px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold text-content-secondary">Memory</h3>
          <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={komposisi.map((x) => `${x.k} ${mb(x.v)}`).join(', ')}>
            {komposisi.filter((x) => (x.v || 0) > 0).map((x) => <span key={x.k} className={x.c} style={{ width: `${((x.v || 0) / totalK) * 100}%` }} />)}
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {komposisi.map((x) => <div key={x.k}><dt className="flex items-center gap-1.5 text-content-muted"><span className={cn('h-2 w-2 rounded-sm', x.c)} />{x.k}</dt><dd className="tnum mt-0.5 text-content-primary">{mb(x.v)}</dd></div>)}
          </dl>
          <div className="mt-2">
            <Baris2 l="Compressed (est.)" v={mb(s.kompresi_perkiraan_mb)} t="Estimated share of RAM used by Windows' compressed memory for this client." />
            <Baris2 l="Commit" v={mb(s.privat_mb)} t="Memory the client has reserved (private bytes), in RAM or not." />
            <Baris2 l="Working set" v={mb(s.ram_mb)} />
          </div>
        </div>
        <div className="border-b border-line-subtle px-4 py-3">
          <h3 className="mb-1 text-xs font-semibold text-content-secondary">Graphics &amp; I/O</h3>
          <Baris2 l="GPU" v={persen(s.gpu)} t="The client's busiest graphics engine, like Task Manager." />
          <Baris2 l="GPU memory" v={mb(s.vram_mb)} />
          <Baris2 l="Read" v={laju(s.baca_bps)} />
          <Baris2 l="Write" v={laju(s.tulis_bps)} />
        </div>
        <div className="px-4 py-3">
          <h3 className="mb-1 text-xs font-semibold text-content-secondary">Process</h3>
          <Baris2 l="Up for" v={lamaJalan(s.mulai_unix ? kini - s.mulai_unix : null)} />
          <Baris2 l="Rejoins" v={b.p ? String(b.p.rejoin) : '—'} t="Automatic rejoins of this account since CAM was opened." />
          <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 py-1 text-sm"><span className="text-content-muted">Limits</span><span className="flex justify-end"><StatusKebijakan k={kebijakan} />{!kebijakan ? <span className="text-content-muted">—</span> : null}</span></div>
          <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 py-1 text-sm" title={b.a?.exe}><span className="text-content-muted">Version</span><span className={cn('min-w-0 break-all text-right text-xs leading-5', versi.tone)}>{versi.teks}</span></div>
        </div>
      </div>
    </>
  )
}
