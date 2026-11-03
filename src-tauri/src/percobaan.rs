use crate::{fps, jendela, joinlog, launcher, roblox, store, sumber};
use serde_json::{json, Map, Value};
use std::time::{Duration, Instant};

#[derive(Default)]
struct Skenario {
    nama: &'static str,
    flags: Value,
    jendela: Option<&'static str>,
    cap: Option<i32>,
    job: Option<Option<u64>>,
    opsi: launcher::OpsiProses,
    gpu_hemat: bool,
}

fn grafis_diterima() -> Value {
    json!({
        "DFIntDebugFRMQualityLevelOverride": 1,
        "FIntDebugForceMSAASamples": 0,
        "DFFlagTextureQualityOverrideEnabled": "True",
        "DFIntTextureQualityOverride": 0,
        "FIntFRMMinGrassDistance": 0,
        "FIntFRMMaxGrassDistance": 0
    })
}

fn grafis_rendah(fps: u32) -> Value {
    json!({
        "DFIntTaskSchedulerTargetFps": fps,
        "DFIntDebugFRMQualityLevelOverride": 1,
        "FIntDebugForceMSAASamples": 0,
        "DFFlagTextureQualityOverrideEnabled": "True",
        "DFIntTextureQualityOverride": 0,
        "FIntRenderShadowIntensity": 0,
        "FIntFRMMinGrassDistance": 0,
        "FIntFRMMaxGrassDistance": 0
    })
}

fn hemat_rilis(nama: &'static str) -> Skenario {
    Skenario {
        nama,
        flags: grafis_diterima(),
        cap: Some(10),
        job: Some(Some(512)),
        opsi: launcher::OpsiProses { prioritas_rendah: true, ..Default::default() },
        ..Default::default()
    }
}

fn hemat_flag(nama: &'static str, tambah: Value) -> Skenario {
    let mut s = hemat_rilis(nama);
    if let (Some(o), Some(t)) = (s.flags.as_object_mut(), tambah.as_object()) {
        for (k, v) in t {
            o.insert(k.clone(), v.clone());
        }
    }
    s
}

fn skenario_lanjut() -> Vec<Skenario> {
    vec![
        hemat_rilis("kontrol (hemat rilis)"),
        hemat_flag("voxel", json!({ "DFFlagDebugRenderForceTechnologyVoxel": "True" })),
        hemat_flag("d3d11-fl10", json!({ "FFlagDebugGraphicsPreferD3D11FL10": "True" })),
        hemat_flag("vulkan", json!({ "FFlagDebugGraphicsPreferVulkan": "True" })),
        hemat_flag("opengl", json!({ "FFlagDebugGraphicsPreferOpenGL": "True" })),
        hemat_flag("flag-ekstra", json!({
            "FFlagDisablePostFx": "True",
            "DFFlagDebugPauseVoxelizer": "True",
            "FFlagDebugSkyGray": "True",
            "FIntRenderGrassDetailStrands": 0
        })),
        Skenario { gpu_hemat: true, ..hemat_rilis("igpu-780m") },
        Skenario { jendela: Some("mungil"), ..hemat_rilis("jendela-320x180") },
        Skenario { cap: Some(5), ..hemat_rilis("cap5") },
        Skenario { cap: Some(3), ..hemat_rilis("cap3") },
        Skenario {
            opsi: launcher::OpsiProses { prioritas_rendah: true, eco: true, memori_rendah: true, ..Default::default() },
            ..hemat_rilis("eco+memori-rendah")
        },
        Skenario {
            opsi: launcher::OpsiProses { prioritas_rendah: true, core: Some(2), ..Default::default() },
            ..hemat_rilis("2-core")
        },
        Skenario { job: Some(Some(128)), ..hemat_rilis("ws128") },
    ]
}

fn daftar_skenario(set: &str) -> Vec<Skenario> {
    if set == "konfirmasi" {
        let satu = || {
            vec![
                hemat_rilis("kontrol (hemat rilis)"),
                Skenario { cap: Some(3), ..hemat_rilis("cap3") },
                Skenario { job: Some(Some(128)), ..hemat_rilis("ws128") },
                Skenario { cap: Some(3), job: Some(Some(128)), ..hemat_rilis("cap3+ws128") },
            ]
        };
        let mut v = satu();
        v.extend(satu());
        return v;
    }
    if set == "lanjut" {
        return skenario_lanjut();
    }
    if let Some(pilih) = set.strip_prefix("lanjut:") {
        let mau: Vec<&str> = pilih.split(',').map(str::trim).collect();
        return skenario_lanjut()
            .into_iter()
            .filter(|s| s.nama.starts_with("kontrol") || mau.contains(&s.nama))
            .collect();
    }
    if set == "ram" {
        let s = |nama, mb| Skenario { nama, flags: grafis_diterima(), jendela: None, cap: Some(10), job: Some(mb), ..Default::default() };
        return vec![
            s("hemat (kontrol)", None),
            s("hemat+ws1024", Some(1024)),
            s("hemat+ws512", Some(512)),
            s("hemat+ws256", Some(256)),
        ];
    }
    if set == "fps" {
        let satu = || {
            vec![
                Skenario { nama: "baseline", flags: json!({}), jendela: None, cap: Some(-1), job: None, ..Default::default() },
                Skenario { nama: "cap30", flags: json!({}), jendela: None, cap: Some(30), job: None, ..Default::default() },
                Skenario { nama: "cap10", flags: json!({}), jendela: None, cap: Some(10), job: None, ..Default::default() },
                Skenario { nama: "cap10+grafis", flags: grafis_diterima(), jendela: None, cap: Some(10), job: None, ..Default::default() },
                Skenario { nama: "cap10+grafis+minimize", flags: grafis_diterima(), jendela: Some("minimize"), cap: Some(10), job: None, ..Default::default() },
            ]
        };
        let mut v = satu();
        v.extend(satu());
        return v;
    }
    vec![
        Skenario { nama: "baseline", flags: json!({}), jendela: None, cap: None, job: None, ..Default::default() },
        Skenario { nama: "fps15", flags: json!({ "DFIntTaskSchedulerTargetFps": 15 }), jendela: None, cap: None, job: None, ..Default::default() },
        Skenario { nama: "fps10", flags: json!({ "DFIntTaskSchedulerTargetFps": 10 }), jendela: None, cap: None, job: None, ..Default::default() },
        Skenario { nama: "fps10+grafis", flags: grafis_rendah(10), jendela: None, cap: None, job: None, ..Default::default() },
        Skenario { nama: "fps10+grafis+kecil", flags: grafis_rendah(10), jendela: Some("kecil"), cap: None, job: None, ..Default::default() },
        Skenario { nama: "fps10+grafis+minimize", flags: grafis_rendah(10), jendela: Some("minimize"), cap: None, job: None, ..Default::default() },
    ]
}

struct Cadangan {
    berkas: std::path::PathBuf,
    isi: Option<Vec<u8>>,
}

impl Drop for Cadangan {
    fn drop(&mut self) {
        match &self.isi {
            Some(b) => {
                let _ = std::fs::write(&self.berkas, b);
            }
            None => {
                let _ = std::fs::remove_file(&self.berkas);
            }
        }
        println!("{} dipulihkan ke isi semula.", self.berkas.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default());
    }
}

const KUNCI_GPU: &str = r"HKCU\Software\Microsoft\DirectX\UserGpuPreferences";

fn baca_pref_gpu(exe: &str) -> Option<String> {
    let o = std::process::Command::new("reg").args(["query", KUNCI_GPU, "/v", exe]).output().ok()?;
    if !o.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&o.stdout).to_string();
    s.lines().find_map(|l| l.split("REG_SZ").nth(1).map(|v| v.trim().to_string()))
}

fn tulis_pref_gpu(exe: &str, nilai: Option<&str>) {
    let mut c = std::process::Command::new("reg");
    match nilai {
        Some(v) => c.args(["add", KUNCI_GPU, "/v", exe, "/t", "REG_SZ", "/d", v, "/f"]),
        None => c.args(["delete", KUNCI_GPU, "/v", exe, "/f"]),
    };
    let _ = c.output();
}

struct PrefGpu {
    exe: String,
    asli: Option<String>,
}

impl PrefGpu {
    fn pasang(exe: &str) -> Self {
        let asli = baca_pref_gpu(exe);
        let lain: Vec<&str> = asli
            .as_deref()
            .unwrap_or("")
            .split(';')
            .filter(|b| !b.is_empty() && !b.starts_with("GpuPreference="))
            .collect();
        let baru = format!("{}GpuPreference=1;", lain.iter().map(|b| format!("{b};")).collect::<String>());
        tulis_pref_gpu(exe, Some(&baru));
        PrefGpu { exe: exe.to_string(), asli }
    }
}

impl Drop for PrefGpu {
    fn drop(&mut self) {
        tulis_pref_gpu(&self.exe, self.asli.as_deref());
        println!("  preferensi GPU {} dipulihkan.", self.exe.rsplit('\\').next().unwrap_or(""));
    }
}

fn flag_ditolak_sejak(sejak: i64) -> Vec<String> {
    let Some(dir) = dirs::data_local_dir().map(|d| d.join("Roblox").join("logs")) else { return Vec::new() };
    let Ok(baca) = std::fs::read_dir(dir) else { return Vec::new() };
    let mut hasil = Vec::new();
    for e in baca.flatten() {
        let Ok(isi) = std::fs::read(e.path()) else { continue };
        for b in isi.split(|&c| c == b'\n') {
            if joinlog::waktu_baris(b).map_or(true, |w| w < sejak) {
                continue;
            }
            let s = String::from_utf8_lossy(b);
            if let Some(i) = s.find("Denied local configuration for:") {
                for f in s[i + 31..].split(',') {
                    let f = f.trim().to_string();
                    if !f.is_empty() && !hasil.contains(&f) {
                        hasil.push(f);
                    }
                }
            }
        }
    }
    hasil
}

fn tulis_flags(cadangan: &Cadangan, flags: &Value) -> Result<(), String> {
    let mut isi: Map<String, Value> = cadangan
        .isi
        .as_ref()
        .and_then(|b| serde_json::from_slice::<Value>(b).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    isi.remove("DFIntTaskSchedulerTargetFps");
    for (k, v) in flags.as_object().cloned().unwrap_or_default() {
        isi.insert(k, v);
    }
    if let Some(d) = cadangan.berkas.parent() {
        std::fs::create_dir_all(d).map_err(|e| format!("folder ClientSettings: {e}"))?;
    }
    let teks = serde_json::to_string_pretty(&Value::Object(isi)).map_err(|e| e.to_string())?;
    std::fs::write(&cadangan.berkas, teks).map_err(|e| format!("menulis ClientAppSettings.json: {e}"))
}

fn tunggu<T>(batas: Duration, jeda: Duration, mut f: impl FnMut() -> Option<T>) -> Option<T> {
    let mulai = Instant::now();
    while mulai.elapsed() < batas {
        if let Some(v) = f() {
            return Some(v);
        }
        std::thread::sleep(jeda);
    }
    None
}

fn jendela_pid(pid: u32) -> Option<usize> {
    jendela::daftar().into_iter().find(|j| j.pid == pid).map(|j| j.hwnd)
}

#[derive(Default)]
struct Rata {
    n: f64,
    cpu: f64,
    gpu: f64,
    ram: f64,
    privat: f64,
    vram: f64,
    kompresi: f64,
    bersama: f64,
}

pub fn jalankan(alias: &str, place_id: u64, detik_ukur: u64, csv: Option<String>, set: &str) -> Result<(), String> {
    use std::io::Write;
    if !launcher::pid_klien().is_empty() {
        return Err("Sudah ada klien Roblox yang berjalan. Tutup dulu semua klien supaya percobaan tidak mengganggu sesi lain dan angkanya bersih.".into());
    }
    let s = store::Store::load();
    let akun = s
        .accounts
        .iter()
        .find(|a| a.alias.eq_ignore_ascii_case(alias))
        .ok_or_else(|| format!("Akun dengan alias \"{alias}\" tidak ditemukan."))?;
    let cookie = store::decrypt(&akun.cookie_enc)?;
    let btid = akun.browser_tracker_id;
    let klien = std::env::var("PROBE_KLIEN").unwrap_or_else(|_| s.klien_path.clone());
    let exe = if klien.is_empty() { None } else { Some(klien.as_str()) };

    let dir = fps::berkas_setting(&klien).ok_or("Folder versi Roblox tidak ditemukan.")?;
    let berkas = dir.join("ClientAppSettings.json");
    let cadangan = Cadangan { isi: std::fs::read(&berkas).ok(), berkas };
    let pengaturan = crate::hemat::berkas_pengaturan().map(|b| Cadangan { isi: std::fs::read(&b).ok(), berkas: b });

    let mut keluar = csv.and_then(|f| {
        let baru = !std::path::Path::new(&f).exists();
        let mut b = std::fs::OpenOptions::new().create(true).append(true).open(&f).ok()?;
        if baru {
            let _ = writeln!(b, "skenario,sampel,cpu_persen,gpu_persen,ram_mb,privat_mb,vram_mb,kompresi_mb,bersama_mb");
        }
        Some(b)
    });

    println!("Percobaan Mode Hemat: akun {alias}, place {place_id}, {detik_ukur} dtk ukur per skenario.\n");
    println!("{:<24} {:>7} {:>7} {:>8} {:>9} {:>8} {:>8}", "skenario", "CPU %", "GPU %", "RAM MB", "privat MB", "VRAM MB", "GPU-RAM");
    for sk in daftar_skenario(set) {
        let tray = launcher::akhiri_tray_diam();
        if tray > 0 {
            println!("  ({} proses tray Roblox yang diam diakhiri -> cold start)", tray);
        }
        tulis_flags(&cadangan, &sk.flags)?;
        if let Some(cap) = sk.cap {
            let p = pengaturan.as_ref().ok_or("GlobalBasicSettings Roblox tidak ditemukan.")?;
            let xml = std::fs::read_to_string(&p.berkas).map_err(|e| format!("membaca GlobalBasicSettings: {e}"))?;
            let baru = crate::hemat::ganti_cap(&xml, cap).ok_or("FramerateCap tidak ada di GlobalBasicSettings.")?;
            std::fs::write(&p.berkas, baru).map_err(|e| format!("menulis GlobalBasicSettings: {e}"))?;
        }
        let ticket = tauri::async_runtime::block_on(roblox::auth_ticket(&cookie))?;
        let sejak = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        let kompresi_awal = sumber::ukur().kompresi_mb;
        let tujuan = launcher::Tujuan::Publik { place_id };
        let exe_klien = launcher::exe_klien(&klien).ok_or("RobloxPlayerBeta.exe tidak ditemukan.")?;
        let _pref_gpu = sk.gpu_hemat.then(|| PrefGpu::pasang(&exe_klien));
        let mut pid_dibuat = None;
        match sk.job {
            Some(batas) => {
                let (pid_baru, peringatan) = launcher::luncurkan_terbatas(
                    &ticket, &tujuan, btid, &exe_klien,
                    launcher::OpsiProses { batas_ws_mb: batas, ..sk.opsi },
                )?;
                pid_dibuat = Some(pid_baru);
                if let Some(w) = peringatan {
                    println!("  PERINGATAN [{}]: {w}", sk.nama);
                }
            }
            None => launcher::luncurkan(&ticket, &tujuan, btid, exe)?,
        }

        tunggu(Duration::from_secs(90), Duration::from_millis(700), || {
            launcher::pid_klien().first().copied()
        })
        .ok_or_else(|| format!("[{}] klien tidak muncul dalam 90 detik", sk.nama))?;
        tunggu(Duration::from_secs(120), Duration::from_millis(1500), || {
            (joinlog::jumlah_join_sejak(sejak) > 0).then_some(())
        })
        .ok_or_else(|| format!("[{}] klien tidak masuk game dalam 2 menit", sk.nama))?;

        std::thread::sleep(Duration::from_secs(5));
        let (pid, hwnd) = tunggu(Duration::from_secs(30), Duration::from_secs(1), || {
            launcher::pid_klien().into_iter().find_map(|p| jendela_pid(p).map(|h| (p, h)))
        })
        .ok_or_else(|| format!("[{}] jendela klien tidak ditemukan", sk.nama))?;

        if let Some(d) = pid_dibuat {
            if d != pid {
                println!("  PERINGATAN [{}]: game berjalan di PID {pid}, bukan PID buatan probe {d} (Roblox memulai ulang dirinya) -- opsi proses TIDAK berlaku", sk.nama);
            }
        }
        match sk.jendela {
            Some("kecil") => {
                let _ = jendela::pindah(hwnd, 40, 40, 640, 360);
            }
            Some("mungil") => {
                let _ = jendela::pindah(hwnd, 40, 40, 320, 180);
            }
            Some("minimize") => {
                let _ = jendela::kecilkan(hwnd);
            }
            _ => {}
        }
        std::thread::sleep(Duration::from_secs(30));

        let _ = sumber::ukur();
        let mut r = Rata::default();
        for i in 1..=detik_ukur {
            std::thread::sleep(Duration::from_secs(1));
            let l = sumber::ukur();
            if let Some(k) = l.klien.iter().find(|k| k.pid == pid) {
                r.n += 1.0;
                r.cpu += k.cpu;
                r.gpu += k.gpu.unwrap_or(0.0);
                r.ram += k.ram_mb;
                r.privat += k.privat_mb;
                r.vram += k.vram_mb.unwrap_or(0.0);
                r.kompresi += l.kompresi_mb;
                r.bersama += k.bersama_mb.unwrap_or(0.0);
                if let Some(f) = keluar.as_mut() {
                    let _ = writeln!(
                        f, "{},{i},{:.2},{:.2},{:.1},{:.1},{:.1},{:.1},{:.1}",
                        sk.nama, k.cpu, k.gpu.unwrap_or(0.0), k.ram_mb, k.privat_mb, k.vram_mb.unwrap_or(0.0), l.kompresi_mb,
                        k.bersama_mb.unwrap_or(0.0)
                    );
                }
            }
        }
        if r.n > 0.0 {
            let putus = baris_putus_sejak(sejak);
            let ditolak = flag_ditolak_sejak(sejak);
            println!(
                "{:<24} {:>7.2} {:>7.2} {:>8.0} {:>9.0} {:>8.0} {:>8.0}   kompresi {:+.0} MB{}{}",
                sk.nama, r.cpu / r.n, r.gpu / r.n, r.ram / r.n, r.privat / r.n, r.vram / r.n, r.bersama / r.n,
                r.kompresi / r.n - kompresi_awal,
                if ditolak.is_empty() { String::new() } else { format!("   DITOLAK: {}", ditolak.join(", ")) },
                if putus.is_empty() { String::new() } else { format!("   PUTUS: {}", putus.join(" | ")) }
            );
        } else {
            println!("{:<24} (klien hilang selama pengukuran)", sk.nama);
        }

        for _ in 0..3 {
            match jendela_pid(pid) {
                Some(h) => {
                    let _ = jendela::tutup(h);
                }
                None => break,
            }
            if tunggu(Duration::from_secs(5), Duration::from_millis(500), || launcher::pid_klien().is_empty().then_some(())).is_some() {
                break;
            }
        }
        if tunggu(Duration::from_secs(30), Duration::from_secs(1), || launcher::pid_klien().is_empty().then_some(())).is_none() {
            return Err(format!("[{}] klien tidak menutup dalam 30 detik; percobaan dihentikan (proses TIDAK dibunuh).", sk.nama));
        }
        std::thread::sleep(Duration::from_secs(3));
    }
    drop(cadangan);
    drop(pengaturan);
    Ok(())
}

fn baris_putus_sejak(sejak: i64) -> Vec<String> {
    let Some(dir) = dirs::data_local_dir().map(|d| d.join("Roblox").join("logs")) else { return Vec::new() };
    let Ok(baca) = std::fs::read_dir(dir) else { return Vec::new() };
    let mut hasil = Vec::new();
    for e in baca.flatten() {
        let Ok(isi) = std::fs::read(e.path()) else { continue };
        for b in isi.split(|&c| c == b'\n') {
            let Some(w) = joinlog::waktu_baris(b) else { continue };
            if w < sejak {
                continue;
            }
            let s = String::from_utf8_lossy(b);
            let l = s.to_ascii_lowercase();
            if l.contains("signalr") {
                continue;
            }
            if l.contains("disconnect") && !l.contains("ondisconnect") || l.contains("kicked") || l.contains("lost connection") {
                hasil.push(s.chars().skip(25).take(110).collect());
            }
        }
    }
    hasil.truncate(3);
    hasil
}
