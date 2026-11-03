const KUNCI = "cam.density";
export const DENSITY = ["compact", "comfortable"];

export function bacaDensity() {
  try {
    const v = localStorage.getItem(KUNCI);
    return DENSITY.includes(v) ? v : "compact";
  } catch {
    return "compact";
  }
}

export function pasangDensity(v, simpan = true) {
  const nilai = DENSITY.includes(v) ? v : "compact";
  document.documentElement.dataset.density = nilai;
  if (simpan) {
    try {
      localStorage.setItem(KUNCI, nilai);
    } catch {
    }
  }
  return nilai;
}
