import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Search, X, RotateCw } from "lucide-react";
import { api } from "../lib/api";
import { Button, Category } from "./Primitives";

const mb = (b) => `${Math.round((b || 0) / 1e6)} MB`;

export default function UnduhVersi({ onSelesai, onBeriTahu }) {
  const [terbaru, setTerbaru] = useState(null);
  const [hash, setHash] = useState("");
  const [cek, setCek] = useState(null);
  const [memeriksa, setMemeriksa] = useState(false);
  const [status, setStatus] = useState(null);
  const pantau = useRef(null);

  const berhenti = () => {
    clearInterval(pantau.current);
    pantau.current = null;
  };

  const ikuti = useCallback(() => {
    if (pantau.current) return;
    pantau.current = setInterval(async () => {
      try {
        const s = await api.statusUnduhRoblox();
        setStatus(s);
        if (!s.aktif) {
          berhenti();
          if (s.hasil) {
            onBeriTahu?.(`Downloaded ${s.versi}. Select it in the list above to launch with it.`, "benar");
            onSelesai?.();
            setTerbaru((t) => (t && t.hash === s.versi ? { ...t, terpasang: true } : t));
            setCek((c) => (c && c.hash === s.versi ? { ...c, terpasang: true } : c));
          } else if (s.galat) {
            onBeriTahu?.(`Download of ${s.versi} stopped: ${s.galat}`, "salah");
          }
        }
      } catch {
        berhenti();
      }
    }, 700);
  }, [onBeriTahu, onSelesai]);

  const tanyaTerbaru = useCallback(() => {
    setTerbaru(null);
    api.versiRobloxTerbaru().then(setTerbaru).catch(() => setTerbaru(false));
  }, []);

  useEffect(() => {
    tanyaTerbaru();
    api.statusUnduhRoblox()
      .then((s) => {
        setStatus(s);
        if (s.aktif) ikuti();
      })
      .catch(() => {});
    return berhenti;
  }, [ikuti, tanyaTerbaru]);

  const periksa = async () => {
    setMemeriksa(true);
    setCek(null);
    try {
      setCek(await api.periksaVersiRoblox(hash));
    } catch (e) {
      onBeriTahu?.(String(e), "salah");
    } finally {
      setMemeriksa(false);
    }
  };

  const unduh = async (h) => {
    try {
      await api.unduhVersiRoblox(h);
      setStatus({ aktif: true, versi: h, tahap: "Starting", byte_selesai: 0, byte_total: 0 });
      ikuti();
    } catch (e) {
      onBeriTahu?.(String(e), "salah");
    }
  };

  const aktif = status?.aktif;
  const persen = status?.byte_total ? Math.min(100, (status.byte_selesai / status.byte_total) * 100) : 0;

  return (
    <Category judul="Download a version from Roblox">
      <div className="flex min-h-(--density-subbar-height) items-center gap-2 border-b border-line py-1 pr-2 pl-6">
        <span className="w-24 flex-none text-dim">Latest (live)</span>
        {terbaru === null ? (
          <span className="text-dim" role="status">Asking Roblox…</span>
        ) : terbaru === false ? (
          <>
            <span className="min-w-0 flex-1 text-bad">Couldn’t reach Roblox.</span>
            <Button icon={RotateCw} onClick={tanyaTerbaru} className="btn-sm flex-none px-2">
              Retry
            </Button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold tabular-nums">{terbaru.versi}</span>
              <span className="ml-2 text-faint">{terbaru.hash}, {mb(terbaru.ukuran)}</span>
            </span>
            {terbaru.terpasang ? (
              <span className="flex-none text-ok">Downloaded</span>
            ) : (
              <Button icon={Download} onClick={() => unduh(terbaru.hash)} disabled={aktif} className="h-6 flex-none px-2">
                Download
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex min-h-(--density-subbar-height) items-center gap-2 border-b border-line py-1 pr-2 pl-6">
        <span className="w-24 flex-none text-dim">By version</span>
        <input
          value={hash}
          onChange={(e) => { setHash(e.target.value); setCek(null); }}
          onKeyDown={(e) => e.key === "Enter" && hash.trim() && periksa()}
          placeholder="version-0123456789abcdef"
          spellCheck={false}
          className="field h-(--density-field-sm) min-w-0 flex-1"
        />
        <Button icon={Search} onClick={periksa} disabled={!hash.trim() || memeriksa} className="btn-sm flex-none px-2">
          {memeriksa ? "Checking…" : "Check"}
        </Button>
      </div>

      {cek && (
        <div className="flex min-h-(--density-subbar-height) items-center gap-2 border-b border-line py-1 pr-2 pl-6">
          <span className="w-24 flex-none text-dim" />
          <span className="min-w-0 flex-1 truncate text-ok">
            {cek.hash} exists on the Roblox CDN: {cek.paket} packages, {mb(cek.ukuran)}.
          </span>
          {cek.terpasang ? (
            <span className="flex-none text-ok">Downloaded</span>
          ) : (
            <Button icon={Download} onClick={() => unduh(cek.hash)} disabled={aktif} className="h-6 flex-none px-2">
              Download
            </Button>
          )}
        </div>
      )}

      {aktif && (
        <div className="border-b border-line py-2 pr-2 pl-6">
          <div className="mb-1.5 flex items-center gap-2 text-body">
            <span className="min-w-0 flex-1 truncate">
              {status.tahap}
              {status.jumlah_paket ? ` (${status.paket_ke} of ${status.jumlah_paket})` : ""}
            </span>
            <span className="flex-none text-dim tabular-nums">
              {mb(status.byte_selesai)} of {mb(status.byte_total)}
            </span>
            <Button icon={X} variant="ghost" onClick={() => api.batalUnduhRoblox()} className="h-6 flex-none px-2">
              Cancel
            </Button>
          </div>
          <div className="h-1.5 overflow-hidden bg-well">
            <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${persen}%` }} />
          </div>
        </div>
      )}

      {!aktif && status?.galat && (
        <div className="border-b border-line px-6 py-1.5 text-body text-bad">
          {status.versi}: {status.galat}
        </div>
      )}
      {!aktif && status?.dilewati?.length > 0 && (
        <div className="border-b border-line px-6 py-1.5 text-body text-warn">
          Roblox added packages this app does not know yet, so they were not installed:{" "}
          {status.dilewati.join(", ")}. That version may not start.
        </div>
      )}

      <p className="border-b border-line px-6 py-1.5 text-meta leading-5 text-faint">
        Every package is checked against Roblox's own manifest (size and MD5)
        before it is unpacked. Since March 2026 Roblox no longer publishes the
        hashes of older versions, so paste the one your executor lists. Very old
        versions are refused when joining a game.
      </p>
    </Category>
  );
}
