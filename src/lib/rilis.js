export const VERSI_APP = typeof __VERSI_APP__ === "string" ? __VERSI_APP__ : "dev";
export const TANGGAL_BUILD = typeof __TANGGAL_BUILD__ === "string" ? __TANGGAL_BUILD__ : "";

export function tanggalBuild() {
  if (!TANGGAL_BUILD) return "Unknown";
  return new Date(TANGGAL_BUILD).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
