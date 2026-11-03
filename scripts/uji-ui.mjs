import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { bukaEdge, tutupEdge } from "./edge-uji.mjs";
import { join, extname } from "node:path";

const DIST = "dist";
const PORT = 8799;
const VERSI = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8")).version;

const AKUN = Array.from({ length: 9 }, (_, i) => ({
  id: `a${i}`, alias: `Akun${i}${"Panjang".repeat(i % 3)}`, username: `user${i}`, display_name: `A${i}`,
  user_id: 1000 + i, robux: 0, premium: i === 0, avatar_url: "", last_launched: 0, last_refreshed: 0,
  fps_cap: i === 1 ? 240 : 0, last_error: i === 2 ? "Cookie rejected by Roblox (dummy)" : "",
  hemat: false, hemat_minimize: false, hemat_ram_mb: 0, hemat_fps: 0,
}));
const RIWAYAT = [
  { place_id: 111, game_name: "Game Satu", icon_url: "", account_id: "a0", alias: "Akun0", avatar_url: "", at: 1757000000 },
  { place_id: 222, game_name: "Game Dua", icon_url: "", account_id: "a1", alias: "Akun1", avatar_url: "", at: 1756000000 },
];
const VERSI_ROBLOX = [
  { path: "C:/R/v1/RobloxPlayerBeta.exe", versi: "0.700.1", bawaan: true, diunduh: false, ada: true },
  { path: "C:/R/v2/RobloxPlayerBeta.exe", versi: "0.690.0", bawaan: false, diunduh: false, ada: true },
];
const SERVERS = [0, 1, 2].map((i) => ({ job_id: `job-0${i}`, playing: i, max_players: 30, ping: 40 + i, fps: 60 }));

const stub = (density, target) => `<script>
try { ${density ? `localStorage.setItem("cam.density", "${density}")` : `localStorage.removeItem("cam.density")`}; localStorage.setItem("wilayahOtomatis", "0"); localStorage.setItem("cam.versiTerakhir", "0.0.1"); } catch {}
window.__GALAT__ = []; addEventListener("error", (e) => { window.__GALAT__.push(String(e.message)); navigator.sendBeacon("/galat", String(e.message) + " @" + (e.filename || "") + ":" + (e.lineno || "")); });
addEventListener("unhandledrejection", (e) => window.__GALAT__.push("rejection: " + String(e.reason)));
window.__fetch = 0; const _f = window.fetch; window.fetch = (...a) => { if (!String(a[0]).startsWith("/hasil")) window.__fetch++; return _f(...a); };
window.__mode = { cari: "ada", simpan: "ok" }; window.__luncur = [];
window.__AKUN = ${JSON.stringify(AKUN)}; window.__hemat = [];
window.__target = ${JSON.stringify(target || null)}; window.__simpanTarget = 0; window.__saved = []; window.__login = [];
window.__update = null; window.__pasang = 0; window.__cekUpdate = 0;
let klien = 0, joinPada = Infinity; window.__setKlien = (n) => { klien = n; };
const tunda = (ms) => new Promise((r) => setTimeout(r, ms));
window.__TAURI__ = { core: { invoke: async (c, a) => {
  if (c === "daftar_akun") return JSON.parse(JSON.stringify(window.__AKUN));
  if (c === "target_terakhir") return window.__target;
  if (c === "simpan_target_terakhir") { window.__target = a.target; window.__simpanTarget++; return null; }
  if (c === "daftar_server_tersimpan") return JSON.parse(JSON.stringify(window.__saved));
  if (c === "simpan_server_tersimpan") { const k = (x) => [x.place_id.trim(), x.link_code.trim(), x.job_id.trim()].join("|");
    const ada = window.__saved.find((x) => k(x) === k(a.server));
    if (ada) return JSON.parse(JSON.stringify([window.__saved, ada.id]));
    const s = { ...a.server, id: "s" + (window.__saved.length + 1) }; window.__saved = [s, ...window.__saved]; return JSON.parse(JSON.stringify([window.__saved, s.id])); }
  if (c === "ubah_nama_server_tersimpan") { window.__saved.find((x) => x.id === a.id).nama = a.nama; return JSON.parse(JSON.stringify(window.__saved)); }
  if (c === "hapus_server_tersimpan") { window.__saved = window.__saved.filter((x) => x.id !== a.id); return JSON.parse(JSON.stringify(window.__saved)); }
  if (c === "login_browser") { window.__login.push(a); await tunda(600); if (window.__mode.login === "batal") throw "The login window was closed before signing in."; return "UjiLogin added from the Roblox login."; }
  if (c === "tutup_login_browser") { window.__mode.login = "batal"; return null; }
  if (c === "set_hemat_akun") { window.__hemat.push(a); const x = window.__AKUN.find((k) => k.id === a.id);
    if (x) { x.hemat = a.hemat; x.hemat_minimize = a.minimize; x.hemat_ram_mb = a.ramMb; x.hemat_fps = a.fps; } return null; }
  if (c === "cari_game") { await tunda(300);
    if (window.__mode.cari === "kosong") return [];
    if (window.__mode.cari === "galat") throw "network down (dummy)";
    return [{ place_id: 111, name: "Game Satu", icon_url: "", players: 10 }, { place_id: 222, name: "Game Dua Dengan Nama Yang Panjang Sekali", icon_url: "", players: 5 }]; }
  if (c === "luncurkan") { window.__luncur.push({ id: a.id, placeId: a.placeId }); setTimeout(() => { klien++; joinPada = Date.now() + 300; }, 200); return "ok"; }
  if (c === "jumlah_klien_roblox") return klien;
  if (c === "cek_update") { window.__cekUpdate++; return window.__update; }
  if (c === "pasang_update") { if (klien > 0) throw "Close all Roblox clients first."; window.__pasang++; return null; }
  if (c === "status_update") return { tahap: "mengunduh", diunduh: 5242880, total: 10485760, pesan: "" };
  if (c === "jumlah_join_sejak") return Date.now() > joinPada ? 1 : 0;
  if (c === "set_tema") { await tunda(400); if (window.__mode.simpan === "galat") throw "disk full (dummy)"; return null; }
  if (c === "daftar_riwayat") return ${JSON.stringify(RIWAYAT)};
  if (c === "daftar_versi_roblox") return ${JSON.stringify(VERSI_ROBLOX)};
  if (c === "klien_path") return "";
  if (c === "daftar_server") return { servers: ${JSON.stringify(SERVERS)}, cursor: "" };
  if (c === "wilayah_server_banyak") return (a.jobIds || []).map((j) => ({ job_id: j, wilayah: "Test City" }));
  if (c === "fflag_daftar") return { kelola: { FFlagUji: "True" }, berkas: "C:/R/v1/ClientSettings/ClientAppSettings.json", di_berkas: {} };
  if (c === "versi_roblox_terbaru") return false;
  if (c === "status_unduh_roblox") return { aktif: false };
  if (c === "klien_akun" || c === "daftar_jendela") return [];
  if (c === "tema") return {};
  if (c === "multi_instance_status") return true;
  if (c.endsWith("_status") || c.startsWith("set_") || c === "perbaiki_riwayat" || c === "jendela_maks") return false;
  if (c === "refresh_terjadwal") return { diperbarui: 0 };
  return "";
} } };
</script>`;

async function skenario({ penuh, versi, pulih }) {
  const hasil = [];
  const cek = (nama, ok, info = "") => hasil.push({ nama, ok: !!ok, info: String(info) });
  const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
  const tunggu = async (f, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = f(); if (v) return v; await tidur(50); } return null; };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const isi = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
  const tekan = (el, key, opsi = {}) => el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opsi }));
  const tombol = (teks, akar = document) => $$("button", akar).find((b) => b.textContent.trim() === teks);
  const props = () => $$("aside").at(-1);
  const nav = async (id) => { $(`[data-nav="${id}"]`).click(); await tidur(350); };
  const bagian = async (nama, fn) => {
    try { await fn(); } catch (e) { cek(`bagian "${nama}" melempar galat`, false, String(e && e.stack || e).split("\n").slice(0, 2).join(" ")); }
  };

  await tunggu(() => $("tbody tr"));

  const views = ["akun", "server", "riwayat", "roblox", "fflag", "tema", "about"];
  for (const v of views) {
    await nav(v);
    const header = $("header");
    const rh = header.getBoundingClientRect();
    const ribbonKeluar = $$(".ribbon-btn, header .text-center", header).some((el) => { const r = el.getBoundingClientRect(); return r.top < rh.top - 0.5 || r.bottom > rh.bottom + 0.5; });
    const p = props();
    const pr = p.getBoundingClientRect();
    const th = $$("thead th").filter((x) => x.offsetParent);
    const tumpang = th.some((x, i) => i && x.getBoundingClientRect().left < th[i - 1].getBoundingClientRect().right - 1);
    const tombolKeluar = $$("button", p).some((b) => b.offsetParent && b.getBoundingClientRect().right > pr.right + 1);
    const masalah = {
      gulirHorizontal: document.documentElement.scrollWidth > innerWidth,
      ribbonKeluar, judulKolomTumpang: tumpang, tombolKeluarPanel: tombolKeluar,
      propertiesLuber: p.scrollWidth > p.clientWidth,
      errorBoundary: document.body.innerText.includes("Something went wrong"),
    };
    const buruk = Object.entries(masalah).filter(([, x]) => x).map(([k]) => k);
    cek(`tata letak view "${v}"`, buruk.length === 0, buruk.join(","));
  }
  await nav("akun");

  if (pulih) {
    await bagian('target dipulihkan setelah dibuka ulang', async () => {
      await tunggu(() => props().innerText.includes("Game Tersimpan"), 3000);
      const v = (l) => $(`input[aria-label="${l}"]`)?.value;
      cek("Dibuka ulang: game, link privat, Job ID, delay kembali",
        props().innerText.includes("Game Tersimpan") && v("Private server") === "VIPPULIH" && v("Job ID") === "job-pulih" && v("Delay between launches (seconds)") === "7",
        `${v("Private server")}|${v("Job ID")}|${v("Delay between launches (seconds)")}`);
      await tidur(900);
      cek("Dibuka ulang: memulihkan TIDAK menimpa simpanan dengan isi kosong", window.__target?.link_code === "VIPPULIH", JSON.stringify(window.__target));
    });
  }

  if (penuh) {
    await bagian('density', async () => {
      cek("density bawaan = Compact", document.documentElement.dataset.density === "compact", document.documentElement.dataset.density);
    });
    await bagian('Properties', async () => {
      const kat = (judul) => $$("aside section").find((s) => s.querySelector("button.category")?.textContent.trim().startsWith(judul));
      const label = (s) => $$(".prop > span:first-child", s).map((x) => x.textContent.trim());
      cek("Launch target: Game, Job ID, Private server, Follow player", label(kat("Launch target")).join("|") === "Game|Job ID|Private server|Follow player", label(kat("Launch target")).join("|"));
      const lb = kat("Launch behavior");
      cek("Launch behavior berisi label 'Delay (s)'", lb && label(lb)[0] === "Delay (s)", lb ? label(lb).join("|") : "tak ada");
      const lblDelay = $(".prop > span:first-child", lb);
      cek("Label Delay muat satu baris tanpa terpotong", lblDelay.scrollWidth <= lblDelay.clientWidth && lblDelay.getBoundingClientRect().height <= 31);
      const lebarLabel = new Set($$("aside .prop > span:first-child").map((s) => Math.round(s.getBoundingClientRect().width)));
      cek("Semua label properti sejajar", lebarLabel.size === 1, [...lebarLabel].join(","));
      const delay = $('input[aria-label="Delay between launches (seconds)"]');
      cek("Delay nonaktif tanpa 2+ akun terpilih", delay.disabled);
      const ikuti = $('input[aria-label="Follow player"]');
      cek("Peringatan Follow player TIDAK tampil saat kosong", !props().innerText.includes("Follow player overrides"));
      isi(ikuti, "Teman"); await tidur(100);
      const redup = $$("aside .prop.prop-diabaikan > span:first-child").map((s) => s.textContent);
      cek("Follow player: peringatan + Game/Job ID/Private server diredupkan", props().innerText.includes("Follow player overrides game and server settings.") && redup.join(",") === "Game,Job ID,Private server", redup.join(","));
      isi(ikuti, ""); await tidur(100);
      cek("Follow player dikosongkan: kembali normal", $$("aside .prop-diabaikan").length === 0 && !props().innerText.includes("Follow player overrides"));
      $('[aria-label="Select all shown accounts"]').click(); await tidur(150);
      const daftarNama = $$("aside .line-clamp-2").at(-1);
      cek("Selection: 'Selected: 9 accounts', nama ≤ 2 baris", props().innerText.includes("Selected: 9 accounts") && daftarNama.getBoundingClientRect().height <= 41, Math.round(daftarNama.getBoundingClientRect().height));
      cek("Delay aktif dengan 2+ akun terpilih", !delay.disabled);
      $('[aria-label="Select all shown accounts"]').click(); await tidur(100);
    });
    await bagian('GamePicker', async () => {
      const game = () => $('aside input[aria-label="Game"]');
      window.__mode.cari = "kosong"; isi(game(), "zzzz");
      const mencari = await tunggu(() => props().innerText.includes("Searching Roblox…"), 1500);
      cek("GamePicker: keadaan 'Searching Roblox…'", mencari);
      cek("GamePicker: 'No games found.' + saran", await tunggu(() => props().innerText.includes("No games found.") && props().innerText.includes("Try a Place ID"), 2000));
      window.__mode.cari = "galat"; isi(game(), "yyyy");
      cek("GamePicker: keadaan galat", await tunggu(() => props().innerText.includes("Couldn’t search Roblox."), 2000));
      window.__mode.cari = "ada"; isi(game(), "game");
      await tunggu(() => $$('[role="option"]', document.getElementById(game().getAttribute("aria-controls")) || document.createElement("i")).length === 2, 2000);
      const g = game();
      cek("GamePicker: combobox + listbox + 2 option", g.getAttribute("role") === "combobox" && g.getAttribute("aria-expanded") === "true");
      const awal = g.getAttribute("aria-activedescendant");
      tekan(g, "ArrowDown"); await tidur(50);
      const turun = g.getAttribute("aria-activedescendant");
      tekan(g, "ArrowUp"); await tidur(50);
      cek("GamePicker: ArrowDown/ArrowUp memindah pilihan", turun && turun !== awal && g.getAttribute("aria-activedescendant") === awal);
      tekan(g, "Escape"); await tidur(50);
      cek("GamePicker: Escape menutup daftar", g.getAttribute("aria-expanded") === "false");
      isi(g, "game2"); await tunggu(() => g.getAttribute("aria-expanded") === "true" && $$('[role="option"]', document.getElementById(g.getAttribute("aria-controls")) || document.createElement("i")).length === 2, 2000);
      tekan(g, "ArrowDown"); await tidur(50); tekan(g, "Enter"); await tidur(150);
      cek("GamePicker: Enter memilih -> kartu nama + Place ID", props().innerText.includes("Game Dua Dengan") && props().innerText.includes("Place 222"));
      $('button[aria-label^="Clear game"]').click(); await tidur(100);
      isi(game(), "1818"); await tidur(500);
      cek("GamePicker: Place ID langsung tanpa pencarian", game().getAttribute("aria-expanded") === "false" && game().value === "1818");
      $('[aria-label="Select Akun3"]').click(); await tidur(50);
      $("[data-luncur-utama]").click();
      await tunggu(() => window.__luncur.length, 3000);
      cek("Place ID langsung dipakai peluncuran", window.__luncur[0]?.placeId === 1818, JSON.stringify(window.__luncur[0]));
      await tunggu(() => $("[data-luncur-utama]"), 6000);
      $('[aria-label="Select Akun3"]').click();
    });
    await bagian('Theme Editor', async () => {
      await nav("tema");
      const simpanBtn = () => $$("button").find((b) => /^(Save theme|Saving…|Saved)$/.test(b.textContent.trim()));
      await tunggu(() => !document.body.innerText.includes("Loading theme…"), 2000);
      cek("Theme: Save nonaktif tanpa perubahan", simpanBtn().disabled);
      const preset = (n) => $$('[aria-label="Theme presets"] [role="radio"]').find((r) => r.textContent.includes(n));
      for (const n of ["Studio Dark", "Studio Darker", "Midnight", "Forest"]) {
        preset(n).click(); await tidur(80);
        cek(`Preset ${n}: tanpa peringatan kontras palsu`, !document.body.innerText.includes("Hard to read"));
      }
      preset("Midnight").click(); await tidur(50);
      simpanBtn().click(); await tidur(120);
      cek("Theme: 'Saving…' + nonaktif", simpanBtn().textContent.trim() === "Saving…" && simpanBtn().disabled);
      cek("Theme: lalu 'Saved'", await tunggu(() => simpanBtn().textContent.trim() === "Saved", 2000));
      window.__mode.simpan = "galat"; preset("Forest").click(); await tidur(50);
      simpanBtn().click();
      cek("Theme gagal: pesan galat", await tunggu(() => document.body.innerText.includes("Couldn’t save theme"), 2000));
      cek("Theme gagal: pratinjau tidak dibuang", preset("Forest").getAttribute("aria-checked") === "true");
      window.__mode.simpan = "ok";
      isi($('input[type="color"][aria-label="Workspace"]'), "#c8c8c8"); await tidur(100);
      cek("Theme: latar terang -> peringatan kontras menyebut elemennya", document.body.innerText.includes("Hard to read") && document.body.innerText.includes("Secondary text"));
      preset("Studio Dark").click(); await tidur(50);
    });
    await bagian('density lewat keyboard + persistensi', async () => {
      const radioD = $('[aria-label="Density"] [role="radio"][tabindex="0"]');
      radioD.focus(); tekan(radioD, "ArrowDown"); await tidur(50);
      tekan(document.activeElement, "Enter"); await tidur(100);
      cek("Comfortable: data-density + tersimpan", document.documentElement.dataset.density === "comfortable" && localStorage.getItem("cam.density") === "comfortable");
      cek("Comfortable: baris Explorer 28 px", Math.round($("nav .row").getBoundingClientRect().height) === 28);
      tekan(document.activeElement, "ArrowUp"); await tidur(50);
      tekan(document.activeElement, "Enter"); await tidur(100);
      cek("Kembali ke Compact", document.documentElement.dataset.density === "compact" && localStorage.getItem("cam.density") === "compact");
    });
    await bagian('roving tabindex', async () => {
      await nav("riwayat");
      const barisH = () => $$("tbody tr[data-baris]");
      barisH()[0].focus(); tekan(barisH()[0], "ArrowDown"); await tidur(80);
      cek("History: ArrowDown memindah tab stop (0/-1)", barisH()[1].tabIndex === 0 && barisH()[0].tabIndex === -1 && document.activeElement === barisH()[1]);
      tekan(barisH()[1], "Enter", { repeat: true }); await tidur(80);
      cek("History: Enter key-repeat diabaikan", barisH()[1].getAttribute("aria-selected") === "false");
      tekan(barisH()[1], "Enter"); await tidur(120);
      cek("History: Enter memilih, tab stop tetap di baris itu", barisH()[1].getAttribute("aria-selected") === "true" && barisH()[1].tabIndex === 0);
      cek("History: tabel role=grid (aria-selected sah)", $("table").getAttribute("role") === "grid");
      await nav("roblox");
      const radioV = () => $$('[aria-label="Client used for launching"] [role="radio"][data-baris]');
      radioV()[0].focus(); tekan(radioV()[0], "ArrowDown"); await tidur(80);
      cek("Client versions: roving ikut panah", radioV()[1].tabIndex === 0 && radioV()[0].tabIndex === -1);
      await nav("server");
      const ladangGame = $('input[placeholder^="Game name"]');
      if (ladangGame) { isi(ladangGame, "1818"); await tidur(100); }
      tombol("Load servers").click();
      await tunggu(() => $$("tbody tr[data-baris]").length === 3, 3000);
      const barisS = () => $$("tbody tr[data-baris]");
      barisS()[0].focus(); tekan(barisS()[0], "End"); await tidur(80);
      cek("Servers: End memindah tab stop ke baris terakhir", barisS()[2].tabIndex === 0 && barisS()[0].tabIndex === -1);
      const jobAwal = $('input[aria-label="Job ID"]').value;
      const locate = $('button[aria-label="Locate this server\'s region"]');
      tekan(locate, "Enter"); locate.click(); await tidur(150);
      cek("Servers: Locate tidak mengubah target", $('input[aria-label="Job ID"]').value === jobAwal);
      tekan(barisS()[2], "Enter"); await tidur(100);
      cek("Servers: Enter pada baris mengisi Job ID", $('input[aria-label="Job ID"]').value === "job-02");
    });
    await bagian('semantik Explorer', async () => {
      const nodes = $$("[data-nav]");
      cek("Explorer: setiap node = satu <button> asli", nodes.length === 7 && nodes.every((n) => n.tagName === "BUTTON"), nodes.length);
      cek("Explorer: node aktif ber-aria-current", $('[data-nav="server"]').getAttribute("aria-current") === "page" && $$('[aria-current="page"]').length === 1);
      const chevron = $('nav button[aria-expanded]');
      cek("Explorer: tombol lipat Accounts terpisah", chevron && !chevron.hasAttribute("data-nav") && !chevron.closest("[data-nav]"));
      $('[data-nav="riwayat"] svg').dispatchEvent(new MouseEvent("click", { bubbles: true })); await tidur(300);
      cek("Explorer: klik ikon node = navigasi yang sama", $('[data-nav="riwayat"]').getAttribute("aria-current") === "page");
    });
    await bagian('Mode Hemat', async () => {
      await nav("akun");
      const baris = (al) => $$("tbody tr").find((tr) => tr.textContent.includes(al));
      baris("Akun4").querySelector("td:nth-child(2)").click(); await tidur(150);
      cek("Hemat: baris 'Resource saver' Off untuk akun yang difokus", props().innerText.includes("Resource saver") && props().innerText.includes("Off"));
      cek("Hemat: opsi lanjutan tersembunyi saat mati", !$('[aria-label="RAM limit"]'));
      $('[aria-label="Resource saver (AFK)"]').click();
      await tunggu(() => window.__hemat.length === 1, 2000);
      const h = window.__hemat[0] || {};
      cek("Hemat: menyalakan -> RAM limit bawaan 512 MB, FPS bawaan (0 = 10)", h.id === "a4" && h.hemat === true && h.minimize === false && h.ramMb === 512 && h.fps === 0, JSON.stringify(h));
      await tunggu(() => props().innerText.includes("On (AFK)"), 2000);
      cek("Hemat: Properties 'On (AFK)' + FPS '10 FPS (saver)'", props().innerText.includes("On (AFK)") && props().innerText.includes("10 FPS (saver)"));
      cek("Hemat: opsi Minimize & RAM limit muncul", !!$('[aria-label="RAM limit"]') && !!$('[aria-label="Minimize window after joining"]'));
      cek("Hemat: lencana 'Saver' di grid", baris("Akun4").textContent.includes("Saver"));
      const sel = $('[aria-label="RAM limit"]');
      cek("Hemat: pilihan RAM menampilkan 512 MB", sel.value === "512", sel.value);
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(sel, "0");
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      await tunggu(() => window.__hemat.length === 2, 2000);
      cek("Hemat: RAM Off tetap bisa dipilih, hemat tetap menyala", window.__hemat[1]?.ramMb === 0 && window.__hemat[1]?.hemat === true, JSON.stringify(window.__hemat[1]));
      await tunggu(() => $('[aria-label="RAM limit"]')?.value === "0", 2000);
      const selFps = $('[aria-label="Saver FPS"]');
      cek("Hemat: pilihan Saver FPS tampil, bawaan 10", !!selFps && selFps.value === "10", selFps?.value);
      cek("Hemat: pilihan 3 & 5 FPS dan RAM 128 MB (more CPU) tersedia",
        [...selFps.options].some((o) => o.value === "3") && [...selFps.options].some((o) => o.value === "5")
        && [...$('[aria-label="RAM limit"]').options].some((o) => o.value === "128" && o.textContent.includes("more CPU")));
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(selFps, "20");
      selFps.dispatchEvent(new Event("change", { bubbles: true }));
      await tunggu(() => window.__hemat.length === 3, 2000);
      cek("Hemat: Saver FPS 20 terkirim, RAM Off dipertahankan", window.__hemat[2]?.fps === 20 && window.__hemat[2]?.ramMb === 0, JSON.stringify(window.__hemat[2]));
      await tunggu(() => props().innerText.includes("20 FPS (saver)"), 2000);
      cek("Hemat: baris FPS limit menampilkan '20 FPS (saver)'", props().innerText.includes("20 FPS (saver)"));
      $('[aria-label^="Select Akun5"]').click(); $('[aria-label^="Select Akun6"]').click(); await tidur(100);
      tombol("Account tools").click(); await tidur(300);
      const dlg = () => $('[role="dialog"]');
      cek("Hemat massal: bagian 'Resource saver (AFK)' di Account tools", dlg().innerText.includes("Resource saver (AFK)") && dlg().innerText.includes("2 selected accounts"));
      tombol("Turn on", dlg()).click(); await tidur(150);
      const fpsMassal = dlg().querySelector('[aria-label="FPS for selected accounts"]');
      cek("Hemat massal: pilihan FPS ada, bawaan 10; RAM bawaan 512", fpsMassal?.value === "10" && dlg().querySelector('[aria-label="RAM limit for selected accounts"]')?.value === "512", fpsMassal?.value);
      cek("Hemat massal: konfirmasi menyebut 10 FPS + RAM 512 MB, belum ada request", dlg().innerText.includes("Turn resource saver on for 2 selected accounts at 10 FPS with a 512 MB RAM limit?") && window.__hemat.length === 3);
      tombol("Cancel", dlg()).click(); await tidur(150);
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(fpsMassal, "15");
      fpsMassal.dispatchEvent(new Event("change", { bubbles: true })); await tidur(150);
      tombol("Turn on", dlg()).click(); await tidur(150);
      cek("Hemat massal: konfirmasi ikut FPS yang dipilih (15)", dlg().innerText.includes("at 15 FPS with a 512 MB RAM limit?"));
      tombol("Turn on for 2", dlg()).click();
      await tunggu(() => window.__hemat.length === 5, 2000);
      cek("Hemat massal: dua akun dinyalakan dengan RAM 512 + 15 FPS", window.__hemat.slice(3).map((x) => x.id + ":" + x.hemat + ":" + x.ramMb + ":" + x.fps).join(",") === "a5:true:512:15,a6:true:512:15", JSON.stringify(window.__hemat.slice(3)));
      await tunggu(() => dlg().innerText.includes("Turned on for 2 of 2"), 2000);
      const daftarHemat = () => [...dlg().querySelectorAll('[aria-label="Resource saver per account"] li')].map((li) => li.innerText.replace(/\s+/g, " ").trim());
      cek("Hemat massal: hasil di dialog + status per akun On · RAM 512", dlg().innerText.includes("Turned on for 2 of 2 · 15 FPS · RAM limit 512 MB") && dlg().innerText.includes("2 of 2 on") && daftarHemat().every((x) => x.includes("15 FPS · RAM 512 MB") && x.endsWith("On")), JSON.stringify(daftarHemat()));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); await tidur(250);
      $('[aria-label^="Select Akun5"]').click(); $('[aria-label^="Select Akun6"]').click(); await tidur(100);
    });
    await bagian('Log in with browser', async () => {
      await nav("akun");
      tombol("Add Account").click(); await tidur(400);
      const dlg = () => $('[role="dialog"]');
      cek("Login: tombol 'Log in with browser' + penjelasan tanpa logout", !!tombol("Log in with browser", dlg()) && dlg().innerText.includes("without logging out"));
      isi($("#tambah-alias"), "AliasLogin");
      tombol("Log in with browser", dlg()).click(); await tidur(150);
      cek("Login: menunggu -> tombol nonaktif + 'Cancel login' + petunjuk", dlg().innerText.includes("Waiting for login…") && !!tombol("Cancel login", dlg()) && dlg().innerText.includes("Do not press Log Out"));
      cek("Login: alias ikut dikirim, cookie TIDAK lewat UI", window.__login[0]?.alias === "AliasLogin" && Object.keys(window.__login[0] || {}).join() === "alias", JSON.stringify(window.__login[0]));
      cek("Login: dialog tidak bisa ditutup dengan Esc selama menunggu", (document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })), !!dlg()));
      await tunggu(() => !dlg(), 3000);
      cek("Login: sukses -> dialog tertutup + Output", !dlg() && document.body.innerText.includes("UjiLogin added from the Roblox login."));
      tombol("Add Account").click(); await tidur(400);
      tombol("Log in with browser", dlg()).click(); await tidur(150);
      tombol("Cancel login", dlg()).click();
      await tunggu(() => document.body.innerText.includes("closed before signing in"), 3000);
      cek("Login: Cancel login -> galat jelas, dialog tetap terbuka", !!dlg() && document.body.innerText.includes("closed before signing in") && !!tombol("Log in with browser", dlg()));
      window.__mode.login = "";
      tombol("Cancel", dlg()).click(); await tidur(300);
    });
    await bagian('Saved servers + target diingat', async () => {
      await nav("akun");
      const ladang = (l) => $(`input[aria-label="${l}"]`);
      isi(ladang("Private server"), "https://www.roblox.com/games/111?privateServerLinkCode=VIPKODE123");
      await tunggu(() => window.__target && window.__target.link_code.includes("VIPKODE123"), 2000);
      cek("Target: isian disimpan otomatis setelah berubah", window.__target?.link_code.includes("VIPKODE123"), JSON.stringify(window.__target));
      const simpan = () => $('button[aria-label^="Save this launch target"], button[aria-label="Saved"], button[aria-label^="Pick a game"]');
      cek("Simpan: nonaktif tanpa game/link? (link ada -> aktif)", !simpan().disabled);
      $('button[aria-label^="Clear game"]')?.click(); await tidur(150);
      isi($('aside input[aria-label="Game"]'), "1818"); await tidur(200);
      simpan().click();
      await tunggu(() => window.__saved.length === 1, 2000);
      cek("Simpan: tersimpan 1 dengan game + link", window.__saved[0]?.place_id === "1818" && window.__saved[0]?.link_code.includes("VIPKODE123") && window.__saved[0]?.nama.includes("Private server"), JSON.stringify(window.__saved[0]));
      await tidur(150);
      cek("Simpan: tombol jadi 'Saved' (umpan balik di tempat)", $('button[aria-label="Saved"]') !== null);
      await tidur(2100);
      simpan().click(); await tidur(300);
      cek("Simpan: kombinasi sama tidak dobel", window.__saved.length === 1);
      isi(ladang("Private server"), ""); $('button[aria-label^="Clear game"]')?.click(); isi(ladang("Job ID"), "job-lama"); isi(ladang("Follow player"), "Seseorang"); await tidur(200);
      const pemicu = $$("aside button").find((b) => b.textContent.trim().startsWith("Saved"));
      pemicu.click(); await tidur(200);
      const item = $$('[role="menu"] [role="menuitem"]').find((b) => b.textContent.includes("Private server"));
      cek("Menu Saved: entri tampil", !!item);
      item.click(); await tidur(200);
      cek("Pakai dari menu: link privat + game (Place 1818) terisi lagi",
        ladang("Private server").value.includes("VIPKODE123") && props().innerText.includes("Place 1818"), props().innerText.slice(0, 120));
      cek("Pakai dari menu: Follow player dikosongkan & Job ID = isi entri", ladang("Follow player").value === "" && ladang("Job ID").value === (window.__saved[0]?.job_id || ""), `${ladang("Follow player").value}|${ladang("Job ID").value}|entri=${window.__saved[0]?.job_id}`);
      await nav("server");
      const daftarS = () => $$('[aria-label="Saved servers list"] li');
      cek("Servers: bagian Saved servers berisi 1 entri", daftarS().length === 1);
      daftarS()[0].querySelector('button[aria-label="Rename"]').click(); await tidur(100);
      const inp = $('input[aria-label="Saved server name"]'); isi(inp, "VD privat kita"); tekan(inp, "Enter");
      await tunggu(() => window.__saved[0]?.nama === "VD privat kita", 2000);
      cek("Servers: ganti nama tersimpan", window.__saved[0]?.nama === "VD privat kita");
      await tidur(200);
      const hapus = () => daftarS()[0]?.querySelector('button[aria-label^="Delete"], button[aria-label^="Confirm: delete"]');
      hapus().click(); await tidur(100);
      cek("Servers: hapus butuh klik kedua", window.__saved.length === 1 && !!daftarS()[0].querySelector('button[aria-label^="Confirm: delete"]'));
      hapus().click();
      await tunggu(() => window.__saved.length === 0, 2000);
      await tunggu(() => daftarS().length === 0, 1000);
      cek("Servers: terhapus + petunjuk kosong", window.__saved.length === 0 && document.body.innerText.includes("No saved servers yet"), `tersisa=${window.__saved.length} baris=${daftarS().length} teks=${(document.querySelector('[aria-label="Saved servers"]')?.innerText || "").slice(0, 80)}`);
      await nav("akun");
      isi(ladang("Private server"), ""); await tidur(100);
    });
    await bagian('About + keadaan pra-rilis', async () => {
      await nav("about");
      const teks = () => document.body.innerText;
      cek(`About: versi ${versi} + build date + 'Not checked'`, teks().includes(versi) && /Build date\s+\d{1,2} \w{3,4} \d{4}/.test(teks()) && teks().includes("Not checked"));
      $$("button").find((b) => b.textContent.includes("Open documentation")).click(); await tidur(300);
      cek("About: dokumentasi dari bundel", ($('[role="dialog"]')?.innerText || "").includes("User guide"));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); await tidur(250);
      $$("button").find((b) => b.textContent.includes("View changelog")).click(); await tidur(300);
      cek("About: changelog dari bundel memuat versi ini", ($('[role="dialog"]')?.innerText || "").includes(versi));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); await tidur(250);
      cek(`Setelah update: Output "Updated to ${versi}" tepat sekali`, (teks().match(/Updated to /g) || []).length === 1 && teks().includes(`Updated to ${versi}.`));
      cek("Update: dicek otomatis sekali saat start (lewat updater, bukan fetch)", window.__cekUpdate === 1 && window.__fetch === 0, `${window.__cekUpdate}/${window.__fetch}`);
      tombol("Check for updates").click(); await tidur(300);
      cek("Update: tidak ada versi baru -> 'Up to date'", teks().includes("Up to date"));
      window.__update = { versi: "9.9.9", catatan: "Catatan uji rilis.", tanggal: "2026-11-03" };
      tombol("Check for updates").click(); await tidur(300);
      cek("Update: versi baru tampil + catatan + tombol Install", teks().includes("Update available: 9.9.9") && teks().includes("Catatan uji rilis.") && !!tombol("Install update"),
        teks().slice(0, 200).replace(/\s+/g, " "));
      window.__setKlien(2); await tidur(2300);
      cek("Update: Install terkunci selama klien Roblox berjalan + alasan", tombol("Install update").disabled && teks().includes("Close all Roblox clients first (2 running)"));
      window.__setKlien(0); await tidur(2300);
      cek("Update: terbuka lagi setelah klien ditutup", !tombol("Install update").disabled);
      tombol("Install update").click(); await tidur(900);
      cek("Update: memasang -> kemajuan unduhan tampil", window.__pasang === 1 && teks().includes("Downloading 5.0 of 10.0 MB (50%)") && teks().includes("Installing 9.9.9"));
      cek("Update: NOL fetch dari halaman", window.__fetch === 0, window.__fetch);
    });
  }

  cek("tanpa galat runtime / rejection", window.__GALAT__.length === 0, window.__GALAT__.slice(0, 2).join(" | "));
  return hasil;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const cariEdge = () => [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => existsSync(p));

async function jalankan(edge, html, { ukuran, density, penuh, target }) {
  let hasil = null;
  const halaman = html.replace("<script", () => stub(density, target) + `\n<script>addEventListener("load", () => setTimeout(async () => {
    let r; try { r = await (${skenario.toString()})(${JSON.stringify({ penuh, versi: VERSI, pulih: !!target })}); }
    catch (e) { r = [{ nama: "skenario melempar galat", ok: false, info: String(e && e.stack || e) }]; }
    fetch("/hasil", { method: "POST", body: JSON.stringify(r) });
  }, 900));</script>\n<script`);
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/hasil" && req.method === "POST") {
      let isi = ""; req.on("data", (d) => (isi += d)); req.on("end", () => { hasil = isi; res.writeHead(204).end(); }); return;
    }
    if (p === "/galat" && req.method === "POST") {
      let isi = ""; req.on("data", (d) => (isi += d)); req.on("end", () => { console.error("  [halaman] " + isi.slice(0, 300)); res.writeHead(204).end(); }); return;
    }
    if (p === "/") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(halaman); }
    try { const buf = await readFile(join(DIST, p.slice(1))); res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" }); res.end(buf); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(PORT, r));
  const edgeUji = bukaEdge(edge, [`--window-size=${ukuran}`, `http://localhost:${PORT}/`], "uji-ui-");
  const anak = edgeUji.anak;
  let galatSpawn = null;
  anak.on("error", (e) => (galatSpawn = e));
  const batas = Date.now() + (process.env.UJI_SINGKAT ? 25000 : 90000);
  while (hasil === null && !galatSpawn && Date.now() < batas) await new Promise((r) => setTimeout(r, 250));
  await tutupEdge(edgeUji);
  server.closeAllConnections?.(); server.close();
  if (galatSpawn) throw galatSpawn;
  return hasil === null ? [{ nama: "halaman tidak melaporkan hasil", ok: false, info: "" }] : JSON.parse(hasil);
}

async function main() {
  if (!existsSync(DIST)) { console.error("uji-ui: dist tidak ada -- jalankan build:web dulu."); process.exit(1); }
  const edge = cariEdge();
  if (!edge) { console.warn("uji-ui: Edge/Chrome tidak ditemukan, dilewati."); return; }
  const html = await readFile(join(DIST, "index.html"), "utf8");
  const run = [
    { ukuran: "1200,760", density: null, penuh: true },
    { ukuran: "1200,760", density: "comfortable", penuh: false },
    { ukuran: "960,600", density: "compact", penuh: false },
    { ukuran: "960,600", density: "comfortable", penuh: false },
    { ukuran: "1200,760", density: null, penuh: false, target: { place_id: "555", game_name: "Game Tersimpan", game_icon: "", job_id: "job-pulih", link_code: "VIPPULIH", ikuti: "", jeda: "7" } },
  ];
  let gagal = 0, total = 0;
  for (const r of (process.env.UJI_SINGKAT ? run.slice(0, 1) : run)) {
    const nama = `${r.ukuran.replace(",", "x")} ${r.density || "bawaan"}${r.target ? " (dibuka ulang)" : ""}`;
    const h = await jalankan(edge, html, r);
    for (const c of h) {
      total++;
      if (!c.ok) { gagal++; console.error(`uji-ui: GAGAL [${nama}] ${c.nama}${c.info ? " -- " + c.info : ""}`); }
    }
    console.log(`  ${nama}: ${h.filter((c) => c.ok).length}/${h.length}`);
  }
  if (gagal) { console.error(`uji-ui: ${gagal} dari ${total} pemeriksaan gagal.`); process.exit(1); }
  console.log(`uji-ui: OK — ${total} pemeriksaan (density, Properties, GamePicker, Theme, About, keyboard, tata letak 2 ukuran x 2 density).`);
  process.exit(0);
}

main().catch((e) => { console.error("uji-ui: gagal dijalankan:", e); process.exit(1); });
