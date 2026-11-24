use std::ffi::c_void;
use std::io::{BufRead, Write};
use std::os::windows::io::AsRawHandle;
use std::process::{Child, Command, Stdio};
use std::time::Duration;

const MB: usize = 1024 * 1024;
const MEMORI_ANAK_MB: usize = 700;
const BATAS_MB: usize = 256;

const JOB_INFO_DASAR: u32 = 2;
const JOB_INFO_CPU: u32 = 15;
const JOB_LIMIT_WORKINGSET: u32 = 0x0000_0001;
const JOB_LIMIT_PRIORITY_CLASS: u32 = 0x0000_0020;
const JOB_CPU_AKTIF_KERAS: u32 = 0x1 | 0x4;
const BELOW_NORMAL: u32 = 0x4000;
const HARDWS_MIN_MATI: u32 = 0x2;
const HARDWS_MAX_NYALA: u32 = 0x4;

#[repr(C)]
#[derive(Default)]
struct BatasDasar {
    waktu_proses: i64,
    waktu_job: i64,
    flags: u32,
    _a: u32,
    min_ws: usize,
    max_ws: usize,
    proses_aktif: u32,
    _b: u32,
    afinitas: usize,
    prioritas: u32,
    penjadwalan: u32,
}

#[repr(C)]
struct InfoCpu {
    flags: u32,
    rate: u32,
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateJobObjectW(attr: *mut c_void, nama: *const u16) -> *mut c_void;
    fn SetInformationJobObject(job: *mut c_void, kelas: u32, info: *const c_void, len: u32) -> i32;
    fn AssignProcessToJobObject(job: *mut c_void, proc: *mut c_void) -> i32;
    fn SetProcessWorkingSetSizeEx(proc: *mut c_void, min: usize, max: usize, flags: u32) -> i32;
    fn GetProcessWorkingSetSizeEx(proc: *mut c_void, min: *mut usize, max: *mut usize, flags: *mut u32) -> i32;
    fn GetLastError() -> u32;
    fn CloseHandle(h: *mut c_void) -> i32;
}

pub fn anak(mb: usize) {
    let mut baris = String::new();
    let _ = std::io::stdin().lock().read_line(&mut baris);
    std::thread::spawn(|| {
        let mut s = String::new();
        while std::io::stdin().lock().read_line(&mut s).is_ok_and(|n| n > 0) {
            s.clear();
        }
        std::process::exit(0);
    });
    let mut v = vec![0u8; mb * MB];
    let mut n = 0u8;
    loop {
        n = n.wrapping_add(1);
        for i in (0..v.len()).step_by(4096) {
            v[i] = n;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

fn hasil(nama: &str, ok: bool) -> String {
    if ok {
        format!("{nama}=ok")
    } else {
        format!("{nama}=galat {}", unsafe { GetLastError() })
    }
}

fn ws_proses(h: *mut c_void, langkah: &mut Vec<String>) {
    let r = unsafe { SetProcessWorkingSetSizeEx(h, 16 * MB, BATAS_MB * MB, HARDWS_MAX_NYALA | HARDWS_MIN_MATI) != 0 };
    langkah.push(hasil("ws-proses", r));
}

fn job_baru() -> *mut c_void {
    unsafe { CreateJobObjectW(std::ptr::null_mut(), std::ptr::null()) }
}

fn job_batas(job: *mut c_void, flags: u32, max_mb: usize, langkah: &mut Vec<String>, nama: &str) {
    let b = BatasDasar {
        flags,
        min_ws: if flags & JOB_LIMIT_WORKINGSET != 0 { 16 * MB } else { 0 },
        max_ws: if flags & JOB_LIMIT_WORKINGSET != 0 { max_mb * MB } else { 0 },
        prioritas: if flags & JOB_LIMIT_PRIORITY_CLASS != 0 { BELOW_NORMAL } else { 0 },
        ..Default::default()
    };
    let r = unsafe { SetInformationJobObject(job, JOB_INFO_DASAR, &b as *const _ as *const c_void, std::mem::size_of::<BatasDasar>() as u32) != 0 };
    langkah.push(hasil(nama, r));
}

fn job_cpu(job: *mut c_void, langkah: &mut Vec<String>) {
    let i = InfoCpu { flags: JOB_CPU_AKTIF_KERAS, rate: 5000 };
    let r = unsafe { SetInformationJobObject(job, JOB_INFO_CPU, &i as *const _ as *const c_void, std::mem::size_of::<InfoCpu>() as u32) != 0 };
    langkah.push(hasil("job-cpu", r));
}

fn masuk_job(job: *mut c_void, h: *mut c_void, langkah: &mut Vec<String>) {
    let r = unsafe { AssignProcessToJobObject(job, h) != 0 };
    langkah.push(hasil("masuk-job", r));
}

fn mulai_anak() -> Result<Child, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Command::new(exe)
        .args(["--probe-job-anak", &MEMORI_ANAK_MB.to_string()])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())
}

fn lanjutkan(c: &mut Child) {
    if let Some(s) = c.stdin.as_mut() {
        let _ = writeln!(s, "mulai");
        let _ = s.flush();
    }
}

fn ukur_ws(pid: u32) -> f64 {
    let mut v: Vec<f64> = (0..6)
        .filter_map(|_| {
            std::thread::sleep(Duration::from_millis(500));
            crate::sumber::snapshot().into_iter().find(|p| p.pid == pid).map(|p| p.working_set as f64 / MB as f64)
        })
        .collect();
    v.sort_by(f64::total_cmp);
    v.get(v.len() / 2).copied().unwrap_or(0.0)
}

fn bendera_ws(h: *mut c_void) -> String {
    let (mut min, mut max, mut flags) = (0usize, 0usize, 0u32);
    if unsafe { GetProcessWorkingSetSizeEx(h, &mut min, &mut max, &mut flags) } == 0 {
        return "tak terbaca".into();
    }
    format!("max {} MB, keras {}", max / MB, flags & HARDWS_MAX_NYALA != 0)
}

fn skenario(nama: &str, pasang: impl FnOnce(*mut c_void, &mut Vec<String>) -> Option<*mut c_void>, ubah_langsung: bool) -> Result<(), String> {
    let mut c = mulai_anak()?;
    let h = c.as_raw_handle() as *mut c_void;
    let mut langkah = Vec::new();
    let job = pasang(h, &mut langkah);
    lanjutkan(&mut c);
    std::thread::sleep(Duration::from_secs(4));
    let ws = ukur_ws(c.id());
    println!("{nama:<28} WS {ws:>6.0} MB | {} | {}", bendera_ws(h), langkah.join(", "));
    if let (true, Some(j)) = (ubah_langsung, job) {
        for mb in [128, 384] {
            let mut l = Vec::new();
            job_batas(j, JOB_LIMIT_WORKINGSET, mb, &mut l, "ubah-lewat-job");
            std::thread::sleep(Duration::from_secs(3));
            println!("{:<28} WS {:>6.0} MB | sasaran {mb} MB | {}", "  (klien berjalan)", ukur_ws(c.id()), l.join(", "));
        }
    }
    let _ = c.kill();
    let _ = c.wait();
    if let Some(j) = job {
        unsafe { CloseHandle(j) };
    }
    Ok(())
}

pub fn jalankan() -> Result<(), String> {
    let hak = crate::launcher::aktifkan_hak_working_set();
    println!("hak working set aktif: {hak}");
    if !hak {
        println!("PERINGATAN: token proses ini tidak punya SeIncreaseWorkingSetPrivilege (shell berintegritas rendah?). Galat ws-proses di bawah tidak bermakna.");
    }
    println!("anak {MEMORI_ANAK_MB} MB, batas {BATAS_MB} MB\n");
    skenario("tanpa batas (kontrol)", |_, _| None, false)?;
    skenario("ws proses saja", |h, l| { ws_proses(h, l); None }, false)?;
    skenario("ws proses lalu job cpu", |h, l| {
        ws_proses(h, l);
        let j = job_baru();
        job_cpu(j, l);
        masuk_job(j, h, l);
        Some(j)
    }, false)?;
    skenario("job cpu lalu ws proses", |h, l| {
        let j = job_baru();
        job_cpu(j, l);
        masuk_job(j, h, l);
        ws_proses(h, l);
        Some(j)
    }, false)?;
    skenario("job prioritas saja", |h, l| {
        let j = job_baru();
        job_batas(j, JOB_LIMIT_PRIORITY_CLASS, 0, l, "job-prioritas");
        masuk_job(j, h, l);
        Some(j)
    }, false)?;
    skenario("job ws + prioritas (lama)", |h, l| {
        let j = job_baru();
        job_batas(j, JOB_LIMIT_WORKINGSET | JOB_LIMIT_PRIORITY_CLASS, BATAS_MB, l, "job-ws+prioritas");
        masuk_job(j, h, l);
        Some(j)
    }, false)?;
    skenario("job ws saja", |h, l| {
        let j = job_baru();
        job_batas(j, JOB_LIMIT_WORKINGSET, BATAS_MB, l, "job-ws");
        masuk_job(j, h, l);
        Some(j)
    }, true)?;
    Ok(())
}
