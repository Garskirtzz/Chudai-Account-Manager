import { ambilAccessCode, ambilLinkCode, ambilShareCode, api, tidur } from '@/api/api'
import type { Akun, ParamLuncur } from '@/api/types'
import { beriTahu, minta, muatRiwayat, nyalakanMulti, pakaiServerTersimpan, useCam, type Antrean, type StatusItem } from '@/stores/cam'

const get = () => useCam.getState()
const set = useCam.setState

let sesiAktif: { batal: boolean } | null = null
let pemicu: Element | null = null

export const sedangLuncur = () => !!sesiAktif

interface Opsi {
  nyalakanDulu?: boolean
  target?: { placeId: number | string; jobId?: string; gameName?: string } | null
  lewatAnggaran?: boolean
}

function paramLuncur(): ParamLuncur & { followUserId?: number } {
  const param = get().param
  return {
    placeId: Number(String(param.placeId).replace(/\D/g, '')) || 0,
    jobId: param.jobId,
    linkCode: ambilShareCode(param.linkCode) || ambilAccessCode(param.linkCode) ? '' : ambilLinkCode(param.linkCode),
    accessCode: ambilAccessCode(param.linkCode),
    shareCode: ambilShareCode(param.linkCode),
    gameName: param.gameName,
    gameIcon: param.gameIcon,
  }
}

async function serverSiap(p: ParamLuncur, acuan: Akun | undefined) {
  if (!p.jobId || !p.placeId || p.followUserId) return { ok: true as const }
  if (!acuan) return { ok: true as const }
  try {
    const h = await api.periksaServer(acuan.id, Number(p.placeId), p.jobId)
    return h.bisa ? { ok: true as const } : { ok: false as const, pesan: h.pesan }
  } catch {
    return { ok: true as const }
  }
}

async function idIkuti(acuan: Akun | undefined): Promise<{ id: number; galat?: string; nama?: string; game?: string; placeId?: number }> {
  const teks = String(get().param.ikuti || '').trim()
  if (!teks) return { id: 0 }
  if (!acuan) return { id: 0, galat: 'Add an account first.' }
  try {
    const u = await api.cariUser(teks, acuan.id)
    if (!u.place_id) return { id: 0, galat: `${u.username || teks} is not in a game right now.` }
    return { id: u.user_id, nama: u.username, game: u.game_name, placeId: u.place_id }
  } catch (e) {
    return { id: 0, galat: String(e) }
  }
}

export async function luncurkanDaftar(daftar: Akun[], sumber: Antrean['sumber'], { nyalakanDulu = false, target = null, lewatAnggaran = false }: Opsi = {}): Promise<void> {
  if (sesiAktif || !daftar.length) return

  if (!nyalakanDulu && daftar.length > 1 && !get().multiAktif) {
    minta({
      judul: 'Multi-instance is off',
      pesan:
        `You are launching ${daftar.length} accounts, but only one Roblox client can run while multi-instance is off.\n\n` +
        "Enabling it holds Roblox's own single-instance lock. Roblox's anti-cheat vendor has said running multiple clients may be treated as suspicious behaviour. It stays on until you turn it off or close this app.",
      labelYa: 'Enable and launch',
      aksi: () => luncurkanDaftar(daftar, sumber, { nyalakanDulu: true, target, lewatAnggaran }),
    })
    return
  }

  const sesi = { batal: false }
  sesiAktif = sesi
  api.setAntreanLuncur(true).catch(() => undefined)
  pemicu = document.activeElement
  const hasil = new Map<string, { status: StatusItem; pesan: string }>(daftar.map((a) => [a.id, { status: 'queued', pesan: '' }]))
  set({
    antrean: { sesi, sumber, fase: 'preparing', batal: false, item: daftar.map((a) => ({ id: a.id, alias: a.alias, status: 'queued', pesan: '' })) },
    statusLuncur: 'Preparing…',
  })

  const ubah = (f: (q: Antrean) => Antrean) => set((s) => ({ antrean: s.antrean && s.antrean.sesi === sesi ? f(s.antrean) : s.antrean }))
  const tandai = (a: Akun, status: StatusItem, pesan = '') => {
    hasil.set(a.id, { status, pesan })
    ubah((q) => ({ ...q, item: q.item.map((x) => (x.id === a.id ? { ...x, status, pesan } : x)) }))
  }
  const status = (s: string) => {
    if (sesiAktif === sesi) set({ statusLuncur: s })
  }
  const aman = async <X>(fn: () => Promise<X>, cadangan: X): Promise<X> => {
    try {
      return await fn()
    } catch {
      return cadangan
    }
  }

  let mulaiJalan = false
  set({ gagalTerakhir: [] })
  try {
    const anggaran = lewatAnggaran ? null : await aman(() => api.cekAnggaran(daftar.map((a) => a.id)), null)
    if (anggaran?.lewat) {
      const gb = (mb: number | null) => ((mb ?? 0) / 1024).toFixed(1)
      minta({
        judul: 'Over the RAM budget',
        pesan: `This launch needs about ${gb(anggaran.tambahan_mb)} GB. Roblox clients already use about ${gb(anggaran.dipakai_mb)} GB of your ${gb(anggaran.anggaran_mb)} GB budget. These figures are estimates.`,
        labelYa: 'Launch anyway',
        aksi: () => luncurkanDaftar(daftar, sumber, { nyalakanDulu, target, lewatAnggaran: true }),
      })
      return
    }
    if (nyalakanDulu && !(await nyalakanMulti())) return
    const p: ParamLuncur & { followUserId?: number } = target
      ? { placeId: target.placeId, jobId: target.jobId || '', linkCode: '', accessCode: '', shareCode: '', gameName: target.gameName || '', gameIcon: '' }
      : paramLuncur()
    const acuan = daftar[0]
    const ik = target ? { id: 0 } : await idIkuti(acuan)
    if ('galat' in ik && ik.galat) return void beriTahu(`Launch not started: ${ik.galat}`, 'salah')
    p.followUserId = ik.id
    if (ik.id && 'placeId' in ik) {
      p.placeId = ik.placeId || 0
      p.gameName = ik.game || ''
      p.gameIcon = ''
    }
    if (!p.placeId && !p.shareCode && !p.followUserId) return void beriTahu('Launch not started: no game selected.', 'salah')
    if (p.followUserId && 'nama' in ik) beriTahu(`Following ${ik.nama} into ${ik.game}.`)
    const cek = await serverSiap(p, acuan)
    if (!cek.ok) return void beriTahu(`Launch not started: ${cek.pesan}`, 'salah')
    const param = get().param
    const jeda = Math.max(0, Number(param.jeda) || 0)
    p.fpsSekali = target ? null : Math.round(Number(param.fps) || 0) || null
    const umum = !target && !p.jobId && !p.linkCode && !p.accessCode && !p.shareCode && !p.followUserId
    let sama: '' | 'pilih' | 'ikuti' = umum && daftar.length > 1 && param.sama !== 'sepi' ? param.sama || '' : ''
    const jobSepi: Record<string, string> = {}
    if (umum && param.sama === 'sepi') {
      status('Finding the emptiest servers…')
      try {
        const job = await api.serverSepi(Number(p.placeId), daftar.length)
        daftar.forEach((a, i) => { if (job[i]) jobSepi[a.id] = job[i] })
        const beda = new Set(Object.values(jobSepi)).size
        const dapat = Object.keys(jobSepi).length
        beriTahu(
          !dapat ? 'Emptiest servers: no public server with room was listed, so Roblox picks the servers.'
            : daftar.length === 1 ? `Emptiest server: ${daftar[0].alias} joins server ${Object.values(jobSepi)[0].slice(0, 8)}….`
              : beda === daftar.length ? `Emptiest servers: each of the ${daftar.length} accounts joins its own server, fewest players first.`
                : `Emptiest servers: only ${beda} servers had room, so some of the ${daftar.length} accounts share one.`,
        )
      } catch (e) {
        beriTahu(`Emptiest servers: the server list couldn't be read (${e}), so Roblox picks the servers.`, 'salah')
      }
    }
    if (sama === 'pilih') {
      status('Finding a server with room for everyone…')
      try {
        const job = await api.pilihServerBersama(acuan.id, Number(p.placeId), daftar.length)
        if (job) {
          p.jobId = job
          sama = ''
          beriTahu(`Same server: all ${daftar.length} accounts join server ${job.slice(0, 8)}….`)
        } else {
          sama = 'ikuti'
          beriTahu(`Same server: no server had room for all ${daftar.length} accounts, so the rest follow the first account's server.`)
        }
      } catch (e) {
        sama = 'ikuti'
        beriTahu(`Same server: the server list couldn't be read (${e}), so the rest follow the first account's server.`, 'salah')
      }
    }
    let pemimpin: Akun | null = null

    mulaiJalan = true
    ubah((q) => ({ ...q, fase: 'running' }))

    const pace = { total: 0, beruntun: 0, diulang: new Set<string>() }
    const jedaPace = () => Math.min(120, Math.max(jeda, pace.total ? 5 : 0) * 2 ** pace.total)
    for (let i = 0; i < daftar.length; i++) {
      const a = daftar[i]
      if (sesi.batal) break
      const terakhir = i === daftar.length - 1
      tandai(a, 'starting')
      status(`Starting ${a.alias}…`)
      const sebelum = await aman(api.jumlahKlien, 0)
      const sejak = Math.floor(Date.now() / 1000)

      try {
        const catatan = (await api.luncurkan(a.id, jobSepi[a.id] ? { ...p, jobId: jobSepi[a.id] } : p)) || ''
        if (catatan) beriTahu(`${a.alias}: ${catatan}`, /(^| )Warning: /.test(catatan) ? 'salah' : 'info')
      } catch (e) {
        tandai(a, 'failed', String(e))
        continue
      }

      const batasProses = Date.now() + 60000
      let muncul = false
      while (Date.now() < batasProses && !sesi.batal) {
        if ((await aman(api.jumlahKlien, 0)) > sebelum) {
          muncul = true
          break
        }
        await tidur(700)
      }
      if (sesi.batal && !muncul) {
        tandai(a, 'launched', 'Stopped waiting after cancel; the client keeps starting on its own.')
        break
      }
      if (!muncul) {
        tandai(a, 'failed', 'Client did not start within 60 seconds.')
        continue
      }

      tandai(a, 'joining')
      const mulaiJoin = Date.now()
      let join = false
      let masalah: string | null = null
      while (Date.now() < mulaiJoin + 120000 && !sesi.batal) {
        if ((await aman(() => api.jumlahJoinSejak(sejak), 0)) > 0) {
          join = true
          break
        }
        masalah = await aman(() => api.masalahMasuk(a.id, sejak), null)
        if (masalah) break
        status(`${a.alias} is joining… ${Math.round((Date.now() - mulaiJoin) / 1000)}s`)
        await tidur(1500)
      }
      if (masalah === 'verifikasi') {
        tandai(a, 'failed', 'Roblox wants a human check for this account.')
        beriTahu(`Launch stopped: Roblox wants a human check for ${a.alias}. Sign in to it again with Add Account → Log in with browser, then launch the rest.`, 'salah')
        break
      }
      if (masalah === 'tolak') {
        pace.total++
        pace.beruntun++
        if (pace.beruntun >= 2 || pace.diulang.has(a.id)) {
          tandai(a, 'failed', 'Roblox refused the sign-in (error 403).')
          beriTahu('Launch stopped: Roblox keeps refusing sign-ins (error 403). Wait a few minutes, then launch the rest.', 'salah')
          break
        }
        pace.diulang.add(a.id)
        const tunggu = jedaPace()
        tandai(a, 'queued', `Roblox refused the sign-in (error 403); trying again in ${tunggu} s.`)
        beriTahu(`Roblox refused ${a.alias} (error 403). Trying it once more, with ${tunggu} s between launches from now on.`, 'salah')
        for (let sisa = tunggu; sisa > 0 && !sesi.batal; sisa--) {
          status(`Waiting after a refused sign-in… ${sisa}s`)
          await tidur(1000)
        }
        i--
        continue
      }
      if (sesi.batal && !join) {
        tandai(a, 'launched', 'Stopped waiting after cancel; the client keeps joining on its own.')
        break
      }
      if (!join) {
        tandai(a, 'failed', 'Did not finish joining within 2 minutes.')
        continue
      }
      const salahAkun = await aman(() => api.periksaAkunJoin(a.id, sejak), null)
      if (salahAkun) {
        tandai(a, 'failed', salahAkun)
        beriTahu(salahAkun, 'salah')
        continue
      }
      tandai(a, 'launched')
      pace.beruntun = 0
      if (sama === 'ikuti' && !pemimpin && !terakhir) {
        pemimpin = a
        status(`Reading ${a.alias}'s server…`)
        let srv = null
        for (let t = 0; t < 8 && !srv && !sesi.batal; t++) {
          srv = await aman(() => api.serverJoinAkun(a.id, sejak), null)
          if (!srv) await tidur(1500)
        }
        if (srv) {
          p.placeId = srv.place_id
          p.jobId = srv.job_id
          beriTahu(`Same server: the rest follow ${a.alias} into server ${srv.job_id.slice(0, 8)}….`)
        } else {
          beriTahu(`Same server: ${a.alias}'s server couldn't be read, so the rest are matched by Roblox on their own.`, 'salah')
        }
      }
      if ((a.hemat && a.hemat_minimize) || a.mulai_kecil) void aman(() => api.jendelaHemat(a.id), false)
      if (a.hemat) {
        void aman(async () => {
          const m = await api.periksaVersiHemat(a.id)
          if (m) beriTahu(m, 'salah')
        }, null)
      }

      if (!terakhir) {
        for (let sisa = jedaPace(); sisa > 0 && !sesi.batal; sisa--) {
          status(`Settling… ${sisa}s`)
          await tidur(1000)
        }
      }
    }
  } catch (e) {
    beriTahu(`Launch stopped: ${e}`, 'salah')
  } finally {
    for (const a of daftar) if (hasil.get(a.id)!.status === 'queued') hasil.set(a.id, { status: 'cancelled', pesan: '' })

    api.setAntreanLuncur(false).catch(() => undefined)
    if (sesiAktif === sesi) {
      sesiAktif = null
      set({ antrean: null, statusLuncur: '' })
      requestAnimationFrame(() => {
        const kini = document.activeElement
        if (kini && kini !== document.body && !kini.closest('[data-progres-luncur]')) return
        const p = pemicu
        if (p instanceof HTMLElement && p.isConnected && !(p as HTMLButtonElement).disabled) p.focus()
        else document.querySelector<HTMLElement>('[data-luncur-utama]')?.focus()
      })
    }

    if (mulaiJalan) {
      await muatRiwayat()
      const dengan = (s: StatusItem) => daftar.filter((a) => hasil.get(a.id)!.status === s)
      const naik = dengan('launched')
      const jatuh = dengan('failed')
      const batal = dengan('cancelled')
      if (daftar.length > 1) set({ gagalTerakhir: jatuh.map((a) => a.id) })
      if (daftar.length > 1) api.kabariBatch(daftar.length, naik.length, jatuh.length, batal.length > 0).catch(() => undefined)
      beriTahu(`Launch finished: Launched ${naik.length} · Failed ${jatuh.length} · Cancelled ${batal.length}`, jatuh.length ? 'salah' : 'benar')
      if (naik.length) beriTahu(`Launched: ${naik.map((a) => a.alias).join(', ')}`)
      for (const a of jatuh) beriTahu(`Failed: ${a.alias} — ${hasil.get(a.id)!.pesan}`, 'salah')
      if (batal.length) beriTahu(`Cancelled (not started): ${batal.map((a) => a.alias).join(', ')}`)
    }
  }
}

export const luncurTerpilih = () => {
  const { akun, dipilih, fokusId } = get()
  if (dipilih.length) return luncurkanDaftar(akun.filter((a) => dipilih.includes(a.id)), 'selection')
  const fokus = akun.find((a) => a.id === fokusId)
  return fokus ? luncurkanDaftar([fokus], 'single') : Promise.resolve()
}
export const luncurSatu = (a: Akun) => luncurkanDaftar([a], 'single')

export function luncurFolder(anggota: Akun[], label: string) {
  set({ dipilih: anggota.map((a) => a.id) })
  beriTahu(`Launching folder ${label} (${anggota.length} account${anggota.length === 1 ? '' : 's'}).`)
  return luncurkanDaftar(anggota, 'folder')
}

export function rejoinServer(a: Akun) {
  const st = a.server_terakhir
  if (st) return luncurkanDaftar([a], 'single', { target: { placeId: st.place_id, jobId: st.job_id, gameName: st.game_name } })
}

export function mainLagi(m: { akun_id: string; alias: string; place_id: number; game_name: string }) {
  const a = get().akun.find((x) => x.id === m.akun_id)
  if (!a) return beriTahu(`${m.alias} is no longer in the list.`, 'salah')
  return luncurkanDaftar([a], 'single', { target: { placeId: m.place_id, gameName: m.game_name } })
}

export function batalkanSisa() {
  const sesi = sesiAktif
  if (!sesi) return
  sesi.batal = true
  set((s) => ({
    antrean: s.antrean && s.antrean.sesi === sesi ? { ...s.antrean, batal: true } : s.antrean,
    statusLuncur: s.statusLuncur && 'Cancelling — finishing the current step…',
  }))
}

export function pilihGagal() {
  const { gagalTerakhir, akun } = get()
  set({ dipilih: gagalTerakhir.filter((id) => akun.some((a) => a.id === id)), gagalTerakhir: [] })
}

export function pasangTray(pindahKeAkun: () => void) {
  window.__camTray = (jenis, id) => {
    const { folder, akun, serverTersimpan } = get()
    if (jenis === 'folder') {
      const f = folder.find((x) => x.id === id)
      if (!f) return
      pindahKeAkun()
      void luncurFolder(akun.filter((a) => a.folder_id === id && folder.some((x) => x.id === a.folder_id)), f.nama)
    } else if (jenis === 'server') {
      const s = serverTersimpan.find((x) => x.id === id)
      if (!s) return
      pindahKeAkun()
      pakaiServerTersimpan(s)
    }
  }
  return () => {
    delete window.__camTray
  }
}
