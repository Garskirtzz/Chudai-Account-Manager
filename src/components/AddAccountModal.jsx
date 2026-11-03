import { useEffect, useState } from "react";
import { UserPlus, ShieldCheck, Eye, EyeOff, AlertTriangle, LogIn, Loader2 } from "lucide-react";
import Modal from "./Modal";
import { Button } from "./Primitives";

export default function AddAccountModal({ buka, onTutup, onSimpan, onLogin, onBatalLogin }) {
  const [alias, setAlias] = useState("");
  const [cookie, setCookie] = useState("");
  const [lihat, setLihat] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [menunggu, setMenunggu] = useState(false);

  const kosongkan = () => {
    setAlias("");
    setCookie("");
    setLihat(false);
  };
  useEffect(() => {
    if (!buka) kosongkan();
  }, [buka]);

  const tutup = () => {
    kosongkan();
    onTutup();
  };

  const login = async () => {
    setMenunggu(true);
    const ok = await onLogin?.(alias);
    setMenunggu(false);
    if (ok) tutup();
  };

  const simpan = async () => {
    setSibuk(true);
    const ok = await onSimpan(cookie, alias);
    setSibuk(false);
    if (ok) tutup();
  };

  return (
    <Modal
      buka={buka}
      onTutup={tutup}
      kunci={sibuk || menunggu}
      judul="Add Account"
      ikon={UserPlus}
      lebar="w-[480px]"
      anakKaki={
        <>
          <Button variant="ghost" onClick={tutup} disabled={sibuk || menunggu}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={simpan}
            disabled={sibuk || menunggu || !cookie.trim()}
            className="px-4"
          >
            {sibuk ? "Testing cookie…" : "Add Account"}
          </Button>
        </>
      }
    >
      <label htmlFor="tambah-alias" className="mb-1 block text-body text-dim">
        Alias <span className="text-faint">(optional)</span>
      </label>
      <input
        id="tambah-alias"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="Leave empty to use the username"
        className="field mb-4"
      />

      <section className="mb-4 border border-line bg-app-bg p-3" aria-label="Log in with browser">
        <div className="text-body font-semibold text-ink">
          Log in with browser <span className="font-normal text-dim">(recommended)</span>
        </div>
        <p className="mt-1 mb-3 text-meta leading-4 text-dim">
          Opens a private Roblox login window. The cookie is captured automatically and the
          window closes <span className="text-ink">without logging out</span>, so the session stays
          valid. Also renews the cookie of an account that is already in the list.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={menunggu ? Loader2 : LogIn} onClick={login} disabled={menunggu || sibuk}>
            {menunggu ? "Waiting for login…" : "Log in with browser"}
          </Button>
          {menunggu && (
            <Button variant="ghost" onClick={() => onBatalLogin?.()}>
              Cancel login
            </Button>
          )}
        </div>
        {menunggu && (
          <p role="status" className="mt-2 mb-0 text-meta leading-4 text-dim">
            Sign in in the Roblox window. Do not press Log Out there — just finish signing in.
          </p>
        )}
      </section>

      <div className="mb-2 text-meta text-dim">Or paste the cookie manually</div>

      <div className="mb-1 flex items-center gap-2">
        <label htmlFor="tambah-cookie" className="min-w-0 flex-1 text-body text-dim">
          .ROBLOSECURITY cookie
        </label>
        <span className={lihat ? "text-meta text-warn" : "text-meta text-dim"} aria-live="polite">
          {lihat ? "Cookie visible" : "Cookie hidden"}
        </span>
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-pressed={lihat}
          aria-controls="tambah-cookie"
          aria-label={lihat ? "Hide cookie" : "Show cookie"}
          className="btn btn-ghost btn-sm gap-1 px-2 text-meta"
        >
          {lihat ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
          {lihat ? "Hide cookie" : "Show cookie"}
        </button>
      </div>
      <textarea
        id="tambah-cookie"
        value={cookie}
        onChange={(e) => setCookie(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        placeholder="_|WARNING:-DO-NOT-SHARE-THIS…"
        style={lihat ? undefined : { WebkitTextSecurity: "disc" }}
        className={
          "field h-24 resize-none py-1.5 text-meta leading-5 break-all" +
          (lihat ? " border-warn/60" : "")
        }
      />
      <p className="mt-2 flex gap-2 text-meta leading-5 text-warn">
        <AlertTriangle size={13} className="mt-0.5 flex-none" aria-hidden />
        This value is equivalent to a password and bypasses 2FA. Never share it.
      </p>
      <p className="mt-1 text-meta leading-5 text-dim">
        F12 → Application → Cookies → <span className="text-ink">.roblox.com</span> →{" "}
        <span className="text-ink">.ROBLOSECURITY</span> → copy the value,
        including the <span className="text-ink">_|WARNING…|_</span> part.
      </p>

      <div className="mt-3 flex gap-2 border-t border-line pt-3 text-meta leading-5 text-dim">
        <ShieldCheck size={14} className="mt-px flex-none text-ok" aria-hidden />
        <span>
          Encrypted with Windows DPAPI before it touches the disk — the stored file
          is useless on any other PC or Windows user.
        </span>
      </div>
    </Modal>
  );
}
