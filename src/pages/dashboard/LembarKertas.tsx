import { atributGame } from '@/utils/namaGame'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { samarkan, waktuRelatif } from '@/api/api'
import { useCam } from '@/stores/cam'
import type { Akun, ProteksiView } from '@/api/types'
import { statusAkun } from '@/lib/status-akun'
import { cn } from '@/utils/cn'

export interface GameAkun { place_id: number; nama: string; gambar: string; at: number }

interface Props {
  buka: 'kasus' | 'detail' | null
  akun: Akun | undefined
  games: GameAkun[]
  fokus: number
  autoRefresh: boolean
  proteksi: ProteksiView | null
  onTutup: () => void
}

function tepiSobek() {
  const t = ['100% 0%', '100% 100%']
  let x = 3, s = 7
  const acak = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let y = 100; y >= 0; y -= 1.2) { x = Math.min(7, Math.max(0, x + (acak() - 0.5) * (acak() < 0.15 ? 5 : 1.4))); t.push(`${x.toFixed(2)}% ${y.toFixed(1)}%`) }
  return `polygon(${t.join(',')})`
}

const kapan = (s: number | undefined) => (s ? waktuRelatif(s) ?? '—' : 'Never')

export function LembarKertas({ buka, akun, games, fokus, autoRefresh, proteksi, onTutup }: Props) {
  const klip = useMemo(tepiSobek, [])
  const terakhir = useRef<'kasus' | 'detail'>('detail')
  if (buka) terakhir.current = buka
  const isi = terakhir.current
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => { ref.current?.toggleAttribute('inert', !buka) }, [buka])
  return (
    <aside ref={ref} className={cn('dash-kertas', buka && 'buka')} style={{ clipPath: klip }} aria-hidden={!buka} aria-label={isi === 'detail' ? 'Account details' : 'Games played'}>
      <div className="isi">
        <button type="button" className="tutup" onClick={onTutup} aria-keyshortcuts="Escape"><span>{isi === 'detail' ? 'Close' : 'Back'}</span><kbd aria-hidden>Esc</kbd></button>
        {isi === 'detail' ? <Detail akun={akun} autoRefresh={autoRefresh} proteksi={proteksi} /> : <Games games={games} fokus={fokus} />}
      </div>
    </aside>
  )
}

function Detail({ akun: a, autoRefresh, proteksi }: { akun: Akun | undefined; autoRefresh: boolean; proteksi: ProteksiView | null }) {
  const sembunyi = useCam((x) => x.sembunyikanUsername)
  if (!a) return null
  const st = statusAkun(a)
  const nama = a.username ? (sembunyi ? samarkan(a.username) : a.username) : '—'
  const s = a.server_terakhir
  const lindung = !proteksi ? '—' : !proteksi.setelan ? 'Off' : proteksi.aktif ? 'On · protecting this session' : 'On'
  return (
    <>
      <h2>Account</h2>
      <div className="merah">Details</div>
      <dl>
        <dt>Username</dt><dd translate="no">@{nama}</dd>
        <dt>Display name</dt><dd translate="no">{a.display_name && a.display_name !== a.username ? a.display_name : nama}</dd>
        <dt>User ID</dt><dd className="tnum">{a.user_id || '—'}</dd>
        <dt>Membership</dt><dd>{a.plus ? 'Plus' : a.premium ? 'Premium' : 'None'}</dd>
        <dt>Robux</dt><dd className="tnum">{a.robux.toLocaleString('en-US')}</dd>
      </dl>
      <div className="bagian">Activity</div>
      <dl>
        <dt>Last launched</dt><dd>{kapan(a.last_launched)}</dd>
        <dt>Last server</dt>
        <dd>{s?.game_name ? <><span translate={atributGame(s.game_name)}>{s.game_name}</span><span className="redup">{s.pribadi ? 'Private server' : 'Public server'} · {kapan(s.at)}</span></> : 'None yet'}</dd>
      </dl>
      <div className="bagian">Sign-in &amp; security</div>
      <dl>
        <dt>Sign-in</dt><dd className={st.jenis === 'ok' ? 'ok' : st.jenis === 'idle' ? undefined : 'buruk'}>{st.teks}</dd>
        <dt>Restrictions</dt><dd className={a.pembatasan ? 'buruk' : undefined}>{a.pembatasan ? a.pembatasan.label : 'None'}</dd>
        <dt>Cookie refreshed</dt><dd>{kapan(a.last_refreshed)}</dd>
        <dt>Cookie auto-refresh</dt><dd>{autoRefresh ? 'On' : 'Off'}</dd>
        <dt>2-step verification</dt><dd>{a.dua_langkah == null ? 'Unknown' : a.dua_langkah.length ? a.dua_langkah.join(', ') : 'Off'}</dd>
        <dt>Email verified</dt><dd>{a.email_ok == null ? 'Unknown' : a.email_ok ? 'Yes' : 'No'}</dd>
        <dt>Main account</dt><dd>{a.utama ? 'Yes' : 'No'}</dd>
        <dt>Sign-in protection</dt><dd>{lindung}</dd>
      </dl>
    </>
  )
}

function Games({ games, fokus }: { games: GameAkun[]; fokus: number }) {
  if (!games.length) return (<><h2>Games</h2><div className="merah">No games yet</div><p className="redup">Games this account joins through CAM appear here.</p></>)
  const k = Math.min(Math.max(0, fokus), games.length - 1), g = games[k]
  return (
    <>
      <h2>Games</h2>
      <div className="merah">Played by this account</div>
      <div className="indeks tnum">[ {String(k + 1).padStart(2, '0')} / {String(games.length).padStart(2, '0')} ]</div>
      <div className="judul-game" translate="no">{g.nama}</div>
      <div className="tags"><span>{k === 0 ? 'Last played' : 'Played before'}</span><span>{kapan(g.at)}</span></div>
      <div className="navi">Scroll, drag or ← → to turn the ring · Esc returns · scroll outside the stage to move the page</div>
    </>
  )
}
