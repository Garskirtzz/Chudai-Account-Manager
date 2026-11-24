import { useEffect, useState } from 'react'
import { Loader2, Power, Trash2, X } from '@/components/ikon'
import { api } from '@/api/api'
import type { InfoLog } from '@/api/types'
import { beriTahu } from '@/stores/cam'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Controls'
import { Select } from '@/components/ui/Select'
import { Bagian, Baris, Isi, Status } from './bagian'

const JEDA: [number, string][] = [[30, '30 minutes'], [60, '1 hour'], [120, '2 hours'], [240, '4 hours'], [480, '8 hours'], [720, '12 hours']]

export function Pemeliharaan() {
  return (
    <div className="space-y-4">
      <LogRoblox />
      <TimerMatikan />
    </div>
  )
}

function LogRoblox() {
  const [info, setInfo] = useState<InfoLog | null>(null)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const baca = () => api.infoLogRoblox().then((v) => { setInfo(v); setGalat('') }, (e) => { setInfo(null); setGalat(String(e)) })
  useEffect(() => { void baca() }, [])
  return (
    <Bagian judul="Roblox logs" kanan={info ? `${info.mb} MB` : null}>
      <Baris
        judul="Old logs and crash dumps"
        ket={info
          ? `${info.berkas} files (${info.mb} MB) in Roblox's log and crash-dump folder; ${info.usang_berkas} older than a day (${info.usang_mb} MB).`
          : galat ? <span className="text-error">Couldn’t read Roblox's log folder: {galat}</span> : "Reading Roblox's log folder…"}
      >
        <Button
          size="md"
          variant="secondary"
          disabled={sibuk || !info?.usang_berkas}
          title="Removes logs and crash dumps last changed more than a day ago. Logs of running clients are never touched."
          onClick={async () => {
            setSibuk(true)
            try {
              const [n, mb] = await api.bersihkanLogRoblox()
              beriTahu(`Removed ${n} old Roblox log${n === 1 ? '' : 's'} and crash dumps (${mb} MB).`, 'benar')
              await baca()
            } catch (e) {
              beriTahu(String(e), 'salah')
            } finally {
              setSibuk(false)
            }
          }}
        >
          {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Clean up
        </Button>
      </Baris>
    </Bagian>
  )
}

function TimerMatikan() {
  const [tenggat, setTenggat] = useState<number | null>(null)
  const [menit, setMenit] = useState(60)
  const [tutup, setTutup] = useState(true)
  const [kini, setKini] = useState(() => Math.floor(Date.now() / 1000))
  const [sibuk, setSibuk] = useState(false)
  useEffect(() => {
    api.statusMatikan().then((t) => setTenggat(t || null), () => {})
  }, [])
  useEffect(() => {
    if (!tenggat) return
    const h = window.setInterval(() => setKini(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(h)
  }, [tenggat])
  const sisa = tenggat ? Math.max(0, tenggat - kini) : 0
  const teksSisa = `${Math.floor(sisa / 3600)}h ${String(Math.floor((sisa % 3600) / 60)).padStart(2, '0')}m ${String(sisa % 60).padStart(2, '0')}s`
  return (
    <Bagian judul="Shut down the PC" ket="For long AFK sessions: Windows shuts down at the chosen time." kanan={tenggat ? <span className="tnum text-warning">in {teksSisa}</span> : 'Off'}>
      {tenggat ? (
        <Baris judul={<span className="text-warning">Shutdown scheduled</span>} ket={`Windows shuts down at ${new Date(tenggat * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} (in ${teksSisa}).`}>
          <Button
            size="md"
            variant="secondary"
            disabled={sibuk}
            onClick={async () => {
              setSibuk(true)
              try {
                await api.batalMatikan()
                setTenggat(null)
                beriTahu('Shutdown called off.', 'benar')
              } catch (e) {
                beriTahu(String(e), 'salah')
              } finally {
                setSibuk(false)
              }
            }}
          >
            <X className="h-4 w-4" />Call off
          </Button>
        </Baris>
      ) : (
        <>
          <Baris judul="Shut down in">
            <Select value={String(menit)} onValueChange={(v) => setMenit(Number(v))} options={JEDA.map(([m, l]) => ({ value: String(m), label: l }))} ariaLabel="Shut down in" className="w-[10rem]" />
          </Baris>
          <Baris judul="Close Roblox clients first" ket="Every Roblox client is asked to close 30 seconds before, so it leaves its game properly.">
            <Checkbox checked={tutup} onCheckedChange={(v) => setTutup(v === true)} aria-label="Close Roblox clients first" />
          </Baris>
          <Isi className="flex flex-wrap items-center gap-3">
            <Button
              size="md"
              variant="secondary"
              disabled={sibuk}
              onClick={async () => {
                setSibuk(true)
                try {
                  setTenggat(await api.jadwalMatikan(menit, tutup))
                  beriTahu('Shutdown scheduled. Windows closes every app at that time.', 'benar')
                } catch (e) {
                  beriTahu(String(e), 'salah')
                } finally {
                  setSibuk(false)
                }
              }}
            >
              <Power className="h-4 w-4" />Schedule shutdown
            </Button>
            <Status>Windows closes every app at that time, not only Roblox.</Status>
          </Isi>
        </>
      )}
    </Bagian>
  )
}
