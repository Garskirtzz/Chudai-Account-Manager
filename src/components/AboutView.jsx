import { useState } from "react";
import { BookOpen, ScrollText, RefreshCw, Copy, CircleCheck, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { Category, Prop, Button, StatusBadge } from "./Primitives";
import Modal from "./Modal";
import { VERSI_APP, tanggalBuild, cekPembaruan } from "../lib/rilis";
import panduan from "../../docs/USER_GUIDE.md?raw";
import changelog from "../../CHANGELOG.md?raw";

export default function AboutView({ beriTahu }) {
  const [dok, setDok] = useState(null); 
  const [update, setUpdate] = useState({ status: "belum" });

  const periksa = async () => {
    setUpdate({ status: "memeriksa" });
    const h = await cekPembaruan();
    setUpdate(h);
    if (h.status === "galat") beriTahu?.(`Couldn’t check for updates: ${h.pesan}`, "salah");
    else if (h.status === "ada") beriTahu?.(`Update available: ${h.versi}.`, "benar");
    else beriTahu?.(`Chudai Account Manager ${VERSI_APP} is up to date.`, "benar");
  };

  const salin = async (teks) => {
    try {
      await navigator.clipboard.writeText(teks);
      beriTahu?.("Link copied to clipboard.", "benar");
    } catch {
      beriTahu?.("Couldn’t copy the link. Select it and copy it manually.", "salah");
    }
  };

  const status = {
    belum: <span className="text-dim">Not checked</span>,
    memeriksa: <StatusBadge jenis="busy" className="text-dim">Checking…</StatusBadge>,
    terbaru: <StatusBadge jenis="ok" className="text-ok">Up to date</StatusBadge>,
    ada: <StatusBadge jenis="warn" className="text-warn">Update available{update.versi ? `: ${update.versi}` : ""}</StatusBadge>,
    galat: <StatusBadge jenis="bad" className="text-bad">Couldn’t check for updates</StatusBadge>,
  }[update.status];

  return (
    <div>
      <Category judul="About">
        <Prop nama="Application">
          <span className="truncate">Chudai Account Manager</span>
        </Prop>
        <Prop nama="Version">
          <span className="truncate tabular-nums select-text">{VERSI_APP}</span>
        </Prop>
        <Prop nama="Build date">
          <span className="truncate select-text">{tanggalBuild()}</span>
        </Prop>
      </Category>

      <Category judul="Links">
        <Prop nama="Documentation">
          <button type="button" className="link inline-flex items-center gap-1.5" onClick={() => setDok({ judul: "Documentation", isi: panduan })}>
            <BookOpen size={13} aria-hidden /> Open documentation
          </button>
        </Prop>
        <Prop nama="Changelog">
          <button type="button" className="link inline-flex items-center gap-1.5" onClick={() => setDok({ judul: "Changelog", isi: changelog })}>
            <ScrollText size={13} aria-hidden /> View changelog
          </button>
        </Prop>
      </Category>

      <Category judul="Updates">
        <Prop nama="Status">
          <span aria-live="polite" className="min-w-0 truncate">{status}</span>
        </Prop>
        {update.status === "galat" && update.pesan && (
          <p className="m-0 border-b border-line px-6 py-1.5 text-meta leading-4 text-dim select-text">{update.pesan}</p>
        )}
        {update.status === "ada" && update.url && (
          <div className="flex items-center gap-2 border-b border-line px-6 py-1.5 text-meta">
            <ArrowUpCircle size={13} className="flex-none text-warn" aria-hidden />
            <span className="min-w-0 flex-1 truncate select-text" title={update.url}>{update.url}</span>
            <Button className="btn-sm flex-none" icon={Copy} onClick={() => salin(update.url)}>
              Copy link
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-line px-6 py-2">
          <Button icon={RefreshCw} onClick={periksa} disabled={update.status === "memeriksa"}>
            {update.status === "memeriksa" ? "Checking…" : "Check for updates"}
          </Button>
          <span className="text-meta text-dim">Manual only. Nothing is downloaded or installed.</span>
        </div>
      </Category>

      <Modal buka={!!dok} onTutup={() => setDok(null)} judul={dok?.judul || ""} ikon={dok?.judul === "Changelog" ? ScrollText : BookOpen} lebar="w-[620px]">
        <Dokumen isi={dok?.isi} />
      </Modal>
    </div>
  );
}

function Dokumen({ isi }) {
  if (!isi || !String(isi).trim()) {
    return (
      <p role="alert" className="m-0 flex items-center gap-2 text-body text-bad">
        <AlertTriangle size={14} aria-hidden /> This document is missing from this build.
      </p>
    );
  }
  const blok = [];
  const baris = String(isi).replace(/\r/g, "").split("\n");
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    if (b.startsWith("```")) {
      const kode = [];
      for (i++; i < baris.length && !baris[i].startsWith("```"); i++) kode.push(baris[i]);
      blok.push(<pre key={i} className="my-2 overflow-x-auto bg-well p-2 text-meta select-text">{kode.join("\n")}</pre>);
    } else if (/^#{1,3} /.test(b)) {
      const lv = b.match(/^#+/)[0].length;
      const teks = sebaris(b.replace(/^#+ /, ""));
      blok.push(
        lv === 1 ? <h2 key={i} className="mt-0 mb-2 text-title font-semibold text-ink">{teks}</h2>
        : <h3 key={i} className="mt-4 mb-1.5 text-body font-bold text-ink">{teks}</h3>
      );
    } else if (/^\s*(-|\d+\.) /.test(b)) {
      const urut = /^\s*\d+\. /.test(b);
      const item = [];
      for (; i < baris.length && /^\s*(-|\d+\.) /.test(baris[i]); i++) {
        const dalam = /^\s{2,}/.test(baris[i]);
        item.push(<li key={i} className={dalam ? "ml-4" : ""}>{sebaris(baris[i].replace(/^\s*(-|\d+\.) /, ""))}</li>);
      }
      i--;
      const Tag = urut ? "ol" : "ul";
      blok.push(<Tag key={`l${i}`} className={`my-1.5 pl-5 ${urut ? "list-decimal" : "list-disc"} space-y-0.5`}>{item}</Tag>);
    } else if (b.trim()) {
      const para = [b];
      for (; i + 1 < baris.length && baris[i + 1].trim() && !/^(#|```|\s*(-|\d+\.) )/.test(baris[i + 1]); i++) para.push(baris[i + 1]);
      blok.push(<p key={i} className="my-1.5">{sebaris(para.join(" "))}</p>);
    }
  }
  return (
    <div className="max-h-[60vh] overflow-y-auto pr-1 text-body leading-5 text-dim select-text">
      {blok}
      <p className="mt-4 mb-0 flex items-center gap-1.5 text-meta text-dim">
        <CircleCheck size={12} aria-hidden /> Bundled with version {VERSI_APP}.
      </p>
    </div>
  );
}

function sebaris(teks) {
  return teks.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, i) =>
    s.startsWith("**") ? <strong key={i} className="font-semibold text-ink">{s.slice(2, -2)}</strong>
    : s.startsWith("`") ? <code key={i} className="bg-well px-1 text-meta text-ink">{s.slice(1, -1)}</code>
    : s
  );
}
