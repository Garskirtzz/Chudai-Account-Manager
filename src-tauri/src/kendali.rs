use std::ffi::c_void;

const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
const PROCESS_SET_QUOTA: u32 = 0x0100;
#[allow(dead_code)]
pub const MEMORY_PRIORITY_NORMAL: u32 = 5;

#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(akses: u32, warisi: i32, pid: u32) -> *mut c_void;
    fn CloseHandle(h: *mut c_void) -> i32;
    fn GetLastError() -> u32;
    fn GetProcessTimes(h: *mut c_void, buat: *mut u64, keluar: *mut u64, kernel: *mut u64, user: *mut u64) -> i32;
    fn K32EmptyWorkingSet(h: *mut c_void) -> i32;
}

struct Handle(*mut c_void);

impl Drop for Handle {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

fn buka(pid: u32, mulai: u64, hak: u32) -> Result<Handle, String> {
    let h = unsafe { OpenProcess(hak | PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if h.is_null() {
        return Err(format!("Couldn't reach Roblox process {pid} (error {}).", unsafe { GetLastError() }));
    }
    let h = Handle(h);
    let (mut buat, mut a, mut b, mut c) = (0u64, 0u64, 0u64, 0u64);
    if unsafe { GetProcessTimes(h.0, &mut buat, &mut a, &mut b, &mut c) } == 0 || buat != mulai {
        return Err(format!("Roblox process {pid} is no longer the same client."));
    }
    Ok(h)
}

pub fn trim_klien(pid: u32, mulai: u64, btid: u64) -> Result<(), String> {
    trim_inti(pid, mulai, Some(btid))
}

fn trim_inti(pid: u32, mulai: u64, btid: Option<u64>) -> Result<(), String> {
    let h = buka(pid, mulai, PROCESS_SET_QUOTA)?;
    if let Some(btid) = btid {
        let milik = unsafe { crate::launcher::baca_baris_perintah(h.0) }.as_deref().and_then(crate::launcher::btid_dari_baris);
        if milik != Some(btid) {
            return Err(format!("Roblox process {pid} is no longer the same client."));
        }
    }
    if unsafe { K32EmptyWorkingSet(h.0) } == 0 {
        return Err(format!("Couldn't trim Roblox process {pid} (error {}).", unsafe { GetLastError() }));
    }
    Ok(())
}

pub const AMBANG_TRIM_MB: f64 = 768.0;
pub const JEDA_TRIM_DTK: i64 = 120;
pub const UMUR_MIN_DTK: i64 = 120;

pub fn filetime_ke_unix(ft: u64) -> i64 {
    (ft / 10_000_000) as i64 - 11_644_473_600
}

#[derive(Clone, Copy, Debug)]
pub struct Calon {
    pub pid: u32,
    pub mulai: u64,
    pub btid: u64,
    pub ws_mb: f64,
    pub dikecualikan: bool,
    pub berbatas: bool,
    pub depan: bool,
    pub macet: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lewati {
    Dikecualikan,
    Depan,
    Macet,
    Memuat,
    Berbatas,
    Kecil,
    BaruDitrim,
}

#[derive(Clone, Copy, Debug, Default)]
struct Jejak {
    terakhir: Option<i64>,
}

#[derive(serde::Serialize, Clone, Debug, Default, PartialEq)]
pub struct StatusTrim {
    pub aktif: bool,
    pub jumlah: u32,
    pub terakhir: Option<i64>,
    pub galat: Option<String>,
}

fn status_bersama() -> &'static std::sync::Mutex<StatusTrim> {
    static S: std::sync::OnceLock<std::sync::Mutex<StatusTrim>> = std::sync::OnceLock::new();
    S.get_or_init(Default::default)
}

pub fn status() -> StatusTrim {
    status_bersama().lock().unwrap_or_else(|e| e.into_inner()).clone()
}

pub fn atur_aktif(aktif: bool) {
    let mut s = status_bersama().lock().unwrap_or_else(|e| e.into_inner());
    s.aktif = aktif;
    if !aktif {
        s.galat = None;
    }
}

pub fn catat_hasil(hasil: Result<(), String>, kini: i64) {
    let mut s = status_bersama().lock().unwrap_or_else(|e| e.into_inner());
    match hasil {
        Ok(()) => {
            s.jumlah += 1;
            s.terakhir = Some(kini);
            s.galat = None;
        }
        Err(e) => s.galat = Some(e),
    }
}

#[derive(Default)]
pub struct Penjadwal {
    jejak: std::collections::HashMap<(u32, u64), Jejak>,
}

impl Penjadwal {
    pub fn alasan(&self, c: &Calon, kini: i64) -> Option<Lewati> {
        if c.dikecualikan {
            return Some(Lewati::Dikecualikan);
        }
        if c.depan {
            return Some(Lewati::Depan);
        }
        if c.macet {
            return Some(Lewati::Macet);
        }
        if kini - filetime_ke_unix(c.mulai) < UMUR_MIN_DTK {
            return Some(Lewati::Memuat);
        }
        if c.berbatas {
            return Some(Lewati::Berbatas);
        }
        if c.ws_mb <= AMBANG_TRIM_MB {
            return Some(Lewati::Kecil);
        }
        if self.jejak.get(&(c.pid, c.mulai)).and_then(|j| j.terakhir).is_some_and(|t| kini - t < JEDA_TRIM_DTK) {
            return Some(Lewati::BaruDitrim);
        }
        None
    }

    pub fn pilih(&mut self, calon: &[Calon], kini: i64) -> Option<(u32, u64, u64)> {
        self.jejak.retain(|k, _| calon.iter().any(|c| (c.pid, c.mulai) == *k));
        calon
            .iter()
            .filter(|c| self.alasan(c, kini).is_none())
            .max_by(|a, b| a.ws_mb.total_cmp(&b.ws_mb))
            .map(|c| (c.pid, c.mulai, c.btid))
    }

    pub fn tercatat(&mut self, pid: u32, mulai: u64, kini: i64) {
        self.jejak.entry((pid, mulai)).or_default().terakhir = Some(kini);
    }

    pub fn kosongkan(&mut self) {
        self.jejak.clear();
    }
}
