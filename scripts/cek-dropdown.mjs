import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, extname } from "node:path";

const DIST = "dist";
const PORT = 8798;

const GAME = [
  { place_id: 111, name: "Violence District", icon_url: "", playing: 1234 },
  { place_id: 222, name: "Violent Nights", icon_url: "", playing: 99 },
];

const AKUN = [
  {
    id: "a1", alias: "AkunUji", username: "akunuji", display_name: "Uji",
    user_id: 1, robux: 0, premium: false, avatar_url: "",
    last_launched: 0, last_refreshed: 0, fps_cap: 0, last_error: "",
  },
];

const STUB = `<script>
window.__TAURI__ = { core: { invoke: async (cmd) => {
  if (cmd === 'daftar_akun') return ${JSON.stringify(AKUN)};
  if (cmd === 'cari_game') return ${JSON.stringify(GAME)};
  if (cmd === 'daftar_riwayat' || cmd === 'daftar_jendela' || cmd === 'klien_berjalan') return [];
  if (cmd === 'tema') return { aksen: '', latar: '', kartu: '', sisi: '' };
  if (cmd === 'daftar_server') return { servers: [], cursor: '' };
  if (cmd === 'jumlah_klien_roblox' || cmd === 'fps_terpasang') return 0;
  if (cmd === 'lokasi_penyimpanan') return 'C:/uji/accounts.json';
  if (cmd.endsWith('_status') || cmd.startsWith('set_')) return false;
  return '';
} } };
window.__GALAT__ = [];
addEventListener('error', e => window.__GALAT__.push(e.message));

const tidur = (ms) => new Promise(r => setTimeout(r, ms));
const setNilai = (el, v) => {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

async function bukaDaftar() {
  const input = [...document.querySelectorAll('input')]
    .find(i => (i.placeholder || '').includes('Place ID'));
  if (!input) return null;
  input.focus();
  setNilai(input, 'violence');
  for (let i = 0; i < 40; i++) {
    await tidur(100);
    const kotak = input.closest('.relative')?.parentElement
      ?.querySelector('.absolute.z-40');
    if (kotak) return { input, kotak };
  }
  return { input, kotak: null };
}

function ukur(nama, r, ri) {
  const H = window.innerHeight;
  return {
    halaman: nama,
    atasDaftar: Math.round(r.top),
    bawahDaftar: Math.round(r.bottom),
    atasLadang: Math.round(ri.top),
    tinggiJendela: H,
    keluarAtas: r.top < 0,
    keluarBawah: r.bottom > H,
    arah: r.top < ri.top ? 'atas' : 'bawah',
  };
}

(async () => {
  const laporan = [];
  await tidur(700);

  let d = await bukaDaftar();
  if (d?.kotak) {
    laporan.push(ukur('accounts', d.kotak.getBoundingClientRect(),
                      d.input.getBoundingClientRect()));
  } else {
    laporan.push({ halaman: 'accounts', galat: 'daftar tidak muncul' });
  }

  const nav = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === 'Servers');
  if (!nav) {
    laporan.push({ halaman: 'servers', galat: 'menu Servers tidak ada' });
  } else {
    nav.click();
    await tidur(400);
    d = await bukaDaftar();
    if (d?.kotak) {
      laporan.push(ukur('servers', d.kotak.getBoundingClientRect(),
                        d.input.getBoundingClientRect()));
    } else {
      laporan.push({ halaman: 'servers', galat: 'daftar tidak muncul' });
    }
  }

  fetch('/hasil', { method: 'POST', body: JSON.stringify(laporan) });
})();
</script>`;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
};

function cariEdge() {
  return [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find((p) => existsSync(p));
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("cek-dropdown: dist tidak ada.");
    process.exit(1);
  }
  const edge = cariEdge();
  if (!edge) {
    console.warn("cek-dropdown: Edge/Chrome tidak ditemukan, dilewati.");
    return;
  }

  const html = await readFile(join(DIST, "index.html"), "utf8");
  let hasil = null;
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/hasil" && req.method === "POST") {
      let isi = "";
      req.on("data", (d) => (isi += d));
      req.on("end", () => {
        hasil = isi;
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

  const anak = spawn(edge, [
    "--headless", "--disable-gpu", "--no-sandbox",
    "--window-size=1200,760",
    `http://localhost:${PORT}/`,
  ]);
  let galatSpawn = null;
  anak.on("error", (e) => (galatSpawn = e));
  const batas = Date.now() + 45000;
  while (hasil === null && !galatSpawn && Date.now() < batas) {
    await new Promise((r) => setTimeout(r, 250));
  }
  try {
    spawnSync("taskkill", ["/T", "/F", "/PID", String(anak.pid)], { stdio: "ignore" });
  } catch {
    anak.kill();
  }
  server.closeAllConnections?.();
  server.close();
  if (galatSpawn) throw galatSpawn;

  const m = hasil === null ? null : [null, hasil];
  if (!m) {
    console.error("cek-dropdown: GAGAL — halaman tidak melaporkan hasil apa pun.");
    process.exit(1);
  }
  const laporan = JSON.parse(m[1].replace(/&quot;/g, '"'));

  let gagal = 0;
  for (const r of laporan) {
    if (r.galat) {
      console.error(`cek-dropdown: GAGAL [${r.halaman}] ${r.galat}`);
      gagal++;
      continue;
    }
    const keluar = r.keluarAtas || r.keluarBawah;
    console.log(
      `  ${r.halaman}: buka ke ${r.arah}, daftar ${r.atasDaftar}..${r.bawahDaftar} ` +
        `(jendela 0..${r.tinggiJendela})`
    );
    if (keluar) {
      console.error(
        `cek-dropdown: GAGAL [${r.halaman}] daftar keluar jendela ` +
          `(atas=${r.keluarAtas} bawah=${r.keluarBawah}).`
      );
      gagal++;
    }
  }
  if (laporan.length < 2) {
    console.error("cek-dropdown: GAGAL — kedua halaman harus diperiksa.");
    gagal++;
  }
  if (gagal) process.exit(1);
  console.log("cek-dropdown: OK — daftar hasil muat di layar di kedua halaman.");
  process.exit(0);
}

main().catch((e) => {
  console.error("cek-dropdown: gagal dijalankan:", e);
  process.exit(1);
});
