import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { Pencil } from "lucide-react";
import { Button } from "./Primitives";

export default function AliasModal({ akun, onTutup, onSimpan }) {
  const [nilai, setNilai] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!akun) return;
    setNilai(akun.alias);
    const t = setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 60);
    return () => clearTimeout(t);
  }, [akun]);

  const simpan = () => {
    const bersih = nilai.trim();
    if (!bersih) return;
    onSimpan(bersih);
  };

  return (
    <Modal
      buka={!!akun}
      onTutup={onTutup}
      judul="Rename this account"
      ikon={Pencil}
      lebar="w-[400px]"
      anakKaki={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={simpan}
            disabled={!nilai.trim()}
            className="px-4"
          >
            Save
          </Button>
        </>
      }
    >
      <input
        ref={ref}
        value={nilai}
        onChange={(e) => setNilai(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && simpan()}
        placeholder={akun?.username || "display name"}
        className="field h-9 text-body"
      />
      <p className="mt-2 text-meta leading-5 text-zinc-500">
        Only the name shown inside this app. The Roblox username
        {akun?.username && (
          <span className="text-zinc-400"> @{akun.username}</span>
        )}{" "}
        does not change.
      </p>
    </Modal>
  );
}
