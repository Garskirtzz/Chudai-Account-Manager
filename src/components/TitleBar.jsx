import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { api } from "../lib/api";
import { cx } from "./Primitives";

export default function TitleBar() {
  const [maks, setMaks] = useState(false);
  const [aktif, setAktif] = useState(true);

  useEffect(() => {
    const cek = () => api.jendelaMaks().then(setMaks).catch(() => {});
    const fokus = () => setAktif(true);
    const lepas = () => setAktif(false);
    cek();
    window.addEventListener("resize", cek);
    window.addEventListener("focus", fokus);
    window.addEventListener("blur", lepas);
    return () => {
      window.removeEventListener("resize", cek);
      window.removeEventListener("focus", fokus);
      window.removeEventListener("blur", lepas);
    };
  }, []);

  const aksi = (a) => api.jendelaAksi(a).then(setMaks).catch(() => {});

  const tekan = (e) => {
    if (e.button !== 0) return;
    if (e.detail === 2) aksi("maks");
    else aksi("seret");
  };

  return (
    <div
      onMouseDown={tekan}
      className="relative flex h-9 flex-none items-center justify-end border-b border-line bg-app-side select-none"
    >
      <span
        className={cx(
          "pointer-events-none absolute inset-x-0 text-center text-body font-medium transition-colors",
          aktif ? "text-ink" : "text-faint"
        )}
      >
        Chudai Account Manager
      </span>

      <div className="relative flex h-full" onMouseDown={(e) => e.stopPropagation()}>
        <TombolJendela label="Minimize" onClick={() => aksi("kecilkan")}>
          <Minus size={15} strokeWidth={1.25} />
        </TombolJendela>
        <TombolJendela label={maks ? "Restore" : "Maximize"} onClick={() => aksi("maks")}>
          {maks ? (
            <Copy size={12} strokeWidth={1.25} className="-scale-x-100" />
          ) : (
            <Square size={11} strokeWidth={1.25} />
          )}
        </TombolJendela>
        <TombolJendela label="Close" tutup onClick={() => aksi("tutup")}>
          <X size={15} strokeWidth={1.25} />
        </TombolJendela>
      </div>
    </div>
  );
}

function TombolJendela({ label, tutup, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cx(
        "grid h-full w-[46px] place-items-center text-dim transition-colors duration-100",
        tutup ? "hover:bg-titlebar-close hover:text-white" : "hover:bg-hover hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
