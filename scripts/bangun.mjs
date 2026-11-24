import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const KUNCI = join(homedir(), ".tauri", "chudai-updater.key");
const ada = existsSync(KUNCI);
const args = ada
  ? ["tauri", "build"]
  : ["tauri", "build", "--config", JSON.stringify(JSON.stringify({ bundle: { createUpdaterArtifacts: false } }))];
if (!ada) console.warn(`bangun: kunci tanda tangan updater tidak ada (${KUNCI}); membangun TANPA berkas pembaruan.`);
const FOLDER_CARGO = process.env.CARGO_HOME || join(homedir(), ".cargo");
const flagLama = (process.env.RUSTFLAGS || "").split(/\s+/).filter(Boolean);
const FLAG_RUST = [
  ...flagLama,
  `--remap-path-prefix=${homedir()}=~`,
  `--remap-path-prefix=${FOLDER_CARGO}=cargo`,
  `--remap-path-prefix=${resolve("src-tauri")}=cam`,
].join("\x1f");

const r = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    CARGO_ENCODED_RUSTFLAGS: FLAG_RUST,
    ...(ada ? { TAURI_SIGNING_PRIVATE_KEY: KUNCI, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "" } : {}),
  },
});
process.exit(r.status ?? 1);
