import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

const DURASI = 120; 
const BISA_FOKUS =
  'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  buka,
  onTutup,
  judul,
  subjudul,
  ikon: Ikon,
  lebar = "w-[460px]",
  anakKaki,
  children,
  kunci = false,
}) {
  const [terpasang, setTerpasang] = useState(buka);
  const [tampak, setTampak] = useState(false);
  const kotak = useRef(null);
  const idJudul = useId();

  const asal = useRef(null);
  useEffect(() => {
    if (buka) {
      asal.current = document.activeElement;
      return;
    }
    const a = asal.current;
    asal.current = null;
    if (a instanceof HTMLElement && document.contains(a)) a.focus();
  }, [buka]);

  useEffect(() => {
    if (!buka || !terpasang) return;
    const f = requestAnimationFrame(() => {
      const el = kotak.current;
      if (!el || el.contains(document.activeElement)) return;
      const awal =
        el.querySelector("[data-autofocus]") ||
        el.querySelector("input:not(:disabled), textarea:not(:disabled), select:not(:disabled)") ||
        el.querySelector("[data-kaki] button:not(:disabled)") ||
        el;
      awal.focus();
    });
    return () => cancelAnimationFrame(f);
  }, [buka, terpasang]);

  const kurung = (e) => {
    if (e.key !== "Tab" || !kotak.current) return;
    const semua = [...kotak.current.querySelectorAll(BISA_FOKUS)].filter((x) => x.offsetParent !== null);
    if (!semua.length) return e.preventDefault();
    const awal = semua[0], akhir = semua[semua.length - 1];
    if (e.shiftKey && (document.activeElement === awal || !kotak.current.contains(document.activeElement))) {
      e.preventDefault();
      akhir.focus();
    } else if (!e.shiftKey && document.activeElement === akhir) {
      e.preventDefault();
      awal.focus();
    }
  };

  useEffect(() => {
    if (buka) {
      setTerpasang(true);
      const f = requestAnimationFrame(() => setTampak(true));
      return () => cancelAnimationFrame(f);
    }
    setTampak(false);
    const t = setTimeout(() => setTerpasang(false), DURASI);
    return () => clearTimeout(t);
  }, [buka]);

  useEffect(() => {
    if (!terpasang) return;
    const esc = (e) => e.key === "Escape" && !kunci && onTutup();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [terpasang, kunci, onTutup]);

  if (!terpasang) return null;

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && !kunci && onTutup()}
      className={
        "fixed inset-0 z-50 grid place-items-center bg-black/55 transition-opacity duration-[120ms] " +
        (tampak ? "opacity-100" : "opacity-0")
      }
    >
      <div
        ref={kotak}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        tabIndex={-1}
        onKeyDown={kurung}
        className={`${lebar} max-w-[calc(100vw-32px)] border border-menu-border bg-app-card shadow-[0_12px_40px_rgb(0_0_0/.6)]`}
      >
        <div className="flex h-8 items-center gap-2 border-b border-line bg-app-side pr-1 pl-4">
          {Ikon && <Ikon size={14} className="flex-none text-dim" aria-hidden />}
          <h2 id={idJudul} className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{judul}</h2>
          <button
            type="button"
            onClick={onTutup}
            disabled={kunci}
            aria-label="Close"
            className="btn btn-ghost h-7 w-7 px-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-(--density-panel-padding)">
          {subjudul && <p className="mb-3 text-body text-dim">{subjudul}</p>}
          {children}
        </div>

        {anakKaki && (
          <div data-kaki className="flex justify-end gap-2 border-t border-line bg-app-side/60 px-4 py-3">
            {anakKaki}
          </div>
        )}
      </div>
    </div>
  );
}
