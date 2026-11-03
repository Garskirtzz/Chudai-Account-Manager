import { useEffect, useId, useRef, useState } from "react";
import { Search, X, Users, Gamepad2, Loader2, AlertTriangle, SearchX } from "lucide-react";
import { api, angka, ambilPlaceIdDariUrl } from "../lib/api";
import { cx } from "./Primitives";

export default function GamePicker({ nilai, onPilih, pilihanLuar, varian = "bar", redup = false }) {
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState([]);
  const [buka, setBuka] = useState(false);
  const [keadaan, setKeadaan] = useState("idle");
  const [terpilih, setTerpilih] = useState(null);
  const [aktif, setAktif] = useState(-1);
  const ref = useRef(null);
  const permintaan = useRef(0);
  const idDaftar = useId();
  const [arah, setArah] = useState("atas");

  useEffect(() => {
    if (!buka) return;
    const ukur = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const perlu = 296;
      const bawah = window.innerHeight - r.bottom;
      setArah(bawah >= perlu || bawah > r.top ? "bawah" : "atas");
    };
    ukur();
    window.addEventListener("resize", ukur);
    return () => window.removeEventListener("resize", ukur);
  }, [buka]);

  useEffect(() => {
    setTerpilih((t) =>
      t && String(t.place_id) === String(nilai || "") ? t : null
    );
  }, [nilai]);

  useEffect(() => {
    if (pilihanLuar) {
      setTerpilih(pilihanLuar);
      setTeks("");
      setBuka(false);
    }
  }, [pilihanLuar]);

  useEffect(() => {
    const klikLuar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setBuka(false);
    };
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  useEffect(() => {
    const q = teks.trim();
    if (!q || /^\d+$/.test(q)) {
      setHasil([]);
      setKeadaan("idle");
      setBuka(false);
      return;
    }
    const t = setTimeout(async () => {
      const seq = ++permintaan.current;
      setKeadaan("mencari");
      setBuka(true);
      try {
        const r = await api.cariGame(q);
        if (seq === permintaan.current) {
          setHasil(r);
          setAktif(r.length ? 0 : -1);
          setKeadaan("siap");
        }
      } catch {
        if (seq === permintaan.current) {
          setHasil([]);
          setKeadaan("galat");
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [teks]);

  const ubah = (e) => {
    let v = e.target.value;

    const dariUrl = ambilPlaceIdDariUrl(v);
    if (dariUrl) v = dariUrl;

    setTeks(v);
    setTerpilih(null);
    onPilih(/^\d+$/.test(v.trim()) ? v.trim() : "", null);
  };

  const pilih = (g) => {
    setTerpilih(g);
    setTeks("");
    setBuka(false);
    onPilih(String(g.place_id), { name: g.name, icon: g.icon_url });
  };

  const kosongkan = () => {
    setTerpilih(null);
    setTeks("");
    setHasil([]);
    setKeadaan("idle");
    onPilih("", null);
  };

  const tombol = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hasil.length) return;
      e.preventDefault();
      setBuka(true);
      const d = e.key === "ArrowDown" ? 1 : -1;
      setAktif((i) => (i + d + hasil.length) % hasil.length);
    } else if (e.key === "Enter") {
      if (buka && hasil[aktif]) {
        e.preventDefault();
        pilih(hasil[aktif]);
      }
    } else if (e.key === "Escape" && buka) {
      e.stopPropagation();
      setBuka(false);
    }
  };

  const panel = varian === "panel";
  const tampilDaftar = buka && keadaan !== "idle";
  const idOpsi = (i) => `${idDaftar}-o${i}`;

  return (
    <div
      ref={ref}
      className={cx("relative min-w-0", panel ? "w-full" : "w-full max-w-md", redup && "opacity-55")}
    >
      {terpilih ? (
        panel ? (
          <div className="flex min-h-(--density-game-height) items-center gap-2 py-1">
            <IkonGame url={terpilih.icon_url} besar />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-body leading-[16px] font-semibold text-ink" title={terpilih.name}>
                {terpilih.name}
              </div>
              <div className="text-meta text-dim select-text">Place {terpilih.place_id}</div>
            </div>
            <button
              type="button"
              onClick={kosongkan}
              title="Clear game"
              aria-label={`Clear game ${terpilih.name}`}
              className="btn btn-ghost -mr-1 h-7 w-7 flex-none px-0"
            >
              <X size={13} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="field flex items-center gap-2 px-1.5">
            <IkonGame url={terpilih.icon_url} />
            <span className="min-w-0 flex-1 truncate font-semibold">{terpilih.name}</span>
            <span className="hidden flex-none text-meta text-dim lg:block">{terpilih.place_id}</span>
            <button type="button" onClick={kosongkan} title="Clear game" aria-label={`Clear game ${terpilih.name}`} className="btn btn-ghost h-6 w-6 flex-none px-0">
              <X size={12} aria-hidden />
            </button>
          </div>
        )
      ) : (
        <label className={cx("flex items-center gap-1.5", panel ? "cell -mx-1 px-1" : "field px-1.5")}>
          <Search size={13} className="flex-none text-faint" aria-hidden />
          <input
            role="combobox"
            aria-expanded={tampilDaftar}
            aria-controls={idDaftar}
            aria-autocomplete="list"
            aria-activedescendant={tampilDaftar && hasil[aktif] ? idOpsi(aktif) : undefined}
            aria-label="Game"
            title="Type a game name, a Place ID, or paste a roblox.com game link"
            value={teks}
            onChange={ubah}
            onKeyDown={tombol}
            onFocus={() => keadaan !== "idle" && setBuka(true)}
            placeholder={panel ? "Search game or paste Place ID" : "Game name, Place ID, or paste a link…"}
            className="h-full min-w-0 flex-1 overflow-hidden bg-transparent text-ellipsis placeholder:text-faint"
          />
          {keadaan === "mencari" && (
            <Loader2 size={12} className="flex-none animate-spin text-faint motion-reduce:animate-none" aria-hidden />
          )}
        </label>
      )}

      {tampilDaftar && (
        <div
          id={idDaftar}
          role="listbox"
          aria-label="Games"
          aria-busy={keadaan === "mencari"}
          className={cx(
            "menu absolute z-40 max-h-72 overflow-y-auto py-1",
            panel ? "right-0 w-[276px]" : "left-0 w-96 max-w-[calc(100vw-32px)]",
            arah === "bawah" ? "top-full mt-0.5" : "bottom-full mb-0.5"
          )}
        >
          {keadaan === "mencari" && hasil.length === 0 && (
            <BarisKeadaan ikon={Loader2} putar teks="Searching Roblox…" />
          )}
          {keadaan === "siap" && hasil.length === 0 && (
            <BarisKeadaan ikon={SearchX} teks="No games found." sub="Try a Place ID or paste a Roblox game link." />
          )}
          {keadaan === "galat" && (
            <BarisKeadaan
              ikon={AlertTriangle}
              bahaya
              teks="Couldn’t search Roblox."
              sub="Check your connection, or type a Place ID instead."
            />
          )}
          {hasil.map((g, i) => (
            <div
              key={g.place_id}
              id={idOpsi(i)}
              role="option"
              aria-selected={i === aktif}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAktif(i)}
              onClick={() => pilih(g)}
              className={cx(
                "flex w-full cursor-pointer items-center gap-2.5 px-2 py-1 text-left",
                i === aktif && "bg-accent text-on-accent"
              )}
            >
              <IkonGame url={g.icon_url} />
              <div className="min-w-0 flex-1">
                <div className={cx("truncate text-body", i === aktif ? "text-on-accent" : "text-ink")}>{g.name}</div>
                <div className={cx("flex items-center gap-1 text-meta", i === aktif ? "text-on-accent/80" : "text-dim")}>
                  <Users size={11} aria-hidden />
                  {angka(g.players)} playing
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BarisKeadaan({ ikon: Ikon, teks, sub, putar, bahaya }) {
  return (
    <div role="status" className="flex items-start gap-2 px-3 py-2">
      <Ikon
        size={13}
        aria-hidden
        className={cx("mt-0.5 flex-none", bahaya ? "text-bad" : "text-dim", putar && "animate-spin motion-reduce:animate-none")}
      />
      <div className="min-w-0">
        <div className={cx("text-body", bahaya ? "text-bad" : "text-ink")}>{teks}</div>
        {sub && <div className="text-meta text-dim">{sub}</div>}
      </div>
    </div>
  );
}

function IkonGame({ url, besar = false }) {
  const ukuran = besar ? "h-(--density-game-icon) w-(--density-game-icon)" : "h-6 w-6";
  return url ? (
    <img src={url} alt="" className={ukuran + " flex-none rounded-[3px] bg-well"} />
  ) : (
    <div className={ukuran + " grid flex-none place-items-center rounded-[3px] bg-well"}>
      <Gamepad2 size={besar ? 14 : 12} className="text-faint" aria-hidden />
    </div>
  );
}
