import { createServer } from "node:http";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { bukaEdge, tutupEdge } from "./edge-uji.mjs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";

const DIST = "dist";
const PORT = 8799;

const AKUN = [
  {
    id: "a1", alias: "AkunUji", username: "akunuji", display_name: "Uji",
    user_id: 1, robux: 0, premium: false, avatar_url: "",
    last_launched: 1757000000, last_refreshed: 1757000000,
    fps_cap: 0, last_error: "",
  },
  {
    id: "a2", alias: "AkunKedua", username: "akundua", display_name: "Dua",
    user_id: 2, robux: 6824, premium: true, avatar_url: "",
    last_launched: 0, last_refreshed: 0,
    fps_cap: 240, last_error: "cookie contoh bermasalah",
  },
];

const RIWAYAT = [
  {
    place_id: 13772394625, game_name: "Game Uji", icon_url: "",
    account_id: "a1", alias: "AkunUji", avatar_url: "", at: 1757000000,
  },
];

const KLIEN = [
  { pid: 12345, exe: "C:/Roblox/RobloxPlayerBeta.exe", akun_id: "a1", alias: "AkunUji" },
  { pid: 23456, exe: "C:/Roblox/RobloxPlayerBeta.exe", akun_id: "", alias: "" },
];

const SERVERS = [{"job_id": "job-00", "playing": 0, "max_players": 30, "ping": 40, "fps": 60}, {"job_id": "job-01", "playing": 1, "max_players": 30, "ping": 41, "fps": 60}, {"job_id": "job-02", "playing": 2, "max_players": 30, "ping": 42, "fps": 60}, {"job_id": "job-03", "playing": 3, "max_players": 30, "ping": 43, "fps": 60}, {"job_id": "job-04", "playing": 4, "max_players": 30, "ping": 44, "fps": 60}, {"job_id": "job-05", "playing": 5, "max_players": 30, "ping": 45, "fps": 60}, {"job_id": "job-06", "playing": 6, "max_players": 30, "ping": 46, "fps": 60}, {"job_id": "job-07", "playing": 7, "max_players": 30, "ping": 47, "fps": 60}, {"job_id": "job-08", "playing": 8, "max_players": 30, "ping": 48, "fps": 60}, {"job_id": "job-09", "playing": 9, "max_players": 30, "ping": 49, "fps": 60}, {"job_id": "job-10", "playing": 10, "max_players": 30, "ping": 50, "fps": 60}, {"job_id": "job-11", "playing": 11, "max_players": 30, "ping": 51, "fps": 60}, {"job_id": "job-12", "playing": 12, "max_players": 30, "ping": 52, "fps": 60}, {"job_id": "job-13", "playing": 13, "max_players": 30, "ping": 53, "fps": 60}, {"job_id": "job-14", "playing": 14, "max_players": 30, "ping": 54, "fps": 60}, {"job_id": "job-15", "playing": 15, "max_players": 30, "ping": 55, "fps": 60}, {"job_id": "job-16", "playing": 16, "max_players": 30, "ping": 56, "fps": 60}, {"job_id": "job-17", "playing": 17, "max_players": 30, "ping": 57, "fps": 60}, {"job_id": "job-18", "playing": 18, "max_players": 30, "ping": 58, "fps": 60}, {"job_id": "job-19", "playing": 19, "max_players": 30, "ping": 59, "fps": 60}, {"job_id": "job-20", "playing": 20, "max_players": 30, "ping": 60, "fps": 60}, {"job_id": "job-21", "playing": 21, "max_players": 30, "ping": 61, "fps": 60}, {"job_id": "job-22", "playing": 22, "max_players": 30, "ping": 62, "fps": 60}, {"job_id": "job-23", "playing": 23, "max_players": 30, "ping": 63, "fps": 60}, {"job_id": "job-24", "playing": 24, "max_players": 30, "ping": 64, "fps": 60}, {"job_id": "job-25", "playing": 25, "max_players": 30, "ping": 65, "fps": 60}, {"job_id": "job-26", "playing": 26, "max_players": 30, "ping": 66, "fps": 60}, {"job_id": "job-27", "playing": 27, "max_players": 30, "ping": 67, "fps": 60}, {"job_id": "job-28", "playing": 28, "max_players": 30, "ping": 68, "fps": 60}, {"job_id": "job-29", "playing": 29, "max_players": 30, "ping": 69, "fps": 60}, {"job_id": "job-30", "playing": 30, "max_players": 30, "ping": 70, "fps": 60}, {"job_id": "job-31", "playing": 31, "max_players": 30, "ping": 71, "fps": 60}, {"job_id": "job-32", "playing": 32, "max_players": 30, "ping": 72, "fps": 60}, {"job_id": "job-33", "playing": 33, "max_players": 30, "ping": 73, "fps": 60}, {"job_id": "job-34", "playing": 34, "max_players": 30, "ping": 74, "fps": 60}, {"job_id": "job-35", "playing": 35, "max_players": 30, "ping": 75, "fps": 60}, {"job_id": "job-36", "playing": 36, "max_players": 30, "ping": 76, "fps": 60}, {"job_id": "job-37", "playing": 37, "max_players": 30, "ping": 77, "fps": 60}, {"job_id": "job-38", "playing": 38, "max_players": 30, "ping": 78, "fps": 60}, {"job_id": "job-39", "playing": 39, "max_players": 30, "ping": 79, "fps": 60}];

const WAJIB = [
  "AkunUji", "AkunKedua", "240 FPS", "Premium",
  "cookie contoh bermasalah", "Launch", "Add Account", "Accounts",
  "Follow player", "Servers", "Appearance",
  "PID 12345", "tidak bisa dikaitkan",
];

const STUB = `<script>
window.__TAURI__ = { core: { invoke: async (cmd, args) => {
  args = args || {};
  (window.__CMD__ = window.__CMD__ || []).push(cmd);
  if (cmd === 'daftar_akun') return ${JSON.stringify(AKUN)};
  if (cmd === 'daftar_riwayat') return ${JSON.stringify(RIWAYAT)};
  if (cmd === 'jumlah_klien_roblox' || cmd === 'fps_terpasang') return 0;
  if (cmd === 'tema') return { aksen: '', latar: '', kartu: '', sisi: '' };
  if (cmd === 'daftar_jendela') return [];
  if (cmd === 'klien_akun') return ${JSON.stringify(KLIEN)};
  if (cmd === 'daftar_versi_roblox') return [];
  if (cmd === 'daftar_server') return { servers: ${JSON.stringify(SERVERS)}, cursor: '' };
  if (cmd === 'wilayah_server_banyak') {
    window.__BATCH__ = Math.max(window.__BATCH__ || 0, (args.jobIds || []).length);
    return (args.jobIds || []).map(j => ({ job_id: j, wilayah: 'Test City' }));
  }
  if (cmd === 'refresh_terjadwal')
    return { diperiksa: 0, diperbarui: 0, dilewati: 0, gagal: [] };
  if (cmd === 'lokasi_penyimpanan') return 'C:/uji/accounts.json';
  if (cmd.endsWith('_status') || cmd.startsWith('set_')) return false;
  return '';
} } };
const __tab = new URLSearchParams(location.search).get('tab');
if (__tab === 'server') {
  window.__STEP__ = [];
  const cariTombol = (t) => {
    for (const e of document.querySelectorAll('button')) {
      if ((e.textContent || '').trim() === t) return e;
    }
    return null;
  };
  setTimeout(() => {
    const tab = cariTombol('Servers');
    window.__STEP__.push('tab:' + !!tab);
    if (tab) tab.click();
    setTimeout(() => {
      const inp = document.querySelector('input[placeholder^="Game name"]');
      window.__STEP__.push('input:' + !!inp);
      if (inp) {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(inp, '1818');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setTimeout(() => {
        const rf = cariTombol('Load servers');
        window.__STEP__.push('muat:' + !!rf + '/mati:' + (rf ? rf.disabled : '?'));
        if (rf) rf.click();
        setTimeout(() => {
          const d = document.createElement('div');
          d.setAttribute('data-uji-batch', String(window.__BATCH__ || 0));
          d.setAttribute('data-uji-cmd', (window.__CMD__ || []).join(','));
          d.setAttribute('data-uji-step', window.__STEP__.join(' '));
          document.body.appendChild(d);
        }, 2500);
      }, 700);
    }, 900);
  }, 1500);
}
if (__tab === 'roblox') {
  setTimeout(() => {
    for (const e of document.querySelectorAll('button')) {
      if ((e.textContent || '').trim() === 'Client versions') { e.click(); return; }
    }
  }, 1200);
}
window.__GALAT__ = [];
addEventListener('error', e => {
  window.__GALAT__.push((e.error && e.error.stack) || e.message);
  document.title = 'GALAT: ' + ((e.error && e.error.message) || e.message);
});
addEventListener('unhandledrejection', e => {
  window.__GALAT__.push('REJECT: ' + e.reason);
  document.title = 'GALAT: reject ' + e.reason;
});

setTimeout(() => {
  try {
    const id = new URLSearchParams(location.search).get('id') || 'x';
    fetch('/dom?id=' + encodeURIComponent(id), {
      method: 'POST',
      body: document.documentElement.outerHTML,
    });
  } catch (e) { }
}, 7000);
</script>`;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
};

function cariEdge() {
  const kandidat = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];
  return kandidat.find((p) => existsSync(p));
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("smoke: folder dist tidak ada. Jalankan build:web dulu.");
    process.exit(1);
  }

  const berkas = await readdir(join(DIST, "assets")).catch(() => []);
  const html = await readFile(join(DIST, "index.html"), "utf8");
  for (const m of html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)) {
    if (!berkas.includes(m[1])) {
      console.error(`smoke: index.html menunjuk ke assets/${m[1]} tapi berkasnya TIDAK ADA.`);
      process.exit(1);
    }
  }

  const edge = cariEdge();
  if (!edge) {
    console.warn("smoke: Edge/Chrome tidak ditemukan, uji render dilewati.");
    return;
  }

  const hasilDom = new Map();
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/dom" && req.method === "POST") {
      const id = new URL(req.url, "http://x").searchParams.get("id") || "x";
      let isi = "";
      req.on("data", (d) => (isi += d));
      req.on("end", () => {
        hasilDom.set(id, isi);
        res.writeHead(204).end();
      });
      return;
    }
    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html.replace("<script", STUB + "\n<script"));
      return;
    }
    try {
      const buf = await readFile(join(DIST, p.slice(1)));
      res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
      res.end(buf);
    } catch {
      res.writeHead(404).end();
    }
  });

  await new Promise((r) => server.listen(PORT, r));

  const ambilDom = async (query, id) => {
    const pisah = query.includes("?") ? "&" : "?";
    const edgeUji = bukaEdge(edge, [`http://localhost:${PORT}/${query}${pisah}id=${id}`], "edge-smoke-");
    const anak = edgeUji.anak;
    let galatSpawn = null;
    anak.on("error", (e) => (galatSpawn = e));

    const batas = Date.now() + 30000;
    while (!hasilDom.has(id) && Date.now() < batas && !galatSpawn) {
      await new Promise((r) => setTimeout(r, 250));
    }
    await tutupEdge(edgeUji);
    if (galatSpawn) throw galatSpawn;
    if (!hasilDom.has(id)) {
      console.error(`  [dump "${query}"] halaman tidak pernah mengirim DOM (30 dtk).`);
      return "";
    }
    return hasilDom.get(id);
  };

  const dom = await ambilDom("", "utama");
  const domRoblox = await ambilDom("?tab=roblox", "roblox");
  const domServer = await ambilDom("?tab=server", "server");

  server.close();

  for (const [nama, d] of [["utama", dom], ["halaman Roblox", domRoblox], ["halaman Servers", domServer]]) {
    const judul = (d.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
    if (judul.startsWith("GALAT:")) {
      console.error(`smoke: GAGAL — galat runtime saat render (${nama}):`);
      console.error("  " + judul.slice(0, 500));
      process.exit(1);
    }
  }

  const hilang = WAJIB.filter((k) => !dom.includes(k));
  if (hilang.length) {
    const jejak = join(tmpdir(), `smoke-gagal-${process.pid}.html`);
    await writeFile(jejak, dom, "utf8");
    console.error("smoke: GAGAL — elemen ini tidak muncul: " + hilang.join(", "));
    console.error("  (aplikasi mungkin render kosong / komponen gagal mount)");
    console.error("  DOM disimpan di: " + jejak);
    process.exit(1);
  }

  const WAJIB_ROBLOX = ["Running now", "AkunUji", "pid 12345", "akun tak dikenali"];
  const hilangRoblox = WAJIB_ROBLOX.filter((k) => !domRoblox.includes(k));
  if (hilangRoblox.length) {
    console.error(
      "smoke: GAGAL — halaman Roblox tidak memuat: " + hilangRoblox.join(", ")
    );
    process.exit(1);
  }

  const batch = (domServer.match(/data-uji-batch="(\d+)"/) || [])[1];
  if (batch === undefined) {
    console.error("smoke: GAGAL — halaman Servers tidak pernah memuat wilayah.");
    process.exit(1);
  }
  if (Number(batch) === 0 || Number(batch) > 15) {
    console.error(`smoke: GAGAL — satu pemuatan wilayah meminta ${batch} server (batas 15).`);
    console.error(`  langkah             : ${(domServer.match(/data-uji-step="([^"]*)"/) || [])[1]}`);
    console.error(`  perintah terpanggil  : ${(domServer.match(/data-uji-cmd="([^"]*)"/) || [])[1]}`);
    process.exit(1);
  }
  for (const k of ["auto", "Region"]) {
    if (!domServer.includes(k)) {
      console.error(`smoke: GAGAL — halaman Servers tidak memuat "${k}".`);
      process.exit(1);
    }
  }

  console.log(
    `smoke: OK — ${WAJIB.length} elemen inti + ${WAJIB_ROBLOX.length} pada halaman Roblox` +
      `, batas wilayah ${batch}/15, tanpa galat.`
  );
}

main().catch((e) => {
  console.error("smoke: gagal dijalankan:", e);
  process.exit(1);
});
