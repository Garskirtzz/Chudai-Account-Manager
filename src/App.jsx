import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Users, SearchX, UserPlus, AlertTriangle, Loader2, RotateCw } from "lucide-react";
import Explorer from "./components/Explorer";
import AppHeader from "./components/AppHeader";
import TitleBar from "./components/TitleBar";
import AccountsGrid from "./components/AccountsGrid";
import LaunchBar from "./components/LaunchBar";
import Output from "./components/Output";
import AddAccountModal from "./components/AddAccountModal";
import AliasModal from "./components/AliasModal";
import ConfirmModal from "./components/ConfirmModal";
import HistoryView from "./components/HistoryView";
import FpsModal from "./components/FpsModal";
import RobloxView from "./components/RobloxView";
import ServerBrowser from "./components/ServerBrowser";
import AccountTools from "./components/AccountTools";
import ThemeEditor, { pasangTema } from "./components/ThemeEditor";
import AboutView from "./components/AboutView";
import SavedServers from "./components/SavedServers";
import FolderModal from "./components/FolderModal";
import { cocokFilter, folderAkun, bacaLokal, tulisLokal, labelPreset, IkonFolder, DND_AKUN } from "./lib/folder";
import FastFlags from "./components/FastFlags";
import { Button, PanelTitle } from "./components/Primitives";
import { api, tidur, ambilLinkCode, ambilAccessCode, ambilShareCode, samarkanRahasia } from "./lib/api";
import { VERSI_APP } from "./lib/rilis";

const RAM_HEMAT_MB = 512;

export default function App() {
  const [akun, setAkun] = useState([]);
  const [statusMuat, setStatusMuat] = useState("memuat");
  const [galatMuat, setGalatMuat] = useState("");
  const [statusRiwayat, setStatusRiwayat] = useState("memuat");
  const riwayatGagalRef = useRef(false);
  const [pidAkun, setPidAkun] = useState(() => ({}));
  const [klienAsing, setKlienAsing] = useState(0);
  const [dipilih, setDipilih] = useState(() => new Set());
  const [cari, setCari] = useState("");
  const [multiAktif, setMultiAktif] = useState(false);
  const [modalBuka, setModalBuka] = useState(false);
  const [fokusId, setFokusId] = useState(null);
  const [tampilan, setTampilan] = useState("akun");
  const [folder, setFolder] = useState([]);
  const [filterFolder, setFilterFolderMentah] = useState(() => bacaLokal("cam.filterFolder", "semua"));
  const setFilterFolder = useCallback((v) => {
    setFilterFolderMentah(v);
    tulisLokal("cam.filterFolder", v);
  }, []);
  const [dialogFolder, setDialogFolder] = useState(null);
  const [updateAwal, setUpdateAwal] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [pilihanLuar, setPilihanLuar] = useState(null);
  const [serverTersimpan, setServerTersimpan] = useState([]);
  const [kunciServer, setKunciServer] = useState(0);
  const targetDipulihkan = useRef(false);
  const [aliasAkun, setAliasAkun] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState(null);
  const [sedangSegarkan, setSedangSegarkan] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sembunyikanUsername, setSembunyikanUsername] = useState(false);
  const [fpsAkun, setFpsAkun] = useState(null);
  const [sedangPerbarui, setSedangPerbarui] = useState(() => new Set());
  const [statusLuncur, setStatusLuncur] = useState("");
  const [antrean, setAntrean] = useState(null);
  const sesiRef = useRef(null);
  const pemicuRef = useRef(null);
  const [alatBuka, setAlatBuka] = useState(false);
  const aksiRef = useRef({});
  const aksiStabil = useMemo(
    () =>
      Object.fromEntries(
        ["luncur", "segarkan", "cookie", "rename", "fps", "salin", "hapus"].map((k) => [
          k,
          (a) => aksiRef.current[k]?.(a),
        ])
      ),
    []
  );
  const [log, setLog] = useState([]);
  const nomorLog = useRef(0);

  const [param, setParam] = useState({
    placeId: "",
    jobId: "",
    linkCode: "",
    ikuti: "",
    jeda: "5",
    gameName: "",
    gameIcon: "",
  });

  const beriTahu = useCallback((pesan, jenis = "info") => {
    const jam = new Date().toLocaleTimeString("en-GB", { hour12: false });
    nomorLog.current += 1;
    const id = nomorLog.current;
    setLog((l) => [...l.slice(-199), { id, jam, pesan: samarkanRahasia(pesan), jenis }]);
  }, []);

  const muat = useCallback(async () => {
    try {
      const data = await api.daftarAkun();
      setAkun(data);
      setStatusMuat("siap");
      setGalatMuat("");
      setDipilih((lama) => {
        const baru = new Set();
        for (const a of data) if (lama.has(a.id)) baru.add(a.id);
        return baru;
      });
    } catch (e) {
      setStatusMuat((s) => (s === "siap" ? s : "galat"));
      setGalatMuat(samarkanRahasia(e));
      beriTahu(`Couldn’t load accounts: ${e}`, "salah");
    }
  }, [beriTahu]);

  const muatFolder = useCallback(async () => {
    try {
      const d = await api.daftarFolder();
      setFolder(Array.isArray(d) ? d : []);
    } catch (e) {
      beriTahu(`Couldn’t load folders: ${e}`, "salah");
    }
  }, [beriTahu]);

  const cobaMuatLagi = useCallback(() => {
    setStatusMuat("memuat");
    muat();
  }, [muat]);

  const muatRiwayat = useCallback(async () => {
    try {
      setRiwayat(await api.daftarRiwayat());
      setStatusRiwayat("siap");
    } catch (e) {
      if (!riwayatGagalRef.current) beriTahu(`Couldn’t load history: ${e}`, "salah");
      riwayatGagalRef.current = true;
      setStatusRiwayat((s) => (s === "siap" ? s : "galat"));
      return;
    }
    riwayatGagalRef.current = false;
  }, [beriTahu]);

  useEffect(() => {
    (async () => {
      try {
        pasangTema(await api.tema());
      } catch {
      }
      try {
        const t = await api.targetTerakhir();
        if (t && typeof t === "object") {
          setParam((p) => ({
            ...p,
            placeId: t.place_id || "",
            gameName: t.game_name || "",
            gameIcon: t.game_icon || "",
            jobId: t.job_id || "",
            linkCode: t.link_code || "",
            ikuti: t.ikuti || "",
            jeda: t.jeda || p.jeda,
          }));
          if (t.place_id) {
            setPilihanLuar({ place_id: t.place_id, name: t.game_name || `Place ${t.place_id}`, icon_url: t.game_icon || "" });
          }
        }
      } catch (e) {
        beriTahu(`Couldn’t restore the last launch target: ${e}`, "salah");
      } finally {
        targetDipulihkan.current = true;
      }
      try {
        const d = await api.daftarServerTersimpan();
        setServerTersimpan(Array.isArray(d) ? d : []);
      } catch (e) {
        beriTahu(`Couldn’t load saved servers: ${e}`, "salah");
      }
      await muatFolder();
      const opsional = async (nama, fn, pasang) => {
        try {
          const v = await fn();
          pasang(v);
          return v;
        } catch (e) {
          beriTahu(`Couldn’t read ${nama}: ${e}`, "salah");
          return false;
        }
      };
      await opsional("multi-instance setting", api.multiInstanceStatus, setMultiAktif);
      const auto = await opsional("auto-refresh setting", api.autoRefreshStatus, setAutoRefresh);
      await opsional("hide-usernames setting", api.sembunyikanUsernameStatus, setSembunyikanUsername);
      await muat();
      await muatRiwayat();
      try {
        if (await api.perbaikiRiwayat()) await muatRiwayat();
      } catch {
      }
      if (auto) {
        try {
          const lap = await api.refreshTerjadwal();
          if (lap.diperbarui > 0) {
            beriTahu(
              `Refreshed ${lap.diperbarui} idle account${lap.diperbarui === 1 ? "" : "s"}.`
            );
            await muat();
          }
        } catch {
        }
      }
    })();
    const timer = setInterval(async () => {
      try {
        if (!(await api.autoRefreshStatus())) return;
        const lap = await api.refreshTerjadwal();
        if (lap.diperbarui > 0) await muat();
      } catch {  }
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [muat, muatRiwayat]);

  useEffect(() => {
    let hidup = true;
    const dataUlang = async () => {
      try {
        const daftar = await api.klienAkun();
        if (!hidup) return;
        const peta = {};
        for (const k of daftar) {
          if (!k.akun_id) continue;
          (peta[k.akun_id] ||= []).push(k.pid);
        }
        setPidAkun((lama) =>
          JSON.stringify(lama) === JSON.stringify(peta) ? lama : peta
        );
        setKlienAsing(daftar.filter((k) => !k.akun_id).length);
      } catch {
      }
    };
    dataUlang();
    const t = setInterval(dataUlang, 4000);
    return () => {
      hidup = false;
      clearInterval(t);
    };
  }, []);

  const terlihat = useMemo(() => {
    const k = cari.trim().toLowerCase();
    if (!k) return akun;
    const namaFolder = (a) => folder.find((f) => f.id === folderAkun(a, folder))?.nama.toLowerCase() || "";
    return akun.filter(
      (a) =>
        a.alias.toLowerCase().includes(k) ||
        a.username.toLowerCase().includes(k) ||
        a.display_name.toLowerCase().includes(k) ||
        String(a.user_id).includes(k) ||
        namaFolder(a).includes(k)
    );
  }, [akun, cari, folder]);

  const filterSah = filterFolder === "semua" || filterFolder === "tanpa" || folder.some((f) => f.id === filterFolder) ? filterFolder : "semua";
  const terlihatGrid = useMemo(() => terlihat.filter((a) => cocokFilter(a, filterSah, folder)), [terlihat, filterSah, folder]);

  const toggle = useCallback(
    (id) =>
      setDipilih((s) => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      }),
    []
  );

  const semuaTerpilih =
    terlihatGrid.length > 0 && terlihatGrid.every((a) => dipilih.has(a.id));

  const toggleSemua = () =>
    setDipilih((s) => {
      const n = new Set(s);
      for (const a of terlihatGrid) semuaTerpilih ? n.delete(a.id) : n.add(a.id);
      return n;
    });

  const namaFolder = (id) => (id ? folder.find((f) => f.id === id)?.nama || "folder" : "Ungrouped");

  const pindahAkun = async (ids, folderId) => {
    const nyata = ids.filter((id) => akun.some((a) => a.id === id && folderAkun(a, folder) !== folderId));
    if (!nyata.length) return;
    try {
      const n = await api.pindahAkun(nyata, folderId);
      await muat();
      const f = folder.find((x) => x.id === folderId);
      const siapa = n === 1 ? akun.find((a) => a.id === nyata[0])?.alias || "1 account" : `${n} accounts`;
      beriTahu(`Moved ${siapa} to ${namaFolder(folderId)}.${f?.preset ? ` Saver preset applied (${labelPreset(f.preset)}).` : ""}`, "benar");
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const simpanFolder = async (data) => {
    try {
      if (data.id) {
        const n = await api.ubahFolder(data);
        beriTahu(`Folder "${data.nama}" saved.${n ? ` Saver preset applied to ${n} account${n === 1 ? "" : "s"}.` : ""}`, "benar");
      } else {
        const f = await api.buatFolder(data.nama, data.warna, data.ikon);
        if (data.preset) await api.ubahFolder({ ...f, preset: data.preset });
        beriTahu(`Folder "${f.nama}" created. Drag accounts onto it, or use Move to folder.`, "benar");
      }
      await muatFolder();
      await muat();
      return true;
    } catch (e) {
      beriTahu(String(e), "salah");
      return false;
    }
  };

  const folderAksi = {
    baru: () => setDialogFolder({ folder: null }),
    edit: (f) => setDialogFolder({ folder: f }),
    filter: (id) => {
      setFilterFolder(filterSah === id ? "semua" : id);
      setTampilan("akun");
    },
    ubahNama: (f, nama) => simpanFolder({ ...f, nama }),
    pilihSemua: (anggota, lepas) =>
      setDipilih((s) => {
        const n = new Set(s);
        for (const a of anggota) lepas ? n.delete(a.id) : n.add(a.id);
        return n;
      }),
    luncur: (anggota, label) => {
      setDipilih(new Set(anggota.map((a) => a.id)));
      beriTahu(`Launching folder ${label} (${anggota.length} account${anggota.length === 1 ? "" : "s"}).`);
      luncurkanDaftar(anggota, "folder");
    },
    geser: async (f, arah) => {
      const ids = folder.map((x) => x.id);
      const i = ids.indexOf(f.id);
      const j = i + arah;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      try {
        await api.urutkanFolder(ids);
        await muatFolder();
      } catch (e) {
        beriTahu(String(e), "salah");
      }
    },
    hapus: (f, jumlah) =>
      setKonfirmasi({
        judul: `Delete folder ${f.nama}?`,
        pesan: jumlah
          ? `Its ${jumlah} account${jumlah === 1 ? "" : "s"} stay in the app and move to Ungrouped. Their resource saver settings are kept.`
          : "The folder is empty. No account is affected.",
        labelYa: "Delete folder",
        bahaya: true,
        aksi: async () => {
          try {
            await api.hapusFolder(f.id);
            if (filterSah === f.id) setFilterFolder("semua");
            await muatFolder();
            await muat();
            beriTahu(`Folder "${f.nama}" deleted.`);
          } catch (e) {
            beriTahu(String(e), "salah");
          }
        },
      }),
  };

  const terapkanPresetFolder = async (f) => {
    try {
      const n = await api.terapkanPresetFolder(f.id);
      await muat();
      beriTahu(n ? `${f.nama} preset applied to ${n} account${n === 1 ? "" : "s"}.` : `Every account in ${f.nama} already matches its preset.`, "benar");
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const segarkan = async (id) => {
    try {
      await api.segarkanAkun(id);
      await muat();
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const simpanAlias = async (nama) => {
    const a = aliasAkun;
    setAliasAkun(null);
    if (!a) return;
    try {
      await api.ubahAlias(a.id, nama);
      await muat();
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const hapus = (a) =>
    setKonfirmasi({
      judul: `Delete ${a.alias}?`,
      pesan:
        "The Roblox account itself is untouched — only the cookie stored in " +
        "this app is removed. To use it again you will have to paste a new " +
        "cookie.",
      labelYa: "Delete",
      bahaya: true,
      aksi: async () => {
        try {
          await api.hapusAkun(a.id);
          await muat();
          beriTahu("Account removed.");
        } catch (e) {
          beriTahu(String(e), "salah");
        }
      },
    });

  const salinCookie = (a) =>
    setKonfirmasi({
      judul: `Copy ${a.alias}'s cookie?`,
      pesan:
        "This cookie is equivalent to a password and bypasses 2FA. While it " +
        "sits on the clipboard, any other app on this PC can read it.",
      labelYa: "Copy",
      bahaya: false,
      aksi: async () => {
        try {
          await navigator.clipboard.writeText(await api.ambilCookie(a.id));
          beriTahu("Cookie copied to clipboard.", "benar");
        } catch (e) {
          beriTahu(String(e), "salah");
        }
      },
    });

  const simpanFps = async (fps) => {
    const a = fpsAkun;
    setFpsAkun(null);
    if (!a) return;
    try {
      await api.setFpsAkun(a.id, fps);
      await muat();
      beriTahu(
        fps === 0
          ? `${a.alias}: FPS limit reset to default.`
          : `${a.alias}: FPS limit set to ${fps}.`,
        "benar"
      );
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const ubahHemat = async (daftar, ubah) => {
    let gagal = 0;
    for (const a of daftar) {
      const n = { hemat: a.hemat, hemat_minimize: a.hemat_minimize, hemat_ram_mb: a.hemat_ram_mb, hemat_fps: a.hemat_fps || 0, ...ubah };
      if (ubah.hemat === true && !a.hemat && !("hemat_ram_mb" in ubah) && !a.hemat_ram_mb) {
        n.hemat_ram_mb = RAM_HEMAT_MB;
      }
      try {
        await api.setHematAkun(a.id, n.hemat, n.hemat_minimize, n.hemat_ram_mb, n.hemat_fps);
      } catch (e) {
        gagal++;
        beriTahu(`${a.alias}: ${e}`, "salah");
      }
    }
    await muat();
    if (!gagal) {
      const siapa = daftar.length === 1 ? daftar[0].alias : `${daftar.length} accounts`;
      beriTahu(
        "hemat" in ubah
          ? `${siapa}: resource saver ${ubah.hemat ? "on" : "off"}. Applies from the next launch.`
          : `${siapa}: resource saver updated. Applies from the next launch.`,
        "benar"
      );
    }
    return gagal;
  };

  useEffect(() => {
    if (!targetDipulihkan.current) return;
    const h = setTimeout(() => {
      api
        .simpanTargetTerakhir({
          place_id: String(param.placeId || ""),
          game_name: param.gameName || "",
          game_icon: param.gameIcon || "",
          job_id: param.jobId || "",
          link_code: param.linkCode || "",
          ikuti: param.ikuti || "",
          jeda: String(param.jeda ?? ""),
        })
        .catch(() => {  });
    }, 500);
    return () => clearTimeout(h);
  }, [param]);

  const pakaiServerTersimpan = (s) => {
    setParam((p) => ({
      ...p,
      placeId: String(s.place_id || ""),
      gameName: s.game_name || "",
      gameIcon: s.game_icon || "",
      jobId: s.job_id || "",
      linkCode: s.link_code || "",
      ikuti: "",
    }));
    if (s.place_id) {
      setPilihanLuar({ place_id: s.place_id, name: s.game_name || `Place ${s.place_id}`, icon_url: s.game_icon || "" });
    }
    setKunciServer((k) => k + 1);
    beriTahu(`"${s.nama}" set as the launch target.`, "benar");
  };

  const simpanServerSekarang = async () => {
    const place = String(param.placeId || "").trim();
    const link = String(param.linkCode || "").trim();
    const job = String(param.jobId || "").trim();
    const game = param.gameName || (place ? `Place ${place}` : "Private server link");
    const nama = link ? `${game} · Private server` : job ? `${game} · Server ${job.slice(0, 8)}` : game;
    try {
      const [daftar] = await api.simpanServerTersimpan({
        id: "", nama, place_id: place, game_name: param.gameName || "", game_icon: param.gameIcon || "",
        job_id: job, link_code: link, dibuat: 0,
      });
      setServerTersimpan(daftar);
      beriTahu(`Saved "${nama}". Find it under Saved in Properties or on the Servers page.`, "benar");
      return true;
    } catch (e) {
      beriTahu(String(e), "salah");
      return false;
    }
  };

  const ubahNamaServerTersimpan = async (s, nama) => {
    try {
      setServerTersimpan(await api.ubahNamaServerTersimpan(s.id, nama));
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const hapusServerTersimpan = async (s) => {
    try {
      setServerTersimpan(await api.hapusServerTersimpan(s.id));
      beriTahu(`Deleted saved server "${s.nama}".`);
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  useEffect(() => {
    if (VERSI_APP === "dev") return;
    let lama;
    try {
      lama = localStorage.getItem("cam.versiTerakhir");
      localStorage.setItem("cam.versiTerakhir", VERSI_APP);
    } catch {
      return;
    }
    if (lama && lama !== VERSI_APP) beriTahu(`Updated to ${VERSI_APP}. See About → Changelog for what changed.`, "benar");
  }, [beriTahu]);

  useEffect(() => {
    const h = setTimeout(() => {
      api
        .cekUpdate()
        .then((info) => {
          if (info && info.versi) {
            setUpdateAwal(info);
            beriTahu(`Update ${info.versi} is available. Open About to install it.`, "benar");
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(h);
  }, [beriTahu]);

  const toggleSembunyikan = async () => {
    try {
      const aktif = await api.setSembunyikanUsername(!sembunyikanUsername);
      setSembunyikanUsername(aktif);
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const tambahAkun = async (cookie, alias, folderId) => {
    try {
      const a = await api.tambahAkun(cookie, alias, folderId);
      await muat();
      beriTahu(`${a.username} added.`, "benar");
      return true;
    } catch (e) {
      beriTahu(String(e), "salah");
      return false;
    }
  };

  const tandaiPerbarui = (id, aktif) =>
    setSedangPerbarui((s) => {
      const n = new Set(s);
      aktif ? n.add(id) : n.delete(id);
      return n;
    });

  const perbaruiCookie = async (a, diam = false) => {
    tandaiPerbarui(a.id, true);
    try {
      await api.perbaruiCookie(a.id);
      await muat();
      if (!diam) beriTahu(`${a.alias}: cookie refreshed.`, "benar");
      return true;
    } catch (e) {
      if (!diam) beriTahu(String(e), "salah");
      return false;
    } finally {
      tandaiPerbarui(a.id, false);
    }
  };

  const perbaruiSemuaCookie = async (diam = false) => {
    let ok = 0;
    for (const a of akun) {
      if (await perbaruiCookie(a, true)) ok++;
    }
    if (!diam && akun.length) {
      beriTahu(`${ok}/${akun.length} cookie diperbarui.`, ok ? "benar" : "salah");
    }
  };

  const toggleAutoRefresh = async () => {
    try {
      const aktif = await api.setAutoRefresh(!autoRefresh);
      setAutoRefresh(aktif);
      beriTahu(
        aktif
          ? "Auto-refresh cookie aktif — cookie diperbarui otomatis saat aplikasi dibuka."
          : "Auto-refresh cookie dimatikan."
      );
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const segarkanSemua = async () => {
    setSedangSegarkan(true);
    for (const a of akun) {
      try {
        await api.segarkanAkun(a.id);
      } catch {
      }
    }
    await muat();
    setSedangSegarkan(false);
  };

  const nyalakanMulti = async () => {
    try {
      const aktif = await api.setMultiInstance(true);
      setMultiAktif(aktif);
      beriTahu("Multi-instance on — more than one Roblox client can open.");
      return aktif;
    } catch (e) {
      beriTahu(String(e), "salah");
      return false;
    }
  };

  const toggleMulti = async () => {
    if (!multiAktif) {
      return setKonfirmasi({
        judul: "Enable multi-instance?",
        pesan:
          "This holds Roblox's own single-instance lock so more than one " +
          "client can run. Roblox's anti-cheat vendor has said running " +
          "multiple clients may be treated as suspicious behaviour, so this " +
          "is off by default. Your call.",
        labelYa: "Enable",
        aksi: nyalakanMulti,
      });
    }
    try {
      const aktif = await api.setMultiInstance(false);
      setMultiAktif(aktif);
      beriTahu(
        aktif
          ? "Multi-instance on — more than one Roblox client can open."
          : "Multi-instance off."
      );
    } catch (e) {
      beriTahu(String(e), "salah");
    }
  };

  const paramLuncur = () => ({
    placeId: Number(String(param.placeId).replace(/\D/g, "")) || 0,
    jobId: param.jobId,
    linkCode:
      ambilShareCode(param.linkCode) || ambilAccessCode(param.linkCode)
        ? ""
        : ambilLinkCode(param.linkCode),
    accessCode: ambilAccessCode(param.linkCode),
    shareCode: ambilShareCode(param.linkCode),
    gameName: param.gameName,
    gameIcon: param.gameIcon,
  });

  const serverSiap = async (p, acuan) => {
    if (!p.jobId || !p.placeId || p.followUserId) return { ok: true };
    if (!acuan) return { ok: true };
    try {
      const h = await api.periksaServer(acuan.id, p.placeId, p.jobId);
      return h.bisa ? { ok: true } : { ok: false, pesan: h.pesan };
    } catch {
      return { ok: true };
    }
  };

  const idIkuti = async (acuan) => {
    const teks = String(param.ikuti || "").trim();
    if (!teks) return { id: 0 };
    if (!acuan) return { id: 0, galat: "Add an account first." };
    try {
      const u = await api.cariUser(teks, acuan.id);
      if (!u.place_id) {
        return {
          id: 0,
          galat: `${u.username || teks} is not in a game right now.`,
        };
      }
      return {
        id: u.user_id,
        nama: u.username,
        game: u.game_name,
        placeId: u.place_id,
      };
    } catch (e) {
      return { id: 0, galat: String(e) };
    }
  };

  const pakaiIkuti = (p, ik) => {
    p.followUserId = ik.id;
    if (ik.id) {
      p.placeId = ik.placeId || 0;
      p.gameName = ik.game || "";
      p.gameIcon = "";
    }
  };

  const luncurkanDaftar = async (daftar, sumber, { nyalakanDulu = false } = {}) => {
    if (sesiRef.current || !daftar.length) return;

    if (!nyalakanDulu && daftar.length > 1 && !multiAktif) {
      return setKonfirmasi({
        judul: "Multi-instance is off",
        pesan:
          `You are launching ${daftar.length} accounts, but only one Roblox ` +
          "client can run while multi-instance is off.\n\n" +
          "Enabling it holds Roblox's own single-instance lock. Roblox's " +
          "anti-cheat vendor has said running multiple clients may be " +
          "treated as suspicious behaviour. It stays on until you turn it " +
          "off or close this app.",
        labelYa: "Enable and launch",
        aksi: () => luncurkanDaftar(daftar, sumber, { nyalakanDulu: true }),
      });
    }

    const sesi = { batal: false };
    sesiRef.current = sesi;
    pemicuRef.current = document.activeElement;
    const hasil = new Map(daftar.map((a) => [a.id, { status: "queued", pesan: "" }]));
    setAntrean({
      sesi,
      sumber,
      fase: "preparing",
      batal: false,
      item: daftar.map((a) => ({ id: a.id, alias: a.alias, status: "queued", pesan: "" })),
    });
    setStatusLuncur("Preparing…");

    const ubah = (f) => setAntrean((q) => (q && q.sesi === sesi ? f(q) : q));
    const tandai = (a, status, pesan = "") => {
      hasil.set(a.id, { status, pesan });
      ubah((q) => ({ ...q, item: q.item.map((x) => (x.id === a.id ? { ...x, status, pesan } : x)) }));
    };
    const status = (s) => sesiRef.current === sesi && setStatusLuncur(s);
    const aman = async (fn, cadangan) => {
      try { return await fn(); } catch { return cadangan; }
    };

    let mulaiJalan = false;
    try {
      if (nyalakanDulu && !(await nyalakanMulti())) return;
      const p = paramLuncur();
      const acuan = daftar[0];
      const ik = await idIkuti(acuan);
      if (ik.galat) return beriTahu(`Launch not started: ${ik.galat}`, "salah");
      pakaiIkuti(p, ik);
      if (!p.placeId && !p.shareCode && !p.followUserId)
        return beriTahu("Launch not started: no game selected.", "salah");
      if (p.followUserId) beriTahu(`Following ${ik.nama} into ${ik.game}.`);
      const cek = await serverSiap(p, acuan);
      if (!cek.ok) return beriTahu(`Launch not started: ${cek.pesan}`, "salah");
      const jeda = Math.max(0, Number(param.jeda) || 0);

      mulaiJalan = true;
      ubah((q) => ({ ...q, fase: "running" }));

      for (let i = 0; i < daftar.length; i++) {
        const a = daftar[i];
        if (sesi.batal) break;
        const terakhir = i === daftar.length - 1;
        tandai(a, "starting");
        status(`Starting ${a.alias}…`);
        const sebelum = await aman(api.jumlahKlien, 0);
        const sejak = Math.floor(Date.now() / 1000);

        try {
          await api.luncurkan(a.id, p);
        } catch (e) {
          tandai(a, "failed", String(e));
          continue;
        }

        const batasProses = Date.now() + 60000;
        let muncul = false;
        while (Date.now() < batasProses && !sesi.batal) {
          if ((await aman(api.jumlahKlien, 0)) > sebelum) { muncul = true; break; }
          await tidur(700);
        }
        if (sesi.batal && !muncul) {
          tandai(a, "launched", "Stopped waiting after cancel; the client keeps starting on its own.");
          break;
        }
        if (!muncul) {
          tandai(a, "failed", "Client did not start within 60 seconds.");
          continue;
        }

        tandai(a, "joining");
        const mulaiJoin = Date.now();
        let join = false;
        while (Date.now() < mulaiJoin + 120000 && !sesi.batal) {
          if ((await aman(() => api.jumlahJoinSejak(sejak), 0)) > 0) { join = true; break; }
          status(`${a.alias} is joining… ${Math.round((Date.now() - mulaiJoin) / 1000)}s`);
          await tidur(1500);
        }
        if (sesi.batal && !join) {
          tandai(a, "launched", "Stopped waiting after cancel; the client keeps joining on its own.");
          break;
        }
        if (!join) {
          tandai(a, "failed", "Did not finish joining within 2 minutes.");
          continue;
        }
        tandai(a, "launched");
        if (a.hemat && a.hemat_minimize) {
          aman(() => api.jendelaHemat(a.id), false);
        }
        if (a.hemat) {
          aman(async () => {
            const m = await api.periksaVersiHemat(a.id);
            if (m) beriTahu(m, "salah");
          }, null);
        }

        if (!terakhir) {
          for (let sisa = jeda; sisa > 0 && !sesi.batal; sisa--) {
            status(`Settling… ${sisa}s`);
            await tidur(1000);
          }
        }
      }
    } catch (e) {
      beriTahu(`Launch stopped: ${e}`, "salah");
    } finally {
      for (const a of daftar) if (hasil.get(a.id).status === "queued") hasil.set(a.id, { status: "cancelled", pesan: "" });

      if (sesiRef.current === sesi) {
        sesiRef.current = null;
        setAntrean(null);
        setStatusLuncur("");
        requestAnimationFrame(() => {
          const kini = document.activeElement;
          if (kini && kini !== document.body && !kini.closest("[data-progres-luncur]")) return;
          const p = pemicuRef.current;
          if (p instanceof HTMLElement && p.isConnected && !p.disabled) p.focus();
          else document.querySelector("[data-luncur-utama]")?.focus();
        });
      }

      if (mulaiJalan) {
        await muatRiwayat();
        const dengan = (s) => daftar.filter((a) => hasil.get(a.id).status === s);
        const naik = dengan("launched"), jatuh = dengan("failed"), batal = dengan("cancelled");
        beriTahu(
          `Launch finished: Launched ${naik.length} · Failed ${jatuh.length} · Cancelled ${batal.length}`,
          jatuh.length ? "salah" : "benar"
        );
        if (naik.length) beriTahu(`Launched: ${naik.map((a) => a.alias).join(", ")}`);
        for (const a of jatuh) beriTahu(`Failed: ${a.alias} — ${hasil.get(a.id).pesan}`, "salah");
        if (batal.length) beriTahu(`Cancelled (not started): ${batal.map((a) => a.alias).join(", ")}`);
      }
    }
  };

  const luncurTerpilih = () => luncurkanDaftar(akun.filter((a) => dipilih.has(a.id)), "selection");
  const luncurSatu = (a) => luncurkanDaftar([a], "single");

  const batalkanSisa = useCallback(() => {
    const sesi = sesiRef.current;
    if (!sesi) return;
    sesi.batal = true;
    setAntrean((q) => (q && q.sesi === sesi ? { ...q, batal: true } : q));
    setStatusLuncur((s) => s && "Cancelling — finishing the current step…");
  }, []);

  const sebagian = terlihatGrid.some((a) => dipilih.has(a.id)) && !semuaTerpilih;
  const fokus = akun.find((a) => a.id === fokusId) || null;

  aksiRef.current = {
    luncur: (a) => luncurSatu(a),
    segarkan: (a) => segarkan(a.id),
    cookie: (a) => perbaruiCookie(a),
    rename: (a) => setAliasAkun(a),
    fps: (a) => setFpsAkun(a),
    salin: (a) => salinCookie(a),
    hapus: (a) => hapus(a),
  };

  const judulDok =
    tampilan === "riwayat" ? "History"
    : tampilan === "roblox" ? "Client versions"
    : tampilan === "server" ? "Servers"
    : tampilan === "tema" ? "Appearance"
    : tampilan === "about" ? "About"
    : tampilan === "fflag" ? "Fast Flags"
    : "Accounts";

  return (
    <div className="flex h-full flex-col gap-0.5 bg-line">
      <div className="flex flex-none flex-col">
        <TitleBar />
        <AppHeader
        multiAktif={multiAktif}
        onToggleMulti={toggleMulti}
        sembunyikanUsername={sembunyikanUsername}
        onToggleSembunyikan={toggleSembunyikan}
        onSegarkanSemua={segarkanSemua}
        sedangSegarkan={sedangSegarkan}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={toggleAutoRefresh}
        onPerbaruiSemua={perbaruiSemuaCookie}
        onTambah={() => setModalBuka(true)}
        jumlahDipilih={dipilih.size}
        onAlat={() => setAlatBuka(true)}
      />
      </div>

      <div className="flex min-h-0 flex-1 gap-0.5">
        <Explorer
          tampilan={tampilan}
          onPilihTampilan={setTampilan}
          akun={akun}
          terlihat={terlihat}
          dipilih={dipilih}
          onToggle={toggle}
          fokusId={fokus?.id}
          onFokus={setFokusId}
          pidAkun={pidAkun}
          cari={cari}
          setCari={setCari}
          jumlahRiwayat={riwayat.length}
          sembunyikanUsername={sembunyikanUsername}
          folder={folder}
          filterFolder={tampilan === "akun" ? filterSah : null}
          folderAksi={folderAksi}
          onPindah={pindahAkun}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <section className="flex min-h-0 flex-1 flex-col bg-app-bg">
            <PanelTitle
              kanan={
                tampilan === "akun" && (cari || filterSah !== "semua") ? (
                  <span className="font-normal text-dim">
                    {terlihatGrid.length} of {akun.length} shown
                  </span>
                ) : null
              }
            >
              {judulDok}
            </PanelTitle>

            {tampilan === "fflag" ? (
              <div className="min-h-0 flex-1">
                <FastFlags beriTahu={beriTahu} />
              </div>
            ) : tampilan === "server" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <SavedServers
                  daftar={serverTersimpan}
                  onPakai={pakaiServerTersimpan}
                  onUbahNama={ubahNamaServerTersimpan}
                  onHapus={hapusServerTersimpan}
                />
                <div className="min-h-0 flex-1">
                  <ServerBrowser
                    key={kunciServer}
                    beriTahu={beriTahu}
                    akunPertama={akun.find((a) => dipilih.has(a.id)) || akun[0]}
                    placeAwal={param.placeId}
                    namaAwal={param.gameName}
                    ikonAwal={param.gameIcon}
                    onPilihServer={(v) => {
                      setParam((p) => ({
                        ...p,
                        placeId: String(v.placeId),
                        jobId: v.jobId,
                        gameName: v.gameName || "",
                        gameIcon: v.gameIcon || "",
                      }));
                      setPilihanLuar({
                        place_id: v.placeId,
                        name: v.gameName || `Place ${v.placeId}`,
                        icon_url: v.gameIcon || "",
                      });
                      beriTahu(`Server ${v.jobId} set as the launch target.`);
                    }}
                  />
                </div>
              </div>
            ) : (
              <main className="min-h-0 flex-1 overflow-y-auto">
                {tampilan === "roblox" ? (
                  <RobloxView onBeriTahu={beriTahu} />
                ) : tampilan === "tema" ? (
                  <ThemeEditor beriTahu={beriTahu} />
                ) : tampilan === "about" ? (
                  <AboutView beriTahu={beriTahu} updateAwal={updateAwal} />
                ) : tampilan === "riwayat" ? (
                  <HistoryView
                    status={statusRiwayat}
                    onCobaLagi={() => { setStatusRiwayat("memuat"); muatRiwayat(); }}
                    riwayat={riwayat}
                    onBersihkan={() =>
                      setKonfirmasi({
                        judul: "Clear history?",
                        pesan:
                          "Every recorded game will be removed. Accounts and their cookies " +
                          "are not affected.",
                        labelYa: "Clear history",
                        bahaya: true,
                        aksi: async () => {
                          try {
                            await api.hapusRiwayat();
                            await muatRiwayat();
                            beriTahu("History cleared.");
                          } catch (e) {
                            beriTahu(String(e), "salah");
                          }
                        },
                      })
                    }
                    onPilihGame={(g) => {
                      setParam((p) => ({
                        ...p,
                        placeId: String(g.place_id),
                        gameName: g.game_name,
                        gameIcon: g.icon_url,
                      }));
                      setPilihanLuar({
                        place_id: g.place_id,
                        name: g.game_name,
                        icon_url: g.icon_url,
                      });
                      beriTahu(`${g.game_name} set as the launch target.`);
                    }}
                  />
                ) : statusMuat === "memuat" && akun.length === 0 ? (
                  <Kosong ikon={Loader2} putar judul="Loading accounts…" teks="Reading saved accounts from disk." />
                ) : statusMuat === "galat" && akun.length === 0 ? (
                  <Kosong
                    ikon={AlertTriangle}
                    judul="Couldn’t load accounts"
                    teks={galatMuat || "The account list could not be read."}
                    aksi={
                      <Button variant="secondary" icon={RotateCw} onClick={cobaMuatLagi}>
                        Retry
                      </Button>
                    }
                  />
                ) : akun.length === 0 ? (
                  <Kosong
                    ikon={Users}
                    judul="No accounts yet"
                    teks="Add an account by pasting its .ROBLOSECURITY cookie. It is checked against Roblox before it is saved."
                    aksi={
                      <Button variant="primary" icon={UserPlus} onClick={() => setModalBuka(true)}>
                        Add Account
                      </Button>
                    }
                  />
                ) : (
                  <>
                    {folder.length > 0 && (
                      <ChipFolder
                        folder={folder}
                        akun={terlihat}
                        filter={filterSah}
                        onFilter={setFilterFolder}
                        onBaru={folderAksi.baru}
                        onPindah={pindahAkun}
                      />
                    )}
                    {terlihatGrid.length === 0 ? (
                      filterSah !== "semua" && !cari ? (
                        <Kosong
                          ikon={Users}
                          judul={`${namaFolder(filterSah === "tanpa" ? null : filterSah)} is empty`}
                          teks="Drag accounts onto this folder in the Explorer, or use Move to folder in an account's menu."
                          aksi={<Button variant="secondary" onClick={() => setFilterFolder("semua")}>Show all accounts</Button>}
                        />
                      ) : (
                        <Kosong
                          ikon={SearchX}
                          judul={`No account matches "${cari}"`}
                          teks="The filter checks alias, username, display name, user ID and folder name. Clear it in the Explorer to see every account."
                        />
                      )
                    ) : (
                  <>
                    {klienAsing > 0 && (
                      <div className="strip-warn border-b border-line px-3 py-1.5 text-body">
                        {klienAsing} klien Roblox berjalan tapi tidak bisa dikaitkan ke akun mana pun
                        {" "}&mdash; biasanya karena dibuka di luar aplikasi ini.
                      </div>
                    )}
                    <AccountsGrid
                      akun={terlihatGrid}
                      folder={folder}
                      onPindah={pindahAkun}
                      dipilih={dipilih}
                      semuaTerpilih={semuaTerpilih}
                      sebagian={sebagian}
                      onToggleSemua={toggleSemua}
                      onToggle={toggle}
                      onFokus={setFokusId}
                      fokusId={fokus?.id}
                      pidAkun={pidAkun}
                      sembunyikanUsername={sembunyikanUsername}
                      sedangLuncur={!!statusLuncur || !!antrean}
                      sedangPerbarui={sedangPerbarui}
                      aksi={aksiStabil}
                    />
                  </>
                    )}
                  </>
                )}
              </main>
            )}
          </section>

          <Output log={log} statusLuncur={statusLuncur} onBersihkan={() => setLog([])} />
        </div>

        <LaunchBar
          pilihanLuar={pilihanLuar}
          nilai={param}
          setNilai={setParam}
          serverTersimpan={serverTersimpan}
          onPakaiTersimpan={pakaiServerTersimpan}
          onSimpanTarget={simpanServerSekarang}
          onKelolaTersimpan={() => setTampilan("server")}
          jumlahDipilih={dipilih.size}
          namaDipilih={akun.filter((a) => dipilih.has(a.id)).map((a) => a.alias)}
          onLuncurkan={() => luncurTerpilih()}
          statusLuncur={statusLuncur}
          antrean={antrean}
          onBatalkan={batalkanSisa}
          fokus={fokus}
          pidFokus={fokus ? pidAkun[fokus.id] : null}
          sembunyikanUsername={sembunyikanUsername}
          aksiAkun={
            fokus
              ? {
                  rename: () => setAliasAkun(fokus),
                  segarkan: () => segarkan(fokus.id),
                  cookie: () => perbaruiCookie(fokus),
                  salin: () => salinCookie(fokus),
                  fps: () => setFpsAkun(fokus),
                  hemat: (ubah) => ubahHemat([fokus], ubah),
                  hapus: () => hapus(fokus),
                  pindah: (folderId) => pindahAkun([fokus.id], folderId),
                  terapkanPreset: (f) => terapkanPresetFolder(f),
                }
              : {}
          }
          folder={folder}
        />
      </div>

      <AccountTools
        terbuka={alatBuka}
        onTutup={() => setAlatBuka(false)}
        akunDipilih={akun.filter((a) => dipilih.has(a.id))}
        beriTahu={beriTahu}
        onHemat={ubahHemat}
        folder={folder}
        onPindah={pindahAkun}
      />

      <FolderModal
        buka={!!dialogFolder}
        folder={dialogFolder?.folder || null}
        jumlahAnggota={dialogFolder?.folder ? akun.filter((a) => a.folder_id === dialogFolder.folder.id).length : 0}
        onTutup={() => setDialogFolder(null)}
        onSimpan={simpanFolder}
      />

      <AddAccountModal
        buka={modalBuka}
        onTutup={() => setModalBuka(false)}
        onSimpan={tambahAkun}
        folder={folder}
        folderAwal={folder.some((f) => f.id === filterSah) ? filterSah : ""}
        onLogin={async (alias, folderId) => {
          try {
            beriTahu("Waiting for the Roblox login window…");
            beriTahu(await api.loginBrowser(alias, folderId), "benar");
            await muat();
            return true;
          } catch (e) {
            beriTahu(String(e), "salah");
            return false;
          }
        }}
        onBatalLogin={() => api.tutupLoginBrowser().catch(() => {})}
      />

      <FpsModal
        akun={fpsAkun}
        onTutup={() => setFpsAkun(null)}
        onSimpan={simpanFps}
      />

      <AliasModal
        akun={aliasAkun}
        onTutup={() => setAliasAkun(null)}
        onSimpan={simpanAlias}
      />

      <ConfirmModal
        buka={!!konfirmasi}
        judul={konfirmasi?.judul}
        pesan={konfirmasi?.pesan}
        labelYa={konfirmasi?.labelYa}
        bahaya={konfirmasi?.bahaya}
        onTutup={() => setKonfirmasi(null)}
        onYa={() => {
          const k = konfirmasi;
          setKonfirmasi(null);
          k?.aksi?.();
        }}
      />
    </div>
  );
}

function ChipFolder({ folder, akun, filter, onFilter, onBaru, onPindah }) {
  const [sasaran, setSasaran] = useState(null);
  const hitung = (id) => akun.filter((a) => folderAkun(a, folder) === id).length;
  const chip = (id, label, jumlah, f, dropKe) => (
    <button
      key={id}
      type="button"
      data-chip={id}
      aria-pressed={filter === id}
      onClick={() => onFilter(id)}
      onDragOver={dropKe === undefined ? undefined : (e) => {
        if (!e.dataTransfer.types.includes(DND_AKUN)) return;
        e.preventDefault();
        setSasaran(id);
      }}
      onDragLeave={() => setSasaran((s) => (s === id ? null : s))}
      onDrop={dropKe === undefined ? undefined : (e) => {
        setSasaran(null);
        const d = e.dataTransfer.getData(DND_AKUN);
        if (!d) return;
        e.preventDefault();
        try { onPindah(JSON.parse(d), dropKe); } catch {  }
      }}
      className={
        "flex h-6 flex-none items-center gap-1.5 border px-2 text-meta " +
        (filter === id ? "border-accent-hi bg-accent text-on-accent" : "border-line bg-well text-ink hover:border-faint") +
        (sasaran === id ? " outline outline-1 outline-[var(--color-ink)]" : "")
      }
    >
      {f !== undefined && (f ? <IkonFolder f={f} size={12} className={filter === id ? "!text-on-accent" : ""} /> : null)}
      <span className="max-w-[140px] truncate">{label}</span>
      <span className={filter === id ? "text-on-accent/80" : "text-dim"}>{jumlah}</span>
    </button>
  );
  return (
    <div role="toolbar" aria-label="Folder filter" className="flex flex-none flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
      {chip("semua", "All", akun.length)}
      {folder.map((f) => chip(f.id, f.nama, hitung(f.id), f, f.id))}
      {chip("tanpa", "Ungrouped", hitung(null), null, null)}
      <button type="button" onClick={onBaru} className="btn btn-ghost btn-sm h-6 gap-1 px-1.5 text-meta font-normal" title="New folder">
        + New folder
      </button>
    </div>
  );
}

function Kosong({ ikon: Ikon, judul, teks, aksi, putar }) {
  return (
    <div className="flex h-full items-start justify-center pt-[12vh]" role={putar ? "status" : undefined}>
      <div className="max-w-sm text-center">
        <Ikon
          size={30}
          className={`mx-auto mb-3 text-faint ${putar ? "animate-spin motion-reduce:animate-none" : ""}`}
          strokeWidth={1.5}
          aria-hidden
        />
        <h3 className="text-title font-semibold text-ink">{judul}</h3>
        <p className="mt-1.5 mb-4 text-body leading-5 text-dim select-text break-words">{teks}</p>
        {aksi}
      </div>
    </div>
  );
}
