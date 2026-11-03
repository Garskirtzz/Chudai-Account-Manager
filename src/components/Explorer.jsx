import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, Users, Server, History, Palette, Search, User, Flag, AlertTriangle, Info,
  FolderPlus, MoreHorizontal, Pencil, FolderCog, CheckSquare, Play, ArrowUp, ArrowDown, Trash2, Inbox,
} from "lucide-react";
import { Checkbox, PanelTitle, Dropdown, DropdownItem, DropdownSeparator, pindahBaris, cx } from "./Primitives";
import { LogoRoblox } from "./RobloxView";
import { samarkan } from "../lib/api";
import { IkonFolder, folderAkun, bacaLokal, tulisLokal, labelPreset, DND_AKUN } from "../lib/folder";

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
  folder = [],
  filterFolder,
  folderAksi = {},
  onPindah,
}) {
  const [akunBuka, setAkunBuka] = useState(true);
  const [terlipat, setTerlipat] = useState(() => new Set(bacaLokal("cam.folderTerlipat", [])));
  const lipat = (id) =>
    setTerlipat((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      tulisLokal("cam.folderTerlipat", [...n]);
      return n;
    });
  const [sasaranDrop, setSasaranDrop] = useState(null);
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
          sesudah={
            <button
              type="button"
              aria-label="New folder"
              title="New folder"
              onClick={() => folderAksi.baru?.()}
              className="mr-1 grid h-5 w-5 flex-none place-items-center rounded-sm text-dim hover:bg-white/10 hover:text-ink"
            >
              <FolderPlus size={12} aria-hidden />
            </button>
          }
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

        {akunBuka && (() => {
          const adaFolder = folder.length > 0;
          const kelompok = adaFolder
            ? [
                ...folder.map((f) => ({ id: f.id, f, akun: terlihat.filter((a) => folderAkun(a, folder) === f.id) })),
                { id: "tanpa", f: null, akun: terlihat.filter((a) => folderAkun(a, folder) === null) },
              ]
            : [{ id: "datar", f: null, akun: terlihat }];
          const urutTampil = kelompok.flatMap((k) => (adaFolder && terlipat.has(k.id) && !cari ? [] : k.akun));
          const idTab = urutTampil.some((x) => x.id === fokusId) ? fokusId : urutTampil[0]?.id;
          const barisAkun = (a, menjorok) => (
            <AkunBaris
              key={a.id}
              a={a}
              menjorok={menjorok}
              fokus={fokusId === a.id}
              pilih={dipilih.has(a.id)}
              hidup={(pidAkun[a.id] || []).length > 0}
              bisaTab={idTab === a.id}
              onFokus={onFokus}
              onToggle={onToggle}
              sembunyikanUsername={sembunyikanUsername}
              idSeret={() => (dipilih.has(a.id) ? [...dipilih] : [a.id])}
            />
          );
          return (
            <div role="listbox" aria-label="Accounts" aria-multiselectable="true">
              {kelompok.map((k) => {
                if (!adaFolder) return k.akun.map((a) => barisAkun(a, false));
                if (cari && k.akun.length === 0) return null;
                if (k.id === "tanpa" && k.akun.length === 0 && !sasaranDrop) return null;
                const buka = cari || !terlipat.has(k.id);
                return (
                  <div key={k.id} role="group" aria-label={k.f ? k.f.nama : "Ungrouped"}>
                    <FolderBaris
                      k={k}
                      buka={buka}
                      aktif={filterFolder === k.id}
                      dipilih={dipilih}
                      onLipat={() => lipat(k.id)}
                      aksi={folderAksi}
                      jadiSasaran={sasaranDrop === k.id}
                      setSasaran={setSasaranDrop}
                      onPindah={onPindah}
                      bisaNaik={!!k.f && folder[0]?.id !== k.id}
                      bisaTurun={!!k.f && folder[folder.length - 1]?.id !== k.id}
                    />
                    {buka && k.akun.map((a) => barisAkun(a, true))}
                  </div>
                );
              })}
            </div>
          );
        })()}
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

function Node({ id, aktif, onClick, ikon: Ikon, label, jumlah, sebelum, sesudah }) {
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
      {sesudah}
    </div>
  );
}

function AkunBaris({ a, menjorok, fokus, pilih, hidup, bisaTab, onFokus, onToggle, sembunyikanUsername, idSeret }) {
  return (
    <div
      data-baris
      data-id={a.id}
      role="option"
      aria-selected={pilih}
      aria-current={fokus || undefined}
      tabIndex={bisaTab ? 0 : -1}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_AKUN, JSON.stringify(idSeret()));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onFokus(a.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter") { e.preventDefault(); onFokus(a.id); }
        else if (e.key === " ") { e.preventDefault(); onToggle(a.id); }
        else pindahBaris(e, (el) => onFokus(el.dataset.id));
      }}
      title={a.username ? `@${sembunyikanUsername ? samarkan(a.username) : a.username}` : a.alias}
      className={cx(
        "row cursor-pointer",
        menjorok ? "pl-[46px]" : "pl-[30px]",
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
}

function FolderBaris({ k, buka, aktif, dipilih, onLipat, aksi, jadiSasaran, setSasaran, onPindah, bisaNaik, bisaTurun }) {
  const [ubahNama, setUbahNama] = useState(false);
  const [nama, setNama] = useState("");
  const anggota = k.akun;
  const terpilih = anggota.filter((a) => dipilih.has(a.id)).length;
  const label = k.f ? k.f.nama : "Ungrouped";
  const mulaiUbah = () => {
    if (!k.f) return;
    setNama(k.f.nama);
    setUbahNama(true);
  };
  const simpanNama = async () => {
    setUbahNama(false);
    const n = nama.trim();
    if (n && n !== k.f.nama) await aksi.ubahNama?.(k.f, n);
  };
  return (
    <div
      className={cx("row gap-0 pr-1 pl-[14px]", aktif && "bg-hover", jadiSasaran && "outline outline-1 -outline-offset-1 outline-[var(--color-ink)]")}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DND_AKUN)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setSasaran(k.id);
      }}
      onDragLeave={() => setSasaran((s) => (s === k.id ? null : s))}
      onDrop={(e) => {
        setSasaran(null);
        const data = e.dataTransfer.getData(DND_AKUN);
        if (!data) return;
        e.preventDefault();
        try { onPindah?.(JSON.parse(data), k.f ? k.f.id : null); } catch {  }
      }}
      title={k.f?.preset ? `${label} — ${labelPreset(k.f.preset)}` : label}
    >
      <button
        type="button"
        aria-label={buka ? `Collapse ${label}` : `Expand ${label}`}
        aria-expanded={buka}
        onClick={onLipat}
        className="grid h-5 w-5 flex-none place-items-center rounded-sm hover:bg-white/10"
      >
        {buka ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
      </button>
      <span className="flex w-5 flex-none justify-center">
        <Checkbox
          checked={anggota.length > 0 && terpilih === anggota.length}
          indeterminate={terpilih > 0 && terpilih < anggota.length}
          disabled={anggota.length === 0}
          onChange={() => aksi.pilihSemua?.(anggota, terpilih === anggota.length)}
          tabIndex={-1}
          aria-label={`Select all in ${label}`}
        />
      </span>
      {ubahNama ? (
        <input
          autoFocus
          value={nama}
          maxLength={40}
          aria-label="Folder name"
          onChange={(e) => setNama(e.target.value)}
          onBlur={simpanNama}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); simpanNama(); }
            else if (e.key === "Escape") { e.preventDefault(); setUbahNama(false); }
          }}
          className="field ml-1 h-5 min-w-0 flex-1 px-1 text-body"
        />
      ) : (
        <button
          type="button"
          data-folder={k.id}
          aria-current={aktif ? "true" : undefined}
          onClick={() => aksi.filter?.(k.id)}
          onDoubleClick={mulaiUbah}
          onKeyDown={(e) => e.key === "F2" && (e.preventDefault(), mulaiUbah())}
          className="ml-1 flex h-full min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {k.f ? <IkonFolder f={k.f} /> : <Inbox size={13} className="flex-none text-dim" aria-hidden />}
          <span className={cx("min-w-0 flex-1 truncate", !k.f && "text-dim")}>{label}</span>
          <span className="flex-none text-cap text-dim" aria-hidden>{anggota.length}</span>
          <span className="sr-only">, {anggota.length} accounts</span>
        </button>
      )}
      <Dropdown
        trigger={
          <button type="button" aria-label={`${label} options`} className="ml-0.5 grid h-5 w-5 flex-none place-items-center rounded-sm text-dim hover:bg-white/10 hover:text-ink">
            <MoreHorizontal size={13} aria-hidden />
          </button>
        }
      >
        <DropdownItem icon={CheckSquare} onClick={() => aksi.pilihSemua?.(anggota, false)} disabled={!anggota.length}>
          Select all ({anggota.length})
        </DropdownItem>
        <DropdownItem icon={Play} onClick={() => aksi.luncur?.(anggota, label)} disabled={!anggota.length}>
          Launch folder
        </DropdownItem>
        {k.f && (
          <>
            <DropdownSeparator />
            <DropdownItem icon={Pencil} onClick={mulaiUbah}>Rename</DropdownItem>
            <DropdownItem icon={FolderCog} onClick={() => aksi.edit?.(k.f)}>Color, icon & saver preset…</DropdownItem>
            <DropdownItem icon={ArrowUp} onClick={() => aksi.geser?.(k.f, -1)} disabled={!bisaNaik}>Move up</DropdownItem>
            <DropdownItem icon={ArrowDown} onClick={() => aksi.geser?.(k.f, 1)} disabled={!bisaTurun}>Move down</DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={Trash2} danger onClick={() => aksi.hapus?.(k.f, anggota.length)}>Delete folder</DropdownItem>
          </>
        )}
      </Dropdown>
    </div>
  );
}
