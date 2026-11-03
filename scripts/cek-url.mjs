import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "src-tauri/src";
let cacat = 0;

for (const f of await readdir(DIR)) {
  if (!f.endsWith(".rs")) continue;
  const isi = await readFile(join(DIR, f), "utf8");
  isi.split("\n").forEach((baris, i) => {
    if (baris.trimStart().startsWith("//")) return;
    for (const m of baris.matchAll(/"(https?:\/\/[^"]*)"/g)) {
      if (/\s/.test(m[1])) {
        console.error(`cek-url: ${DIR}/${f}:${i + 1} URL memuat spasi:`);
        console.error(`  ${JSON.stringify(m[1].slice(0, 120))}`);
        cacat++;
      }
    }
  });
}

if (cacat) process.exit(1);
console.log("cek-url: OK — tidak ada spasi nyasar di literal URL.");
