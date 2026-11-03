import WindowManager from "./WindowManager";
import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button, IconButton, Category, Keadaan, tombolBaris, useRoving, cx } from "./Primitives";
import { api } from "../lib/api";
import UnduhVersi from "./UnduhVersi";

export function LogoRoblox({ size = 14, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
         fill="currentColor" aria-hidden="true">
      <path d="M4.9 1.2 22.8 6l-4.8 17.9L0 19.1 4.9 1.2Zm5.4 8.2-1.4 5.2 5.2 1.4 1.4-5.2-5.2-1.4Z" />
    </svg>
  );
}

export default function RobloxView({ onBeriTahu }) {
  const [daftar, setDaftar] = useState([]);
  const [dipakai, setDipakai] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [berjalan, setBerjalan] = useState([]);
  const [sumber, setSumber] = useState({});
  const [status, setStatus] = useState("memuat");
  const [galat, setGalat] = useState("");

  const muat = useCallback(async () => {
    setStatus((s) => (s === "siap" || s === "segar" ? "segar" : "memuat"));
    try {
      setDaftar(await api.daftarVersiRoblox());
      setDipakai(await api.klienPath());
      setStatus("siap");
      setGalat("");
    } catch (e) {
      setStatus((s) => (s === "segar" ? "siap" : "galat"));
      setGalat(String(e));
      onBeriTahu?.(`Couldn’t load Roblox versions: ${e}`, "salah");
    }
    try { setBerjalan(await api.klienAkun()); } catch {  }
  }, [onBeriTahu]);

  useEffect(() => {
    muat();
    const ukur = async () => {
      try {
        const l = await api.sumberKlien();
        setSumber(Object.fromEntries((l.klien || []).map((k) => [k.pid, k])));
      } catch {  }
    };
    ukur();
    const t = setInterval(async () => {
      try { setBerjalan(await api.klienAkun()); } catch {  }
      ukur();
    }, 3000);
    return () => clearInterval(t);
  }, [muat]);

  const pakai = async (path) => {
    try {
      await api.setKlienPath(path);
      setDipakai(path);
      onBeriTahu?.(
        path ? "This version will be used for launching." : "Back to following the Roblox protocol.",
        "benar"
      );
    } catch (e) {
      onBeriTahu?.(String(e), "salah");
    }
  };

  const tambah = async () => {
    setSibuk(true);
    try {
      await api.tambahKlienKustom();
      await muat();
      onBeriTahu?.("Version added.", "benar");
    } catch (e) {
      if (String(e).includes("__BATAL__")) return;
      onBeriTahu?.(String(e), "salah");
    } finally {
      setSibuk(false);
    }
  };

  const hapus = async (path, diunduh) => {
    try {
      await api.hapusKlienKustom(path);
      await muat();
      onBeriTahu?.(
        diunduh
          ? "Downloaded version deleted."
          : "Removed from the list. The folder itself is untouched."
      );
    } catch (e) {
      onBeriTahu?.(String(e), "salah");
    }
  };

  const bawaan = daftar.filter((k) => k.bawaan);
  const kustom = daftar.filter((k) => !k.bawaan);
  const tabOtomatis = dipakai === "" || !daftar.some((k) => k.path === dipakai && k.ada);
  const rov = useRoving(["", ...daftar.filter((k) => k.ada).map((k) => k.path)]);
  const baris = (k) => (
    <BarisVersi
      key={k.path}
      k={k}
      aktif={dipakai === k.path}
      onPakai={pakai}
      onHapus={hapus}
      tabIndex={k.ada ? rov.tab(k.path, dipakai === k.path) : -1}
      onFocus={rov.fokus(k.path)}
    />
  );

  return (
    <div>
      {status === "memuat" && <Keadaan jenis="memuat" judul="Loading Roblox versions…" />}
      {status === "galat" && (
        <Keadaan jenis="galat" judul="Couldn’t load Roblox versions" teks={galat} onCobaLagi={muat} />
      )}
      <Category judul="Running now" kanan={berjalan.length || "none"}>
        {berjalan.length ? (
          berjalan.map(({ pid, exe: path, alias }) => {
            const cocok = dipakai && path.toLowerCase() === dipakai.toLowerCase();
            return (
              <div key={pid} className="row h-(--density-list-row) border-b border-line pl-6">
                <span className="h-2 w-2 flex-none rounded-full bg-ok" />
                <span className={"w-36 flex-none truncate " + (alias ? "font-semibold" : "text-faint italic")}>
                  {alias || "akun tak dikenali"}
                </span>
                <span className="w-20 flex-none text-dim tabular-nums select-text">pid {pid}</span>
                <Pemakaian s={sumber[pid]} />
                <span className="min-w-0 flex-1 truncate text-faint" title={path}>
                  {path || "(path unreadable)"}
                </span>
                {dipakai && (
                  <span className={"flex-none " + (cocok ? "text-ok" : "text-warn")}>
                    {cocok ? "Selected version" : "Other version"}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="border-b border-line px-6 py-1.5 text-body text-faint">
            No Roblox client is running.
          </div>
        )}
      </Category>

      <Category
        judul="Client used for launching"
        aksi={
          <button
            type="button"
            onClick={muat}
            disabled={status === "segar" || status === "memuat"}
            className="btn btn-ghost btn-sm gap-1 px-2 text-meta font-normal"
          >
            <RefreshCw size={11} aria-hidden className={status === "segar" ? "animate-spin motion-reduce:animate-none" : undefined} />
            {status === "segar" ? "Refreshing…" : "Reload"}
          </button>
        }
      >
        <div role="radiogroup" aria-label="Client used for launching">
        <div
          data-baris
          role="radio"
          aria-checked={dipakai === ""}
          tabIndex={rov.tab("", tabOtomatis)}
          onFocus={rov.fokus("")}
          onClick={() => pakai("")}
          onKeyDown={(e) => tombolBaris(e, () => pakai(""))}
          className={"row h-auto cursor-pointer items-start gap-2 border-b border-line py-1.5 pl-6 whitespace-normal " + (dipakai === "" ? "row-sel" : "")}
        >
          <Radio aktif={dipakai === ""} />
          <div className="min-w-0">
            <div className="font-semibold">Automatic (roblox-player: protocol)</div>
            <div className={"text-meta leading-5 " + (dipakai === "" ? "text-white/80" : "text-dim")}>
              Windows can point the protocol at one version only, and Roblox
              rewrites it on every update. Pick a version below to pin it.
            </div>
          </div>
        </div>
        {bawaan.length ? (
          bawaan.map(baris)
        ) : status === "memuat" || status === "galat" ? null : (
          <div className="border-b border-line px-6 py-1.5 text-body text-faint">
            No Roblox installation found in the standard folder.
          </div>
        )}
        {kustom.map(baris)}
        </div>
        <div className="flex items-center gap-2 border-b border-line px-6 py-1.5">
          <Button icon={FolderPlus} onClick={tambah} disabled={sibuk} className="btn-sm px-2">
            {sibuk ? "Choosing…" : "Add downgraded version…"}
          </Button>
          <span className="text-meta text-faint">
            Pick the folder that contains RobloxPlayerBeta.exe.
          </span>
        </div>
      </Category>

      <UnduhVersi onSelesai={muat} onBeriTahu={onBeriTahu} />

      <WindowManager aktif />
    </div>
  );
}

function Radio({ aktif }) {
  return (
    <span
      className={
        "mt-[3px] grid h-[13px] w-[13px] flex-none place-items-center rounded-full border " +
        (aktif ? "border-white bg-transparent" : "border-control-border-hi bg-well")
      }
    >
      {aktif && <span className="h-[5px] w-[5px] rounded-full bg-white" />}
    </span>
  );
}

function BarisVersi({ k, aktif, onPakai, onHapus, tabIndex, onFocus }) {
  const [yakin, setYakin] = useState(false);
  return (
    <div
      data-baris={k.ada ? "" : undefined}
      role="radio"
      aria-checked={aktif}
      aria-disabled={!k.ada || undefined}
      aria-label={`${k.versi || "Version unreadable"}, ${k.bawaan ? "installed" : k.diunduh ? "downloaded" : "added folder"}${k.ada ? "" : ", missing"}`}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={() => k.ada && onPakai(k.path)}
      onKeyDown={(e) => k.ada && tombolBaris(e, () => onPakai(k.path))}
      className={cx(
        "row h-auto gap-2 border-b border-line py-1.5 pl-6",
        k.ada ? "cursor-pointer" : "cursor-not-allowed opacity-55",
        aktif && "row-sel"
      )}
    >
      <Radio aktif={aktif} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{k.versi || "Version unreadable"}</span>
          <span className={aktif ? "text-white/80" : "text-dim"}>
            {k.bawaan ? "Installed" : k.diunduh ? "Downloaded" : "Added folder"}
          </span>
          {!k.ada && (
            <span className="inline-flex items-center gap-1 text-bad">
              <AlertTriangle size={11} /> Missing
            </span>
          )}
        </div>
        <div className={"truncate text-meta " + (aktif ? "text-white/70" : "text-faint")} title={k.path}>
          {k.path}
        </div>
      </div>
      {!k.bawaan &&
        (k.diunduh ? (
          <Button
            variant={yakin ? "destroy" : "danger"}
            icon={Trash2}
            onMouseLeave={() => setYakin(false)}
            onBlur={() => setYakin(false)}
            onClick={(e) => {
              e.stopPropagation();
              if (yakin) onHapus(k.path, true);
              else setYakin(true);
            }}
            className="h-6 flex-none px-2"
            title="Delete this downloaded version from disk"
            aria-label={yakin ? "Confirm: delete downloaded version files" : "Delete this downloaded version from disk"}
          >
            {yakin ? "Delete files" : ""}
          </Button>
        ) : (
          <IconButton
            icon={Trash2}
            variant="danger"
            title="Remove from list (the folder is not deleted)"
            onClick={(e) => { e.stopPropagation(); onHapus(k.path, false); }}
          />
        ))}
    </div>
  );
}

function Pemakaian({ s }) {
  if (!s) return <span className="w-56 flex-none text-meta text-dim">Measuring…</span>;
  const angka = (v, d = 1) => (v == null ? "n/a" : v.toFixed(d));
  return (
    <span
      className="w-56 flex-none text-meta text-dim tabular-nums select-text"
      title={`Private memory ${angka(s.privat_mb, 0)} MB${s.vram_mb != null ? `, GPU memory ${angka(s.vram_mb, 0)} MB` : ""}`}
    >
      CPU {angka(s.cpu)}% · RAM {angka(s.ram_mb, 0)} MB · GPU {angka(s.gpu)}%
    </span>
  );
}
