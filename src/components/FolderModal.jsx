import { useEffect, useRef, useState } from "react";
import { FolderPlus, FolderCog, Check } from "lucide-react";
import Modal from "./Modal";
import { Button, Checkbox, cx } from "./Primitives";
import { FPS_SAVER } from "../lib/api";
import { WARNA_FOLDER, IKON_FOLDER, IkonFolder } from "../lib/folder";

const RAM = [
  { v: 0, l: "Off" },
  { v: 1024, l: "1024 MB" },
  { v: 512, l: "512 MB (recommended)" },
  { v: 256, l: "256 MB" },
  { v: 128, l: "128 MB (less RAM, more CPU)" },
];

export default function FolderModal({ buka, folder, jumlahAnggota = 0, onTutup, onSimpan }) {
  const [nama, setNama] = useState("");
  const [warna, setWarna] = useState("");
  const [ikon, setIkon] = useState("");
  const [pakaiPreset, setPakaiPreset] = useState(false);
  const [preset, setPreset] = useState({ hemat: true, fps: 10, ram_mb: 512, minimize: false });
  const [sibuk, setSibuk] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!buka) return;
    setNama(folder?.nama || "");
    setWarna(folder?.warna || "");
    setIkon(folder?.ikon || "");
    setPakaiPreset(!!folder?.preset);
    setPreset(folder?.preset || { hemat: true, fps: 10, ram_mb: 512, minimize: false });
    setSibuk(false);
    const t = setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 60);
    return () => clearTimeout(t);
  }, [buka, folder]);

  const simpan = async () => {
    if (!nama.trim() || sibuk) return;
    setSibuk(true);
    const ok = await onSimpan?.({ ...(folder || {}), nama: nama.trim(), warna, ikon, preset: pakaiPreset ? preset : null });
    setSibuk(false);
    if (ok) onTutup?.();
  };
  const ubah = (k) => (e) => setPreset((p) => ({ ...p, [k]: Number(e.target.value) }));
  const pratinjau = { warna, ikon };

  return (
    <Modal
      buka={buka}
      onTutup={onTutup}
      judul={folder ? "Edit folder" : "New folder"}
      ikon={folder ? FolderCog : FolderPlus}
      lebar="w-[460px]"
      anakKaki={
        <>
          <Button variant="ghost" onClick={onTutup}>Cancel</Button>
          <Button variant="primary" onClick={simpan} disabled={!nama.trim() || sibuk} className="px-4">
            {folder ? "Save" : "Create folder"}
          </Button>
        </>
      }
    >
      <label className="block text-meta text-dim" htmlFor="folder-nama">Name</label>
      <div className="mt-1 flex items-center gap-2">
        <span className="grid h-9 w-9 flex-none place-items-center border border-line bg-well" aria-hidden>
          <IkonFolder f={pratinjau} size={18} />
        </span>
        <input
          id="folder-nama"
          ref={ref}
          value={nama}
          maxLength={40}
          onChange={(e) => setNama(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && simpan()}
          placeholder="e.g. Farming, Boosting"
          className="field h-9 min-w-0 flex-1 text-body"
        />
      </div>

      <div className="mt-3 text-meta text-dim" id="folder-warna">Color</div>
      <div role="radiogroup" aria-labelledby="folder-warna" className="mt-1 flex flex-wrap gap-1.5">
        {WARNA_FOLDER.map((w) => (
          <button
            key={w.kunci || "bawaan"}
            type="button"
            role="radio"
            aria-checked={warna === w.kunci}
            aria-label={w.label}
            title={w.label}
            onClick={() => setWarna(w.kunci)}
            className={cx("grid h-7 w-7 place-items-center border", warna === w.kunci ? "border-ink" : "border-line hover:border-faint")}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-well" style={w.hex ? { background: w.hex } : undefined}>
              {warna === w.kunci && <Check size={10} className={w.hex ? "text-white" : "text-ink"} aria-hidden />}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 text-meta text-dim" id="folder-ikon">Icon</div>
      <div role="radiogroup" aria-labelledby="folder-ikon" className="mt-1 flex flex-wrap gap-1.5">
        {IKON_FOLDER.map((i) => (
          <button
            key={i.kunci || "folder"}
            type="button"
            role="radio"
            aria-checked={ikon === i.kunci}
            aria-label={i.label}
            title={i.label}
            onClick={() => setIkon(i.kunci)}
            className={cx("grid h-7 w-7 place-items-center border", ikon === i.kunci ? "border-ink bg-hover" : "border-line hover:border-faint")}
          >
            <IkonFolder f={{ warna, ikon: i.kunci }} size={14} />
          </button>
        ))}
      </div>

      <div className="mt-4 border border-line p-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-body font-semibold text-ink">
          <Checkbox checked={pakaiPreset} onChange={setPakaiPreset} aria-label="Resource saver preset" />
          Resource saver preset
        </label>
        <p className="mt-1 mb-0 text-meta leading-4 text-dim">
          Applied to every account in this folder{folder && jumlahAnggota ? ` (${jumlahAnggota} now)` : ""} and to accounts moved in later. Accounts can still be changed one by one.
        </p>
        {pakaiPreset && (
          <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-body">
            <span className="text-dim">Resource saver</span>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={!!preset.hemat} onChange={(v) => setPreset((p) => ({ ...p, hemat: v }))} aria-label="Preset: resource saver on" />
              {preset.hemat ? "On" : "Off"}
            </label>
            {preset.hemat && (
              <>
                <span className="text-dim">FPS</span>
                <select className="field w-auto" value={preset.fps || 10} onChange={ubah("fps")} aria-label="Preset: FPS">
                  {FPS_SAVER.map((f) => <option key={f} value={f}>{f} FPS</option>)}
                </select>
                <span className="text-dim">RAM limit</span>
                <select className="field w-auto" value={preset.ram_mb || 0} onChange={ubah("ram_mb")} aria-label="Preset: RAM limit">
                  {RAM.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
                <span className="text-dim">Minimize</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={!!preset.minimize} onChange={(v) => setPreset((p) => ({ ...p, minimize: v }))} aria-label="Preset: minimize after joining" />
                  {preset.minimize ? "After joining" : "Off"}
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
