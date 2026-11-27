// @ts-nocheck
const JAM = 3600 * 1000;
const HARI = 24 * JAM;

export function sisaWaktu(ms) {
  if (ms >= HARI) {
    const d = Math.floor(ms / HARI);
    return `${d} day${d === 1 ? "" : "s"} left`;
  }
  if (ms >= JAM) {
    const j = Math.floor(ms / JAM);
    return `${j} hour${j === 1 ? "" : "s"} left`;
  }
  return "less than an hour left";
}

function tanggal(ms) {
  try {
    return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return new Date(ms).toISOString();
  }
}

const BUKA = "Use Open roblox.com in the account details to see them.";

export function statusPembatasan(p, kini = Date.now()) {
  if (!p) return null;
  const akhir = p.berakhir ? Date.parse(p.berakhir) : NaN;
  const adaAkhir = Number.isFinite(akhir);
  switch (p.jenis) {
    case "ban":
      if (adaAkhir && akhir <= kini) {
        return {
          jenis: "warn",
          teks: "Ban ended",
          rincian: `The ban ended on ${tanggal(akhir)}. Refresh to update the status; Roblox may ask you to reactivate the account on roblox.com.`,
          dibatasi: true,
        };
      }
      return {
        jenis: "bad",
        teks: adaAkhir ? `Banned · ${sisaWaktu(akhir - kini)}` : "Banned",
        rincian: `${p.label || "Banned by Roblox"}${adaAkhir ? `, ends ${tanggal(akhir)}` : ""}.`,
        dibatasi: true,
      };
    case "terminated":
      return { jenis: "bad", teks: "Terminated", rincian: "Roblox deleted this account.", dibatasi: true };
    case "warn":
      return {
        jenis: "warn",
        teks: "Warning",
        rincian: `Roblox issued a warning. The account can't be used until it is acknowledged on roblox.com. ${BUKA}`,
        dibatasi: true,
      };
    case "lock":
      return {
        jenis: "bad",
        teks: "Locked",
        rincian: `Roblox locked this account for security. ${BUKA}`,
        dibatasi: true,
      };
    case "deactivated":
      return { jenis: "bad", teks: "Deactivated", rincian: `This account is deactivated. ${BUKA}`, dibatasi: true };
    default:
      return { jenis: "warn", teks: "Restricted", rincian: `Roblox restricts this account. ${BUKA}`, dibatasi: true };
  }
}

export function statusAkun(a, kini = Date.now()) {
  const p = statusPembatasan(a.pembatasan, kini);
  if (p) return p;
  if (a.banned) {
    return { jenis: "bad", teks: "Banned", rincian: "Roblox shows this account as banned on its public profile.", dibatasi: true };
  }
  if (a.last_error) return { jenis: "bad", teks: a.last_error, rincian: a.last_error, dibatasi: false };
  if (a.banned == null) {
    return { jenis: "idle", teks: "Not checked", rincian: "Refresh this account to check its sign-in and restrictions.", dibatasi: false, belum: true };
  }
  return { jenis: "ok", teks: "Healthy", rincian: "Roblox accepts the sign-in and reports no restriction (last Refresh).", dibatasi: false };
}
