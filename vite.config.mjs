import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const konf = JSON.parse(readFileSync(new URL("./src-tauri/tauri.conf.json", import.meta.url), "utf8"));

export const ejaanBiasa = (p) =>
  p
    .replace(/^\\\\\?\\UNC\\/i, "\\\\")
    .replace(/^\\\\\?\\(?=[A-Za-z]:)/, "")
    .replace(/^[a-z]:/, (d) => d.toUpperCase());
const AKAR = ejaanBiasa(realpathSync.native(fileURLToPath(new URL(".", import.meta.url))));

export default defineConfig({
  root: AKAR,
  plugins: [react()],
  resolve: {
    alias: { "@": join(AKAR, "src") },
  },
  define: {
    __VERSI_APP__: JSON.stringify(konf.version),
    __TANGGAL_BUILD__: JSON.stringify(new Date().toISOString()),
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome110",
    assetsInlineLimit: (berkas) => (/\.(woff2?|ttf|otf)$/i.test(berkas) ? false : undefined),
  },
});
