import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, Layers, Crosshair, Check } from "lucide-react";
import { api } from "../lib/api";
import { Button, IconButton, Category, cx } from "./Primitives";

export default function WindowManager({ aktif }) {
  const [jendela, setJendela] = useState([]);
  const [pesan, setPesan] = useState("");
  const [sunting, setSunting] = useState(null);
  const [kolom, setKolom] = useState(0);

  const muat = useCallback(async () => {
    try {
      setJendela(await api.daftarJendela());
    } catch {
      setJendela([]);
    }
  }, []);

  useEffect(() => {
    if (!aktif) return;
    muat();
    const t = setInterval(muat, 4000);
    return () => clearInterval(t);
  }, [aktif, muat]);

  const susun = async (mode) => {
    try {
      const n = await api.susunJendela(mode, kolom);
      setPesan(`Arranged ${n} window${n === 1 ? "" : "s"}.`);
      await muat();
    } catch (e) {
      setPesan(String(e));
    }
  };

  const simpanSunting = async () => {
    if (!sunting) return;
    try {
      await api.pindahJendela(
        sunting.hwnd,
        Number(sunting.x) || 0,
        Number(sunting.y) || 0,
        Number(sunting.w) || 800,
        Number(sunting.h) || 600
      );
      setSunting(null);
      await muat();
    } catch (e) {
      setPesan(String(e));
    }
  };

  return (
    <Category judul="Client windows" kanan={jendela.length || "none"}>
      <div className="flex gap-3 border-b border-line px-6 py-2.5">
        <PetaLayar jendela={jendela} sorot={sunting?.hwnd} />
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-body leading-5 text-dim">
            Stop the Roblox windows from stacking on top of each other. The
            grid is sized from how many are open.
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button icon={LayoutGrid} onClick={() => susun("kisi")}>Tile</Button>
            <Button icon={Layers} onClick={() => susun("bertumpuk")}>Cascade</Button>
            <label className="ml-1 flex items-center gap-1.5 text-body text-dim" title="0 picks the column count automatically">
              Columns
              <input
                type="number"
                min="0"
                max="6"
                value={kolom}
                onChange={(e) => setKolom(Number(e.target.value) || 0)}
                className="field h-(--density-field-sm) w-11 px-1 text-center"
              />
            </label>
          </div>
          {pesan && <p className="mt-1.5 text-meta text-dim">{pesan}</p>}
        </div>
      </div>

      {jendela.length === 0 ? (
        <div className="border-b border-line px-6 py-1.5 text-body text-faint">
          No Roblox windows are open.
        </div>
      ) : (
        jendela.map((j, i) => (
          <div key={j.hwnd} className="border-b border-line">
            <div className="row h-(--density-list-row) pl-6">
              <span className="w-4 flex-none text-faint tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{j.judul}</span>
              <span className="flex-none text-faint tabular-nums">
                {j.w}×{j.h} at {j.x},{j.y}
              </span>
              <IconButton
                icon={Crosshair}
                title="Bring to front"
                onClick={() => api.fokusJendela(j.hwnd).catch(() => {})}
              />
              <button
                type="button"
                onClick={() =>
                  setSunting(sunting?.hwnd === j.hwnd ? null : { hwnd: j.hwnd, x: j.x, y: j.y, w: j.w, h: j.h })
                }
                className="btn btn-ghost btn-sm px-2"
              >
                {sunting?.hwnd === j.hwnd ? "Cancel" : "Move…"}
              </button>
            </div>

            {sunting?.hwnd === j.hwnd && (
              <div className="flex flex-wrap items-center gap-2 px-6 pb-2 text-body text-dim">
                {["x", "y", "w", "h"].map((k) => (
                  <label key={k} className="flex items-center gap-1">
                    {k.toUpperCase()}
                    <input
                      type="number"
                      value={sunting[k]}
                      onChange={(e) => setSunting({ ...sunting, [k]: e.target.value })}
                      className="field h-(--density-field-sm) w-16 px-1 text-center"
                    />
                  </label>
                ))}
                <Button variant="primary" icon={Check} onClick={simpanSunting} className="btn-sm">
                  Apply
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </Category>
  );
}

function PetaLayar({ jendela, sorot }) {
  const dpr = window.devicePixelRatio || 1;
  let x0 = 0;
  let y0 = 0;
  let x1 = Math.round(window.screen.width * dpr);
  let y1 = Math.round(window.screen.height * dpr);
  for (const j of jendela) {
    x0 = Math.min(x0, j.x);
    y0 = Math.min(y0, j.y);
    x1 = Math.max(x1, j.x + j.w);
    y1 = Math.max(y1, j.y + j.h);
  }
  const lebar = 168;
  const skala = lebar / Math.max(1, x1 - x0);
  const tinggi = Math.max(50, Math.round((y1 - y0) * skala));

  return (
    <div
      className="relative flex-none overflow-hidden border border-control-hover bg-well"
      style={{ width: lebar, height: tinggi }}
      title="Where the Roblox windows sit on your screens"
    >
      {jendela.map((j, i) => (
        <div
          key={j.hwnd}
          className={cx(
            "absolute grid place-items-center border text-cap font-bold",
            sorot === j.hwnd ? "border-white bg-accent text-white" : "border-accent-hi bg-accent/40 text-white"
          )}
          style={{
            left: (j.x - x0) * skala,
            top: (j.y - y0) * skala,
            width: Math.max(4, j.w * skala),
            height: Math.max(4, j.h * skala),
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
