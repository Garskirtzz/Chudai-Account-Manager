import { useState } from "react";
import { Bookmark, Pencil, Trash2, Check, X, Gamepad2, Lock, Server } from "lucide-react";
import { Button, IconButton, tombolBaris, useRoving, cx } from "./Primitives";

export function jenisServer(s) {
  if (s.link_code) return { ikon: Lock, teks: "Private server" };
  if (s.job_id) return { ikon: Server, teks: `Server ${s.job_id.slice(0, 8)}` };
  return { ikon: Gamepad2, teks: "Any server" };
}

export default function SavedServers({ daftar, onPakai, onUbahNama, onHapus }) {
  const [buka, setBuka] = useState(true);
  const rov = useRoving(daftar.map((s) => s.id));

  return (
    <section className="flex-none border-b border-line" aria-label="Saved servers">
      <button type="button" className="category" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
        <Bookmark size={13} aria-hidden />
        <span className="min-w-0 flex-1 truncate">Saved servers</span>
        <span className="font-normal text-dim">{daftar.length || "none"}</span>
      </button>
      {buka &&
        (daftar.length === 0 ? (
          <p className="m-0 px-6 py-2 text-meta leading-4 text-dim">
            No saved servers yet. Pick a game and paste a private server link (or a Job ID) in
            Properties → Launch target, then click the bookmark button there. Saved servers stay
            until you delete them.
          </p>
        ) : (
          <ul className="m-0 max-h-48 list-none overflow-y-auto p-0" aria-label="Saved servers list">
            {daftar.map((s, i) => (
              <Baris key={s.id} s={s} rov={rov} pertama={i === 0} onPakai={onPakai} onUbahNama={onUbahNama} onHapus={onHapus} />
            ))}
          </ul>
        ))}
    </section>
  );
}

function Baris({ s, rov, pertama, onPakai, onUbahNama, onHapus }) {
  const [sunting, setSunting] = useState(false);
  const [nama, setNama] = useState(s.nama);
  const [yakin, setYakin] = useState(false);
  const j = jenisServer(s);

  const simpanNama = async () => {
    if (nama.trim() && nama.trim() !== s.nama) await onUbahNama(s, nama.trim());
    setSunting(false);
  };

  return (
    <li
      data-baris
      tabIndex={rov.tab(s.id, pertama)}
      onFocus={rov.fokus(s.id)}
      onKeyDown={(e) => !sunting && tombolBaris(e, () => onPakai(s))}
      onDoubleClick={() => !sunting && onPakai(s)}
      aria-label={`${s.nama}, ${s.game_name || `place ${s.place_id}`}, ${j.teks}. Press Enter to use as launch target`}
      className="group flex h-(--density-list-row) items-center gap-2 border-b border-line pr-2 pl-6 hover:bg-hover focus-visible:bg-hover last:border-b-0"
    >
      {s.game_icon ? (
        <img src={s.game_icon} alt="" className="h-5 w-5 flex-none rounded-[3px] bg-well" />
      ) : (
        <span className="grid h-5 w-5 flex-none place-items-center rounded-[3px] bg-well" aria-hidden>
          <Gamepad2 size={11} className="text-faint" />
        </span>
      )}
      {sunting ? (
        <input
          autoFocus
          className="field h-6 min-w-0 flex-1"
          value={nama}
          maxLength={80}
          onChange={(e) => setNama(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") simpanNama();
            if (e.key === "Escape") { setNama(s.nama); setSunting(false); }
          }}
          aria-label="Saved server name"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">
          <span className="text-ink">{s.nama}</span>
          <span className="ml-2 text-meta text-dim">{s.game_name || `Place ${s.place_id}`}</span>
        </span>
      )}
      <span className="inline-flex w-32 flex-none items-center gap-1 truncate text-meta text-dim">
        <j.ikon size={11} aria-hidden /> {j.teks}
      </span>
      {sunting ? (
        <>
          <IconButton icon={Check} title="Save name" onClick={simpanNama} />
          <IconButton icon={X} title="Cancel rename" onClick={() => { setNama(s.nama); setSunting(false); }} />
        </>
      ) : (
        <>
          <Button className="btn-sm flex-none" variant="primary" onClick={() => onPakai(s)} aria-label={`Use ${s.nama} as launch target`}>
            Use
          </Button>
          <IconButton icon={Pencil} title="Rename" onClick={() => setSunting(true)} />
          <Button
            className={cx("btn-sm flex-none", !yakin && "w-7 px-0")}
            variant={yakin ? "destroy" : "danger"}
            icon={Trash2}
            onBlur={() => setYakin(false)}
            onMouseLeave={() => setYakin(false)}
            onClick={() => (yakin ? onHapus(s) : setYakin(true))}
            aria-label={yakin ? `Confirm: delete ${s.nama}` : `Delete ${s.nama}`}
            title="Delete (click twice)"
          >
            {yakin ? "Delete" : null}
          </Button>
        </>
      )}
    </li>
  );
}
