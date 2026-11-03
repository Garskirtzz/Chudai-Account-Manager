import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { PanelTitle, IconButton, cx } from "./Primitives";

export default function Output({ log, statusLuncur, onBersihkan }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length, statusLuncur]);

  return (
    <section className="panel flex h-(--density-output-height) flex-none flex-col">
      <PanelTitle
        kanan={<IconButton icon={Trash2} size={12} title="Clear output" onClick={onBersihkan} className="-mr-2" />}
      >
        Output
      </PanelTitle>
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto py-1 text-body leading-5 select-text">
        {log.length === 0 && !statusLuncur && (
          <div className="px-3 text-faint">Launch results and errors will appear here.</div>
        )}
        {log.map((l) => (
          <div
            key={l.id}
            className={cx(
              "flex gap-3 px-3",
              l.jenis === "salah" ? "text-bad" : l.jenis === "benar" ? "text-ink" : "text-dim"
            )}
          >
            <span className="flex-none text-faint tabular-nums">{l.jam}</span>
            <span className="min-w-0 break-words">{l.pesan}</span>
          </div>
        ))}
        {statusLuncur && (
          <div className="flex gap-3 px-3 text-link">
            <span className="flex-none text-faint tabular-nums">now</span>
            <span>{statusLuncur}</span>
          </div>
        )}
      </div>
    </section>
  );
}
