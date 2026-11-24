// @ts-nocheck
import { cari } from "./kamus-id";

const KUNCI = "cam.bahasa";
export const BAHASA = [
  { kode: "en", nama: "English" },
  { kode: "id", nama: "Bahasa Indonesia" },
];

const ATRIBUT = ["title", "placeholder"];
const LEWATI = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"]);

let aktif = false;
let pengamat = null;
const simpul = new Map();
const atribut = new Map();

function rapikan(s) {
  return s.replace(/\s+/g, " ").trim();
}

export function terjemahkan(s) {
  if (!s || !/[A-Za-z]/.test(s)) return null;
  const kunci = rapikan(s);
  const hasil = cari(kunci);
  if (hasil == null || hasil === kunci) return null;
  const awal = /^\s*/.exec(s)[0];
  const akhir = /\s*$/.exec(s)[0];
  return awal + hasil + akhir;
}

function dilewati(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (LEWATI.has(e.tagName) || e.getAttribute?.("translate") === "no" || e.isContentEditable) return true;
  }
  return false;
}

function asliDari(n) {
  const c = simpul.get(n);
  if (c && n.nodeValue === c.tulis) return c.asli;
  if (c) simpul.delete(n);
  return n.nodeValue;
}

function tulis(n, asli, nilai) {
  if (n.nodeValue !== nilai) n.nodeValue = nilai;
  simpul.set(n, { asli, tulis: nilai });
}

function hanyaTeks(el) {
  const anak = el.childNodes;
  if (anak.length < 2) return false;
  for (const a of anak) if (a.nodeType !== 3) return false;
  return true;
}

function terjemahkanGabungan(el) {
  const anak = [...el.childNodes];
  const asli = anak.map(asliDari);
  const hasil = terjemahkan(asli.join(""));
  if (hasil != null) {
    anak.forEach((a, i) => tulis(a, asli[i], i === 0 ? hasil : ""));
    return;
  }
  anak.forEach((a, i) => {
    if (!simpul.has(a)) return;
    if (a.nodeValue !== asli[i]) a.nodeValue = asli[i];
    simpul.delete(a);
  });
}

function prosesTeks(n) {
  const el = n.parentElement;
  if (!el || dilewati(el)) return;
  if (hanyaTeks(el)) return terjemahkanGabungan(el);
  const asli = asliDari(n);
  const hasil = terjemahkan(asli);
  if (hasil != null) tulis(n, asli, hasil);
}

function prosesAtribut(el) {
  if (el.closest('[translate="no"]') || el.hasAttribute("data-judul-data")) return;
  for (const nama of ATRIBUT) {
    const kini = el.getAttribute(nama);
    if (kini == null) continue;
    const catatan = atribut.get(el) || {};
    const c = catatan[nama];
    const asli = c && kini === c.tulis ? c.asli : kini;
    const hasil = terjemahkan(asli);
    if (hasil == null) continue;
    if (kini !== hasil) el.setAttribute(nama, hasil);
    catatan[nama] = { asli, tulis: hasil };
    atribut.set(el, catatan);
  }
}

function prosesPohon(akar) {
  if (akar.nodeType === 3) return prosesTeks(akar);
  if (akar.nodeType !== 1) return;
  if (akar.hasAttribute?.("title") || akar.hasAttribute?.("placeholder")) prosesAtribut(akar);
  const jalan = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = jalan.nextNode(); n; n = jalan.nextNode()) {
    if (n.nodeType === 3) prosesTeks(n);
    else if (n.hasAttribute("title") || n.hasAttribute("placeholder")) prosesAtribut(n);
  }
}

function pangkas() {
  if (simpul.size > 4000) for (const n of simpul.keys()) if (!n.isConnected) simpul.delete(n);
  if (atribut.size > 2000) for (const el of atribut.keys()) if (!el.isConnected) atribut.delete(el);
}

function mulai() {
  if (pengamat) return;
  prosesPohon(document.body);
  pengamat = new MutationObserver((daftar) => {
    for (const m of daftar) {
      if (m.type === "characterData") prosesTeks(m.target);
      else if (m.type === "attributes") prosesAtribut(m.target);
      else for (const n of m.addedNodes) prosesPohon(n);
    }
    pangkas();
  });
  pengamat.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUT });
}

function berhenti() {
  pengamat?.disconnect();
  pengamat = null;
  for (const [n, c] of simpul) if (n.isConnected && n.nodeValue === c.tulis) n.nodeValue = c.asli;
  for (const [el, catatan] of atribut) {
    if (!el.isConnected) continue;
    for (const [nama, c] of Object.entries(catatan)) if (el.getAttribute(nama) === c.tulis) el.setAttribute(nama, c.asli);
  }
  simpul.clear();
  atribut.clear();
}

export function bacaBahasa() {
  try {
    return localStorage.getItem(KUNCI) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
}

export function pasangBahasa(kode) {
  const k = kode === "id" ? "id" : "en";
  try {
    localStorage.setItem(KUNCI, k);
  } catch {
  }
  document.documentElement.lang = k;
  try {
    window.dispatchEvent(new CustomEvent("cam-bahasa", { detail: k }));
  } catch {
  }
  if (k === "id" && !aktif) {
    aktif = true;
    mulai();
  } else if (k === "en" && aktif) {
    aktif = false;
    berhenti();
  }
  return k;
}
