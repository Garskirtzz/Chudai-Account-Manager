import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const KUNCI = join(homedir(), ".tauri", "chudai-updater.key");
const ada = existsSync(KUNCI);
const args = ada
  ? ["tauri", "build"]
  : ["tauri", "build", "--config", JSON.stringify(JSON.stringify({ bundle: { createUpdaterArtifacts: false } }))];
if (!ada) console.warn(`bangun: kunci tanda tangan updater tidak ada (${KUNCI}); membangun TANPA berkas pembaruan.`);
const r = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env: ada ? { ...process.env, TAURI_SIGNING_PRIVATE_KEY: KUNCI, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "" } : process.env,
});
process.exit(r.status ?? 1);
