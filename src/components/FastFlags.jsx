import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, RotateCcw, FileInput, ClipboardPaste, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import Modal from "./Modal";
import { Button, IconButton, Keadaan, cx } from "./Primitives";

const KUNCI_FPS = "DFIntTaskSchedulerTargetFps";
const NAMA_SAH = /^[A-Za-z][A-Za-z0-9_]{0,199}$/;

function jenis(nama) {
  const m = /^(?:D|S)?F(Flag|Int|String|Log)/.exec(nama);
  return m ? { Flag: "Bool", Int: "Int", String: "String", Log: "Log" }[m[1]] : "";
}

function urai(nama, teks) {
  const t = String(teks).trim();
  const j = jenis(nama);
  if (j === "Bool" && /^(true|false)$/i.test(t)) return t.toLowerCase() === "true";
  if ((j === "Int" || j === "Log") && /^-?\d+$/.test(t)) return Number(t);
  return String(teks);
}

const tampil = (v) => (typeof v === "string" ? v : JSON.stringify(v));

export default function FastFlags({ beriTahu }) {
  const [kelola, setKelola] = useState({});
  const [awal, setAwal] = useState({});
  const [berkas, setBerkas] = useState("");
  const [diBerkas, setDiBerkas] = useState({});
  const [nama, setNama] = useState("");
  const [nilai, setNilai] = useState("");
  const [tempel, setTempel] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const pakai = useCallback((v) => {
    setKelola(v.kelola || {});
    setAwal(v.kelola || {});
    setBerkas(v.berkas || "");
    setDiBerkas(v.di_berkas || {});
  }, []);

  const [status, setStatus] = useState("memuat");
  const [galat, setGalat] = useState("");
  const muat = useCallback(() => {
    setStatus("memuat");
    api
      .fflagDaftar()
      .then((v) => { pakai(v); setStatus("siap"); })
      .catch((e) => {
        setStatus("galat");
        setGalat(String(e));
        beriTahu(`Couldn’t load Fast Flags: ${e}`, "salah");
      });
  }, [pakai, beriTahu]);

  useEffect(() => {
    muat();
  }, [muat]);

  const kunci = useMemo(() => Object.keys(kelola).sort((a, b) => a.localeCompare(b)), [kelola]);
  const berubah = JSON.stringify(kelola) !== JSON.stringify(awal);
  const asing = Object.keys(diBerkas).filter((k) => !(k in kelola));

  const tambah = () => {
    const n = nama.trim();
    if (!NAMA_SAH.test(n)) {
      beriTahu(`"${n}" is not a valid flag name. Use letters, digits and _ only.`, "salah");
      return;
    }
    setKelola({ ...kelola, [n]: urai(n, nilai) });
    setNama("");
    setNilai("");
  };

  const hapus = (k) => {
    const b = { ...kelola };
    delete b[k];
    setKelola(b);
  };

  const imporBerkas = () => {
    const b = { ...kelola };
    for (const k of asing) b[k] = diBerkas[k];
    setKelola(b);
    beriTahu(`Imported ${asing.length} flag${asing.length === 1 ? "" : "s"} from the client's file. Save to keep them.`);
  };

  const imporTempel = () => {
    let obj;
    try {
      obj = JSON.parse(tempel);
    } catch (e) {
      beriTahu(`That is not valid JSON: ${e.message}`, "salah");
      return;
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      beriTahu('Paste a JSON object, like {"FFlagExample": "True"}.', "salah");
      return;
    }
    const buruk = Object.keys(obj).filter((k) => !NAMA_SAH.test(k));
    if (buruk.length) {
      beriTahu(`Not a valid flag name: ${buruk.slice(0, 3).join(", ")}`, "salah");
      return;
    }
    setKelola({ ...kelola, ...obj });
    setTempel(null);
    beriTahu(`Added ${Object.keys(obj).length} flags. Save to keep them.`);
  };

  const simpan = async () => {
    setSibuk(true);
    try {
      pakai(await api.fflagSimpan(kelola));
      beriTahu("Fast flags saved and written to the Roblox client.", "benar");
    } catch (e) {
      beriTahu(String(e), "salah");
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-(--density-toolbar-height) flex-none items-center gap-1.5 border-b border-line px-2">
        <Button variant="primary" icon={Save} onClick={simpan} disabled={!berubah || sibuk || status !== "siap"} className="">
          Save
        </Button>
        <Button icon={RotateCcw} onClick={() => setKelola(awal)} disabled={!berubah} className="h-7">
          Revert
        </Button>
        <div className="mx-1 h-5 w-px bg-line" />
        <Button
          icon={FileInput}
          onClick={imporBerkas}
          disabled={asing.length === 0}
          className=""
          title="Take over flags that are already in the client's ClientAppSettings.json"
        >
          Import from client{asing.length ? ` (${asing.length})` : ""}
        </Button>
        <Button icon={ClipboardPaste} onClick={() => setTempel("")} className="h-7">
          Paste JSON…
        </Button>
        <span className="ml-auto truncate pl-2 text-meta text-faint" title={berkas}>
          {berkas || "No Roblox client found"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "memuat" && <Keadaan jenis="memuat" judul="Loading Fast Flags…" />}
        {status === "galat" && (
          <Keadaan jenis="galat" judul="Couldn’t load Fast Flags" teks={galat} onCobaLagi={muat} />
        )}
        <table className="w-full table-fixed border-collapse text-body">
          <colgroup>
            <col className="w-[46%]" />
            <col />
            <col className="w-[70px]" />
            <col className="w-[36px]" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="grid-head">Flag</th>
              <th className="grid-head">Value</th>
              <th className="grid-head">Type</th>
              <th className="grid-head border-r-0" />
            </tr>
          </thead>
          <tbody>
            {kunci.map((k) => {
              const j = jenis(k);
              return (
                <tr key={k} className="h-(--density-list-row) border-b border-line hover:bg-hover">
                  <td className="truncate px-2" title={k}>
                    {k}
                    {k === KUNCI_FPS && (
                      <span className="ml-2 text-warn" title="An account's own FPS limit overrides this value">
                        per-account FPS wins
                      </span>
                    )}
                  </td>
                  <td className="border-l border-line px-2">
                    <input
                      className="cell"
                      value={tampil(kelola[k])}
                      onChange={(e) => setKelola({ ...kelola, [k]: urai(k, e.target.value) })}
                      aria-label={`Value of ${k}`}
                    />
                  </td>
                  <td className={cx("px-2", j ? "text-dim" : "text-warn")}>
                    {j || (
                      <span className="inline-flex items-center gap-1" title="Roblox flag names start with FFlag, FInt, FString or FLog (optionally D or S first)">
                        <AlertTriangle size={11} /> ?
                      </span>
                    )}
                  </td>
                  <td className="px-1 text-center">
                    <IconButton icon={Trash2} variant="danger" title={`Remove ${k}`} onClick={() => hapus(k)} />
                  </td>
                </tr>
              );
            })}

            <tr className="h-(--density-subbar-height) border-b border-line bg-app-card">
              <td className="px-2">
                <input
                  className="cell"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tambah()}
                  placeholder="New flag, e.g. FFlagDebugGraphicsPreferD3D11"
                />
              </td>
              <td className="border-l border-line px-2">
                <input
                  className="cell"
                  value={nilai}
                  onChange={(e) => setNilai(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tambah()}
                  placeholder="Value"
                />
              </td>
              <td colSpan={2} className="px-1">
                <Button icon={Plus} onClick={tambah} disabled={!nama.trim()} className="btn-sm w-full px-1">
                  Add
                </Button>
              </td>
            </tr>
          </tbody>
        </table>

        {status === "siap" && kunci.length === 0 && (
          <p className="px-3 pt-4 text-body leading-5 text-dim">
            No flags yet. Add one above, paste a JSON block, or import the flags
            already in the client's file.
          </p>
        )}

        <p className="px-3 pt-4 pb-3 text-meta leading-5 text-faint">
          Flags are written to the selected client's ClientAppSettings.json when
          you save, and again right before every launch, so they follow you to
          any Roblox version you pick. Flags from other tools in that file are
          left alone. Roblox now ignores most flags that are not on its allow-list,
          and a flag can change how the client behaves, so add only flags you
          know.
        </p>
      </div>

      <Modal
        buka={tempel !== null}
        onTutup={() => setTempel(null)}
        judul="Paste flags as JSON"
        ikon={ClipboardPaste}
        lebar="w-[520px]"
        anakKaki={
          <>
            <Button variant="ghost" onClick={() => setTempel(null)}>Cancel</Button>
            <Button variant="primary" onClick={imporTempel} disabled={!tempel?.trim()}>
              Add flags
            </Button>
          </>
        }
      >
        <textarea
          value={tempel || ""}
          onChange={(e) => setTempel(e.target.value)}
          spellCheck={false}
          placeholder={'{\n  "FFlagExample": "True",\n  "DFIntExample": 10\n}'}
          className="field h-48 resize-none py-1.5 text-meta leading-5"
        />
        <p className="mt-2 text-meta text-dim">
          Flags with the same name replace the ones in the list. Nothing is
          written until you press Save.
        </p>
      </Modal>
    </div>
  );
}
