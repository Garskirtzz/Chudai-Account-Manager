import { useState } from "react";
import { History, Trash2, Gamepad2, Crosshair } from "lucide-react";
import { Button, Keadaan, tombolBaris, useRoving, cx } from "./Primitives";
import { waktuRelatif } from "../lib/api";

export default function HistoryView({ riwayat, status = "siap", onCobaLagi, onPilihGame, onBersihkan }) {
  const [terpilih, setTerpilih] = useState(null);
  const rov = useRoving([...new Set(riwayat.map((r) => r.place_id))]);

  if (!riwayat.length && status === "memuat") {
    return <Keadaan jenis="memuat" judul="Loading history…" />;
  }
  if (!riwayat.length && status === "galat") {
    return (
      <Keadaan
        jenis="galat"
        judul="Couldn’t load history"
        teks="The launch history file could not be read. Accounts and launching still work."
        onCobaLagi={onCobaLagi}
      />
    );
  }
  if (!riwayat.length) {
    return (
      <div className="flex h-full items-start justify-center pt-[12vh] text-center">
        <div className="max-w-sm">
          <History size={30} className="mx-auto mb-3 text-faint" strokeWidth={1.5} />
          <h3 className="text-title font-semibold text-ink">No games played yet</h3>
          <p className="mt-1.5 text-body leading-5 text-dim">
            Every game an account joins from this app is listed here, so it can
            be picked again in one click.
          </p>
        </div>
      </div>
    );
  }

  const groups = [];
  const index = new Map();
  for (const r of riwayat) {
    let g = index.get(r.place_id);
    if (!g) {
      g = { place_id: r.place_id, game_name: r.game_name, icon_url: r.icon_url, at: r.at, accounts: [] };
      index.set(r.place_id, g);
      groups.push(g);
    }
    g.accounts.push(r);
    if (r.at > g.at) g.at = r.at;
  }

  return (
    <div>
      <div className="flex h-(--density-subbar-height) items-center gap-2 border-b border-line px-3 text-body text-dim">
        <span className="flex-1">
          {groups.length} {groups.length === 1 ? "game" : "games"}. Click one to make it the launch target.
        </span>
        <Button variant="danger" icon={Trash2} onClick={onBersihkan} className="btn-sm px-2">
          Clear history
        </Button>
      </div>

      <table role="grid" aria-label="Launch history" className="w-full table-fixed border-collapse text-body">
        <colgroup>
          <col />
          <col className="w-[22%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="grid-head">Game</th>
            <th className="grid-head">Played by</th>
            <th className="grid-head">Last played</th>
            <th className="grid-head border-r-0">Place ID</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => {
            const sel = terpilih === g.place_id;
            const pakai = () => { setTerpilih(g.place_id); onPilihGame(g); };
            const bisaTab = groups.some((x) => x.place_id === terpilih) ? sel : i === 0;
            return (
              <tr
                key={g.place_id}
                data-baris
                tabIndex={rov.tab(g.place_id, bisaTab)}
                onFocus={rov.fokus(g.place_id)}
                aria-selected={sel}
                aria-label={`${g.game_name}, place ${g.place_id}${sel ? ", current launch target" : ". Press Enter to set as launch target"}`}
                onClick={pakai}
                onKeyDown={(e) => tombolBaris(e, pakai)}
                className={cx("group h-(--density-media-row) cursor-pointer border-b border-line", sel ? "bg-accent text-on-accent" : "hover:bg-hover focus-visible:bg-hover")}
              >
                <td className="px-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {g.icon_url ? (
                      <img src={g.icon_url} alt="" className="h-8 w-8 flex-none rounded-[3px] bg-well" />
                    ) : (
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-[3px] bg-well">
                        <Gamepad2 size={14} className="text-faint" />
                      </span>
                    )}
                    <span className="truncate font-semibold">{g.game_name}</span>
                    <span
                      className={cx(
                        "ml-auto inline-flex flex-none items-center gap-1 text-meta",
                        sel ? "" : "text-dim opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                      )}
                      aria-hidden
                    >
                      <Crosshair size={13} />
                      {sel ? "Launch target" : "Set as target"}
                    </span>
                  </div>
                </td>
                <td className="px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {g.accounts.slice(0, 6).map((r) => (
                        <Avatar key={r.account_id} r={r} />
                      ))}
                    </div>
                    <span className={cx("truncate", !sel && "text-dim")}>
                      {g.accounts.length === 1 ? g.accounts[0].alias : `${g.accounts.length} accounts`}
                    </span>
                  </div>
                </td>
                <td className={cx("truncate px-2", !sel && "text-dim")}>{waktuRelatif(g.at)}</td>
                <td className={cx("truncate px-2 tabular-nums select-text", !sel && "text-dim")}>{g.place_id}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Avatar({ r }) {
  const [gagal, setGagal] = useState(false);
  if (r.avatar_url && !gagal) {
    return (
      <img
        src={r.avatar_url}
        alt=""
        title={r.alias}
        onError={() => setGagal(true)}
        className="h-5 w-5 rounded-full border border-app-bg bg-well"
      />
    );
  }
  return (
    <span
      title={r.alias}
      className="grid h-5 w-5 place-items-center rounded-full border border-app-bg bg-well text-cap font-bold text-dim"
    >
      {(r.alias[0] || "?").toUpperCase()}
    </span>
  );
}
