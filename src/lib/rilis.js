export const VERSI_APP = typeof __VERSI_APP__ === "string" ? __VERSI_APP__ : "dev";
export const TANGGAL_BUILD = typeof __TANGGAL_BUILD__ === "string" ? __TANGGAL_BUILD__ : "";

export function tanggalBuild() {
  if (!TANGGAL_BUILD) return "Unknown";
  return new Date(TANGGAL_BUILD).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export const SUMBER_UPDATE = "";

export function lebihBaru(a, b) {
  const pa = String(a).replace(/^v/i, "").split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^v/i, "").split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

export async function cekPembaruan(sumber = SUMBER_UPDATE, ambil = globalThis.fetch) {
  if (!sumber) {
    return { status: "galat", pesan: "No update source is configured for this build." };
  }
  try {
    const kendali = new AbortController();
    const batas = setTimeout(() => kendali.abort(), 10000);
    const r = await ambil(sumber, { credentials: "omit", cache: "no-store", signal: kendali.signal });
    clearTimeout(batas);
    if (!r.ok) return { status: "galat", pesan: `The update server answered HTTP ${r.status}.` };
    const j = await r.json();
    if (!j || typeof j.version !== "string") {
      return { status: "galat", pesan: "The update information is not in the expected format." };
    }
    return lebihBaru(j.version, VERSI_APP)
      ? { status: "ada", versi: j.version, url: typeof j.url === "string" ? j.url : "" }
      : { status: "terbaru", versi: j.version };
  } catch (e) {
    return {
      status: "galat",
      pesan: e?.name === "AbortError" ? "The update server did not answer in time." : "You may be offline, or the update server is unreachable.",
    };
  }
}
