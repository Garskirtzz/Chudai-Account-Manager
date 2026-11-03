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
        if o + 200 > buf.len() {
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
    pub gpu: Option<f64>,
    pub vram_mb: Option<f64>,
    pub bersama_mb: Option<f64>,
}

#[derive(serde::Serialize, Clone, Debug, Default)]
pub struct Laporan {
    pub klien: Vec<SumberKlien>,
    pub kompresi_mb: f64,
    pub inti: usize,
}

struct Pdh {
    query: isize,
    gpu: isize,
    vram: isize,
    bersama: isize,
}

struct Pemantau {
    waktu: Instant,
    cpu: HashMap<u32, u64>,
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
    let mut klien = Vec::new();
    let mut kompresi_mb = 0.0;
    let mut cpu_baru = HashMap::new();
    for p in &snap {
        if p.nama == "Memory Compression" {
            kompresi_mb = p.working_set as f64 / 1_048_576.0;
        }
        if !p.nama.eq_ignore_ascii_case(nama_image) {
            continue;
        }
        cpu_baru.insert(p.pid, p.waktu_cpu);
        let cpu = match (lama.as_ref().and_then(|l| l.cpu.get(&p.pid)), detik > 0.05) {
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
            gpu: gpu.as_ref().map(|g| g.get(&p.pid).copied().unwrap_or(0.0)),
            vram_mb: vram.as_ref().map(|v| v.get(&p.pid).copied().unwrap_or(0.0) / 1_048_576.0),
            bersama_mb: bersama.as_ref().map(|v| v.get(&p.pid).copied().unwrap_or(0.0) / 1_048_576.0),
        });
    }

    let pdh = lama.and_then(|p| p.pdh).or_else(buka_pdh);
    *kunci = Some(Pemantau { waktu: kini, cpu: cpu_baru, pdh });
    Laporan { klien, kompresi_mb, inti }
}

#[cfg(test)]
mod tes {
    use super::*;

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
    }
}
