import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronDown, FolderOpen, FolderPlus, KeyRound, Loader2, PanelLeftOpen, RefreshCw, Search, UserPlus } from '@/components/ikon'
import type { Akun } from '@/api/types'
import type { AccountSortKey } from '@/types'
import { IkonFolder, folderAkun } from '@/lib/folder'
import { statusAkun } from '@/lib/status-akun'
import { cocokCari, cocokStatus } from '@/lib/saring-akun'
import { bukaDialog, cobaMuatLagi, folderAksi, hapusAkun, hapusTerpilih, perbaruiSemuaCookie, segarkanSemua, setDipilih, setFokus, toggleAutoRefresh, useCam } from '@/stores/cam'
import { setPilihKlik, usePilihKlik } from '@/stores/rencanaLuncur'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { ACCOUNT_COLUMNS } from '@/components/account/accountColumns'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/Feedback'
import { Tooltip } from '@/components/ui/Tooltip'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { TombolSidebar } from '@/components/shell/JudulHalaman'
import { useLebarKonten } from '@/components/shell/navigasi'
import { skalaRem } from '@/hooks/useLebar'
import { TabelAkun, type KolomTampil } from './DaftarAkun'
import { KartuDetail } from './TabAkun'
import { MenuKonteks, konteksDari, type Konteks } from './MenuKonteks'
import { BilahPilihan, lepasPilihanHalus, type Pilihan } from './BilahPilihan'
import { DialogLuncur } from './DialogLuncur'

const PAD = 16
const CELAH = 12

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
  const pilihKlik = usePilihKlik((s) => s.aktif)

  const sort = useSettingsStore((s) => s.accountSort)
  const visibleColumns = useSettingsStore((s) => s.visibleColumns)
  const padat = useSettingsStore((s) => s.accountDensity) === 'compact'
  const updateSettings = useSettingsStore((s) => s.update)
  const cari = useUIStore((s) => s.cariAkun)
  const setCari = useUIStore((s) => s.setCariAkun)
  const sidebarLipat = useUIStore((s) => s.sidebarCollapsed)

  const [params, setParams] = useSearchParams()
  const sedangLuncur = !!statusLuncur || !!antrean
  const kartu = useRef<HTMLElement>(null)

  const k = skalaRem()
  const dalam = useLebarKonten() - 2 * PAD * k
  const lebarDetail = Math.round((dalam >= 1500 * k ? 380 : dalam >= 1000 * k ? 340 : 300) * k)
  const lebarDaftar = dalam - lebarDetail - CELAH * k
  const ringkas = useLebarKonten() < 760 * k

  const fokusTautan = useRef<string | null>(null)
  useEffect(() => {
    const id = params.get('account')
    const f = params.get('folder')
    if (!id && !f) return
    if (id) {
      fokusTautan.current = id
      setFokus(id)
    }
    if (f === '__attention' || f === '__running') {
      const { akun: semua, pidAkun: pid } = useCam.getState()
      setCari('')
      useCam.setState({ filterFolder: 'semua' })
      setDipilih(semua.filter((a) => cocokStatus(a, f === '__running' ? 'jalan' : 'perhatian', pid)).map((a) => a.id))
    } else if (f) useCam.setState({ filterFolder: f })
    const next = new URLSearchParams(params)
    next.delete('account')
    next.delete('folder')
    setParams(next, { replace: true })
  }, [params, setParams, setCari])

  const filterSah = filter === 'semua' || filter === 'tanpa' || folder.some((f) => f.id === filter) ? filter : 'semua'
  const diFolder = useMemo(
    () =>
      akun.filter((a) => {
        if (filterSah === 'semua') return true
        const f = folderAkun(a, folder)
        return filterSah === 'tanpa' ? f === null : f === filterSah
      }),
    [akun, folder, filterSah],
  )

  const daftar = useMemo(() => {
    const cocok = diFolder.filter((a) => cocokCari(a, cari, folder))
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
  }, [diFolder, cari, pidAkun, folder, sort])

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
      useCam.setState({ filterFolder: 'semua' })
      return
    }
    setFokus(null)
    setPilihKlik(false)
  }, [fokusId, daftar, akun, setCari])
  const fokus = daftar.find((a) => a.id === fokusId) ?? null
  const kartuAkun = fokus ?? daftar[0] ?? null

  const sel: Pilihan | null = dipilih.length ? { ids: dipilih, n: dipilih.length, label: null } : pilihKlik && fokus ? { ids: [fokus.id], n: 1, label: fokus.alias } : null
  const bersih = useCallback(() => {
    setDipilih([])
    setPilihKlik(false)
  }, [])

  useEffect(() => {
    const kunci = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const aktif = document.activeElement as HTMLElement | null
      if (aktif?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')) return
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]')) return
      const { dipilih: d } = useCam.getState()
      if (!d.length && !usePilihKlik.getState().aktif) return
      lepasPilihanHalus(document.querySelector<HTMLElement>('[data-bersih-pilihan]'))
    }
    window.addEventListener('keydown', kunci)
    return () => window.removeEventListener('keydown', kunci)
  }, [])

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
  const nJalan = diFolder.filter((a) => pidAkun[a.id]?.length).length
  const nPerhatian = diFolder.filter((a) => cocokStatus(a, 'perhatian', pidAkun)).length
  const jumlah = cari.trim() ? `${daftar.length} of ${diFolder.length} accounts` : `${diFolder.length} account${diFolder.length === 1 ? '' : 's'}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-w-0 shrink-0 items-center gap-2 px-4 pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          {sidebarLipat ? <TombolSidebar className="-ml-1.5" /> : null}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-6 tracking-[-0.015em] text-content-primary">Accounts</h1>
            <p className="truncate text-xs leading-4 text-content-muted" data-ringkasan-akun>
              {namaFolder ? <><span translate={filterSah !== 'tanpa' ? 'no' : undefined}>{namaFolder}</span><span> · </span></> : null}
              <span>{jumlah}</span>
              {nJalan ? <span>{` · ${nJalan} running`}</span> : null}
              {nPerhatian ? <span className="text-warning">{` · ${nPerhatian} need${nPerhatian === 1 ? 's' : ''} attention`}</span> : null}
            </p>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <SearchInput value={cari} onValueChange={setCari} shortcut="Ctrl F" placeholder="Filter accounts" title="Alias, username, display name, user ID, notes or folder" className="w-[15rem]" aria-label="Filter accounts" data-cari-akun="" />
          {sidebarLipat ? <PilihFolder /> : null}
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
          <div className="inline-flex h-8 items-center rounded-md border border-line">
            <Tooltip content="Check every account's sign-in and restrictions, one at a time">
              <button type="button" data-segarkan-semua onClick={() => void segarkanSemua()} disabled={sedangSegarkan || !akun.length} aria-label={ringkas ? 'Refresh' : undefined} className="inline-flex h-[30px] items-center gap-1.5 rounded-l-[5px] px-3 text-sm font-medium text-content-secondary transition-[background-color,color,transform] duration-150 enabled:hover:bg-surface-2 enabled:hover:text-content-primary enabled:active:scale-[0.97] disabled:opacity-45">
                <RefreshCw className={cn('h-3.5 w-3.5', sedangSegarkan && 'animate-spin')} />{ringkas ? null : 'Refresh'}
              </button>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Cookie refresh options" title="Cookie refresh" data-menu-cookie className="inline-flex h-[30px] w-[26px] items-center justify-center rounded-r-[5px] border-l border-line text-content-secondary transition-colors hover:bg-surface-2 hover:text-content-primary">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[19rem]">
                <DropdownMenuItem icon={<RefreshCw className="h-3.5 w-3.5" />} disabled={sedangSegarkan || !akun.length} onSelect={() => void segarkanSemua()}>Refresh all accounts</DropdownMenuItem>
                <DropdownMenuItem icon={<KeyRound className="h-3.5 w-3.5" />} disabled={!akun.length} onSelect={() => void perbaruiSemuaCookie()}>Refresh all cookies now</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={autoRefresh} onCheckedChange={() => void toggleAutoRefresh()}>Auto-refresh idle cookies on startup</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="md" variant="secondary" className={cn(ringkas && 'px-2')} aria-label={ringkas ? 'Add account' : undefined} onClick={() => bukaDialog({ jenis: 'tambah' })} title="Add account (Ctrl+N)">
            <UserPlus className="h-4 w-4" />{ringkas ? null : 'Add account'}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 px-4 pb-3.5 pt-3">
        <section
          ref={kartu}
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-line-subtle bg-surface-1"
          aria-label="Account list"
          onContextMenu={(e) => {
            const kk = konteksDari(e.target, e.currentTarget, e.clientX, e.clientY, dipilih)
            if (!kk) return
            e.preventDefault()
            setFokus(kk.asal)
            setMenu(kk)
          }}
          onKeyDown={(e) => {
            const el = e.target as HTMLElement
            if (el.closest('input, textarea, [contenteditable="true"], [role="menu"]')) return
            if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
              const r = el.closest('[data-id]')?.getBoundingClientRect()
              const kk = r ? konteksDari(el, e.currentTarget, r.left + 24, r.bottom, dipilih) : null
              if (kk) { e.preventDefault(); setMenu(kk) }
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

          <div key={filterSah} className="flex min-h-0 flex-1 animate-fade-up flex-col">
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
                  icon={FolderOpen}
                  title={`${namaFolder ?? 'This view'} is empty`}
                  description="Drag accounts onto this folder, or use Move to folder in an account's menu."
                  action={<Button size="sm" variant="secondary" onClick={() => useCam.setState({ filterFolder: 'semua' })}>Show all accounts</Button>}
                />
              )
            ) : (
              <TabelAkun akun={daftar} kolom={kolom} sort={sort} onSort={urutkan} semua={semua} sebagian={sebagian} onSemua={pilihSemua} padat={padat} folder={folder} dipilih={dipilih} fokusId={fokusId} pidAkun={pidAkun} sedangLuncur={sedangLuncur} bisaSeret={sort.key === 'custom'} onKosong={() => { if (usePilihKlik.getState().aktif && !useCam.getState().dipilih.length) lepasPilihanHalus() }} />
            )}
          </div>

          <BilahPilihan sel={sel} kartu={kartu} folder={folder} onBersih={bersih} />
        </section>

        <aside aria-label="Account details" style={{ width: lebarDetail }} className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[10px] border border-line-subtle bg-surface-1">
          <KartuDetail a={kartuAkun} />
        </aside>
      </div>

      <DialogLuncur />
    </div>
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
  const jumlah = sah === 'semua' ? akun.length : akun.filter((a) => folderAkun(a, folder) === (sah === 'tanpa' ? null : sah)).length
  const pilih = (v: string) => useCam.setState({ filterFolder: v })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" data-pilih-folder title={aktif ? `Showing: ${aktif}` : 'Show one folder'} className="dd-tombol max-w-[12rem] !rounded-md">
          <IkonFolder f={folder.find((f) => f.id === sah) ?? null} size={16} />
          <span className="min-w-0 truncate" translate={aktif && sah !== 'tanpa' ? 'no' : undefined}>{aktif ?? 'All accounts'}</span>
          <span className="shrink-0 tabular-nums text-content-muted">{jumlah}</span>
          <ChevronDown className="dd-chev h-3.5 w-3.5 text-content-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[16rem]">
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
