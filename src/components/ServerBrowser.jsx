import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Target } from "lucide-react";
import { api } from "../lib/api";
import { Button, Checkbox, Keadaan, tombolBaris, useRoving } from "./Primitives";
import GamePicker from "./GamePicker";

const BATAS_MUAT = 15;

export default function ServerBrowser({
  akunPertama,
  onPilihServer,
  placeAwal,
  namaAwal,
  ikonAwal,
  onPlaceBerubah,
  beriTahu,
}) {
  const [placeId, setPlaceId] = useState(placeAwal || "");
  const [nama, setNama] = useState(placeAwal ? namaAwal || "" : "");
  const [ikon, setIkon] = useState(placeAwal ? ikonAwal || "" : "");
  const [awal] = useState(() =>
    placeAwal
      ? {
          place_id: placeAwal,
          name: namaAwal || `Place ${placeAwal}`,
          icon_url: ikonAwal || "",
        }
      : null
  );
  const [servers, setServers] = useState([]);
  const rov = useRoving(servers.map((s) => s.job_id));
  const [cursor, setCursor] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const [wilayah, setWilayah] = useState({});
  const [memuatWilayah, setMemuatWilayah] = useState(false);
  const [minSlot, setMinSlot] = useState(2);
  const [urut, setUrut] = useState("kosong");
  const [filterNegara, setFilterNegara] = useState("");
  const [diambilPada, setDiambilPada] = useState(0);
  const [otomatis, setOtomatis] = useState(() => {
    try {
      return localStorage.getItem("wilayahOtomatis") !== "0";
    } catch {
      return true;
    }
  });
  const wilayahRef = useRef({});
  const sesiRef = useRef(0);
  const sedangRef = useRef(false);

  const pid = Number(String(placeId).replace(/\D/g, "")) || 0;

  const muat = useCallback(
    async (lanjut) => {
      if (!pid) return;
      setMemuat(true);
      setGalat("");
      try {
        const h = await api.daftarServer(pid, lanjut ? cursor : "");
        setServers((lama) => (lanjut ? [...lama, ...h.servers] : h.servers));
        setCursor(h.cursor || "");
        setDiambilPada(Date.now());
        return h.servers;
      } catch (e) {
        setGalat(String(e));
        return [];
      } finally {
        setMemuat(false);
      }
    },
    [pid, cursor]
  );


  useEffect(() => {
    setServers([]);
    setCursor("");
    setDiambilPada(0);
    setFilterNegara("");
    sesiRef.current += 1;
  }, [pid]);

  const muatWilayah = useCallback(
    async (daftar, batas = BATAS_MUAT) => {
      if (!akunPertama || !pid || sedangRef.current) return;
      const perlu = daftar
        .map((s) => s.job_id)
        .filter((j) => wilayahRef.current[j] === undefined)
        .slice(0, batas);
      if (perlu.length === 0) return;

      const sesi = sesiRef.current;
      sedangRef.current = true;
      setMemuatWilayah(true);
      try {
        const hasil = await api.wilayahServerBanyak(akunPertama.id, pid, perlu);
        if (sesi !== sesiRef.current) return;
        const baru = { ...wilayahRef.current };
        for (const w of hasil) baru[w.job_id] = w.wilayah || "—";
        for (const j of perlu) if (baru[j] === undefined) baru[j] = "—";
        wilayahRef.current = baru;
        setWilayah(baru);
      } catch (e) {
        beriTahu?.(String(e), "salah");
      } finally {
        sedangRef.current = false;
        setMemuatWilayah(false);
      }
    },
    [akunPertama, pid, beriTahu]
  );

  const sisaWilayah = useMemo(
    () => servers.filter((s) => wilayah[s.job_id] === undefined).length,
    [servers, wilayah]
  );

  const ubahOtomatis = useCallback((v) => {
    setOtomatis(v);
    try {
      localStorage.setItem("wilayahOtomatis", v ? "1" : "0");
    } catch {
    }
  }, []);

  const terlihat = useMemo(() => {
    const q = filterNegara.trim().toLowerCase();
    const f = servers.filter((s) => {
      if (s.max_players - s.playing < minSlot) return false;
      if (!q) return true;
      const w = wilayah[s.job_id];
      if (!w || w === "—") return false;
      return w.split(",").pop().trim().toLowerCase() === q;
    });
    const urutan = {
      kosong: (a, b) => a.playing - b.playing,
      penuh: (a, b) => b.playing - a.playing,
      ping: (a, b) => (a.ping || 999) - (b.ping || 999),
    };
    return [...f].sort(urutan[urut] || urutan.kosong);
  }, [servers, minSlot, urut, filterNegara, wilayah]);

  useEffect(() => {
    if (servers.length === 0 || !otomatis) return;
    const urutan = {
      kosong: (a, b) => a.playing - b.playing,
      penuh: (a, b) => b.playing - a.playing,
      ping: (a, b) => (a.ping || 999) - (b.ping || 999),
    };
    muatWilayah([...servers].sort(urutan[urut] || urutan.kosong));
  }, [servers, urut, muatWilayah, otomatis]);

  const negaraDitemukan = useMemo(() => {
    const hitung = new Map();
    for (const s of servers) {
      if (s.max_players - s.playing < minSlot) continue;
      const w = wilayah[s.job_id];
      if (!w || w === "—") continue;
      const negara = w.split(",").pop().trim();
      hitung.set(negara, (hitung.get(negara) || 0) + 1);
    }
    return [...hitung.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [servers, wilayah, minSlot]);

  const pilih = (s) =>
    onPilihServer({ placeId: pid, jobId: s.job_id, gameName: nama, gameIcon: ikon });

  const pakaiTerbaik = async () => {
    const segar = await muat(false);
    const q = filterNegara.trim().toLowerCase();
    const kandidat = segar
      .filter((s) => s.max_players - s.playing >= minSlot)
      .filter((s) => {
        if (!q) return true;
        const w = wilayahRef.current[s.job_id];
        return !!w && w !== "—" && w.split(",").pop().trim().toLowerCase() === q;
      })
      .sort((a, b) => a.playing - b.playing)[0];
    if (kandidat) pilih(kandidat);
    else
      beriTahu?.(
        filterNegara
          ? `No located server in ${filterNegara} matches that free-slot filter.`
          : "No server matches that free-slot filter.",
        "salah"
      );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-(--density-toolbar-height) flex-none items-center gap-1.5 border-b border-line px-2">
        <GamePicker
          nilai={placeId}
          pilihanLuar={awal}
          onPilih={(p, meta) => {
            setPlaceId(p);
            setNama(meta?.name || "");
            setIkon(meta?.icon || "");
            onPlaceBerubah?.(p, meta);
          }}
        />
        <Button icon={RefreshCw} onClick={() => muat(false)} disabled={!pid || memuat} className="h-7">
          {memuat ? "Loading…" : "Load servers"}
        </Button>
        <Button
          variant="primary"
          icon={Target}
          onClick={pakaiTerbaik}
          disabled={!pid || memuat}
          className=""
          title="Reload the list, then set the emptiest matching server as the launch target"
        >
          Use best server
        </Button>
      </div>

      <div className="flex h-(--density-subbar-height) flex-none items-center gap-3 overflow-hidden border-b border-line px-2.5 text-body whitespace-nowrap text-dim">
        <label
          className="flex items-center gap-1.5"
          title="Only show servers with at least this many empty slots. Roblox's player counts are cached, so leave some head-room."
        >
          Min. free slots
          <input
            type="number"
            min="0"
            max="100"
            value={minSlot}
            onChange={(e) => setMinSlot(Number(e.target.value) || 0)}
            className="field h-(--density-field-sm) w-11 px-1 text-center"
          />
        </label>

        <label className="flex items-center gap-1.5">
          Region
          <select
            value={filterNegara}
            onChange={(e) => setFilterNegara(e.target.value)}
            disabled={negaraDitemukan.length === 0}
            title={
              negaraDitemukan.length === 0
                ? "Regions appear here as the server list is located"
                : "Only show servers in this country"
            }
            className="field h-(--density-field-sm) w-36 px-1 disabled:text-faint"
          >
            <option value="">{negaraDitemukan.length === 0 ? "Not located yet" : "All regions"}</option>
            {negaraDitemukan.map(([n, jml]) => (
              <option key={n} value={n}>
                {n} ({jml})
              </option>
            ))}
          </select>
        </label>
        {memuatWilayah ? (
          <span className="text-link">Locating…</span>
        ) : (
          <>
            <label
              className="flex cursor-pointer items-center gap-1.5"
              title={
                otomatis
                  ? `Regions of the first ${BATAS_MUAT} servers are located automatically`
                  : "Regions are located only for servers you click"
              }
            >
              <Checkbox checked={otomatis} onChange={() => ubahOtomatis(!otomatis)} />
              Auto-locate
            </label>
          </>
        )}

        <label className="ml-auto flex items-center gap-1.5">
          Sort
          <select value={urut} onChange={(e) => setUrut(e.target.value)} className="field h-(--density-field-sm) w-28 px-1">
            <option value="kosong">Emptiest</option>
            <option value="penuh">Fullest</option>
            <option value="ping">Lowest ping</option>
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {galat && (
          <Keadaan
            jenis="galat"
            judul="Couldn’t load servers"
            teks={galat}
            onCobaLagi={() => muat(false)}
          />
        )}

        {!galat && memuat && servers.length === 0 && (
          <Keadaan jenis="memuat" judul="Loading servers…" />
        )}

        {!galat && !(memuat && servers.length === 0) && terlihat.length === 0 && (
          <p className="px-4 pt-[10vh] text-center text-body text-dim">
            {servers.length === 0
              ? "Pick a game above, then load its servers."
              : filterNegara
                ? `No server in ${filterNegara} has that many free slots.`
                : "No server has that many free slots. Lower the number above."}
          </p>
        )}

        {terlihat.length > 0 && (
          <table role="grid" aria-label="Servers" className="w-full table-fixed border-collapse text-body">
            <colgroup>
              <col className="w-[30%]" />
              <col />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[20%]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="grid-head">Players</th>
                <th className="grid-head">Region</th>
                <th className="grid-head">Ping</th>
                <th className="grid-head">FPS</th>
                <th className="grid-head">Job ID</th>
                <th className="grid-head border-r-0" />
              </tr>
            </thead>
            <tbody>
              {terlihat.map((s, i) => {
                const bebas = s.max_players - s.playing;
                const isi = s.max_players ? Math.min(1, s.playing / s.max_players) : 0;
                return (
                  <tr
                    key={s.job_id}
                    data-baris
                    tabIndex={rov.tab(s.job_id, i === 0)}
                    onFocus={rov.fokus(s.job_id)}
                    aria-label={`Server ${s.playing} of ${s.max_players} players${s.ping ? `, ${s.ping} ms` : ""}. Press Enter to use as launch target`}
                    onDoubleClick={() => pilih(s)}
                    onKeyDown={(e) => tombolBaris(e, () => pilih(s))}
                    className="group h-[calc(var(--density-table-row)-4px)] border-b border-line hover:bg-hover focus-visible:bg-hover"
                  >
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-11 flex-none tabular-nums">
                          {s.playing}/{s.max_players}
                        </span>
                        <span className="h-1.5 min-w-8 flex-1 overflow-hidden bg-well">
                          <span
                            className={
                              "block h-full " +
                              (isi >= 1 ? "bg-bad" : isi > 0.75 ? "bg-warn" : "bg-ok")
                            }
                            style={{ width: `${Math.max(4, isi * 100)}%` }}
                          />
                        </span>
                        <span className={"w-12 flex-none text-right " + (bebas > 0 ? "text-dim" : "text-bad")}>
                          {bebas > 0 ? `${bebas} free` : "full"}
                        </span>
                      </div>
                    </td>
                    <td className="truncate px-2">
                      {wilayah[s.job_id] ?? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            muatWilayah([s], 1);
                          }}
                          onDoubleClick={(e) => e.stopPropagation()}
                          aria-label="Locate this server's region"
                          disabled={memuatWilayah}
                          className="link"
                        >
                          Locate
                        </button>
                      )}
                    </td>
                    <td
                      className={
                        "px-2 tabular-nums " +
                        (!s.ping ? "text-faint" : s.ping < 90 ? "text-ok" : s.ping < 160 ? "text-warn" : "text-bad")
                      }
                    >
                      {s.ping ? `${s.ping} ms` : "—"}
                    </td>
                    <td className="px-2 text-dim tabular-nums">{Math.round(s.fps) || "—"}</td>
                    <td className="truncate px-2 text-dim select-text" title={s.job_id}>
                      {s.job_id}
                    </td>
                    <td className="px-1.5 text-right">
                      <button
                        type="button"
                        title="Set this server as the launch target (or double-click the row)"
                        onClick={() => pilih(s)}
                        onDoubleClick={(e) => e.stopPropagation()}
                        aria-label={`Use server ${s.job_id} as launch target`}
                        className="btn btn-secondary btn-sm px-2 text-meta"
                      >
                        Use
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {cursor && (
          <div className="p-2">
            <Button onClick={() => muat(true)} disabled={memuat} className="w-full">
              {memuat ? "Loading…" : "Load more servers"}
            </Button>
          </div>
        )}
      </div>

      {diambilPada > 0 && (
        <div
          className="flex h-(--density-statusbar-height) flex-none items-center gap-2 border-t border-line bg-app-side px-2.5 text-meta text-dim"
          title="Roblox caches these player counts, so treat them as approximate. The server you pick is checked live before launching."
        >
          <span>
            {terlihat.length} of {servers.length} servers shown, list loaded <UmurData sejak={diambilPada} />
          </span>
          {!memuatWilayah && sisaWilayah > 0 && (
            <button
              type="button"
              onClick={() => muatWilayah(servers, BATAS_MUAT)}
              className="link ml-auto"
              title={`${sisaWilayah} servers are not located yet`}
            >
              Locate {Math.min(BATAS_MUAT, sisaWilayah)} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UmurData({ sejak }) {
  const [umur, setUmur] = useState(() => Math.floor((Date.now() - sejak) / 1000));
  useEffect(() => {
    setUmur(Math.floor((Date.now() - sejak) / 1000));
    const t = setInterval(() => setUmur(Math.floor((Date.now() - sejak) / 1000)), 5000);
    return () => clearInterval(t);
  }, [sejak]);
  return <span className={umur < 60 ? "" : "text-warn"}>{umur}s ago</span>;
}
