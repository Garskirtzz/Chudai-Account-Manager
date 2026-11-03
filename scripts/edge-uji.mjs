import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function bukaEdge(edge, args, awalan = "edge-uji-") {
  const profil = mkdtempSync(join(tmpdir(), awalan));
  const anak = spawn(edge, ["--headless", "--disable-gpu", "--no-sandbox", "--no-first-run", `--user-data-dir=${profil}`, ...args]);
  return { anak, profil };
}

function pidProfil(profil) {
  const kunci = profil.split(/[\\/]/).pop();
  try {
    const o = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${kunci}*' } | ForEach-Object { $_.ProcessId }`,
      ],
      { encoding: "utf8", windowsHide: true }
    );
    return o.split(/\s+/).filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

export async function tutupEdge({ anak, profil }) {
  try {
    anak.kill();
  } catch {
  }
  for (let coba = 0; coba < 10; coba++) {
    const pids = pidProfil(profil);
    if (!pids.length) break;
    for (const pid of pids) {
      try {
        process.kill(pid);
      } catch {
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  try {
    rmSync(profil, { recursive: true, force: true });
  } catch {
  }
}

export function sisaEdge(awalan = "edge-uji-") {
  return pidProfil(awalan.replace(/-$/, ""));
}
