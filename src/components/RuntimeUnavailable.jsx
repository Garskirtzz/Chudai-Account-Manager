import { Component, useState } from "react";
import { AlertTriangle, Copy, RotateCw } from "lucide-react";
import { samarkanRahasia } from "../lib/api";

export function HalamanGalat({ judul, teks, petunjuk, detail, aksi, labelAksi = "Retry" }) {
  const [tersalin, setTersalin] = useState(false);
  const [buka, setBuka] = useState(false);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(samarkanRahasia(detail));
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1500);
    } catch {
      setBuka(true);
    }
  };

  return (
    <div role="alert" className="flex h-screen items-center justify-center bg-app-bg p-6 text-ink">
      <div className="panel w-full max-w-[480px] p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-title font-semibold">{judul}</h1>
            <p className="mt-2 text-body leading-5 text-dim">{teks}</p>
            {petunjuk && <p className="mt-2 text-body leading-5 text-dim">{petunjuk}</p>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 pl-8">
          <button type="button" className="btn btn-primary" onClick={aksi} autoFocus>
            <RotateCw size={14} aria-hidden /> {labelAksi}
          </button>
          <button type="button" className="btn btn-secondary" onClick={salin}>
            <Copy size={14} aria-hidden /> {tersalin ? "Copied" : "Copy technical details"}
          </button>
          <button type="button" className="btn btn-ghost" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
            {buka ? "Hide details" : "Show details"}
          </button>
        </div>
        {buka && (
          <pre className="mt-4 ml-8 max-h-48 overflow-auto rounded-sm bg-well p-3 text-meta text-dim select-text whitespace-pre-wrap break-all">
            {samarkanRahasia(detail)}
          </pre>
        )}
      </div>
    </div>
  );
}

function detailRuntime() {
  return [
    "Chudai Account Manager — desktop runtime unavailable",
    `window.__TAURI__: ${typeof window.__TAURI__}`,
    `__TAURI__.core.invoke: ${typeof window.__TAURI__?.core?.invoke}`,
    `URL origin: ${location.origin}`,
    `User agent: ${navigator.userAgent}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");
}

export default function RuntimeUnavailable({ onRetry }) {
  return (
    <HalamanGalat
      judul="Desktop runtime unavailable"
      teks="Chudai Account Manager is running outside the Tauri desktop app. The web preview cannot access local accounts, Roblox processes, or Windows features."
      petunjuk={<>Run <code className="text-ink">npm run dev</code> for desktop development, or open the built Chudai Account Manager <code className="text-ink">.exe</code>.</>}
      detail={detailRuntime()}
      aksi={onRetry}
    />
  );
}

export class ErrorBoundary extends Component {
  state = { galat: null, kunci: 0 };

  static getDerivedStateFromError(galat) {
    return { galat };
  }

  componentDidCatch(galat, info) {
    console.error("[ErrorBoundary]", samarkanRahasia(galat?.message), info?.componentStack);
    this.stackKomponen = info?.componentStack || "";
  }

  render() {
    const { galat, kunci } = this.state;
    if (!galat) return <div key={kunci} className="contents">{this.props.children}</div>;
    const detail = [
      "Chudai Account Manager — render error",
      `${galat.name || "Error"}: ${galat.message || String(galat)}`,
      "",
      (galat.stack || "").split("\n").slice(0, 12).join("\n"),
      this.stackKomponen ? `\nComponent stack:${this.stackKomponen}` : "",
      `\nTime: ${new Date().toISOString()}`,
    ].join("\n");
    return (
      <HalamanGalat
        judul="Something went wrong"
        teks="Part of the interface failed to render. Your accounts are stored on disk and were not changed. Try again, or reload the application if the problem repeats."
        detail={detail}
        aksi={() => this.setState({ galat: null, kunci: kunci + 1 })}
      />
    );
  }
}
