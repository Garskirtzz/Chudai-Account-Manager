import { useEffect, useState } from "react";
import Modal from "./Modal";
import { Gauge } from "lucide-react";
import { Button } from "./Primitives";

const PRESET = [0, 10, 30, 60, 120, 144, 240];

export default function FpsModal({ akun, onTutup, onSimpan }) {
  const [nilai, setNilai] = useState(0);

  useEffect(() => {
    if (akun) setNilai(akun.fps_cap || 0);
  }, [akun]);

  return (
    <Modal
      buka={!!akun}
      onTutup={onTutup}
      judul="FPS limit"
      subjudul={akun?.alias}
      ikon={Gauge}
      lebar="w-[440px]"
      anakKaki={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSimpan(nilai)} className="px-4">
            Save
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-7 border border-line">
        {PRESET.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setNilai(f)}
            className={
              "h-(--density-control-height) border-r border-line text-body last:border-r-0 " +
              (nilai === f ? "bg-accent text-on-accent" : "bg-control text-ink hover:bg-control-hover")
            }
          >
            {f === 0 ? "Default" : f}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-body text-dim">
        Custom value <span className="text-faint">(15 to 1000, 0 = Roblox default)</span>
      </label>
      <input
        type="number"
        min="0"
        max="1000"
        value={nilai}
        onChange={(e) => setNilai(Math.max(0, Number(e.target.value) || 0))}
        className="field"
      />

      <p className="mt-4 text-meta leading-5 text-dim">
        Written to <span className="text-ink">ClientAppSettings.json</span> right
        before this account launches — the same mechanism Bloxstrap uses, not a
        client modification.
        <br />
        <span className="text-zinc-600">
          That file is global per Roblox install, so “per account” works because
          launches are sequential and each client reads it once at startup. If two
          clients start at the same moment they can end up sharing one value.
        </span>
      </p>
    </Modal>
  );
}
