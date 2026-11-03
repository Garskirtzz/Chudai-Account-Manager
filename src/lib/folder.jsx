import {
  Folder, Bot, Briefcase, Gamepad2, Coins, Crown, Star, Zap, Shield, Ghost, Users, Heart,
} from "lucide-react";

export const WARNA_FOLDER = [
  { kunci: "", label: "Default", hex: "" },
  { kunci: "biru", label: "Blue", hex: "#3b82f6" },
  { kunci: "hijau", label: "Green", hex: "#16a34a" },
  { kunci: "teal", label: "Teal", hex: "#0d9488" },
  { kunci: "kuning", label: "Amber", hex: "#d97706" },
  { kunci: "oranye", label: "Orange", hex: "#ea580c" },
  { kunci: "merah", label: "Red", hex: "#dc2626" },
  { kunci: "ungu", label: "Purple", hex: "#9333ea" },
  { kunci: "pink", label: "Pink", hex: "#db2777" },
];

export const IKON_FOLDER = [
  { kunci: "", label: "Folder", ikon: Folder },
  { kunci: "bot", label: "Bot", ikon: Bot },
  { kunci: "koper", label: "Briefcase", ikon: Briefcase },
  { kunci: "game", label: "Gamepad", ikon: Gamepad2 },
  { kunci: "koin", label: "Coins", ikon: Coins },
  { kunci: "mahkota", label: "Crown", ikon: Crown },
  { kunci: "bintang", label: "Star", ikon: Star },
  { kunci: "petir", label: "Bolt", ikon: Zap },
  { kunci: "perisai", label: "Shield", ikon: Shield },
  { kunci: "hantu", label: "Ghost", ikon: Ghost },
  { kunci: "orang", label: "People", ikon: Users },
  { kunci: "hati", label: "Heart", ikon: Heart },
];

export const warnaFolder = (f) => WARNA_FOLDER.find((w) => w.kunci === (f?.warna || ""))?.hex || "";
export const ikonFolder = (f) => IKON_FOLDER.find((i) => i.kunci === (f?.ikon || ""))?.ikon || Folder;

export function IkonFolder({ f, size = 13, className = "" }) {
  const Ikon = ikonFolder(f);
  const hex = warnaFolder(f);
  return <Ikon size={size} aria-hidden className={`flex-none ${hex ? "" : "text-dim"} ${className}`} style={hex ? { color: hex } : undefined} />;
}

export function labelPreset(p) {
  if (!p) return "";
  if (!p.hemat) return "Saver off";
  return [`Saver on`, `${p.fps || 10} FPS`, p.ram_mb ? `${p.ram_mb} MB` : "RAM limit off", p.minimize && "minimize"]
    .filter(Boolean)
    .join(" · ");
}

export function sesuaiPreset(a, p) {
  if (!p) return true;
  const fps = p.fps ? Math.min(240, Math.max(3, p.fps)) : 0;
  const ram = p.ram_mb ? Math.min(4096, Math.max(128, p.ram_mb)) : 0;
  return !!a.hemat === !!p.hemat && !!a.hemat_minimize === !!p.minimize && (a.hemat_ram_mb || 0) === ram && (a.hemat_fps || 0) === fps;
}

export const folderAkun = (a, folder) => (a.folder_id && folder.some((f) => f.id === a.folder_id) ? a.folder_id : null);

export function cocokFilter(a, filter, folder) {
  if (!filter || filter === "semua") return true;
  const f = folderAkun(a, folder);
  return filter === "tanpa" ? f === null : f === filter;
}

export function bacaLokal(kunci, bawaan) {
  try {
    const v = localStorage.getItem(kunci);
    return v === null ? bawaan : JSON.parse(v);
  } catch {
    return bawaan;
  }
}
export function tulisLokal(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch {
  }
}

export const DND_AKUN = "application/x-cam-akun";
