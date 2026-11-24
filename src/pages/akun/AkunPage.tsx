import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, ChevronDown, FolderOpen, FolderPlus, Gamepad2, KeyRound, LayoutGrid, Loader2, PanelLeftOpen, Play, RefreshCw, Rows3, Search, Trash2, UserPlus, Users, Wrench } from '@/components/ikon'
import type { Akun } from '@/api/types'
import type { AccountSortKey } from '@/types'
import { IkonFolder, folderAkun } from '@/lib/folder'
import { statusAkun } from '@/lib/status-akun'
import { cocokCari, cocokStatus } from '@/lib/saring-akun'
import { bukaDialog, cobaMuatLagi, folderAksi, hapusAkun, hapusTerpilih, perbaruiSemuaCookie, segarkanSemua, setDipilih, setFokus, toggleAutoRefresh, useCam } from '@/stores/cam'
import { luncurTerpilih } from '@/logic/luncur'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore, type FilterStatus } from '@/stores/uiStore'
import { clamp, cn } from '@/utils/cn'
import { ACCOUNT_COLUMNS } from '@/components/account/accountColumns'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/Controls'
import { SearchInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/Feedback'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { TombolSidebar } from '@/components/shell/JudulHalaman'
import { useLebarKonten } from '@/components/shell/navigasi'
import { skalaRem } from '@/hooks/useLebar'
import { TabelAkun, UbinAkun, type KolomTampil } from './DaftarAkun'
import { LEBAR_STRIP, PanelKanan, bukaPanel, tutupLaci, usePanel } from './PanelKanan'
import { MenuKonteks, konteksDari, type Konteks } from './MenuKonteks'

const MIN_DAFTAR = 640
const MIN_PANEL = 280

export function AkunPage() {
  const akun = useCam((s) => s.akun)
  const folder = useCam((s) => s.folder)
  const statusMuat = useCam((s) => s.statusMuat)
  const galatMuat = useCam((s) => s.galatMuat)
  const filter = useCam((s) => s.filterFolder)
  const dipilih = useCam((s) => s.dipilih)
  const fokusId = useCam((s) => s.fokusId)
  const pidAkun = useCam((s) => s.pidAkun)
  const klienAsing = useCam((s) => s.klienAsing)
  const antrean = useCam((s) => s.antrean)
  const statusLuncur = useCam((s) => s.statusLuncur)
  const sedangSegarkan = useCam((s) => s.sedangSegarkan)
  const autoRefresh = useCam((s) => s.autoRefresh)

  const view = useSettingsStore((s) => s.accountView)
  const sort = useSettingsStore((s) => s.accountSort)
  const visibleColumns = useSettingsStore((s) => s.visibleColumns)
  const padat = useSettingsStore((s) => s.accountDensity) === 'compact'
  const updateSettings = useSettingsStore((s) => s.update)
  const panelLebar = useUIStore((s) => s.accountDetailWidth)
  const setPanelLebar = useUIStore((s) => s.setAccountDetailWidth)
  const panelTutup = useUIStore((s) => s.panelAkunTutup)
  const status = useUIStore((s) => s.filterStatus)
  const setStatus = useUIStore((s) => s.setFilterStatus)
  const cari = useUIStore((s) => s.cariAkun)
  const setCari = useUIStore((s) => s.setCariAkun)
  const sidebarLipat = useUIStore((s) => s.sidebarCollapsed)

  const [params, setParams] = useSearchParams()
  const sedangLuncur = !!statusLuncur || !!antrean

  const k = skalaRem()
  const konten = useLebarKonten()
  const muat = konten - Math.max(panelLebar, MIN_PANEL * k) >= MIN_DAFTAR * k
  const lebarPanel = Math.round(clamp(muat ? Math.min(panelLebar, konten - MIN_DAFTAR * k) : panelLebar, MIN_PANEL * k, 480))
  const lebarDaftar = konten - (muat ? (panelTutup ? LEBAR_STRIP : lebarPanel) : 0)
  const ringkas = konten < 1100 * k

  const fokusTautan = useRef<string | null>(null)
  useEffect(() => {
    const id = params.get('account')
    const f = params.get('folder')
    if (!id && !f) return
    if (id) {
      fokusTautan.current = id
      setFokus(id)
    }
    if (f === '__attention') setStatus('perhatian')
    else if (f === '__running') setStatus('jalan')
    else if (f) useCam.setState({ filterFolder: f })
    const next = new URLSearchParams(params)
    next.delete('account')
    next.delete('folder')
    setParams(next, { replace: true })
  }, [params, setParams, setStatus])

  const filterSah = filter === 'semua' || filter === 'tanpa' || folder.some((f) => f.id === filter) ? filter : 'semua'
  const dasar = useMemo(
    () =>
      akun.filter((a) => {
        if (!cocokCari(a, cari, folder)) return false
        if (filterSah === 'semua') return true
        const f = folderAkun(a, folder)
        return filterSah === 'tanpa' ? f === null : f === filterSah
      }),
    [akun, cari, folder, filterSah],
  )
  const hitung = (f: FilterStatus) => dasar.filter((a) => cocokStatus(a, f, pidAkun)).length

  const daftar = useMemo(() => {
    const cocok = dasar.filter((a) => cocokStatus(a, status, pidAkun))
    if (sort.key === 'custom') return cocok
    const urutan = { bad: 0, warn: 1, idle: 2, ok: 3 } as Record<string, number>
    const nilai = (a: Akun): string | number => {
      switch (sort.key) {
        case 'status': return urutan[statusAkun(a).jenis] ?? 9
        case 'client': return pidAkun[a.id]?.length ? 0 : 1
        case 'lastLaunched': return a.last_launched || 0
        case 'fps': return a.hemat ? a.hemat_fps || 10 : a.fps_cap || 9999
        case 'folder': return folder.find((f) => f.id === folderAkun(a, folder))?.nama.toLowerCase() ?? '~'
        default: return a.alias.toLowerCase()
      }
    }
    const d = sort.direction === 'asc' ? 1 : -1
    return [...cocok].sort((x, y) => (nilai(x) > nilai(y) ? d : nilai(x) < nilai(y) ? -d : 0))
  }, [dasar, status, pidAkun, folder, sort])

  const fokus = daftar.find((a) => a.id === fokusId)
  const [menu, setMenu] = useState<Konteks | null>(null)
  useEffect(() => {
    if (!fokusId) return
    if (daftar.some((a) => a.id === fokusId)) {
      if (fokusTautan.current === fokusId) fokusTautan.current = null
      return
    }
    if (!akun.some((a) => a.id === fokusId)) return 
    if (fokusTautan.current === fokusId) {
      fokusTautan.current = null
      setCari('')
      setStatus('semua')
      useCam.setState({ filterFolder: 'semua' })
      return
    }
    setFokus(null)
  }, [fokusId, daftar, akun, setCari, setStatus])
  const bisaLuncur = (dipilih.length > 0 || !!fokus) && !sedangLuncur

  const bisaDipilih = daftar.filter((a) => !a.utama)
  const semua = bisaDipilih.length > 0 && bisaDipilih.every((a) => dipilih.includes(a.id))
  const sebagian = daftar.some((a) => dipilih.includes(a.id)) && !semua
  const pilihSemua = () => {
    const ids = new Set(dipilih)
    for (const a of bisaDipilih) if (semua) ids.delete(a.id); else ids.add(a.id)
    setDipilih([...ids])
  }

  const kolom: KolomTampil[] = ACCOUNT_COLUMNS.filter((c) => (c.locked || visibleColumns.includes(c.key)) && lebarDaftar >= c.showFrom * k)
  const urutkan = (key: AccountSortKey) =>
    updateSettings({ accountSort: sort.key !== key ? { key, direction: 'asc' } : sort.direction === 'asc' ? { key, direction: 'desc' } : { key: 'custom', direction: 'asc' } })

  const namaFolder = filterSah === 'tanpa' ? 'Ungrouped' : filterSah === 'semua' ? null : folder.find((f) => f.id === filterSah)?.nama
  const namaStatus: Record<FilterStatus, string> = { semua: 'All accounts', jalan: 'Running', sehat: 'Healthy', perhatian: 'Needs attention', belum: 'Not checked' }
  const tab: { id: FilterStatus; titik?: string; title?: string }[] = [
    { id: 'semua' },
    { id: 'jalan', titik: 'bg-success' },
    { id: 'sehat', titik: 'bg-info' },
    { id: 'perhatian', titik: 'bg-error', title: 'Banned, locked, restricted or signed out' },
    { id: 'belum', titik: 'bg-content-muted', title: 'Never refreshed: sign-in and restrictions unknown' },
  ]
  const kiniTab = tab.find((t) => t.id === status) ?? tab[0]
  const kosongJudul = status !== 'semua' ? `No account is ${namaStatus[status].toLowerCase()}` : `${namaFolder ?? 'This view'} is empty`
  const kosongIsi =
    status === 'jalan' ? 'No Roblox client is running. Tick accounts and press Launch.'
      : status === 'perhatian' ? 'No account is banned, locked, restricted or signed out.'
        : status === 'sehat' ? 'Refresh accounts to check their sign-in and restrictions.'
          : status === 'belum' ? 'Every account here has been checked.'
            : "Drag accounts onto this folder, or use Move to folder in an account's menu."

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line-subtle px-4 py-2.5">
        <Button
          data-luncur-utama
          size="md"
          variant="primary"
          onClick={() => void luncurTerpilih()}
          disabled={!bisaLuncur}
          title={sedangLuncur ? undefined : dipilih.length ? 'Launch the ticked accounts (Ctrl+Enter)' : fokus ? 'Launch the selected account (Ctrl+Enter). Tick accounts to launch several together.' : 'Click an account, or tick several, to launch'}
          aria-label={!sedangLuncur && dipilih.length > 1 ? `Launch ${dipilih.length} accounts` : undefined}
        >
          {sedangLuncur ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {sedangLuncur ? 'Launching…' : 'Launch'}
          {!sedangLuncur && dipilih.length > 1 ? <span className="-mr-1 rounded bg-black/10 px-1.5 text-xs tabular-nums" aria-hidden>{dipilih.length}</span> : null}
        </Button>
        <ChipTarget laci={!muat} />
        <Button size="md" variant="ghost" className={cn(ringkas && 'px-2')} aria-label={ringkas ? 'Account tools' : undefined} disabled={!dipilih.length} onClick={() => bukaDialog({ jenis: 'alat' })} title={dipilih.length ? 'Bulk tools for the ticked accounts' : 'Select accounts first'}><Wrench className="h-4 w-4" />{ringkas ? null : 'Account tools'}</Button>
        <SearchInput value={cari} onValueChange={setCari} placeholder="Filter accounts (alias, username, notes, folder…)" className="min-w-[10rem] max-w-[28rem] flex-1" aria-label="Filter accounts" data-cari-akun="" />
        {sidebarLipat ? <PilihFolder /> : null}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button size="md" variant="ghost" className={cn(ringkas && 'px-2')} aria-label={ringkas ? 'Refresh' : undefined} onClick={() => void segarkanSemua()} disabled={sedangSegarkan || !akun.length} title="Check every account's sign-in and restrictions, one at a time">
            <RefreshCw className={cn('h-4 w-4', sedangSegarkan && 'animate-spin')} />{ringkas ? null : 'Refresh'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="md" variant="ghost" className={cn(ringkas && 'px-2')} aria-label={ringkas ? 'Cookies' : undefined} title="Cookie refresh">
                <KeyRound className="h-4 w-4" />{ringkas ? null : 'Cookies'}
                {autoRefresh ? <span className="h-1.5 w-1.5 rounded-full bg-info" aria-label="Auto-refresh on" /> : null}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[19rem]">
              <DropdownMenuItem icon={<RefreshCw className="h-3.5 w-3.5" />} disabled={!akun.length} onSelect={() => void perbaruiSemuaCookie()}>Refresh all cookies now</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={autoRefresh} onCheckedChange={() => void toggleAutoRefresh()}>Auto-refresh idle cookies on startup</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-11 shrink-0 items-stretch border-b border-line-subtle pl-2 pr-3">
        {sidebarLipat ? (
          <div className="mr-2 flex h-11 shrink-0 items-center gap-1.5">
            <TombolSidebar />
            <h1 className="whitespace-nowrap text-md font-semibold tracking-[-0.01em] text-content-primary">Accounts</h1>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" data-filter-status aria-label={`Account status: ${namaStatus[status]}`} className="dd-tombol max-w-full">
                {kiniTab.titik ? <span className={cn('size-2 shrink-0 rounded-full', kiniTab.titik)} aria-hidden /> : null}
                <span className="min-w-0 truncate">{namaStatus[status]}</span>
                <span className="shrink-0 tabular-nums text-content-muted">{hitung(status)}</span>
                <ChevronDown className="dd-chev h-3.5 w-3.5 shrink-0 text-content-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[17rem]">
              <DropdownMenuLabel>Account status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
                {tab.map((t) => (
                  <DropdownMenuRadioItem key={t.id} value={t.id} title={t.title}>
                    <span className="flex w-full items-center gap-2">
                      <span className={cn('size-2 shrink-0 rounded-full', t.titik ?? 'bg-transparent')} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{namaStatus[t.id]}</span>
                      <span className="dd-tag tabular-nums">{hitung(t.id)}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" data-hapus-terpilih className={cn(ringkas && 'px-2', dipilih.length && !sedangLuncur && 'text-error hover:text-error')} aria-label={ringkas ? 'Delete ticked accounts' : undefined} disabled={!dipilih.length || sedangLuncur} onClick={hapusTerpilih} title={sedangLuncur ? 'Wait for the launch to finish' : dipilih.length ? `Delete the ${dipilih.length === 1 ? 'ticked account' : `${dipilih.length} ticked accounts`} (asks first)` : 'Tick accounts to delete them'}><Trash2 className="h-4 w-4" />{ringkas ? null : 'Delete'}</Button>
            <Button size="sm" variant="secondary" onClick={() => bukaDialog({ jenis: 'tambah' })} title="Add account (Ctrl+N)"><UserPlus className="h-4 w-4" />{ringkas ? 'Add' : 'Add account'}</Button>
          </div>
        </div>
        <div className="flex h-11 shrink-0 items-center pl-2">
          <SegmentedControl
            ariaLabel="Account layout"
            size="sm"
            value={view}
            onValueChange={(v) => updateSettings({ accountView: v })}
            options={[
              { value: 'table', label: <Rows3 className="h-4 w-4" aria-hidden />, title: 'Table' },
              { value: 'tiles', label: <LayoutGrid className="h-4 w-4" aria-hidden />, title: 'Tiles' },
            ]}
          />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          aria-label="Account list"
          onContextMenu={(e) => {
            const k = konteksDari(e.target, e.currentTarget, e.clientX, e.clientY, dipilih)
            if (!k) return
            e.preventDefault()
            setMenu(k)
          }}
          onKeyDown={(e) => {
            const el = e.target as HTMLElement
            if (el.closest('input, textarea, [contenteditable="true"], [role="menu"]')) return
            if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
              const r = el.closest('[data-id]')?.getBoundingClientRect()
              const k = r ? konteksDari(el, e.currentTarget, r.left + 24, r.bottom, dipilih) : null
              if (k) { e.preventDefault(); setMenu(k) }
              return
            }
            if (e.key === 'Delete' && !sedangLuncur && el.matches('[data-id]')) {
              const baris = akun.find((x) => x.id === el.closest<HTMLElement>('[data-id]')?.dataset.id)
              if (dipilih.length) { e.preventDefault(); hapusTerpilih() }
              else if (baris) { e.preventDefault(); hapusAkun(baris) }
            }
          }}
        >
          {menu ? <MenuKonteks k={menu} folder={folder} onTutup={() => setMenu(null)} onPilihSemua={pilihSemua} semuaDipilih={semua} /> : null}
          {klienAsing > 0 ? (
            <div role="status" className="flex shrink-0 items-start gap-2 border-b border-warning/25 bg-warning/[0.07] px-4 py-1.5 text-sm text-content-secondary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>{klienAsing === 1 ? "1 Roblox client is running but can't be matched to any account — usually because it was opened outside this app." : `${klienAsing} Roblox clients are running but can't be matched to any account — usually because they were opened outside this app.`}</span>
            </div>
          ) : null}

          <div key={`${filterSah}|${status}|${view}`} className="flex min-h-0 flex-1 animate-fade-up flex-col">
            {statusMuat === 'memuat' && !akun.length ? (
              <EmptyState icon={Loader2} title="Loading accounts…" description="Reading saved accounts from disk." />
            ) : statusMuat === 'galat' && !akun.length ? (
              <EmptyState icon={AlertTriangle} title="Couldn’t load accounts" description={galatMuat} action={<Button size="sm" variant="secondary" onClick={cobaMuatLagi}>Retry</Button>} />
            ) : !akun.length ? (
              <EmptyState icon={UserPlus} title="No accounts yet" description="Add an account by pasting its .ROBLOSECURITY cookie. It is checked against Roblox before it is saved." action={<Button size="sm" variant="primary" onClick={() => bukaDialog({ jenis: 'tambah' })}><UserPlus className="h-3.5 w-3.5" />Add account</Button>} />
            ) : !daftar.length ? (
              cari.trim() ? (
                <EmptyState icon={Search} title={`No account matches "${cari.trim()}"`} description="The filter checks alias, username, display name, user ID, notes and folder name. Clear it to see every account." action={<Button size="sm" variant="secondary" onClick={() => setCari('')}>Clear filter</Button>} />
              ) : (
                <EmptyState
                  icon={Check}
                  title={kosongJudul}
                  description={kosongIsi}
                  action={<Button size="sm" variant="secondary" onClick={() => { setStatus('semua'); useCam.setState({ filterFolder: 'semua' }) }}>Show all accounts</Button>}
                />
              )
            ) : view === 'table' ? (
              <TabelAkun akun={daftar} kolom={kolom} sort={sort} onSort={urutkan} semua={semua} sebagian={sebagian} onSemua={pilihSemua} padat={padat} folder={folder} dipilih={dipilih} fokusId={fokusId} pidAkun={pidAkun} sedangLuncur={sedangLuncur} bisaSeret={sort.key === 'custom'} />
            ) : (
              <UbinAkun akun={daftar} folder={folder} dipilih={dipilih} fokusId={fokusId} pidAkun={pidAkun} sedangLuncur={sedangLuncur} bisaSeret={false} />
            )}
          </div>

          <div className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-line-subtle px-3 text-xs text-content-muted">
            <span>{daftar.length === akun.length ? `${akun.length} accounts` : `${daftar.length} of ${akun.length} shown`}{sort.key !== 'custom' ? ' · sorted (drag to reorder is off)' : ''}</span>
            {dipilih.length ? (
              <button type="button" onClick={() => setDipilih([])} className="hover:text-content-primary">Clear selection ({dipilih.length})</button>
            ) : fokus ? (
              <span className="min-w-0 truncate"><span translate="no" className="text-content-secondary">{fokus.alias}</span> selected · Ctrl+Enter launches it</span>
            ) : akun.length ? (
              <span>Tick accounts to launch them together.</span>
            ) : null}
          </div>
        </section>

        {muat && !panelTutup ? (
          <ResizeHandle orientation="vertical" label="Resize side panel" invert valueNow={panelLebar} min={MIN_PANEL} max={480} onDelta={(d) => setPanelLebar(clamp(useUIStore.getState().accountDetailWidth + d, MIN_PANEL, 480))} onReset={() => setPanelLebar(320)} className="mx-0 w-[5px]" />
        ) : null}
        <PanelKanan muat={muat} lebar={lebarPanel} />
      </div>
    </div>
  )
}

function ChipTarget({ laci }: { laci: boolean }) {
  const param = useCam((s) => s.param)
  const terbuka = usePanel((s) => laci && s.buka && s.tab === 'luncur')
  const ikuti = param.ikuti.trim()
  const [ikonGagal, setIkonGagal] = useState(false)
  const server = ikuti ? null : param.linkCode.trim() ? 'private server' : param.jobId.trim() ? 'one server' : 'any server'
  const nama = ikuti ? `Following ${ikuti}` : param.placeId ? param.gameName || `Place ${param.placeId}` : 'Choose a game'
  useEffect(() => setIkonGagal(false), [param.gameIcon])
  return (
    <button
      type="button"
      data-target-luncur
      onClick={() => (terbuka ? tutupLaci() : bukaPanel('luncur'))}
      aria-expanded={laci ? terbuka : undefined}
      title={`${nama}${server ? ` · ${server}` : ''} — change it in the Launch panel`}
      className="flex h-8 min-w-0 max-w-[12rem] shrink items-center gap-2 rounded-md border border-line pl-1 pr-2.5 text-sm text-content-secondary transition-[color,border-color,transform] duration-150 hover:border-line-strong hover:text-content-primary active:scale-[0.97]"
    >
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-3 text-content-muted">
        {ikuti ? <Users className="h-3.5 w-3.5" /> : param.gameIcon && !ikonGagal ? <img src={param.gameIcon} alt="" className="size-6 object-cover" onError={() => setIkonGagal(true)} /> : <Gamepad2 className="h-3.5 w-3.5" />}
      </span>
      <span className={cn('min-w-0 truncate', !param.placeId && !ikuti && 'text-content-muted')} translate={param.placeId && param.gameName ? 'no' : undefined}>{nama}</span>
      {server ? <span className="hidden shrink-0 text-xs text-content-muted min-[1100px]:inline">· {server}</span> : null}
    </button>
  )
}

function PilihFolder() {
  const akun = useCam((s) => s.akun)
  const folder = useCam((s) => s.folder)
  const filter = useCam((s) => s.filterFolder)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const sah = filter === 'semua' || filter === 'tanpa' || folder.some((f) => f.id === filter) ? filter : 'semua'
  const tanpa = akun.filter((a) => folderAkun(a, folder) === null).length
  const aktif = sah === 'semua' ? null : sah === 'tanpa' ? 'Ungrouped' : folder.find((f) => f.id === sah)?.nama
  const pilih = (v: string) => useCam.setState({ filterFolder: v })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" data-pilih-folder title={aktif ? `Showing: ${aktif}` : 'Show one folder'} className="dd-tombol max-w-[12rem]">
          <IkonFolder f={folder.find((f) => f.id === sah) ?? null} size={16} />
          <span className="min-w-0 truncate" translate={aktif && sah !== 'tanpa' ? 'no' : undefined}>{aktif ?? 'All folders'}</span>
          <ChevronDown className="dd-chev h-3.5 w-3.5 text-content-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[16rem]">
        <DropdownMenuItem icon={<FolderOpen className="h-3.5 w-3.5" />} onSelect={() => pilih('semua')} shortcut={String(akun.length)}>All accounts</DropdownMenuItem>
        {folder.map((f) => (
          <DropdownMenuItem key={f.id} icon={<IkonFolder f={f} size={14} />} onSelect={() => pilih(f.id)} shortcut={String(akun.filter((a) => folderAkun(a, folder) === f.id).length)}>
            <span translate="no">{f.nama}</span>
          </DropdownMenuItem>
        ))}
        {tanpa ? <DropdownMenuItem icon={<IkonFolder f={null} size={14} />} onSelect={() => pilih('tanpa')} shortcut={String(tanpa)}>Ungrouped</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<FolderPlus className="h-3.5 w-3.5" />} onSelect={folderAksi.baru}>New folder…</DropdownMenuItem>
        <DropdownMenuItem icon={<PanelLeftOpen className="h-3.5 w-3.5" />} onSelect={toggleSidebar} shortcut="Ctrl B">Manage folders</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
