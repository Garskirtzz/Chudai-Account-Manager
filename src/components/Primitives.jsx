import { cloneElement, useEffect, useRef, useState } from "react";
import { Check, Minus, ChevronDown, ChevronRight, CircleCheck, AlertTriangle, Circle, Activity, Loader2, XCircle, Clock, Ban, Info, RotateCw } from "lucide-react";

export const cx = (...k) => k.filter(Boolean).join(" ");

export function Checkbox({ checked, indeterminate, onChange, className, ...rest }) {
  const nyala = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={(e) => { e.stopPropagation(); onChange?.(!checked); }}
      className={cx(
        "relative grid h-[14px] w-[14px] flex-none place-items-center rounded-[2px] border",
        "before:absolute before:-inset-[5px] before:content-['']",
        nyala
          ? "border-accent-hi bg-accent text-white"
          : "border-control-border-hi bg-well hover:border-faint",
        className
      )}
      {...rest}
    >
      {indeterminate ? (
        <Minus size={10} strokeWidth={3.5} />
      ) : checked ? (
        <Check size={10} strokeWidth={3.5} />
      ) : null}
    </button>
  );
}

const VARIAN = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  destroy: "btn-destroy",
  play: "btn-play",
};

export function Button({ children, variant = "secondary", icon: Icon, className, ...rest }) {
  return (
    <button type="button" className={cx("btn", VARIAN[variant], className)} {...rest}>
      {Icon && <Icon size={14} strokeWidth={2} className="flex-none" />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, variant = "ghost", className, size = 14, ...rest }) {
  return (
    <button
      type="button"
      aria-label={rest.title}
      className={cx("btn h-7 w-7 px-0", VARIAN[variant], className)}
      {...rest}
    >
      <Icon size={size} strokeWidth={2} />
    </button>
  );
}

export function Input({ label, hint, className, wrapClassName, ...rest }) {
  return (
    <div className={cx("min-w-0", wrapClassName)}>
      {label && (
        <label className="mb-1 block truncate text-meta text-dim">
          {label}
          {hint && <span className="ml-1 hidden text-faint md:inline">({hint})</span>}
        </label>
      )}
      <input className={cx("field", className)} {...rest} />
    </div>
  );
}

export function Dropdown({ trigger, children, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menu = useRef(null);

  const kePemicu = () => ref.current?.querySelector("[aria-haspopup]")?.focus();
  const item = () => [...(menu.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || [])];

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      kePemicu();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    const f = requestAnimationFrame(() => item()[0]?.focus());
    return () => {
      cancelAnimationFrame(f);
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const navigasi = (e) => {
    const semua = item();
    const i = semua.indexOf(document.activeElement);
    const ke = (j) => { e.preventDefault(); semua[(j + semua.length) % semua.length]?.focus(); };
    if (e.key === "ArrowDown") ke(i + 1);
    else if (e.key === "ArrowUp") ke(i - 1);
    else if (e.key === "Home") ke(0);
    else if (e.key === "End") ke(semua.length - 1);
    else if (e.key === "Tab") setOpen(false);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      kePemicu();
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={(e) => { e.stopPropagation(); setOpen((b) => !b); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); }
        }}
      >
        {cloneElement(trigger, { "aria-haspopup": "menu", "aria-expanded": open })}
      </div>
      {open && (
        <div
          ref={menu}
          role="menu"
          onKeyDown={navigasi}
          onClick={(e) => { e.stopPropagation(); setOpen(false); kePemicu(); }}
          className={cx(
            "menu absolute top-full z-30 mt-0.5 min-w-48 py-1",
            "shadow-[0_6px_18px_rgb(0_0_0/.55)]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, children, danger, ...rest }) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cx(
        "flex h-7 w-full items-center gap-2.5 px-3 text-left text-body",
        "disabled:pointer-events-none disabled:opacity-45",
        danger
          ? "text-bad hover:bg-danger-hover focus:bg-danger-hover"
          : "text-ink hover:bg-accent hover:text-on-accent focus:bg-accent focus:text-on-accent"
      )}
      {...rest}
    >
      <span className="w-3.5 flex-none" aria-hidden>{Icon && <Icon size={13} strokeWidth={2} />}</span>
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-menu-separator" />;
}

export function Category({ judul, kanan, aksi, awalBuka = true, children }) {
  const [buka, setBuka] = useState(awalBuka);
  return (
    <section>
      <div className="relative">
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          aria-expanded={buka}
          className={cx("category", aksi && "pr-28")}
        >
          {buka ? <ChevronDown size={13} aria-hidden /> : <ChevronRight size={13} aria-hidden />}
          <span className="min-w-0 flex-1 truncate">{judul}</span>
          {kanan && <span className="font-normal text-dim">{kanan}</span>}
        </button>
        {aksi && <div className="absolute top-0 right-1.5 flex h-6 items-center">{aksi}</div>}
      </div>
      {buka && children}
    </section>
  );
}

export function Prop({ nama, title, hint, hintTetap, kelas, children }) {
  return (
    <div className={cx("prop", kelas)} title={title}>
      <span>{nama}</span>
      <div>{children}</div>
      {hint && <p className="prop-hint" style={hintTetap ? { display: "block" } : undefined}>{hint}</p>}
    </div>
  );
}

const STATUS = {
  ok: { ikon: CircleCheck, warna: "text-ok" },
  bad: { ikon: AlertTriangle, warna: "text-bad" },
  warn: { ikon: AlertTriangle, warna: "text-warn" },
  run: { ikon: Activity, warna: "text-ok" },
  idle: { ikon: Circle, warna: "text-faint" },
  busy: { ikon: Loader2, warna: "text-accent-hi", putar: true },
  queued: { ikon: Clock, warna: "text-dim" },
  fail: { ikon: XCircle, warna: "text-bad" },
  skip: { ikon: Ban, warna: "text-faint" },
};

export function StatusBadge({ jenis, children, diAtasAksen, className, ...rest }) {
  const s = STATUS[jenis] || STATUS.idle;
  const Ikon = s.ikon;
  return (
    <span className={cx("inline-flex min-w-0 max-w-full items-center gap-1.5", className)} {...rest}>
      <span
        className={cx(
          "grid h-4 w-4 flex-none place-items-center rounded-full",
          diAtasAksen && "bg-black/55",
          s.warna
        )}
        aria-hidden
      >
        <Ikon size={11} strokeWidth={2.5} className={s.putar ? "animate-spin motion-reduce:animate-none" : undefined} />
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export function useRoving(ids) {
  const [aktif, setAktif] = useState(null);
  const ada = aktif !== null && ids.includes(aktif);
  return {
    tab: (id, bawaan) => ((ada ? aktif === id : bawaan) ? 0 : -1),
    fokus: (id) => () => setAktif(id),
  };
}

export function tombolBaris(e, aksi, onPindah) {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (!e.repeat) aksi?.();
    return;
  }
  pindahBaris(e, onPindah);
}

export function pindahBaris(e, onPindah) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return false;
  const wadah = e.currentTarget.parentElement;
  const semua = [...wadah.querySelectorAll(":scope > [data-baris]")];
  const i = semua.indexOf(e.currentTarget);
  const j =
    e.key === "Home" ? 0
    : e.key === "End" ? semua.length - 1
    : e.key === "ArrowDown" ? Math.min(i + 1, semua.length - 1)
    : Math.max(i - 1, 0);
  e.preventDefault();
  if (j !== i && semua[j]) {
    e.currentTarget.tabIndex = -1;
    semua[j].tabIndex = 0;
    semua[j].focus();
    onPindah?.(semua[j]);
  }
  return true;
}

export function PanelTitle({ children, kanan }) {
  return (
    <div className="panel-title">
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {kanan}
    </div>
  );
}

export function Keadaan({ jenis, judul, teks, onCobaLagi, labelCobaLagi = "Retry", className }) {
  const Ikon = jenis === "memuat" ? Loader2 : jenis === "galat" ? AlertTriangle : Info;
  return (
    <div
      role={jenis === "galat" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2.5 border-b border-line px-6 py-2 text-body leading-5",
        jenis === "galat" && "strip-error",
        className
      )}
    >
      <Ikon
        size={14}
        aria-hidden
        className={cx(
          "mt-0.5 flex-none",
          jenis === "memuat" && "animate-spin text-dim motion-reduce:animate-none",
          jenis === "galat" && "text-bad",
          jenis === "kosong" && "text-dim"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className={cx("font-semibold", jenis === "galat" ? "text-bad" : "text-ink")}>{judul}</div>
        {teks && <div className="text-meta leading-4 text-dim select-text break-words">{teks}</div>}
      </div>
      {onCobaLagi && (
        <Button icon={RotateCw} onClick={onCobaLagi} className="flex-none px-2">
          {labelCobaLagi}
        </Button>
      )}
    </div>
  );
}
