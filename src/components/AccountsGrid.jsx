import { memo, useLayoutEffect, useRef, useState } from "react";
import {
  Play, MoreHorizontal, Pencil, Trash2, Copy, RefreshCw, KeyRound, Gauge, Inbox,
} from "lucide-react";
import { Checkbox, Dropdown, DropdownItem, DropdownSeparator, StatusBadge, pindahBaris, cx } from "./Primitives";
import { waktuRelatif, samarkan } from "../lib/api";
import { IkonFolder, folderAkun, DND_AKUN } from "../lib/folder";

export default function AccountsGrid({
  akun,
  dipilih,
  semuaTerpilih,
  sebagian,
  onToggleSemua,
  onToggle,
  onFokus,
  fokusId,
  pidAkun,
  sembunyikanUsername,
  sedangLuncur,
  sedangPerbarui,
  aksi,
  folder = [],
  onPindah,
}) {
  const idTab = akun.some((a) => a.id === fokusId) ? fokusId : akun[0]?.id;

  const wadah = useRef(null);
  const [lebar, setLebar] = useState(9999);
  useLayoutEffect(() => {
    const el = wadah.current;
    if (!el) return;
    setLebar(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setLebar(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const kolom = {
    terakhir: lebar >= 416 + 92,
    username: lebar >= 416 + 92 + 88,
    fps: lebar >= 416 + 92 + 88 + 64,
  };
  return (
    <div ref={wadah} className="w-full">
    <table role="grid" aria-label="Accounts" aria-multiselectable="true" className="w-full table-fixed border-collapse text-body">
      <colgroup>
        <col className="w-8" />
        <col />
        {kolom.username && <col className="w-[88px]" />}
        {kolom.terakhir && <col className="w-[92px]" />}
        <col className="w-[108px]" />
        {kolom.fps && <col className="w-[64px]" />}
        <col className="w-[100px]" />
        <col className="w-[64px]" />
      </colgroup>
      <thead className="sticky top-0 z-10">
        <tr>
          <th className="grid-head px-0">
            <div className="grid place-items-center">
              <Checkbox checked={semuaTerpilih} indeterminate={sebagian} onChange={onToggleSemua} title="Select all" aria-label="Select all shown accounts" />
            </div>
          </th>
          <th className="grid-head">Account</th>
          <th className={cx("grid-head", !kolom.username && "hidden")}>Username</th>
          <th className={cx("grid-head", !kolom.terakhir && "hidden")}>Last launched</th>
          <th className="grid-head">Client</th>
          <th className={cx("grid-head", !kolom.fps && "hidden")}>FPS</th>
          <th className="grid-head">Status</th>
          <th className="grid-head border-r-0"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {akun.map((a) => (
          <Baris
            key={a.id}
            a={a}
            dipilih={dipilih.has(a.id)}
            fokus={fokusId === a.id}
            bisaTab={idTab === a.id}
            pid={pidAkun[a.id]}
            onToggle={onToggle}
            onFokus={onFokus}
            sembunyikanUsername={sembunyikanUsername}
            sedangLuncur={sedangLuncur}
            sedangPerbarui={sedangPerbarui.has(a.id)}
            aksi={aksi}
            folder={folder}
            onPindah={onPindah}
            idSeret={() => (dipilih.has(a.id) ? [...dipilih] : [a.id])}
            kolUsername={kolom.username}
            kolTerakhir={kolom.terakhir}
            kolFps={kolom.fps}
          />
        ))}
      </tbody>
    </table>
    </div>
  );
}

const Baris = memo(function Baris({
  a, dipilih, fokus, bisaTab, pid, onToggle, onFokus, sembunyikanUsername, sedangLuncur, sedangPerbarui, aksi,
  kolUsername, kolTerakhir, kolFps, folder, onPindah, idSeret,
}) {
  const fAkun = folder.find((f) => f.id === folderAkun(a, folder)) || null;
  const [gagalGambar, setGagalGambar] = useState(false);
  const hidup = pid && pid.length > 0;
  const dipakai = waktuRelatif(a.last_launched);

  return (
    <tr
      data-baris
      tabIndex={bisaTab ? 0 : -1}
      aria-selected={dipilih}
      aria-current={fokus || undefined}
      onClick={() => onFokus(a.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter") { e.preventDefault(); onFokus(a.id); }
        else if (e.key === " ") { e.preventDefault(); onToggle(a.id); }
        else pindahBaris(e, (el) => onFokus(el.dataset.id));
      }}
      data-id={a.id}
      draggable={folder.length > 0}
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_AKUN, JSON.stringify(idSeret()));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cx(
        "group h-(--density-table-row) cursor-pointer border-b border-line",
        dipilih ? "bg-accent text-on-accent focus-visible:outline-white" : fokus ? "bg-hover" : "hover:bg-hover",
        fokus && "shadow-[inset_3px_0_0_var(--color-ink)]"
      )}
    >
      <td className="px-0" onClick={(e) => { e.stopPropagation(); onToggle(a.id); }}>
        <div className="grid place-items-center">
          <Checkbox checked={dipilih} onChange={() => onToggle(a.id)} aria-label={`Select ${a.alias}`} />
        </div>
      </td>
      <td className="px-2">
        <div className="flex min-w-0 items-center gap-2">
          {a.avatar_url && !gagalGambar ? (
            <img
              src={a.avatar_url}
              alt=""
              onError={() => setGagalGambar(true)}
              className="h-5 w-5 flex-none rounded-full bg-well"
            />
          ) : (
            <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-well text-cap font-bold text-dim">
              {(a.alias[0] || "?").toUpperCase()}
            </span>
          )}
          <span className="truncate font-semibold">{a.alias}</span>
          {fAkun && (
            <span title={`Folder: ${fAkun.nama}`} className="flex flex-none items-center">
              <IkonFolder f={fAkun} size={12} className={dipilih ? "!text-white/90" : ""} />
              <span className="sr-only">, folder {fAkun.nama}</span>
            </span>
          )}
          {a.premium && (
            <span className={cx("min-w-0 shrink-[9] truncate text-meta", dipilih ? "text-white/80" : "text-warn")}>Premium</span>
          )}
          {a.hemat && (
            <span
              className={cx("min-w-0 shrink-[9] truncate text-meta", dipilih ? "text-white/80" : "text-link")}
              title="Resource saver: 10 FPS, low graphics, low priority"
            >
              Saver
            </span>
          )}
        </div>
      </td>
      <td className={cx("truncate px-2 select-text", !dipilih && "text-dim", !kolUsername && "hidden")}>
        {a.username ? `@${sembunyikanUsername ? samarkan(a.username) : a.username}` : "Not refreshed"}
      </td>
      <td className={cx("truncate px-2", !dipilih && (dipakai ? "text-dim" : "text-faint"), !kolTerakhir && "hidden")}>
        {dipakai || "Never launched"}
      </td>
      <td className="truncate px-2">
        {hidup ? (
          <StatusBadge
            jenis="run"
            diAtasAksen={dipilih}
            className={cx("select-text", !dipilih && "text-ok")}
            title={pid.length > 1 ? `${pid.length} klien Roblox berjalan untuk akun ini` : "Klien Roblox sedang berjalan"}
            aria-label={`Running, PID ${pid.join(", ")}`}
          >
            PID {pid.join(", ")}
          </StatusBadge>
        ) : (
          <StatusBadge jenis="idle" diAtasAksen={dipilih} className={dipilih ? "text-white/80" : "text-dim"}>
            Not running
          </StatusBadge>
        )}
      </td>
      <td className={cx("truncate px-2", !dipilih && (a.fps_cap ? "" : "text-faint"), !kolFps && "hidden")}>
        {a.fps_cap > 0 ? `${a.fps_cap} FPS` : "—"}
      </td>
      <td className="truncate px-2" title={a.last_error || undefined}>
        {a.last_error ? (
          <StatusBadge jenis="bad" diAtasAksen={dipilih} className={dipilih ? "" : "text-bad"} aria-label={`Cookie rejected: ${a.last_error}`}>
            {a.last_error}
          </StatusBadge>
        ) : (
          <StatusBadge jenis="ok" diAtasAksen={dipilih} className={dipilih ? "text-white/90" : "text-dim"}>
            Healthy
          </StatusBadge>
        )}
      </td>
      <td className="px-1">
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            title={sedangLuncur ? "A launch is already running" : `Launch ${a.alias} only`}
            aria-label={`Launch ${a.alias} only`}
            disabled={sedangLuncur}
            onClick={() => aksi.luncur(a)}
            className={cx(
              "btn h-7 w-7 border-transparent px-0",
              dipilih ? "text-white hover:bg-white/15" : "bg-transparent text-play hover:bg-hover"
            )}
          >
            <Play size={12} fill="currentColor" strokeWidth={0} />
          </button>
          <Dropdown
            trigger={
              <button
                type="button"
                aria-label={`More actions for ${a.alias}`}
                className={cx("btn h-7 w-7 border-transparent bg-transparent px-0", dipilih ? "text-white hover:bg-white/15" : "text-dim hover:bg-hover")}
              >
                <MoreHorizontal size={14} />
              </button>
            }
          >
            <DropdownItem icon={RefreshCw} onClick={() => aksi.segarkan(a)}>Refresh data</DropdownItem>
            <DropdownItem icon={KeyRound} onClick={() => aksi.cookie(a)} disabled={sedangPerbarui}>
              {sedangPerbarui ? "Refreshing cookie…" : "Refresh cookie"}
            </DropdownItem>
            <DropdownItem icon={Pencil} onClick={() => aksi.rename(a)}>Rename</DropdownItem>
            <DropdownItem icon={Gauge} onClick={() => aksi.fps(a)}>
              FPS limit{a.fps_cap ? ` (${a.fps_cap})` : ""}
            </DropdownItem>
            <DropdownItem icon={Copy} onClick={() => aksi.salin(a)}>Copy cookie</DropdownItem>
            {folder.length > 0 && (
              <>
                <DropdownSeparator />
                <div className="px-3 pt-1 pb-0.5 text-cap text-dim" aria-hidden>Move to folder</div>
                {[...folder, null].map((f) => {
                  const id = f ? f.id : null;
                  const di = folderAkun(a, folder) === id;
                  return (
                    <DropdownItem key={id || "tanpa"} icon={f ? () => <IkonFolder f={f} size={13} /> : Inbox} disabled={di} onClick={() => onPindah?.([a.id], id)}>
                      {f ? f.nama : "Ungrouped"}{di ? " (current)" : ""}
                    </DropdownItem>
                  );
                })}
              </>
            )}
            <DropdownSeparator />
            <DropdownItem icon={Trash2} danger onClick={() => aksi.hapus(a)}>Delete account</DropdownItem>
          </Dropdown>
        </div>
      </td>
    </tr>
  );
});
