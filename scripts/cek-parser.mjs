import { ambilLinkCode, ambilAccessCode, ambilShareCode } from "../src/lib/api.js";

const SHARE = "https://www.roblox.com/share?code=8b9ef0461a7bb947ba23be24e9671adc&type=Server";
const LAMA = "https://www.roblox.com/games/123/X?privateServerLinkCode=67724955068405734514998262644752";
const AKSES = "accessCode=1f2e3d4c-5b6a-7988-9a0b-1c2d3e4f5061";

const kasus = [
  ["share -> shareCode", ambilShareCode(SHARE), "8b9ef0461a7bb947ba23be24e9671adc"],
  ["share -> bukan accessCode", ambilAccessCode(SHARE), ""],
  ["lama -> linkCode", ambilLinkCode(LAMA), "67724955068405734514998262644752"],
  ["lama -> bukan shareCode", ambilShareCode(LAMA), ""],
  ["accessCode ditempel", ambilAccessCode(AKSES), "1f2e3d4c-5b6a-7988-9a0b-1c2d3e4f5061"],
  ["kosong aman", ambilShareCode(""), ""],
];

let gagal = 0;
for (const [nama, dapat, harap] of kasus) {
  if (dapat !== harap) {
    console.error(`cek-parser: GAGAL ${nama}\n  dapat : ${JSON.stringify(dapat)}\n  harap : ${JSON.stringify(harap)}`);
    gagal++;
  }
}
if (gagal) process.exit(1);
console.log(`cek-parser: OK — ${kasus.length} kasus link lolos.`);
