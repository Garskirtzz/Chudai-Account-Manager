import { readFileSync, existsSync, readdirSync, unlinkSync, linkSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const versi = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")).version;
const RILIS = "rilis";
const EXE_BUILD = join("src-tauri", "target", "release", "ChudaiAccountManager.exe");
const EXE_RILIS = join(RILIS, "Chudai Account Manager.exe");
const POLA_SETUP = /^Chudai Account Manager_(.+)_x64-setup\.exe$/;
const SETUP = `Chudai Account Manager_${versi}_x64-setup.exe`;
const SETUP_BUILD = join("src-tauri", "target", "release", "bundle", "nsis", SETUP);

function gagal(pesan) {
  console.error(`rilis: GAGAL — ${pesan}`);
  process.exit(1);
}

if (!existsSync(EXE_BUILD)) gagal(`${EXE_BUILD} tidak ada; jalankan build dulu.`);
if (!existsSync(SETUP_BUILD)) gagal(`installer ${SETUP} tidak ada; versi di tauri.conf.json belum dibuild?`);

try {
  if (existsSync(EXE_RILIS)) unlinkSync(EXE_RILIS);
} catch (e) {
  gagal(`tidak bisa mengganti ${EXE_RILIS} (aplikasinya masih terbuka?): ${e.message}`);
}
linkSync(EXE_BUILD, EXE_RILIS);

copyFileSync(SETUP_BUILD, join(RILIS, SETUP));

const dihapus = [];
for (const f of readdirSync(RILIS)) {
  const m = f.match(POLA_SETUP);
  if (m && m[1] !== versi) {
    try {
      unlinkSync(join(RILIS, f));
      dihapus.push(m[1]);
    } catch (e) {
      console.warn(`rilis: ${f} tidak bisa dihapus (${e.message})`);
    }
  }
}

spawnSync("ie4uinit.exe", ["-show"], { stdio: "ignore" });

console.log(`rilis: OK — ${versi} terpasang di ${RILIS}\\ (exe + ${SETUP})` +
  (dihapus.length ? `; installer lama dihapus: ${dihapus.join(", ")}` : ""));
