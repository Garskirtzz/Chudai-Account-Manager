import { useEffect, useRef, useState } from "react";
import { Ban, UserPlus, Tag, ShieldOff, Search, Wrench, AlertTriangle, CircleCheck } from "lucide-react";
import { api, FPS_SAVER } from "../lib/api";
import Modal from "./Modal";
import { Button, Input, StatusBadge, cx } from "./Primitives";

export default function AccountTools({ terbuka, onTutup, akunDipilih, beriTahu, onHemat, folder = [], onPindah }) {
  const [folderTujuan, setFolderTujuan] = useState("");
  const [target, setTarget] = useState("");
  const [ketemu, setKetemu] = useState(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [sibuk, setSibuk] = useState("");
  const [hasil, setHasil] = useState(null);
  const [blokir, setBlokir] = useState(null);
  const [tanya, setTanya] = useState(null);
  const [ramMassal, setRamMassal] = useState(512);
  const [fpsMassal, setFpsMassal] = useState(10);
  const [hasilHemat, setHasilHemat] = useState(null);
  const kotakTanya = useRef(null);

  useEffect(() => {
    if (tanya) kotakTanya.current?.querySelector("button")?.focus();
  }, [tanya]);

  const ids = akunDipilih.map((a) => a.id);
  const n = ids.length;
  const pertama = akunDipilih[0];
  const jumlahAkun = `${n} selected account${n === 1 ? "" : "s"}`;
  const hematAktif = akunDipilih.filter((a) => a.hemat).length;

  const kunciSeleksi = ids.join(",");
  useEffect(() => {
    setBlokir(null);
    setHasil(null);
    setTanya(null);
    setHasilHemat(null);
  }, [kunciSeleksi, terbuka]);

  const cari = async () => {
    setSibuk("cari");
    setKetemu(null);
    try {
      const u = await api.cariUser(target, ids[0]);
      setKetemu(u);
    } catch (e) {
      beriTahu(String(e), "salah");
    } finally {
      setSibuk("");
    }
  };

  const jalankan = async (nama, label, sasaranIds, fn) => {
    setTanya(null);
    setSibuk(nama);
    setHasil(null);
    try {
      const r = await fn();
      const dilewati = Math.max(0, sasaranIds.length - r.berhasil - r.gagal.length);
      const h = { label, total: sasaranIds.length, berhasil: r.berhasil, gagal: r.gagal, dilewati };
      setHasil(h);
      const ringkas = `${label}: ${r.berhasil} succeeded · ${r.gagal.length} failed${dilewati ? ` · ${dilewati} skipped` : ""}`;
      beriTahu(ringkas, r.gagal.length || dilewati ? "salah" : "benar");
      for (const g of r.gagal) beriTahu(`  ${g}`, "salah");
      return h;
    } catch (e) {
      beriTahu(`${label} failed: ${e}`, "salah");
    } finally {
      setSibuk("");
    }
  };

  const konfirmasi = (judul, label, jalan) => setTanya({ judul, label, jalan });

  const muatBlokir = async () => {
    setSibuk("blokir");
    try {
      setBlokir(await api.daftarBlokir(ids[0]));
    } catch (e) {
      beriTahu(String(e), "salah");
    } finally {
      setSibuk("");
    }
  };

  const namaTarget = ketemu ? ketemu.username || `User ${ketemu.user_id}` : "";

  return (
    <Modal
      buka={terbuka}
      onTutup={onTutup}
      kunci={!!sibuk && sibuk !== "cari"}
      judul={`Account tools — ${jumlahAkun}`}
      ikon={Wrench}
      lebar="w-[540px]"
    >
      <p className="mb-4 text-body leading-5 text-dim">
        Actions in the first two sections run on all{" "}
        <span className="font-semibold text-ink">{jumlahAkun}</span>
        {n > 0 && (
          <>
            :{" "}
            <span className="text-ink">{akunDipilih.map((a) => a.alias).join(", ")}</span>
          </>
        )}
        .
      </p>

      <section className="mb-4 border border-line bg-app-bg p-3" aria-label="Target player">
        <div className="flex items-end gap-2">
          <Input
            label="Target player"
            hint="username, profile link or ID"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Builderman"
            wrapClassName="flex-1"
            onKeyDown={(e) => e.key === "Enter" && target && cari()}
          />
          <Button icon={Search} onClick={cari} disabled={!target || !!sibuk}>
            {sibuk === "cari" ? "Finding…" : "Find"}
          </Button>
        </div>

        {ketemu && (
          <p className="mt-2 text-meta leading-4 text-dim select-text">
            <span className="font-semibold text-ink">{namaTarget}</span>{" "}
            <span className="text-dim">#{ketemu.user_id}</span>
            {ketemu.place_id ? ` — playing ${ketemu.game_name}` : " — not in a game"}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            icon={Ban}
            disabled={!ketemu || !!sibuk}
            onClick={() =>
              konfirmasi(`Block ${namaTarget} on ${jumlahAkun}?`, `Block on ${n}`, () =>
                jalankan("block", `Block ${namaTarget}`, ids, () => api.blokirUser(ids, ketemu.user_id, false))
              )
            }
          >
            Block
          </Button>
          <Button
            icon={ShieldOff}
            disabled={!ketemu || !!sibuk}
            onClick={() =>
              konfirmasi(`Unblock ${namaTarget} on ${jumlahAkun}?`, `Unblock on ${n}`, () =>
                jalankan("unblock", `Unblock ${namaTarget}`, ids, () => api.blokirUser(ids, ketemu.user_id, true))
              )
            }
          >
            Unblock
          </Button>
          <Button
            icon={UserPlus}
            disabled={!ketemu || !!sibuk}
            onClick={() =>
              konfirmasi(`Send a friend request to ${namaTarget} from ${jumlahAkun}?`, `Send from ${n}`, () =>
                jalankan("friend", `Friend request to ${namaTarget}`, ids, () => api.tambahTeman(ids, ketemu.user_id))
              )
            }
          >
            Add friend
          </Button>
        </div>
      </section>

      <section className="mb-4 border border-line bg-app-bg p-3" aria-label="Display name">
        <div className="flex items-end gap-2">
          <Input
            label="New display name"
            hint="Roblox allows one change per 7 days"
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
            placeholder="NewName"
            wrapClassName="flex-1"
          />
          <Button
            icon={Tag}
            disabled={namaBaru.trim().length < 3 || !!sibuk}
            onClick={() =>
              konfirmasi(
                `Rename ${jumlahAkun} to "${namaBaru.trim()}"?`,
                `Rename ${n}`,
                () => jalankan("nama", `Display name "${namaBaru.trim()}"`, ids, () => api.ubahDisplayName(ids, namaBaru.trim()))
              )
            }
          >
            Apply
          </Button>
        </div>
      </section>

      {tanya && (
        <div
          ref={kotakTanya}
          role="alertdialog"
          aria-label="Confirm bulk action"
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setTanya(null); } }}
          className="strip-warn mb-4 border border-warn/50 p-3"
        >
          <p className="m-0 flex gap-2 text-body leading-5 text-ink">
            <AlertTriangle size={14} className="mt-0.5 flex-none text-warn" aria-hidden />
            <span>
              <span className="font-semibold">{tanya.judul}</span>
              <span className="block text-meta leading-4 text-dim">
                This will run on {jumlahAkun}, one request per account.
              </span>
            </span>
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTanya(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={tanya.jalan}>
              {tanya.label}
            </Button>
          </div>
        </div>
      )}

      {hasil && <Hasil h={hasil} akunDipilih={akunDipilih} />}

      {folder.length > 0 && (
        <section className="mb-4 border border-line bg-app-bg p-3" aria-label="Folder">
          <div className="text-body font-semibold text-ink">Folder</div>
          <div className="text-meta leading-4 text-dim">
            Move the selected accounts. A folder's resource saver preset is applied to accounts moved into it.
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="field w-auto flex-none"
              value={folderTujuan}
              onChange={(e) => setFolderTujuan(e.target.value)}
              aria-label="Move selected accounts to folder"
            >
              <option value="">Ungrouped</option>
              {folder.map((f) => <option key={f.id} value={f.id}>{f.nama}</option>)}
            </select>
            <Button className="flex-none" disabled={n === 0} onClick={() => onPindah?.(akunDipilih.map((a) => a.id), folderTujuan || null)}>
              Move {n} account{n === 1 ? "" : "s"}
            </Button>
          </div>
        </section>
      )}

      <section className="mb-4 border border-line bg-app-bg p-3" aria-label="Resource saver">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-body font-semibold text-ink">
              Resource saver (AFK)
              {n > 0 && (
                <StatusBadge
                  jenis={hematAktif === n ? "ok" : hematAktif === 0 ? "idle" : "warn"}
                  className={cx("font-normal", hematAktif === n ? "text-ok" : "text-dim")}
                >
                  {hematAktif} of {n} on
                </StatusBadge>
              )}
            </div>
            <div className="text-meta leading-4 text-dim">
              {fpsMassal} FPS, low graphics, low priority{ramMassal ? `, RAM limit ${ramMassal} MB` : ""}. Applies from the next launch.
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="field w-auto flex-none"
            value={fpsMassal}
            onChange={(e) => setFpsMassal(Number(e.target.value))}
            aria-label="FPS for selected accounts"
            title="FPS applied when turning resource saver on"
          >
            {FPS_SAVER.map((f) => (
              <option key={f} value={f}>FPS: {f}</option>
            ))}
          </select>
          <select
            className="field w-auto flex-none"
            value={ramMassal}
            onChange={(e) => setRamMassal(Number(e.target.value))}
            aria-label="RAM limit for selected accounts"
            title="RAM limit applied when turning resource saver on"
          >
            <option value={0}>RAM: Off</option>
            <option value={1024}>RAM: 1024 MB</option>
            <option value={512}>RAM: 512 MB</option>
            <option value={256}>RAM: 256 MB</option>
            <option value={128}>RAM: 128 MB (more CPU)</option>
          </select>
          <Button
            className="flex-none"
            disabled={!!sibuk || n === 0}
            onClick={() => konfirmasi(`Turn resource saver on for ${jumlahAkun} at ${fpsMassal} FPS${ramMassal ? ` with a ${ramMassal} MB RAM limit` : ", RAM limit off"}?`, `Turn on for ${n}`, async () => {
              setTanya(null);
              setHasilHemat(null);
              const gagal = (await onHemat?.(akunDipilih, { hemat: true, hemat_ram_mb: ramMassal, hemat_fps: fpsMassal })) || 0;
              setHasilHemat({ ok: n - gagal, gagal, teks: `Turned on for ${n - gagal} of ${n} · ${fpsMassal} FPS${ramMassal ? ` · RAM limit ${ramMassal} MB` : " · RAM limit off"}` });
            })}
          >
            Turn on
          </Button>
          <Button
            className="flex-none"
            disabled={!!sibuk || n === 0 || hematAktif === 0}
            onClick={() => konfirmasi(`Turn resource saver off for ${jumlahAkun}?`, `Turn off for ${n}`, async () => {
              setTanya(null);
              setHasilHemat(null);
              const gagal = (await onHemat?.(akunDipilih, { hemat: false })) || 0;
              setHasilHemat({ ok: n - gagal, gagal, teks: `Turned off for ${n - gagal} of ${n}` });
            })}
          >
            Turn off
          </Button>
        </div>
        {hasilHemat && (
          <p role="status" className={cx("mt-2 mb-0 flex items-center gap-1.5 text-meta", hasilHemat.gagal ? "text-warn" : "text-ok")}>
            {hasilHemat.gagal ? <AlertTriangle size={12} aria-hidden /> : <CircleCheck size={12} aria-hidden />}
            {hasilHemat.teks}{hasilHemat.gagal ? ` · ${hasilHemat.gagal} failed (see Output)` : ""}. Relaunch to apply.
          </p>
        )}
        {n > 0 && (
          <ul className="mt-2 mb-0 max-h-36 list-none overflow-y-auto border border-line p-0" aria-label="Resource saver per account">
            {akunDipilih.map((a) => (
              <li key={a.id} className="flex h-7 items-center gap-2 border-b border-line px-2 text-meta last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-ink">{a.alias}</span>
                <span className="w-48 flex-none truncate text-dim">
                  {a.hemat ? `${a.hemat_fps || 10} FPS · ${a.hemat_ram_mb ? `RAM ${a.hemat_ram_mb} MB` : "RAM limit off"}${a.hemat_minimize ? " · minimize" : ""}` : ""}
                </span>
                <StatusBadge jenis={a.hemat ? "ok" : "idle"} className={cx("w-12 flex-none", a.hemat ? "text-ok" : "text-dim")}>
                  {a.hemat ? "On" : "Off"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-line bg-app-bg p-3" aria-label="Blocked list">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-body font-semibold text-ink">Blocked list — first selected account only</div>
            <div className="truncate text-meta leading-4 text-dim">
              {pertama ? `Shows and changes blocks for ${pertama.alias} only.` : "No account selected."}
            </div>
          </div>
          <Button onClick={muatBlokir} disabled={!!sibuk || !pertama} className="flex-none">
            {sibuk === "blokir" ? "Loading…" : blokir ? "Reload" : "Load"}
          </Button>
        </div>

        {blokir && (
          <>
            {blokir.length === 0 ? (
              <p className="mt-2 mb-0 text-meta text-dim">Nobody is blocked on {pertama?.alias}.</p>
            ) : (
              <>
                <ul className="mt-2 mb-0 max-h-40 list-none overflow-auto p-0">
                  {blokir.map((b) => (
                    <li key={b.user_id} className="flex h-7 items-center gap-2 px-1.5 text-body text-ink hover:bg-hover">
                      <span className="min-w-0 flex-1 truncate select-text">{b.nama}</span>
                      <Button
                        variant="ghost"
                        className="flex-none px-2 text-meta"
                        disabled={!!sibuk}
                        aria-label={`Unblock ${b.nama} on ${pertama.alias}`}
                        onClick={() =>
                          jalankan("unblock", `Unblock ${b.nama} on ${pertama.alias}`, [ids[0]], () =>
                            api.blokirUser([ids[0]], b.user_id, true)
                          ).then(muatBlokir)
                        }
                      >
                        Unblock
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-2 w-full"
                  disabled={!!sibuk}
                  onClick={() =>
                    konfirmasi(
                      `Unblock all ${blokir.length} players on ${pertama.alias}?`,
                      "Unblock everyone",
                      async () => {
                        setTanya(null);
                        setSibuk("semua");
                        try {
                          const n2 = await api.bukaBlokirSemua(ids[0]);
                          beriTahu(`Unblocked ${n2} on ${pertama.alias}.`, "benar");
                          await muatBlokir();
                        } catch (e) {
                          beriTahu(String(e), "salah");
                        } finally {
                          setSibuk("");
                        }
                      }
                    )
                  }
                >
                  Unblock everyone on {pertama.alias}
                </Button>
              </>
            )}
          </>
        )}
      </section>
    </Modal>
  );
}

function Hasil({ h, akunDipilih }) {
  const gagalPer = new Map(
    h.gagal.map((g) => {
      const i = g.indexOf(": ");
      return i > 0 ? [g.slice(0, i), g.slice(i + 2)] : [g, ""];
    })
  );
  const bersih = h.gagal.length === 0 && h.dilewati === 0;
  return (
    <div
      role="status"
      className={cx(
        "mb-4 border p-3",
        bersih ? "strip-success border-ok/40" : "strip-warn border-warn/50"
      )}
    >
      <p className="m-0 flex items-center gap-2 text-body font-semibold text-ink">
        {bersih ? (
          <CircleCheck size={14} className="flex-none text-ok" aria-hidden />
        ) : (
          <AlertTriangle size={14} className="flex-none text-warn" aria-hidden />
        )}
        {h.label}: {h.berhasil} succeeded · {h.gagal.length} failed
        {h.dilewati ? ` · ${h.dilewati} skipped` : ""}
      </p>
      {h.total > 1 && (
        <ul className="mt-2 mb-0 max-h-36 list-none overflow-auto p-0">
          {akunDipilih.slice(0, h.total).map((a) => {
            const galat = gagalPer.get(a.alias);
            return (
              <li key={a.id} className="flex items-start gap-2 py-0.5 text-meta leading-4">
                <span className="w-28 flex-none truncate text-ink">{a.alias}</span>
                {galat !== undefined ? (
                  <StatusBadge jenis="fail" className="min-w-0 text-bad select-text">
                    {galat || "Failed"}
                  </StatusBadge>
                ) : (
                  <StatusBadge jenis="ok" className="text-dim">{h.dilewati ? "No error reported" : "Done"}</StatusBadge>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {h.total === 1 && h.gagal.length > 0 && (
        <p className="mt-1 mb-0 text-meta leading-4 text-bad select-text">{h.gagal.join("; ")}</p>
      )}
    </div>
  );
}
