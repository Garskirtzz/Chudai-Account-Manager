import { useEffect, useRef, useState } from "react";
import { Play, Pencil, Gauge, RefreshCw, KeyRound, Copy, Trash2, AlertTriangle, Bookmark, BookmarkPlus, BookmarkCheck, ChevronDown } from "lucide-react";
import { Category, Prop, PanelTitle, IconButton, StatusBadge, Checkbox, Dropdown, DropdownItem, DropdownSeparator, cx } from "./Primitives";
import { jenisServer } from "./SavedServers";
import GamePicker from "./GamePicker";
import { waktuRelatif, samarkan, FPS_SAVER } from "../lib/api";
import { folderAkun, labelPreset, sesuaiPreset, IkonFolder } from "../lib/folder";

export default function LaunchBar({
  nilai,
  setNilai,
  jumlahDipilih,
  namaDipilih,
  onLuncurkan,
  statusLuncur,
  antrean,
  onBatalkan,
  pilihanLuar,
  serverTersimpan = [],
  onPakaiTersimpan,
  onSimpanTarget,
  onKelolaTersimpan,
  fokus,
  pidFokus,
  sembunyikanUsername,
  aksiAkun,
  folder = [],
}) {
  const ubah = (k) => (e) => setNilai({ ...nilai, [k]: e.target.value });
  const [tersimpanBaru, setTersimpanBaru] = useState(false);
  useEffect(() => {
    if (!tersimpanBaru) return;
    const h = setTimeout(() => setTersimpanBaru(false), 2000);
    return () => clearTimeout(h);
  }, [tersimpanBaru]);
  const bisaSimpan = !!(String(nilai.placeId || "").trim() || String(nilai.linkCode || "").trim());
  const busy = !!statusLuncur || !!antrean;
  const ikutiAktif = String(nilai.ikuti || "").trim() !== "";
  const diabaikan = ikutiAktif ? "prop-diabaikan" : undefined;
  const ketDiabaikan = ikutiAktif ? "Ignored while Follow player is active." : undefined;
  const jedaBerlaku = jumlahDipilih >= 2;

  return (
    <aside className="panel flex w-[300px] flex-none flex-col">
      <PanelTitle>Properties</PanelTitle>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Category
          judul="Launch target"
          aksi={
            <div className="flex items-center gap-0.5">
              <Dropdown
                trigger={
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm gap-1 px-1.5 text-meta font-normal"
                    title="Saved servers: game + Job ID + private server in one click"
                  >
                    <Bookmark size={12} aria-hidden /> Saved{serverTersimpan.length ? ` ${serverTersimpan.length}` : ""}
                    <ChevronDown size={11} aria-hidden />
                  </button>
                }
              >
                {serverTersimpan.length === 0 ? (
                  <div className="px-3 py-2 text-meta leading-4 text-dim">
                    No saved servers yet. Fill in the launch target, then click the bookmark button.
                  </div>
                ) : (
                  serverTersimpan.map((s) => {
                    const j = jenisServer(s);
                    return (
                      <DropdownItem key={s.id} icon={j.ikon} onClick={() => onPakaiTersimpan?.(s)}>
                        <span className="min-w-0 flex-1 truncate">{s.nama}</span>
                      </DropdownItem>
                    );
                  })
                )}
                <DropdownSeparator />
                <DropdownItem icon={Bookmark} onClick={() => onKelolaTersimpan?.()}>
                  Manage saved servers…
                </DropdownItem>
              </Dropdown>
              <IconButton
                icon={tersimpanBaru ? BookmarkCheck : BookmarkPlus}
                size={13}
                title={tersimpanBaru ? "Saved" : bisaSimpan ? "Save this launch target" : "Pick a game or paste a private server link to save"}
                disabled={!bisaSimpan}
                onClick={async () => {
                  if (await onSimpanTarget?.()) setTersimpanBaru(true);
                }}
                className={cx("h-6 w-6", tersimpanBaru && "text-ok")}
              />
            </div>
          }
        >
          <Prop nama="Game" kelas={diabaikan} title={ketDiabaikan}>
            <GamePicker
              varian="panel"
              nilai={nilai.placeId}
              pilihanLuar={pilihanLuar}
              onPilih={(placeId, meta) =>
                setNilai({
                  ...nilai,
                  placeId,
                  gameName: meta?.name || "",
                  gameIcon: meta?.icon || "",
                })
              }
            />
          </Prop>
          <Prop nama="Job ID" kelas={diabaikan} title={ketDiabaikan || "Join one specific public server. Pick one on the Servers page."}>
            <input
              className="cell"
              value={nilai.jobId}
              onChange={ubah("jobId")}
              placeholder="Any server"
              aria-label="Job ID"
              aria-description={ketDiabaikan || "Join one specific public server."}
            />
          </Prop>
          <Prop
            nama="Private server"
            kelas={diabaikan}
            title={ketDiabaikan || "VIP link, roblox.com/share link, or accessCode=<code> for an invited account."}
            hint={ikutiAktif ? undefined : "VIP link, share link, or access code."}
          >
            <input
              className="cell"
              value={nilai.linkCode}
              onChange={ubah("linkCode")}
              placeholder="None"
              aria-label="Private server"
              aria-description={ketDiabaikan || "Paste a VIP link, share link, or access code."}
            />
          </Prop>
          <Prop
            nama="Follow player"
            kelas={ikutiAktif ? "prop-aktif" : undefined}
            title="Join whichever server this player is in. Overrides game, Job ID, and private server."
          >
            <input
              className="cell"
              value={nilai.ikuti}
              onChange={ubah("ikuti")}
              placeholder="Username"
              aria-label="Follow player"
              aria-description="Overrides game, Job ID, and private server."
            />
          </Prop>
          {ikutiAktif && (
            <div role="status" className="strip-warn flex items-start gap-2 border-b border-line px-6 py-1.5 text-meta leading-4">
              <AlertTriangle size={13} className="mt-px flex-none text-warn" aria-hidden />
              <span>Follow player overrides game and server settings.</span>
            </div>
          )}
        </Category>

        <Category judul="Launch behavior">
          <Prop
            nama="Delay (s)"
            title={jedaBerlaku ? "Counted after the previous client has joined." : "Has no effect with fewer than two accounts selected."}
            hint="Used only when launching multiple accounts."
            hintTetap
          >
            <input
              className="cell"
              type="number"
              min="0"
              max="60"
              value={nilai.jeda}
              onChange={ubah("jeda")}
              disabled={!jedaBerlaku}
              aria-label="Delay between launches (seconds)"
              aria-description="Used only when launching multiple accounts."
            />
          </Prop>
        </Category>

        <Category judul="Selection" kanan={jumlahDipilih ? `${jumlahDipilih} selected` : "none"}>
          <div className="border-b border-line px-6 py-1.5 text-body leading-5">
            <div className={jumlahDipilih ? "text-ink" : "text-dim"}>
              Selected: {jumlahDipilih} account{jumlahDipilih === 1 ? "" : "s"}
            </div>
            {jumlahDipilih === 0 ? (
              <div className="text-dim">Select accounts in the list to launch or run bulk actions.</div>
            ) : (
              <div className="line-clamp-2 text-dim" title={namaDipilih.join(", ")}>
                {namaDipilih.join(", ")}
              </div>
            )}
          </div>
        </Category>

        {!fokus && (
          <Category judul="Account">
            <div className="border-b border-line px-6 py-1.5 text-body leading-5 text-dim">
              Click an account name to see its details. Clicking does not change the selection.
            </div>
          </Category>
        )}
        {fokus && (
          <Category judul={`Account: ${fokus.alias}`}>
            <Prop nama="Username">
              <span className="truncate select-text">
                {fokus.username ? `@${sembunyikanUsername ? samarkan(fokus.username) : fokus.username}` : "Not refreshed"}
              </span>
            </Prop>
            <Prop nama="Last launched">
              <span className="truncate">{waktuRelatif(fokus.last_launched) || "Never launched"}</span>
            </Prop>
            {folder.length > 0 && (
              <Prop nama="Folder" title="Moving an account into a folder with a resource saver preset applies that preset.">
                <IkonFolder f={folder.find((f) => f.id === folderAkun(fokus, folder)) || null} size={12} />
                <select
                  className="cell min-w-0 flex-1"
                  value={folderAkun(fokus, folder) || ""}
                  onChange={(e) => aksiAkun.pindah?.(e.target.value || null)}
                  aria-label="Folder"
                >
                  <option value="">Ungrouped</option>
                  {folder.map((f) => <option key={f.id} value={f.id}>{f.nama}</option>)}
                </select>
              </Prop>
            )}
            <Prop nama="FPS limit">
              <span className="flex-1">
                {fokus.hemat ? `${fokus.hemat_fps || 10} FPS (saver)` : fokus.fps_cap ? `${fokus.fps_cap} FPS` : "Roblox default"}
              </span>
              <IconButton
                icon={Pencil}
                size={12}
                title={fokus.hemat ? "Change FPS limit (used when resource saver is off)" : "Change FPS limit"}
                onClick={aksiAkun.fps}
                className="-my-1"
              />
            </Prop>
            {(() => {
              const f = folder.find((x) => x.id === folderAkun(fokus, folder));
              if (!f?.preset) return null;
              const sama = sesuaiPreset(fokus, f.preset);
              return (
                <div className={cx("flex items-center gap-2 border-b border-line px-6 py-1 text-meta leading-4", sama ? "text-dim" : "text-warn")}>
                  <span className="min-w-0 flex-1">
                    {sama ? `Follows the ${f.nama} preset: ${labelPreset(f.preset)}.` : `Differs from the ${f.nama} preset (${labelPreset(f.preset)}).`}
                  </span>
                  {!sama && (
                    <button type="button" className="link flex-none" onClick={() => aksiAkun.terapkanPreset?.(f)}>
                      Apply folder preset
                    </button>
                  )}
                </div>
              );
            })()}
            <Prop
              nama="Resource saver"
              title="For AFK accounts: low FPS (10 by default), low graphics, low priority. Measured on Violence District at 10 FPS: CPU about -66%, GPU about -69%."
              hint={`${fokus.hemat_fps || 10} FPS, low graphics, low priority. Applies from the next launch.`}
            >
              <label className="flex min-w-0 cursor-pointer items-center gap-2">
                <Checkbox
                  checked={!!fokus.hemat}
                  onChange={(v) => aksiAkun.hemat?.({ hemat: v })}
                  aria-label="Resource saver (AFK)"
                />
                <span className="truncate">{fokus.hemat ? "On (AFK)" : "Off"}</span>
              </label>
            </Prop>
            {fokus.hemat && (
              <>
                <Prop
                  nama="Saver FPS"
                  title="Frame rate while resource saver is on. It replaces the account's FPS limit until resource saver is turned off. 10 FPS uses the least CPU and GPU."
                  hint="Replaces the FPS limit while saver is on."
                >
                  <select
                    className="cell"
                    value={fokus.hemat_fps || 10}
                    onChange={(e) => aksiAkun.hemat?.({ hemat_fps: Number(e.target.value) })}
                    aria-label="Saver FPS"
                  >
                    {FPS_SAVER.map((f) => (
                      <option key={f} value={f}>{f === 10 ? "10 FPS (recommended)" : f === 3 ? "3 FPS (lowest CPU/GPU)" : `${f} FPS`}</option>
                    ))}
                  </select>
                </Prop>
                <Prop
                  nama="Minimize"
                  title="Minimizes the window after it joins: GPU drops to 0%, but private memory grows by about 750 MB and GPU memory doubles."
                  hint="GPU 0%, but uses more memory."
                >
                  <label className="flex min-w-0 cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={!!fokus.hemat_minimize}
                      onChange={(v) => aksiAkun.hemat?.({ hemat_minimize: v })}
                      aria-label="Minimize window after joining"
                    />
                    <span className="truncate">{fokus.hemat_minimize ? "After joining" : "Off"}</span>
                  </label>
                </Prop>
                <Prop
                  nama="RAM limit"
                  title="Caps the client's physical memory. The rest is compressed in RAM by Windows, not written to disk while memory is free. 512 MB saved about 54% physical RAM in testing."
                  hint="Rest is compressed in RAM by Windows."
                >
                  <select
                    className="cell"
                    value={fokus.hemat_ram_mb || 0}
                    onChange={(e) => aksiAkun.hemat?.({ hemat_ram_mb: Number(e.target.value) })}
                    aria-label="RAM limit"
                  >
                    <option value={0}>Off</option>
                    <option value={1024}>1024 MB</option>
                    <option value={512}>512 MB (recommended)</option>
                    <option value={256}>256 MB</option>
                    <option value={128}>128 MB (less RAM, more CPU)</option>
                  </select>
                </Prop>
              </>
            )}
            <Prop nama="Cookie">
              <StatusBadge jenis={fokus.last_error ? "bad" : "ok"} className={fokus.last_error ? "text-bad" : "text-ok"}>
                {fokus.last_error ? "Rejected" : "Healthy"}
              </StatusBadge>
            </Prop>
            {fokus.last_error && (
              <p className="m-0 border-b border-line px-6 py-1.5 text-meta leading-4 text-bad select-text break-words">
                {fokus.last_error}
              </p>
            )}
            <Prop nama="Client">
              <StatusBadge
                jenis={pidFokus?.length ? "run" : "idle"}
                className={cx("select-text", pidFokus?.length ? "text-ok" : "text-dim")}
              >
                {pidFokus?.length ? `Running, PID ${pidFokus.join(", ")}` : "Not running"}
              </StatusBadge>
            </Prop>
            <Prop nama="User ID">
              <span className="truncate select-text">{fokus.user_id || "—"}</span>
            </Prop>
            <div className="flex flex-wrap gap-1 border-b border-line px-2 py-1.5">
              <IconButton icon={Pencil} title="Rename" onClick={aksiAkun.rename} />
              <IconButton icon={RefreshCw} title="Refresh data" onClick={aksiAkun.segarkan} />
              <IconButton icon={KeyRound} title="Refresh cookie" onClick={aksiAkun.cookie} />
              <IconButton icon={Copy} title="Copy cookie" onClick={aksiAkun.salin} />
              <IconButton icon={Gauge} title="FPS limit" onClick={aksiAkun.fps} />
              <IconButton icon={Trash2} variant="danger" title="Delete account" onClick={aksiAkun.hapus} className="ml-auto" />
            </div>
          </Category>
        )}
      </div>

      <div className="flex-none border-t border-line bg-app-side p-2">
        {antrean ? (
          <ProgresLuncur antrean={antrean} statusLuncur={statusLuncur} onBatalkan={onBatalkan} />
        ) : (
          <button
            type="button"
            onClick={onLuncurkan}
            disabled={jumlahDipilih === 0 || busy}
            title={jumlahDipilih === 0 ? "Select one or more accounts first" : undefined}
            data-luncur-utama
            className={cx("btn btn-play btn-lg w-full text-body", busy && "opacity-100!")}
          >
            <Play size={15} fill="currentColor" strokeWidth={0} className="flex-none" />
            <span className="truncate">
              {busy
                ? statusLuncur
                : jumlahDipilih > 1
                  ? `Launch ${jumlahDipilih} accounts`
                  : "Launch"}
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}

const LABEL = {
  queued: ["queued", "Queued"],
  starting: ["busy", "Starting…"],
  joining: ["busy", "Joining…"],
  launched: ["ok", "Launched"],
  failed: ["fail", "Failed"],
  cancelled: ["skip", "Cancelled"],
};

function ProgresLuncur({ antrean, statusLuncur, onBatalkan }) {
  const { item, batal, fase } = antrean;
  const total = item.length;
  const n = (s) => item.filter((x) => x.status === s).length;
  const selesai = n("launched") + n("failed") + n("cancelled");
  const posisi = Math.min(total, item.filter((x) => x.status !== "queued" && x.status !== "cancelled").length);
  const sisa = n("queued");
  const persiapan = fase === "preparing";
  const labelBatal = sisa > 0 && !persiapan ? "Cancel remaining" : persiapan ? "Cancel" : "Stop waiting";
  const ref = useRef(null);

  useEffect(() => {
    const kini = document.activeElement;
    if (!kini || kini === document.body || kini.disabled || kini.closest("[data-luncur-utama]")) {
      ref.current?.focus();
    }
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-progres-luncur
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-body font-semibold text-ink">
          {persiapan
            ? `Preparing to launch ${total} account${total === 1 ? "" : "s"}`
            : `Launching ${Math.max(posisi, 1)} of ${total} account${total === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="truncate text-meta text-dim">{statusLuncur || "Preparing…"}</div>
      <div className="h-1 overflow-hidden rounded-full bg-well" aria-hidden>
        <div className="h-full bg-accent-hi transition-[width] motion-reduce:transition-none" style={{ width: `${(selesai / total) * 100}%` }} />
      </div>
      <div className="text-meta text-dim tabular-nums">
        {n("launched")} launched · {n("failed")} failed · {sisa} remaining
      </div>
      <ul className="m-0 max-h-[104px] list-none overflow-y-auto border border-line bg-well p-0">
        {item.map((x) => {
          const [jenis, label] = LABEL[x.status] || LABEL.queued;
          return (
            <li key={x.id} className="flex h-6 items-center gap-2 px-2 text-meta" title={x.pesan || undefined}>
              <span className="min-w-0 flex-1 truncate text-ink">{x.alias}</span>
              <StatusBadge jenis={jenis} className={x.status === "failed" ? "text-bad" : "text-dim"}>
                {label}
              </StatusBadge>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="btn btn-secondary w-full"
        onClick={onBatalkan}
        disabled={batal}
      >
        {batal ? "Cancelling…" : labelBatal}
      </button>
      <p className="m-0 text-meta leading-4 text-dim">
        {batal
          ? "Accounts that already started keep running. Nothing is closed."
          : labelBatal === "Stop waiting"
            ? "Stops waiting for the join. The Roblox client keeps running."
            : null}
      </p>
    </div>
  );
}
