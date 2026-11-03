import { useEffect, useState } from "react";
import { Check, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Button, Category, Prop, Keadaan, tombolBaris, useRoving } from "./Primitives";
import { DENSITY, bacaDensity, pasangDensity } from "../lib/density";

const BAWAAN = { aksen: "#0f5db0", latar: "#2a2a2a", kartu: "#2e2e2e", sisi: "#353535" };

const BAWAAN_LAMA = [
  { aksen: "#4a68c8", latar: "#101216", kartu: "#191c22", sisi: "#14161b" }, 
  { aksen: "#60a5fa", latar: "#0a0c10", kartu: "#141820", sisi: "#0d1015" }, 
];

const PRESET = [
  { nama: "Studio Dark", ...BAWAAN },
  { nama: "Studio Darker", aksen: "#0e639c", latar: "#1e1e1e", kartu: "#232323", sisi: "#2b2b2b" },
  { nama: "Midnight", aksen: "#3674c8", latar: "#1f232b", kartu: "#232831", sisi: "#2b313c" },
  { nama: "Forest", aksen: "#2e7d4f", latar: "#252826", kartu: "#2a2d2b", sisi: "#323633" },
];

const KOLOM = [
  { k: "aksen", label: "Selection", ket: "Highlighted rows and primary buttons" },
  { k: "latar", label: "Workspace", ket: "The document area in the middle" },
  { k: "kartu", label: "Panels", ket: "Explorer, Properties and Output" },
  { k: "sisi", label: "Headers", ket: "Ribbon, panel titles and category rows" },
];

function normalkan(t) {
  const isi = { ...BAWAAN };
  for (const k of Object.keys(BAWAAN)) if (t?.[k]) isi[k] = t[k];
  const lama = BAWAAN_LAMA.some((b) =>
    Object.keys(BAWAAN).every((k) => String(isi[k]).toLowerCase() === b[k])
  );
  if (lama) return { ...BAWAAN };
  if (String(isi.aksen).toLowerCase() === "#3d7fd6" && isi.latar === "#1f232b" && isi.kartu === "#232831" && isi.sisi === "#2b313c") {
    return { ...isi, aksen: "#3674c8" };
  }
  return isi;
}

export function pasangTema(t) {
  const akar = document.documentElement;
  const pakai = normalkan(t);
  akar.style.setProperty("--color-app-bg", pakai.latar);
  akar.style.setProperty("--color-app-card", pakai.kartu);
  akar.style.setProperty("--color-app-side", pakai.sisi);
  akar.style.setProperty("--color-accent", pakai.aksen);
  akar.style.setProperty("--color-accent-hi", terangkan(pakai.aksen, 12));
  akar.style.setProperty("--color-on-accent", terang(pakai.aksen) ? "#101010" : "#ffffff");
}

function rgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminans(hex) {
  const c = rgb(hex);
  if (!c) return 1;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function terang(hex) {
  return luminans(hex) > 0.4;
}

function kontras(a, b) {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TOKEN = {
  dim: "#a0a0a0", bad: "#f58282", warn: "#e8a33d", ok: "#5cc46f", link: "#7fb4ec", faint: "#707070",
};
function campur(a, b, bagian) {
  const x = rgb(a), y = rgb(b);
  if (!x || !y) return a;
  const c = x.map((v, i) => Math.round(v * (1 - bagian) + y[i] * bagian));
  return `#${((c[0] << 16) | (c[1] << 8) | c[2]).toString(16).padStart(6, "0")}`;
}
function terangkan(hex, persen) {
  const c = rgb(hex);
  if (!c) return hex;
  const ubah = (v) => Math.max(0, Math.min(255, Math.round(v + (persen / 100) * 255)));
  const [r, g, b] = c.map(ubah);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function auditKontras(t) {
  const permukaan = ["latar", "kartu", "sisi"].map((k) => t[k]);
  const terburuk = (warna) => Math.min(...permukaan.map((p) => kontras(warna, p)));
  const fokus = campur(terangkan(t.aksen, 12), "#ffffff", 0.5);
  const diAtasAksen = terang(t.aksen) ? "#101010" : "#ffffff";
  const cek = [
    { nama: "Secondary text", rasio: terburuk(TOKEN.dim), batas: 4.5 },
    { nama: "Error text", rasio: terburuk(TOKEN.bad), batas: 4.5 },
    { nama: "Warning text", rasio: terburuk(TOKEN.warn), batas: 4.5 },
    { nama: "Success text", rasio: terburuk(TOKEN.ok), batas: 4.5 },
    { nama: "Links", rasio: terburuk(TOKEN.link), batas: 4.5 },
    { nama: "Focus ring", rasio: terburuk(fokus), batas: 3 },
    { nama: "Text on selected rows", rasio: kontras(diAtasAksen, t.aksen), batas: 4.5 },
    { nama: "Disabled text", rasio: terburuk(TOKEN.faint), batas: 2 },
  ];
  return cek.filter((c) => c.rasio < c.batas);
}

export default function ThemeEditor({ beriTahu }) {
  const [t, setT] = useState(BAWAAN);
  const [awal, setAwal] = useState(BAWAAN);
  const [muat, setMuat] = useState("memuat");
  const [simpanan, setSimpanan] = useState("idle");
  const [density, setDensity] = useState(bacaDensity);
  const rovD = useRoving(DENSITY);
  const rovP = useRoving(PRESET.map((p) => p.nama));

  useEffect(() => {
    (async () => {
      try {
        const isi = normalkan(await api.tema());
        setT(isi);
        setAwal(isi);
      } catch {
      } finally {
        setMuat("siap");
      }
    })();
  }, []);

  useEffect(() => {
    if (simpanan !== "tersimpan") return;
    const h = setTimeout(() => setSimpanan("idle"), 2000);
    return () => clearTimeout(h);
  }, [simpanan]);

  useEffect(() => {
    pasangTema(t);
  }, [t]);

  const berubah = KOLOM.some((c) => t[c.k] !== awal[c.k]);

  const simpan = async () => {
    setSimpanan("menyimpan");
    try {
      await api.setTema(t);
      setAwal(t);
      setSimpanan("tersimpan");
      beriTahu("Theme saved.", "benar");
    } catch (e) {
      setSimpanan("galat");
      beriTahu(`Couldn’t save theme: ${e}`, "salah");
    }
  };

  const pilihDensity = (v) => setDensity(pasangDensity(v));
  const kontrasBuruk = auditKontras(t);

  return (
    <div>
      <Category judul="Density">
        <div role="radiogroup" aria-label="Density">
          {DENSITY.map((d, i) => {
            const aktif = density === d;
            return (
              <div
                key={d}
                data-baris
                role="radio"
                aria-checked={aktif}
                tabIndex={rovD.tab(d, aktif)}
                onFocus={rovD.fokus(d)}
                onClick={() => pilihDensity(d)}
                onKeyDown={(e) => tombolBaris(e, () => pilihDensity(d))}
                className={"row h-auto items-start gap-2 border-b border-line py-1.5 pl-6 whitespace-normal cursor-pointer " + (aktif ? "row-sel" : "")}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{i === 0 ? "Compact" : "Comfortable"}</div>
                  <div className={"text-meta " + (aktif ? "text-on-accent/80" : "text-dim")}>
                    {i === 0
                      ? "Denser rows for many accounts. Helper text is hidden."
                      : "Taller rows, more spacing, and helper text under fields."}
                  </div>
                </div>
                {aktif && (
                  <span className="inline-flex flex-none items-center gap-1 self-center text-meta" aria-hidden>
                    <Check size={13} /> Active
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="m-0 border-b border-line px-6 py-1.5 text-meta text-dim">
          Applied immediately and remembered on this PC.
        </p>
      </Category>

      {muat === "memuat" && <Keadaan jenis="memuat" judul="Loading theme…" />}

      <Category judul="Presets">
        <div role="radiogroup" aria-label="Theme presets">
        {PRESET.map((p, i) => {
          const aktif = KOLOM.every((c) => t[c.k].toLowerCase() === p[c.k]);
          const terapkan = () => setT({ aksen: p.aksen, latar: p.latar, kartu: p.kartu, sisi: p.sisi });
          const adaAktif = PRESET.some((x) => KOLOM.every((c) => t[c.k].toLowerCase() === x[c.k]));
          return (
            <div
              key={p.nama}
              data-baris
              role="radio"
              aria-checked={aktif}
              tabIndex={rovP.tab(p.nama, adaAktif ? aktif : i === 0)}
              onFocus={rovP.fokus(p.nama)}
              onClick={terapkan}
              onKeyDown={(e) => tombolBaris(e, terapkan)}
              className={"row h-7 cursor-pointer border-b border-line pl-6 " + (aktif ? "row-sel" : "")}
            >
              <span className="flex flex-none border border-black/40" aria-hidden>
                {[p.sisi, p.kartu, p.latar, p.aksen].map((c) => (
                  <span key={c} style={{ background: c }} className="h-3.5 w-3.5" />
                ))}
              </span>
              <span className="flex-1">{p.nama}</span>
              {aktif && (
                <span className="inline-flex items-center gap-1 text-meta" aria-hidden>
                  <Check size={13} /> Active
                </span>
              )}
            </div>
          );
        })}
        </div>
      </Category>

      <Category judul="Colours">
        {KOLOM.map((c) => (
          <Prop key={c.k} nama={c.label} title={c.ket}>
            <label className="flex w-full cursor-pointer items-center gap-2">
              <span className="relative h-4 w-7 flex-none border border-black/50" style={{ background: t[c.k] }}>
                <input
                  type="color"
                  value={t[c.k]}
                  onChange={(e) => setT({ ...t, [c.k]: e.target.value })}
                  aria-label={c.label}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </span>
              <span className="tabular-nums">{t[c.k]}</span>
              <span className="ml-auto truncate text-meta text-faint">{c.ket}</span>
            </label>
          </Prop>
        ))}
        {kontrasBuruk.length > 0 && (
          <div role="alert" className="strip-warn flex items-start gap-2 border-b border-line px-6 py-1.5 text-meta leading-4">
            <AlertTriangle size={13} className="mt-px flex-none text-warn" aria-hidden />
            <span>
              Hard to read with these colours:{" "}
              {kontrasBuruk.map((c) => `${c.nama} ${c.rasio.toFixed(1)}:1 (needs ${c.batas}:1)`).join(", ")}.
              Pick a darker background or a different selection colour.
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-6 py-2">
          <Button
            variant="primary"
            icon={simpanan === "menyimpan" ? Loader2 : Check}
            onClick={simpan}
            disabled={!berubah || simpanan === "menyimpan" || muat !== "siap"}
            aria-live="polite"
          >
            {simpanan === "menyimpan" ? "Saving…" : simpanan === "tersimpan" ? "Saved" : "Save theme"}
          </Button>
          <Button icon={RotateCcw} onClick={() => setT(BAWAAN)} disabled={simpanan === "menyimpan"}>
            Reset to default
          </Button>
          {simpanan === "galat" && (
            <span role="alert" className="inline-flex items-center gap-1 text-meta text-bad">
              <AlertTriangle size={12} aria-hidden /> Couldn’t save theme
            </span>
          )}
          <span className="basis-full text-meta text-dim">
            Text colours are fixed so everything stays readable.
          </span>
        </div>
      </Category>
    </div>
  );
}
