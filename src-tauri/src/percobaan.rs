use crate::{fps, jendela, joinlog, launcher, roblox, store, sumber};
use serde_json::{json, Map, Value};
use std::time::{Duration, Instant};

struct JagaJob(Option<usize>);

impl Drop for JagaJob {
    fn drop(&mut self) {
        if let Some(j) = self.0.take() {
            launcher::job_tutup(j);
        }
    }
}

const JOB_CPU_ENABLE_HARD: u32 = 0x1 | 0x4;

#[derive(Default)]
struct Skenario {
    nama: &'static str,
    flags: Value,
    jendela: Option<&'static str>,
    cap: Option<i32>,
    job: Option<Option<u64>>,
    opsi: launcher::OpsiProses,
    gpu_hemat: bool,
    hidup: Option<Hidup>,
    silang: Option<(u32, u64)>,
}

#[derive(Clone, Copy)]
enum Hidup {
    Trim(u64),
    MemoriRendah,
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
    if set == "cpusilang" {
        let mut s = hemat_rilis("hemat silang 3%");
        s.opsi.cpu_persen_x100 = Some(0);
        s.silang = Some((300, 30));
        return vec![s];
    }
    if set == "cpusibuk" {
        let cap = |nama, x100| {
            let mut s = hemat_rilis(nama);
            s.opsi.cpu_persen_x100 = Some(x100);
            s
        };
        return vec![hemat_rilis("hemat kontrol"), cap("hemat + cpu 5%", 500), cap("hemat + cpu 3%", 300)];
    }
    if set == "hidup" {
        let biasa = |nama| Skenario { nama, flags: grafis_diterima(), cap: Some(60), ..Default::default() };
        return vec![
            hemat_rilis("hemat kontrol"),
            Skenario { hidup: Some(Hidup::Trim(120)), ..hemat_rilis("hemat + trim 2 mnt") },
            Skenario { hidup: Some(Hidup::MemoriRendah), ..hemat_rilis("hemat + memori rendah") },
            biasa("60fps kontrol"),
            Skenario { hidup: Some(Hidup::Trim(120)), ..biasa("60fps + trim 2 mnt") },
        ];
    }
    if set == "proses" {
        let opsi = |eco, memori_rendah, core| launcher::OpsiProses { prioritas_rendah: true, eco, memori_rendah, core, ..Default::default() };
        return vec![
            hemat_rilis("kontrol 10fps"),
            Skenario { opsi: opsi(true, false, None), ..hemat_rilis("eco") },
            Skenario { opsi: opsi(false, true, None), ..hemat_rilis("memori rendah") },
            Skenario { opsi: opsi(true, true, None), ..hemat_rilis("eco + memori rendah") },
            Skenario { opsi: opsi(false, false, Some(2)), ..hemat_rilis("2 core") },
        ];
    }
    if set == "grafis" {
        return vec![
            Skenario { nama: "normal 60fps", flags: json!({}), cap: Some(60), ..Default::default() },
            Skenario { nama: "grafis ringan 60fps", flags: grafis_diterima(), cap: Some(60), ..Default::default() },
        ];
    }
    if set == "geometri" {
        let csg = || json!({
            "DFIntCSGLevelOfDetailSwitchingDistance": 0,
            "DFIntCSGLevelOfDetailSwitchingDistanceL12": 0,
            "DFIntCSGLevelOfDetailSwitchingDistanceL23": 0,
            "DFIntCSGLevelOfDetailSwitchingDistanceL34": 0
        });
        return vec![
            hemat_rilis("kontrol 10fps"),
            hemat_flag("csg 10fps", csg()),
            Skenario { cap: Some(3), job: Some(Some(256)), ..hemat_rilis("deep afk") },
            Skenario { cap: Some(3), job: Some(Some(256)), ..hemat_flag("deep afk + csg", csg()) },
            Skenario { nama: "normal", flags: json!({}), ..Default::default() },
            Skenario { nama: "grafis ringan", flags: grafis_diterima(), ..Default::default() },
        ];
    }
    if set == "pilot" {
        return vec![
            hemat_rilis("kontrol 10fps"),
            Skenario { jendela: Some("mungil"), ..hemat_rilis("tiny 10fps") },
            Skenario { cap: Some(3), ..hemat_rilis("3fps") },
            Skenario { cap: Some(5), ..hemat_rilis("5fps") },
            Skenario { cap: Some(15), ..hemat_rilis("15fps") },
            Skenario { cap: Some(30), ..hemat_rilis("30fps") },
            Skenario { cap: Some(60), ..hemat_rilis("60fps") },
            Skenario { cap: Some(3), jendela: Some("mungil"), ..hemat_rilis("tiny 3fps") },
            Skenario { job: Some(Some(256)), ..hemat_rilis("ws256") },
            Skenario { job: Some(Some(128)), ..hemat_rilis("ws128") },
        ];
    }
    if set == "kalibrasi" {
        return vec![Skenario { nama: "normal", flags: json!({}), ..Default::default() }, hemat_rilis("hemat 512")];
    }
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
    if set == "cpu" {
        let s = |nama, cpu: Option<u32>| Skenario {
            nama,
            flags: grafis_diterima(),
            jendela: None,
            cap: Some(10),
            job: Some(Some(512)),
            opsi: launcher::OpsiProses { prioritas_rendah: true, cpu_persen_x100: cpu, ..Default::default() },
            ..Default::default()
        };
        let satu = || vec![s("saver (kontrol)", None), s("saver+cpu1.5%", Some(150)), s("saver+cpu1%", Some(100)), s("saver+cpu0.5%", Some(50))];
        let mut v = satu();
        v.extend(satu());
        return v;
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
struct Sampel {
    cpu: Vec<f64>,
    gpu: Vec<f64>,
    ram: Vec<f64>,
    privat: Vec<f64>,
    vram: Vec<f64>,
    kompresi: Vec<f64>,
    bersama: Vec<f64>,
    hard_fault: Option<(u32, u32)>,
    page_fault: Option<(u32, u32)>,
    detik: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Ringkas {
    pub n: usize,
    pub median: f64,
    pub p95: f64,
    pub min: f64,
    pub max: f64,
}

pub(crate) fn ringkas(data: &[f64]) -> Option<Ringkas> {
    if data.is_empty() {
        return None;
    }
    let mut v = data.to_vec();
    v.sort_by(f64::total_cmp);
    let n = v.len();
    let median = if n % 2 == 1 { v[n / 2] } else { (v[n / 2 - 1] + v[n / 2]) / 2.0 };
    let i = ((n as f64 * 0.95).ceil() as usize).clamp(1, n) - 1;
    Some(Ringkas { n, median, p95: v[i], min: v[0], max: v[n - 1] })
}

fn angka(r: Option<Ringkas>, dp: usize) -> String {
    r.map(|x| format!("{:.*}", dp, x.median)).unwrap_or_else(|| "n/a".into())
}

struct HasilBlok {
    blok: usize,
    nama: &'static str,
    cpu: Option<f64>,
    gpu: Option<f64>,
    ram_fisik: Option<f64>,
}

#[derive(Debug, PartialEq)]
pub(crate) struct Banding {
    pub n: usize,
    pub median: f64,
    pub min: f64,
    pub max: f64,
    pub turun: usize,
}

pub(crate) fn banding(kontrol: &[(usize, f64)], skenario: &[(usize, f64)]) -> Option<Banding> {
    let selisih: Vec<f64> = skenario
        .iter()
        .filter_map(|(b, v)| kontrol.iter().find(|(k, _)| k == b).map(|(_, c)| v - c))
        .collect();
    let r = ringkas(&selisih)?;
    Some(Banding { n: r.n, median: r.median, min: r.min, max: r.max, turun: selisih.iter().filter(|s| **s < 0.0).count() })
}

fn cetak_banding(hasil: &[HasilBlok], nama_kontrol: &str) {
    type Ambil = fn(&HasilBlok) -> Option<f64>;
    let metrik: [(&str, Ambil); 3] = [("CPU %", |h| h.cpu), ("GPU %", |h| h.gpu), ("RAM fisik MB", |h| h.ram_fisik)];
    let mut nama: Vec<&str> = Vec::new();
    for h in hasil {
        if !nama.contains(&h.nama) {
            nama.push(h.nama);
        }
    }
    let seri = |n: &str, f: Ambil| -> Vec<(usize, f64)> {
        hasil.iter().filter(|h| h.nama == n).filter_map(|h| f(h).map(|v| (h.blok, v))).collect()
    };
    println!("\nRingkasan per blok (selisih terhadap \"{nama_kontrol}\"; n = jumlah blok):");
    for (judul, f) in metrik {
        println!("\n{judul}");
        for n in &nama {
            let nilai: Vec<f64> = seri(n, f).into_iter().map(|(_, v)| v).collect();
            let Some(r) = ringkas(&nilai) else {
                println!("  {n:<20} n/a");
                continue;
            };
            let b = if *n == nama_kontrol {
                "kontrol".to_string()
            } else {
                banding(&seri(nama_kontrol, f), &seri(n, f))
                    .map(|b| format!("selisih {:+.2} ({:+.2}..{:+.2}), turun di {}/{} blok", b.median, b.min, b.max, b.turun, b.n))
                    .unwrap_or_else(|| "tidak ada pasangan".into())
            };
            println!("  {n:<20} median {:>8.2}  rentang {:.2}..{:.2}  {b}", r.median, r.min, r.max);
        }
    }
}

const KEPALA_CSV: &str = "blok,skenario,sampel,dipakai,cpu_persen,gpu_persen,ram_mb,privat_mb,vram_mb,kompresi_mb,bersama_mb,hard_fault,io_byte,kompresi_awal_mb,page_fault,tersedia_mb,aksi,ram_privat_mb,ram_bersama_mb,kompresi_perkiraan_mb,fisik_perkiraan_mb";

fn kepala_csv_cocok(isi: &str) -> bool {
    isi.lines().next().is_none_or(|l| l.trim_end() == KEPALA_CSV)
}

fn env_angka(nama: &str, bawaan: u64) -> u64 {
    std::env::var(nama).ok().and_then(|v| v.parse().ok()).unwrap_or(bawaan)
}

pub fn jalankan(alias: &str, place_id: u64, detik_ukur: u64, csv: Option<String>, set: &str) -> Result<(), String> {
    use std::io::Write;
    if !launcher::pid_klien().is_empty() {
        return Err("Sudah ada klien Roblox yang berjalan. Tutup dulu semua klien supaya percobaan tidak mengganggu sesi lain dan angkanya bersih.".into());
    }
    if crate::cam_lain_berjalan() {
        return Err("CAM sedang terbuka. Tutup dulu (termasuk exe di rilis\\) supaya probe tidak menimpa accounts.json.".into());
    }
    let s = store::Store::load();
    let akun = s
        .accounts
        .iter()
        .find(|a| a.alias.eq_ignore_ascii_case(alias))
        .ok_or_else(|| format!("Akun dengan alias \"{alias}\" tidak ditemukan."))?;
    let btid = akun.browser_tracker_id;
    crate::pasang_rotasi_probe();
    let cookie_kini = || crate::cookie_tersimpan(btid);
    cookie_kini()?;
    let klien = std::env::var("PROBE_KLIEN").unwrap_or_else(|_| s.klien_path.clone());
    let exe = if klien.is_empty() { None } else { Some(klien.as_str()) };

    let dir = fps::berkas_setting(&klien).ok_or("Folder versi Roblox tidak ditemukan.")?;
    let berkas = dir.join("ClientAppSettings.json");
    let cadangan = Cadangan { isi: std::fs::read(&berkas).ok(), berkas };
    let pengaturan = crate::hemat::berkas_pengaturan().map(|b| Cadangan { isi: std::fs::read(&b).ok(), berkas: b });

    if let Some(f) = &csv {
        let isi = std::fs::read_to_string(f).unwrap_or_default();
        if !kepala_csv_cocok(&isi) {
            return Err(format!("{f} memakai format kolom lain; pakai nama berkas baru supaya datanya tidak tercampur."));
        }
    }
    let mut keluar = csv.and_then(|f| {
        let baru = std::fs::metadata(&f).map_or(true, |m| m.len() == 0);
        let mut b = std::fs::OpenOptions::new().create(true).append(true).open(&f).ok()?;
        if baru {
            let _ = writeln!(b, "{KEPALA_CSV}");
        }
        Some(b)
    });

    let pilot = matches!(set, "pilot" | "geometri" | "grafis" | "proses" | "hidup" | "cpusibuk" | "cpusilang");
    let blok = env_angka("PROBE_BLOK", if pilot { 3 } else { 1 }) as usize;
    let stabil = env_angka("PROBE_STABIL", if pilot { 120 } else { 30 });
    let buang = env_angka("PROBE_BUANG", if pilot { 60 } else { 0 });
    let benih = env_angka("PROBE_BENIH", rand::random::<u32>() as u64);
    let skenario = daftar_skenario(set);
    let nama_kontrol = skenario.first().map(|s| s.nama).unwrap_or("");
    let mut urutan: Vec<(usize, usize)> = Vec::new();
    let mut acak = <rand::rngs::StdRng as rand::SeedableRng>::seed_from_u64(benih);
    for b in 1..=blok {
        let mut satu: Vec<usize> = (0..skenario.len()).collect();
        if pilot {
            rand::seq::SliceRandom::shuffle(&mut satu[..], &mut acak);
        }
        urutan.extend(satu.into_iter().map(|i| (b, i)));
    }
    let mut hasil: Vec<HasilBlok> = Vec::new();

    println!("Percobaan Mode Hemat: akun {alias}, place {place_id}, set {set}, {blok} blok, stabil {stabil} dtk, ukur {detik_ukur} dtk (buang {buang} dtk pertama), benih {benih}.");
    println!("Klien: {}\n", launcher::exe_klien(&klien).as_deref().and_then(|e| std::path::Path::new(e).parent()?.file_name()?.to_str().map(str::to_owned)).unwrap_or_else(|| "tidak diketahui".into()));
    println!("{:<5} {:<24} {:>7} {:>7} {:>7} {:>8} {:>9} {:>8} {:>8}  (median)", "blok", "skenario", "CPU %", "CPU p95", "GPU %", "RAM MB", "privat MB", "VRAM MB", "GPU-RAM");
    for (no_blok, i) in urutan {
        let sk = &skenario[i];
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
        } else if let Some(Cadangan { isi: Some(asli), berkas }) = &pengaturan {
            std::fs::write(berkas, asli).map_err(|e| format!("memulihkan GlobalBasicSettings: {e}"))?;
        }
        let ticket = tauri::async_runtime::block_on(roblox::auth_ticket(&cookie_kini()?))?;
        let sejak = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        let kompresi_awal = sumber::ukur().kompresi_mb;
        let tujuan = launcher::Tujuan::Publik { place_id };
        let exe_klien = launcher::exe_klien(&klien).ok_or("RobloxPlayerBeta.exe tidak ditemukan.")?;
        let _pref_gpu = sk.gpu_hemat.then(|| PrefGpu::pasang(&exe_klien));
        let mut pid_dibuat = None;
        let mut jaga_job = JagaJob(None);
        match sk.job {
            Some(batas) => {
                let dibuat = launcher::luncurkan_terbatas(
                    &ticket, &tujuan, btid, &exe_klien,
                    launcher::OpsiProses { batas_ws_mb: batas, ..sk.opsi.clone() },
                )?;
                pid_dibuat = Some(dibuat.pid);
                jaga_job.0 = dibuat.job_cpu;
                if let Some(w) = dibuat.peringatan {
                    println!("  PERINGATAN [{}]: {w}", sk.nama);
                }
                if sk.opsi.cpu_persen_x100.is_some() && jaga_job.0.is_none() {
                    println!("  PERINGATAN [{}]: job CPU tidak terpasang", sk.nama);
                }
            }
            None => launcher::luncurkan(&ticket, &tujuan, btid, exe, &[])?,
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

        let job_cpu = jaga_job.0;
        let job_hilang = sk.opsi.cpu_persen_x100.is_some() && job_cpu.is_none();
        let sah = pid_dibuat.map_or(true, |d| d == pid) && !job_hilang;
        if let Some(d) = pid_dibuat {
            if d != pid {
                println!("  PERINGATAN [{}]: game berjalan di PID {pid}, bukan PID buatan probe {d} (Roblox memulai ulang dirinya) -- opsi proses TIDAK berlaku", sk.nama);
            }
        }
        match sk.jendela {
            Some(j @ ("kecil" | "mungil")) => {
                let (w, h) = if j == "kecil" { (640, 360) } else { (320, 180) };
                match crate::kecil::kecilkan(hwnd, w, h) {
                    Ok(u) if u == (w, h) => {}
                    Ok(u) => println!("  PERINGATAN [{}]: jendela hanya sampai {}x{}", sk.nama, u.0, u.1),
                    Err(e) => println!("  PERINGATAN [{}]: jendela tidak dikecilkan: {e}", sk.nama),
                }
            }
            Some("minimize") => {
                let _ = jendela::kecilkan(hwnd);
            }
            _ => {}
        }
        std::thread::sleep(Duration::from_secs(stabil));

        let mulai_pid = sumber::snapshot().into_iter().find(|p| p.pid == pid).map(|p| p.mulai);
        if let (Some(Hidup::MemoriRendah), Some(m)) = (sk.hidup, mulai_pid) {
            let hasil = crate::kendali::atur_prioritas_memori(pid, m, crate::kendali::MEMORY_PRIORITY_VERY_LOW)
                .and_then(|()| crate::kendali::prioritas_memori(pid, m));
            if hasil != Ok(crate::kendali::MEMORY_PRIORITY_VERY_LOW) {
                println!("  PERINGATAN [{}]: prioritas memori tidak terpasang: {hasil:?}", sk.nama);
            }
        }
        let cek_batas = |kapan: &str, cpu_harap: Option<u32>| {
            if let Some(Some(mb)) = sk.job {
                match mulai_pid {
                    Some(m) => match crate::kendali::batas_ws_keras_mb(pid, m) {
                        Ok(Some(x)) if x == mb => {}
                        lain => println!("  PERINGATAN [{}]: batas RAM keras {mb} MB tidak berlaku {kapan}: {lain:?}", sk.nama),
                    },
                    None => println!("  PERINGATAN [{}]: batas RAM tidak dapat diperiksa {kapan} (waktu mulai PID {pid} tidak terbaca)", sk.nama),
                }
            }
            if let Some(j) = job_cpu {
                let harap = cpu_harap.map_or((0, 0), |r| (JOB_CPU_ENABLE_HARD, r));
                match launcher::job_cpu_baca(j) {
                    Ok(x) if x == harap => {}
                    lain => println!("  PERINGATAN [{}]: batas CPU {kapan} = {lain:?}, harapan {harap:?}", sk.nama),
                }
            }
        };
        let cpu_awal = match (sk.silang, sk.opsi.cpu_persen_x100) {
            (Some(_), _) | (None, Some(0)) | (None, None) => None,
            (None, Some(r)) => Some(r),
        };
        cek_batas("sesudah masa stabil", cpu_awal);
        if sk.hidup.is_some() && mulai_pid.is_none() {
            println!("  PERINGATAN [{}]: waktu mulai PID {pid} tidak terbaca -- aksi tidak dipasang", sk.nama);
        }

        let _ = sumber::ukur();
        let mut s = Sampel::default();
        let akurat = std::env::var("PROBE_AKURAT").is_ok();
        let folder_versi = launcher::klien_berjalan()
            .into_iter()
            .find(|(p, _)| *p == pid)
            .and_then(|(_, exe)| std::path::Path::new(&exe).parent().and_then(|d| d.file_name()).map(|n| n.to_string_lossy().to_string()))
            .unwrap_or_default();
        let opsional = |v: Option<f64>| v.map(|x| format!("{x:.2}")).unwrap_or_default();
        let mut trim_gagal = 0u32;
        let silang_awal = sk.silang.map(|_| {
            let mut r = <rand::rngs::StdRng as rand::SeedableRng>::seed_from_u64(benih ^ 0x5349_4c41_4e47 ^ no_blok as u64);
            rand::Rng::gen_bool(&mut r, 0.5)
        });
        if let Some(a) = silang_awal {
            println!("  [{}] uji silang: keadaan awal batas CPU = {}", sk.nama, if a { "ON" } else { "OFF" });
        }
        let mut silang_gagal = 0u32;
        let mut jendela_rusak = false;
        let mut cpu_harap = cpu_awal;
        for i in 1..=detik_ukur {
            if let (Some((rate, jendela)), Some(awal), Some(j)) = (sk.silang, silang_awal, job_cpu) {
                let ke = (i - 1) / jendela.max(1);
                let nyala = awal ^ (ke % 2 == 1);
                if (i - 1) % jendela.max(1) == 0 {
                    let target = nyala.then_some(rate);
                    let baca = launcher::job_cpu_atur(j, target).and_then(|()| launcher::job_cpu_baca(j));
                    let harap = target.map_or((0, 0), |r| (JOB_CPU_ENABLE_HARD, r));
                    jendela_rusak = baca != Ok(harap);
                    if jendela_rusak {
                        silang_gagal += 1;
                        println!("  PERINGATAN [{}]: detik {i}: batas CPU {target:?} -> {baca:?}; jendela ini tidak dipakai", sk.nama);
                    }
                    cpu_harap = match baca {
                        Ok((f, r)) if f != 0 => Some(r),
                        _ => None,
                    };
                    if let (Some(Some(mb)), Some(m)) = (sk.job, mulai_pid) {
                        match crate::kendali::batas_ws_keras_mb(pid, m) {
                            Ok(Some(x)) if x == mb => {}
                            lain => println!("  PERINGATAN [{}]: detik {i}: batas RAM keras {mb} MB tidak berlaku sesudah pergantian: {lain:?}", sk.nama),
                        }
                    }
                }
            }
            let aksi = match (sk.hidup, mulai_pid) {
                (Some(Hidup::Trim(n)), Some(m)) if (i - 1) % n.max(1) == 0 => match crate::kendali::trim(pid, m) {
                    Ok(()) => "trim",
                    Err(_) => {
                        trim_gagal += 1;
                        "trim gagal"
                    }
                },
                _ if sk.silang.is_some() && jendela_rusak => "cpu gagal",
                _ if sk.silang.is_some() => if cpu_harap.is_some() { "cpu on" } else { "cpu off" },
                _ => "",
            };
            std::thread::sleep(Duration::from_secs(1));
            let l = sumber::ukur();
            let tersedia = sumber::memori_sistem(&[]).tersedia_mb;
            if let Some(k) = l.klien.iter().find(|k| k.pid == pid) {
                let dipakai = sah && !jendela_rusak && i > buang;
                if dipakai {
                    s.cpu.push(k.cpu);
                    s.gpu.extend(k.gpu);
                    s.ram.push(k.ram_mb);
                    s.privat.push(k.privat_mb);
                    s.vram.extend(k.vram_mb);
                    s.kompresi.push(l.kompresi_mb - kompresi_awal);
                    s.bersama.extend(k.bersama_mb);
                    s.hard_fault = Some((s.hard_fault.map_or(k.hard_fault, |x| x.0), k.hard_fault));
                    s.page_fault = Some((s.page_fault.map_or(k.page_fault, |x| x.0), k.page_fault));
                    s.detik += 1.0;
                }
                if let Some(f) = keluar.as_mut() {
                    let _ = writeln!(
                        f, "{no_blok},{},{i},{},{:.2},{},{:.1},{:.1},{},{:.1},{},{},{},{:.1},{},{},{aksi},{:.1},{:.1},{:.1},{:.1}",
                        sk.nama, dipakai as u8, k.cpu, opsional(k.gpu), k.ram_mb, k.privat_mb, opsional(k.vram_mb), l.kompresi_mb,
                        opsional(k.bersama_mb), k.hard_fault, k.io_byte, kompresi_awal, k.page_fault, opsional(tersedia),
                        k.ram_privat_mb, k.ram_bersama_mb, k.kompresi_perkiraan_mb, k.fisik_perkiraan_mb
                    );
                }
                if akurat && i % 20 == 0 {
                    let mb = |b: u64| b as f64 / 1_048_576.0;
                    match crate::ramfisik::ukur(pid, &folder_versi) {
                        Ok(r) => println!(
                            "AKURAT,{no_blok},{},{i},{:.1},{:.1},{:.1},{:.1},{:.1},{:.1},{},{:.1},{:.1},{:.1},{:.1},{:.1}",
                            sk.nama, mb(r.privat), mb(r.img_roblox), mb(r.img_lain), mb(r.mapped), mb(r.lain), mb(r.di_ram), r.lama_ms,
                            k.fisik_perkiraan_mb, k.ram_privat_mb, k.ram_bersama_mb, k.kompresi_perkiraan_mb, k.ram_mb
                        ),
                        Err(e) => println!("AKURAT,{no_blok},{},{i},GAGAL {e}", sk.nama),
                    }
                }
            }
        }
        cek_batas("di akhir pengukuran", cpu_harap);
        if silang_gagal > 0 {
            println!("  PERINGATAN [{}]: {silang_gagal} pergantian batas CPU gagal", sk.nama);
        }
        if !sah {
            let sebab = if job_hilang { "job CPU tidak terpasang" } else { "PID berganti; opsi proses tidak berlaku" };
            println!("{:<5} {:<24} PUTARAN TIDAK SAH ({sebab}) -- tidak dihitung", no_blok, sk.nama);
        }
        if trim_gagal > 0 {
            println!("  PERINGATAN [{}]: {trim_gagal} trim gagal", sk.nama);
        }
        if !s.cpu.is_empty() {
            let putus = baris_putus_sejak(sejak);
            let ditolak = flag_ditolak_sejak(sejak);
            let (cpu, gpu, ram, privat, vram, bersama, kompresi) =
                (ringkas(&s.cpu), ringkas(&s.gpu), ringkas(&s.ram), ringkas(&s.privat), ringkas(&s.vram), ringkas(&s.bersama), ringkas(&s.kompresi));
            let fault = s.hard_fault.map(|(a, b)| b.saturating_sub(a) as f64 / s.detik * 60.0);
            let fault_semua = s.page_fault.map(|(a, b)| b.saturating_sub(a) as f64 / s.detik * 60.0);
            println!(
                "{:<5} {:<24} {:>7} {:>7} {:>7} {:>8} {:>9} {:>8} {:>8}   kompresi {:+.0} MB, hard fault/mnt {:.0}, page fault/mnt {:.0}{}{}",
                no_blok, sk.nama, angka(cpu, 2), cpu.map(|x| format!("{:.2}", x.p95)).unwrap_or_else(|| "n/a".into()), angka(gpu, 2),
                angka(ram, 0), angka(privat, 0), angka(vram, 0), angka(bersama, 0),
                kompresi.map_or(0.0, |x| x.median), fault.unwrap_or(0.0), fault_semua.unwrap_or(0.0),
                if ditolak.is_empty() { String::new() } else { format!("   DITOLAK: {}", ditolak.join(", ")) },
                if putus.is_empty() { String::new() } else { format!("   PUTUS: {}", putus.join(" | ")) }
            );
            hasil.push(HasilBlok {
                blok: no_blok,
                nama: sk.nama,
                cpu: cpu.map(|x| x.median),
                gpu: gpu.map(|x| x.median),
                ram_fisik: ram.zip(kompresi).map(|(a, b)| a.median + b.median),
            });
        } else if sah {
            println!("{:<5} {:<24} (klien hilang selama pengukuran)", no_blok, sk.nama);
        }

        let rata_tersedia = || {
            let mut v = Vec::new();
            for _ in 0..3 {
                if let Some(x) = sumber::memori_sistem(&[]).tersedia_mb {
                    v.push(x);
                }
                std::thread::sleep(Duration::from_secs(1));
            }
            (!v.is_empty()).then(|| v.iter().sum::<f64>() / v.len() as f64)
        };
        let g_sebelum = if akurat { rata_tersedia().map(|t| (t, sumber::ukur().kompresi_mb)) } else { None };

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
        drop(jaga_job);
        std::thread::sleep(Duration::from_secs(3));
        if let Some((t1, k1)) = g_sebelum {
            std::thread::sleep(Duration::from_secs(2));
            if let Some(t2) = rata_tersedia() {
                let k2 = sumber::ukur().kompresi_mb;
                println!("TUTUP,{no_blok},{},{t1:.1},{t2:.1},{:.1},{k1:.1},{k2:.1}", sk.nama, t2 - t1);
            }
        }
    }
    if blok > 1 {
        cetak_banding(&hasil, nama_kontrol);
    }
    drop(cadangan);
    drop(pengaturan);
    Ok(())
}

pub(crate) fn baris_putus_sejak(sejak: i64) -> Vec<String> {
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

#[cfg(test)]
mod tes_ringkas {
    use super::*;

    #[test]
    fn median_p95_dan_kosong() {
        assert_eq!(ringkas(&[]), None);
        let r = ringkas(&[3.0, 1.0, 2.0]).unwrap();
        assert_eq!((r.n, r.median, r.min, r.max), (3, 2.0, 1.0, 3.0));
        assert_eq!(ringkas(&[1.0, 2.0, 3.0, 4.0]).unwrap().median, 2.5);
        let v: Vec<f64> = (1..=100).map(f64::from).collect();
        assert_eq!(ringkas(&v).unwrap().p95, 95.0);
    }

    #[test]
    fn csv_lama_ditolak() {
        assert!(kepala_csv_cocok(""));
        assert!(kepala_csv_cocok(&format!("{KEPALA_CSV}\r\n1,a,1,1,1,,1,1,,1,,0,0\n")));
        assert!(!kepala_csv_cocok("skenario,sampel,cpu_persen,gpu_persen,ram_mb,privat_mb,vram_mb,kompresi_mb,bersama_mb\n"));
    }

    #[test]
    fn banding_berpasangan_per_blok() {
        let kontrol = [(1, 10.0), (2, 20.0), (3, 30.0)];
        let lain = [(1, 8.0), (2, 21.0), (3, 25.0), (4, 1.0)];
        let b = banding(&kontrol, &lain).unwrap();
        assert_eq!((b.n, b.median, b.min, b.max, b.turun), (3, -2.0, -5.0, 1.0, 2), "blok tanpa pasangan dibuang");
        assert_eq!(banding(&kontrol, &[(9, 1.0)]), None);
    }
}
