use std::collections::HashMap;
use std::ffi::c_void;
use std::sync::Mutex;
use std::time::Instant;

#[link(name = "ntdll")]
extern "system" {
    fn NtQuerySystemInformation(kelas: u32, buf: *mut c_void, panjang: u32, dikembalikan: *mut u32) -> i32;
}

#[link(name = "pdh")]
extern "system" {
    fn PdhOpenQueryW(sumber: *const u16, user: usize, query: *mut isize) -> u32;
    fn PdhAddEnglishCounterW(query: isize, jalur: *const u16, user: usize, counter: *mut isize) -> u32;
    fn PdhCollectQueryData(query: isize) -> u32;
    fn PdhGetFormattedCounterArrayW(counter: isize, format: u32, ukuran: *mut u32, jumlah: *mut u32, isi: *mut u8) -> u32;
}

const SYSTEM_PROCESS_INFORMATION: u32 = 5;
const STATUS_INFO_LENGTH_MISMATCH: i32 = 0xC000_0004u32 as i32;
const PDH_FMT_DOUBLE: u32 = 0x0000_0200;
const PDH_MORE_DATA: u32 = 0x8000_07D2;

#[derive(Clone, Debug)]
pub struct Proses {
    pub pid: u32,
    pub nama: String,
    pub waktu_cpu: u64,
    pub working_set: u64,
    pub privat: u64,
    pub privat_ram: u64,
    pub mulai: u64,
    pub hard_fault: u32,
    pub page_fault: u32,
    pub prioritas: i32,
    pub io_byte: u64,
    pub baca_byte: u64,
    pub tulis_byte: u64,
}

pub fn di_luar_ram(privat: u64, privat_ram: u64) -> u64 {
    privat.saturating_sub(privat_ram)
}

pub fn snapshot() -> Vec<Proses> {
    let mut ukuran: u32 = 512 * 1024;
    let mut buf: Vec<u8>;
    loop {
        buf = vec![0u8; ukuran as usize];
        let mut kembali = 0u32;
        let st = unsafe {
            NtQuerySystemInformation(SYSTEM_PROCESS_INFORMATION, buf.as_mut_ptr() as *mut c_void, ukuran, &mut kembali)
        };
        if st == STATUS_INFO_LENGTH_MISMATCH {
            ukuran = kembali.max(ukuran) + 64 * 1024;
            continue;
        }
        if st < 0 {
            return Vec::new();
        }
        break;
    }

    let baca_u32 = |o: usize| u32::from_le_bytes(buf[o..o + 4].try_into().unwrap());
    let baca_u64 = |o: usize| u64::from_le_bytes(buf[o..o + 8].try_into().unwrap());
    let mut hasil = Vec::new();
    let mut o = 0usize;
    loop {
        if o + 256 > buf.len() {
            break;
        }
        let berikut = baca_u32(o) as usize;
        let panjang_nama = u16::from_le_bytes(buf[o + 56..o + 58].try_into().unwrap()) as usize;
        let ptr_nama = baca_u64(o + 64) as *const u16;
        let nama = if ptr_nama.is_null() || panjang_nama == 0 {
            String::new()
        } else {
            let s = unsafe { std::slice::from_raw_parts(ptr_nama, panjang_nama / 2) };
            String::from_utf16_lossy(s)
        };
        hasil.push(Proses {
            pid: baca_u64(o + 80) as u32,
            nama,
            waktu_cpu: baca_u64(o + 40).wrapping_add(baca_u64(o + 48)),
            working_set: baca_u64(o + 144),
            privat: baca_u64(o + 184),
            privat_ram: baca_u64(o + 8),
            mulai: baca_u64(o + 32),
            hard_fault: baca_u32(o + 16),
            page_fault: baca_u32(o + 128),
            prioritas: baca_u32(o + 72) as i32,
            io_byte: baca_u64(o + 232).wrapping_add(baca_u64(o + 240)),
            baca_byte: baca_u64(o + 232),
            tulis_byte: baca_u64(o + 240),
        });
        if berikut == 0 {
            break;
        }
        o += berikut;
    }
    hasil
}

#[derive(serde::Serialize, Clone, Debug, Default)]
pub struct SumberKlien {
    pub pid: u32,
    pub cpu: f64,
    pub ram_mb: f64,
    pub privat_mb: f64,
    pub ram_privat_mb: f64,
    pub di_luar_ram_mb: f64,
    pub hard_fault: u32,
    pub page_fault: u32,
    pub io_byte: u64,
    pub gpu: Option<f64>,
    pub vram_mb: Option<f64>,
    pub bersama_mb: Option<f64>,
    pub baca_bps: Option<f64>,
    pub tulis_bps: Option<f64>,
    pub mulai_unix: i64,
    pub ram_bersama_mb: f64,
    pub kompresi_perkiraan_mb: f64,
    pub fisik_perkiraan_mb: f64,
}

#[derive(serde::Serialize, Clone, Debug, Default)]
pub struct Laporan {
    pub klien: Vec<SumberKlien>,
    pub kompresi_mb: f64,
    pub inti: usize,
    pub cpu_sistem: Option<f64>,
    pub memori: MemoriSistem,
    pub fisik_semua_perkiraan_mb: f64,
}

pub fn filetime_ke_unix(ft: u64) -> i64 {
    if ft == 0 {
        0
    } else {
        (ft / 10_000_000) as i64 - 11_644_473_600
    }
}

pub fn bagian_kompresi(kompresi_mb: f64, milik_mb: f64, semua_mb: f64) -> f64 {
    if semua_mb <= 0.0 || milik_mb <= 0.0 || kompresi_mb <= 0.0 {
        return 0.0;
    }
    (kompresi_mb * milik_mb / semua_mb).min(milik_mb)
}

pub fn fisik_perkiraan(privat_ram_mb: f64, bersama_mb: f64, jumlah_klien: usize, kompresi_mb: f64) -> f64 {
    privat_ram_mb + bersama_mb / jumlah_klien.max(1) as f64 + kompresi_mb
}

pub fn fisik_per_kelompok(klien: &mut [SumberKlien], kelompok: &HashMap<u32, String>) -> f64 {
    let kunci = |pid: u32| kelompok.get(&pid).map(|s| s.to_lowercase()).unwrap_or_default();
    let mut jumlah: HashMap<String, usize> = HashMap::new();
    let mut maks: HashMap<String, f64> = HashMap::new();
    for k in klien.iter() {
        let g = kunci(k.pid);
        *jumlah.entry(g.clone()).or_default() += 1;
        let m = maks.entry(g).or_default();
        *m = m.max(k.ram_bersama_mb);
    }
    for k in klien.iter_mut() {
        let n = jumlah.get(&kunci(k.pid)).copied().unwrap_or(1);
        k.fisik_perkiraan_mb = fisik_perkiraan(k.ram_privat_mb, k.ram_bersama_mb, n, k.kompresi_perkiraan_mb);
    }
    klien.iter().map(|k| k.ram_privat_mb + k.kompresi_perkiraan_mb).sum::<f64>() + maks.values().sum::<f64>()
}

pub fn sibuk_persen(sebelum: (u64, u64), kini: (u64, u64)) -> Option<f64> {
    let total = kini.1.checked_sub(sebelum.1).filter(|&t| t > 0)?;
    let idle = kini.0.saturating_sub(sebelum.0).min(total);
    Some((total - idle) as f64 / total as f64 * 100.0)
}

struct Pdh {
    query: isize,
    gpu: isize,
    vram: isize,
    bersama: isize,
}

struct Pemantau {
    waktu: Instant,
    cpu: HashMap<(u32, u64), u64>,
    io: HashMap<(u32, u64), (u64, u64)>,
    sistem: Option<(u64, u64)>,
    pdh: Option<Pdh>,
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn buka_pdh() -> Option<Pdh> {
    unsafe {
        let mut q = 0isize;
        if PdhOpenQueryW(std::ptr::null(), 0, &mut q) != 0 {
            return None;
        }
        let mut gpu = 0isize;
        let mut vram = 0isize;
        let mut bersama = 0isize;
        let a = PdhAddEnglishCounterW(q, wide(r"\GPU Engine(*)\Utilization Percentage").as_ptr(), 0, &mut gpu);
        let b = PdhAddEnglishCounterW(q, wide(r"\GPU Process Memory(*)\Dedicated Usage").as_ptr(), 0, &mut vram);
        let c = PdhAddEnglishCounterW(q, wide(r"\GPU Process Memory(*)\Shared Usage").as_ptr(), 0, &mut bersama);
        if a != 0 && b != 0 {
            return None;
        }
        PdhCollectQueryData(q);
        Some(Pdh {
            query: q,
            gpu: if a == 0 { gpu } else { 0 },
            vram: if b == 0 { vram } else { 0 },
            bersama: if c == 0 { bersama } else { 0 },
        })
    }
}

fn baca_larik(counter: isize) -> Vec<(String, f64)> {
    if counter == 0 {
        return Vec::new();
    }
    unsafe {
        let mut ukuran = 0u32;
        let mut jumlah = 0u32;
        let st = PdhGetFormattedCounterArrayW(counter, PDH_FMT_DOUBLE, &mut ukuran, &mut jumlah, std::ptr::null_mut());
        if st != PDH_MORE_DATA || ukuran == 0 {
            return Vec::new();
        }
        let mut buf = vec![0u64; (ukuran as usize + 7) / 8];
        if PdhGetFormattedCounterArrayW(counter, PDH_FMT_DOUBLE, &mut ukuran, &mut jumlah, buf.as_mut_ptr() as *mut u8) != 0 {
            return Vec::new();
        }
        let dasar = buf.as_ptr() as *const u8;
        (0..jumlah as usize)
            .filter_map(|i| {
                let p = dasar.add(i * 24);
                let nama_ptr = *(p as *const *const u16);
                let status = *(p.add(8) as *const u32);
                let nilai = *(p.add(16) as *const f64);
                if nama_ptr.is_null() || status > 1 {
                    return None;
                }
                let mut n = 0;
                while *nama_ptr.add(n) != 0 {
                    n += 1;
                }
                Some((String::from_utf16_lossy(std::slice::from_raw_parts(nama_ptr, n)), nilai))
            })
            .collect()
    }
}

pub fn pid_dari_instans(nama: &str) -> Option<u32> {
    nama.strip_prefix("pid_")?.split('_').next()?.parse().ok()
}

pub fn engtype_dari_instans(nama: &str) -> &str {
    nama.rsplit("engtype_").next().unwrap_or("")
}

pub fn gpu_per_pid(butir: &[(String, f64)]) -> HashMap<u32, f64> {
    let mut per_jenis: HashMap<(u32, String), f64> = HashMap::new();
    for (nama, v) in butir {
        if let Some(pid) = pid_dari_instans(nama) {
            *per_jenis.entry((pid, engtype_dari_instans(nama).to_string())).or_default() += v;
        }
    }
    let mut hasil: HashMap<u32, f64> = HashMap::new();
    for ((pid, _), v) in per_jenis {
        let e = hasil.entry(pid).or_default();
        if v > *e {
            *e = v;
        }
    }
    hasil
}

#[repr(C)]
struct MemoryStatusEx {
    panjang: u32,
    beban: u32,
    fisik_total: u64,
    fisik_tersedia: u64,
    commit_batas: u64,
    commit_tersedia: u64,
    virtual_total: u64,
    virtual_tersedia: u64,
    virtual_ext: u64,
}

#[link(name = "kernel32")]
extern "system" {
    fn GlobalMemoryStatusEx(buf: *mut MemoryStatusEx) -> i32;
    fn GetSystemTimes(idle: *mut u64, kernel: *mut u64, user: *mut u64) -> i32;
}

fn waktu_sistem() -> Option<(u64, u64)> {
    let (mut i, mut k, mut u) = (0u64, 0u64, 0u64);
    (unsafe { GetSystemTimes(&mut i, &mut k, &mut u) } != 0).then_some((i, k + u))
}

#[derive(serde::Serialize, Clone, Debug, Default)]
pub struct MemoriSistem {
    pub total_mb: Option<f64>,
    pub tersedia_mb: Option<f64>,
    pub beban_persen: Option<u32>,
    pub commit_terpakai_mb: Option<f64>,
    pub commit_batas_mb: Option<f64>,
    pub kompresi_mb: Option<f64>,
}

pub fn memori_sistem(snap: &[Proses]) -> MemoriSistem {
    let mb = |b: u64| b as f64 / 1_048_576.0;
    let mut hasil = MemoriSistem {
        kompresi_mb: snap.iter().find(|p| p.nama == "Memory Compression").map(|p| mb(p.working_set)),
        ..Default::default()
    };
    let mut m = unsafe { std::mem::zeroed::<MemoryStatusEx>() };
    m.panjang = std::mem::size_of::<MemoryStatusEx>() as u32;
    if unsafe { GlobalMemoryStatusEx(&mut m) } != 0 {
        hasil.total_mb = Some(mb(m.fisik_total));
        hasil.tersedia_mb = Some(mb(m.fisik_tersedia));
        hasil.beban_persen = Some(m.beban);
        hasil.commit_terpakai_mb = Some(mb(m.commit_batas.saturating_sub(m.commit_tersedia)));
        hasil.commit_batas_mb = Some(mb(m.commit_batas));
    }
    hasil
}

static PEMANTAU: Mutex<Option<Pemantau>> = Mutex::new(None);

pub fn ukur() -> Laporan {
    ukur_nama("RobloxPlayerBeta.exe")
}

pub fn ukur_nama(nama_image: &str) -> Laporan {
    let inti = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1);
    let snap = snapshot();
    let kini = Instant::now();
    let mut kunci = PEMANTAU.lock().unwrap_or_else(|e| e.into_inner());
    let lama = kunci.take();

    let per_pid = |butir: Vec<(String, f64)>| {
        let mut v: HashMap<u32, f64> = HashMap::new();
        for (nama, x) in butir {
            if let Some(pid) = pid_dari_instans(&nama) {
                *v.entry(pid).or_default() += x;
            }
        }
        v
    };
    let (gpu, vram, bersama) = match lama.as_ref().and_then(|p| p.pdh.as_ref()) {
        Some(pdh) => unsafe {
            PdhCollectQueryData(pdh.query);
            (Some(gpu_per_pid(&baca_larik(pdh.gpu))), Some(per_pid(baca_larik(pdh.vram))), Some(per_pid(baca_larik(pdh.bersama))))
        },
        None => (None, None, None),
    };

    let detik = lama.as_ref().map(|p| kini.duration_since(p.waktu).as_secs_f64()).unwrap_or(0.0);
    let mb = |b: u64| b as f64 / 1_048_576.0;
    let mut klien = Vec::new();
    let kompresi_mb = snap.iter().find(|p| p.nama == "Memory Compression").map_or(0.0, |p| mb(p.working_set));
    let di_luar_semua: f64 = snap
        .iter()
        .filter(|p| p.nama != "Memory Compression")
        .map(|p| mb(di_luar_ram(p.privat, p.privat_ram)))
        .sum();
    let jumlah_klien = snap.iter().filter(|p| p.nama.eq_ignore_ascii_case(nama_image)).count();
    let mut cpu_baru = HashMap::new();
    let mut io_baru = HashMap::new();
    for p in &snap {
        if !p.nama.eq_ignore_ascii_case(nama_image) {
            continue;
        }
        cpu_baru.insert((p.pid, p.mulai), p.waktu_cpu);
        io_baru.insert((p.pid, p.mulai), (p.baca_byte, p.tulis_byte));
        let io_lama = lama.as_ref().and_then(|l| l.io.get(&(p.pid, p.mulai))).filter(|_| detik > 0.05);
        let laju = |kini: u64, sebelum: u64| kini.saturating_sub(sebelum) as f64 / detik;
        let ram_privat = mb(p.privat_ram);
        let ram_bersama = mb(p.working_set.saturating_sub(p.privat_ram));
        let kompresi_bagian = bagian_kompresi(kompresi_mb, mb(di_luar_ram(p.privat, p.privat_ram)), di_luar_semua);
        let cpu = match (lama.as_ref().and_then(|l| l.cpu.get(&(p.pid, p.mulai))), detik > 0.05) {
            (Some(&sebelum), true) => {
                let delta = p.waktu_cpu.saturating_sub(sebelum) as f64 / 10_000_000.0;
                (delta / (detik * inti as f64) * 100.0).clamp(0.0, 100.0)
            }
            _ => 0.0,
        };
        klien.push(SumberKlien {
            pid: p.pid,
            cpu,
            ram_mb: p.working_set as f64 / 1_048_576.0,
            privat_mb: p.privat as f64 / 1_048_576.0,
            ram_privat_mb: p.privat_ram as f64 / 1_048_576.0,
            di_luar_ram_mb: di_luar_ram(p.privat, p.privat_ram) as f64 / 1_048_576.0,
            hard_fault: p.hard_fault,
            page_fault: p.page_fault,
            io_byte: p.io_byte,
            gpu: gpu.as_ref().map(|g| g.get(&p.pid).copied().unwrap_or(0.0)),
            vram_mb: vram.as_ref().map(|v| v.get(&p.pid).copied().unwrap_or(0.0) / 1_048_576.0),
            bersama_mb: bersama.as_ref().map(|v| v.get(&p.pid).copied().unwrap_or(0.0) / 1_048_576.0),
            baca_bps: io_lama.map(|&(b, _)| laju(p.baca_byte, b)),
            tulis_bps: io_lama.map(|&(_, t)| laju(p.tulis_byte, t)),
            mulai_unix: filetime_ke_unix(p.mulai),
            ram_bersama_mb: ram_bersama,
            kompresi_perkiraan_mb: kompresi_bagian,
            fisik_perkiraan_mb: fisik_perkiraan(ram_privat, ram_bersama, jumlah_klien, kompresi_bagian),
        });
    }

    let sistem_kini = waktu_sistem();
    let cpu_sistem = lama.as_ref().and_then(|l| l.sistem).zip(sistem_kini).and_then(|(a, b)| sibuk_persen(a, b));
    let fisik_semua_perkiraan_mb = fisik_per_kelompok(&mut klien, &HashMap::new());
    let memori = memori_sistem(&snap);
    let pdh = lama.and_then(|p| p.pdh).or_else(buka_pdh);
    *kunci = Some(Pemantau { waktu: kini, cpu: cpu_baru, io: io_baru, sistem: sistem_kini, pdh });
    Laporan { klien, kompresi_mb, inti, cpu_sistem, memori, fisik_semua_perkiraan_mb }
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn hard_fault_dan_io_cocok_dengan_api_windows() {
        #[link(name = "kernel32")]
        extern "system" {
            fn GetCurrentProcess() -> *mut c_void;
            fn GetProcessIoCounters(h: *mut c_void, io: *mut [u64; 6]) -> i32;
            fn K32GetProcessMemoryInfo(h: *mut c_void, m: *mut [u32; 18], cb: u32) -> i32;
        }
        let pid = std::process::id();
        let io_kini = || {
            let mut io = [0u64; 6];
            assert_ne!(unsafe { GetProcessIoCounters(GetCurrentProcess(), &mut io) }, 0);
            io[3] + io[4]
        };
        let sebelum = io_kini();
        let saya = snapshot().into_iter().find(|p| p.pid == pid).unwrap();
        let sesudah = io_kini();
        assert!(sebelum <= saya.io_byte && saya.io_byte <= sesudah, "{sebelum} {} {sesudah}", saya.io_byte);
        let mut m = [0u32; 18];
        m[0] = 72;
        assert_ne!(unsafe { K32GetProcessMemoryInfo(GetCurrentProcess(), &mut m, 72) }, 0);
        assert!(m[1] > 0 && saya.hard_fault <= m[1], "hard {} total {}", saya.hard_fault, m[1]);
        assert!(saya.page_fault > 0 && saya.page_fault <= m[1], "snapshot {} api {}", saya.page_fault, m[1]);
        assert!(m[1] - saya.page_fault < 50_000, "offset page fault meleset: {} vs {}", saya.page_fault, m[1]);
    }

    #[test]
    fn memori_sistem_terbaca() {
        let m = memori_sistem(&snapshot());
        let (total, ada) = (m.total_mb.unwrap(), m.tersedia_mb.unwrap());
        assert!(total > 1000.0 && ada > 0.0 && ada <= total, "{m:?}");
        assert!(m.beban_persen.unwrap() <= 100);
    }

    #[test]
    fn nama_instans_gpu() {
        let n = "pid_4242_luid_0x00000000_0x0000D1F5_phys_0_eng_3_engtype_3D";
        assert_eq!(pid_dari_instans(n), Some(4242));
        assert_eq!(engtype_dari_instans(n), "3D");
        assert_eq!(pid_dari_instans("luid_0x0_phys_0"), None);
    }

    #[test]
    fn gpu_ambil_jenis_tersibuk() {
        let b = vec![
            ("pid_1_luid_x_phys_0_eng_0_engtype_3D".to_string(), 10.0),
            ("pid_1_luid_x_phys_0_eng_1_engtype_3D".to_string(), 15.0),
            ("pid_1_luid_x_phys_0_eng_5_engtype_Copy".to_string(), 20.0),
            ("pid_2_luid_x_phys_0_eng_0_engtype_3D".to_string(), 3.0),
        ];
        let g = gpu_per_pid(&b);
        assert_eq!(g[&1], 25.0);
        assert_eq!(g[&2], 3.0);
    }

    #[test]
    fn snapshot_menemukan_diri_sendiri() {
        let pid = std::process::id();
        let s = snapshot();
        let saya = s.iter().find(|p| p.pid == pid).expect("proses uji ada di snapshot");
        assert!(saya.working_set > 0 && saya.privat > 0 && !saya.nama.is_empty());
        #[link(name = "kernel32")]
        extern "system" {
            fn GetCurrentProcess() -> *mut c_void;
            fn GetProcessTimes(h: *mut c_void, a: *mut u64, b: *mut u64, c: *mut u64, d: *mut u64) -> i32;
            fn GetPriorityClass(h: *mut c_void) -> u32;
        }
        let (mut buat, mut b, mut c, mut d) = (0u64, 0u64, 0u64, 0u64);
        unsafe {
            assert_ne!(GetProcessTimes(GetCurrentProcess(), &mut buat, &mut b, &mut c, &mut d), 0);
            assert_eq!(saya.mulai, buat, "offset CreateTime");
            if GetPriorityClass(GetCurrentProcess()) == 0x20 {
                assert_eq!(saya.prioritas, 8, "offset BasePriority");
            }
        }
    }

    #[test]
    fn rumus_monitor() {
        assert_eq!(filetime_ke_unix(0), 0);
        assert_eq!(filetime_ke_unix((1_767_225_600 + 11_644_473_600) * 10_000_000), 1_767_225_600);
        assert_eq!(bagian_kompresi(600.0, 300.0, 1200.0), 150.0);
        assert_eq!(bagian_kompresi(600.0, 100.0, 120.0), 100.0, "tak pernah melebihi bagiannya sendiri");
        assert_eq!(bagian_kompresi(600.0, 0.0, 1200.0), 0.0);
        assert_eq!(bagian_kompresi(600.0, 100.0, 0.0), 0.0);
        assert_eq!(fisik_perkiraan(400.0, 120.0, 3, 50.0), 490.0);
        assert_eq!(fisik_perkiraan(400.0, 120.0, 0, 0.0), 520.0, "jumlah 0 dianggap 1");
        assert_eq!(sibuk_persen((100, 1000), (150, 1100)), Some(50.0));
        assert_eq!(sibuk_persen((100, 1000), (100, 1000)), None);
    }

    #[test]
    fn fisik_per_kelompok_versi() {
        let k = |pid, privat, bersama, kompresi| SumberKlien { pid, ram_privat_mb: privat, ram_bersama_mb: bersama, kompresi_perkiraan_mb: kompresi, ..Default::default() };
        assert_eq!(fisik_per_kelompok(&mut [], &HashMap::new()), 0.0);
        let mut satu = [k(1, 400.0, 120.0, 50.0)];
        assert_eq!(fisik_per_kelompok(&mut satu, &HashMap::new()), 570.0);
        assert_eq!(satu[0].fisik_perkiraan_mb, 570.0);
        let mut tiga = [k(1, 400.0, 120.0, 0.0), k(2, 300.0, 100.0, 0.0), k(3, 200.0, 90.0, 0.0)];
        let peta: HashMap<u32, String> = [(1, r"C:\V\version-a".to_string()), (2, r"C:\V\VERSION-A".to_string()), (3, r"C:\V\version-b".to_string())].into();
        let total = fisik_per_kelompok(&mut tiga, &peta);
        assert_eq!(tiga[0].fisik_perkiraan_mb, 460.0, "120/2");
        assert_eq!(tiga[1].fisik_perkiraan_mb, 350.0, "100/2");
        assert_eq!(tiga[2].fisik_perkiraan_mb, 290.0, "versi sendiri: 90/1");
        assert_eq!(total, 900.0 + 120.0 + 90.0, "bersama dihitung sekali per versi");
        let mut campur = [k(1, 400.0, 120.0, 0.0), k(7, 50.0, 80.0, 0.0), k(8, 60.0, 70.0, 0.0)];
        let peta: HashMap<u32, String> = [(1, r"C:\\V\\version-a".to_string())].into();
        let total = fisik_per_kelompok(&mut campur, &peta);
        assert_eq!(campur[0].fisik_perkiraan_mb, 520.0, "versi sendiri: 120/1");
        assert_eq!(campur[1].fisik_perkiraan_mb, 90.0, "tak diketahui: 80/2");
        assert_eq!(campur[2].fisik_perkiraan_mb, 95.0, "tak diketahui: 70/2");
        assert_eq!(total, 510.0 + 120.0 + 80.0);
    }
}
