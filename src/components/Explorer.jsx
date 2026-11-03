import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, Users, Server, History, Palette, Search, User, Flag, AlertTriangle, Info,
} from "lucide-react";
import { Checkbox, PanelTitle, pindahBaris, cx } from "./Primitives";
import { LogoRoblox } from "./RobloxView";
import { samarkan } from "../lib/api";

export default function Explorer({
  tampilan,
  onPilihTampilan,
  akun,
  terlihat,
  dipilih,
  onToggle,
  fokusId,
  onFokus,
  pidAkun,
  cari,
  setCari,
  jumlahRiwayat,
  sembunyikanUsername,
}) {
  const [akunBuka, setAkunBuka] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const node = (id) => ({ id, aktif: tampilan === id, onClick: () => onPilihTampilan(id) });

  return (
    <aside className="panel flex w-[232px] flex-none flex-col">
      <PanelTitle>Explorer</PanelTitle>

      <div className="flex-none border-b border-line p-2">
        <label className="field flex h-(--density-field-sm) items-center gap-1.5 px-1.5">
          <Search size={12} className="flex-none text-faint" />
          <input
            ref={ref}
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Filter accounts (Ctrl+K)"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-meta placeholder:text-faint"
          />
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-1">
        <Node
          {...node("akun")}
          ikon={Users}
          label="Accounts"
          jumlah={akun.length}
          sebelum={
            <button
              type="button"
              aria-label={akunBuka ? "Collapse accounts" : "Expand accounts"}
              aria-expanded={akunBuka}
              onClick={() => setAkunBuka((b) => !b)}
              className="ml-1 grid h-5 w-5 flex-none place-items-center rounded-sm hover:bg-white/10"
            >
              {akunBuka ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
            </button>
          }
        />

        {akunBuka && (
          <div role="listbox" aria-label="Accounts" aria-multiselectable="true">
            {terlihat.map((a, i) => {
              const fokus = fokusId === a.id;
              const pilih = dipilih.has(a.id);
              const hidup = (pidAkun[a.id] || []).length > 0;
              const bisaTab = terlihat.some((x) => x.id === fokusId) ? fokus : i === 0;
              return (
                <div
                  key={a.id}
                  data-baris
                  data-id={a.id}
                  role="option"
                  aria-selected={pilih}
                  aria-current={fokus || undefined}
                  tabIndex={bisaTab ? 0 : -1}
                  onClick={() => onFokus(a.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter") { e.preventDefault(); onFokus(a.id); }
                    else if (e.key === " ") { e.preventDefault(); onToggle(a.id); }
                    else pindahBaris(e, (el) => onFokus(el.dataset.id));
                  }}
                  title={a.username ? `@${sembunyikanUsername ? samarkan(a.username) : a.username}` : a.alias}
                  className={cx(
                    "row cursor-pointer pl-[30px]",
                    fokus && "bg-hover shadow-[inset_3px_0_0_var(--color-ink)]"
                  )}
                >
                  <Checkbox checked={pilih} onChange={() => onToggle(a.id)} tabIndex={-1} aria-label={`Select ${a.alias}`} />
                  <User size={13} className={cx("flex-none", a.last_error ? "text-bad" : "text-dim")} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{a.alias}</span>
                  {a.last_error && <AlertTriangle size={12} className="flex-none text-bad" aria-label="Cookie rejected" />}
                  {hidup && <span className="h-2 w-2 flex-none rounded-full bg-ok" title="Running" aria-label="Running" />}
                </div>
              );
            })}
          </div>
        )}
        {akunBuka && cari && terlihat.length === 0 && (
          <div className="row pl-[48px] text-faint italic hover:bg-transparent">No match</div>
        )}

        <Node {...node("server")} ikon={Server} label="Servers" />
        <Node {...node("riwayat")} ikon={History} label="History" jumlah={jumlahRiwayat} />
        <Node {...node("roblox")} ikon={LogoRoblox} label="Client versions" />
        <Node {...node("fflag")} ikon={Flag} label="Fast Flags" />
        <Node {...node("tema")} ikon={Palette} label="Appearance" />
        <Node {...node("about")} ikon={Info} label="About" />
      </nav>
    </aside>
  );
}

function Node({ id, aktif, onClick, ikon: Ikon, label, jumlah, sebelum }) {
  return (
    <div className={cx("row gap-0 px-0", aktif && "row-sel")}>
      {sebelum}
      <button
        type="button"
        data-nav={id}
        onClick={onClick}
        aria-current={aktif ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-1.5 pr-2 text-left"
        style={{ paddingLeft: sebelum ? 4 : 20 }}
      >
        <Ikon size={14} className={cx("flex-none", aktif ? "" : "text-dim")} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {jumlah > 0 && (
          <>
            <span className={cx("flex-none text-cap", aktif ? "text-on-accent/80" : "text-dim")} aria-hidden>
              {jumlah}
            </span>
            <span className="sr-only">, {jumlah} items</span>
          </>
        )}
      </button>
    </div>
  );
}
