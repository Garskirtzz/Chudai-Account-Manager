use std::ffi::c_void;

const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
const PROCESS_SET_QUOTA: u32 = 0x0100;
const PROCESS_SET_INFORMATION: u32 = 0x0200;
const PROCESS_MEMORY_PRIORITY: u32 = 0;
pub const MEMORY_PRIORITY_VERY_LOW: u32 = 1;
#[allow(dead_code)]
pub const MEMORY_PRIORITY_NORMAL: u32 = 5;

#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(akses: u32, warisi: i32, pid: u32) -> *mut c_void;
    fn CloseHandle(h: *mut c_void) -> i32;
    fn GetLastError() -> u32;
    fn GetProcessTimes(h: *mut c_void, buat: *mut u64, keluar: *mut u64, kernel: *mut u64, user: *mut u64) -> i32;
    fn K32EmptyWorkingSet(h: *mut c_void) -> i32;
    fn SetProcessInformation(h: *mut c_void, kelas: u32, isi: *const c_void, panjang: u32) -> i32;
    fn GetProcessInformation(h: *mut c_void, kelas: u32, isi: *mut c_void, panjang: u32) -> i32;
    fn GetProcessWorkingSetSizeEx(h: *mut c_void, min: *mut usize, max: *mut usize, flags: *mut u32) -> i32;
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

pub fn trim(pid: u32, mulai: u64) -> Result<(), String> {
    trim_inti(pid, mulai, None)
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

pub fn atur_prioritas_memori(pid: u32, mulai: u64, nilai: u32) -> Result<(), String> {
    let h = buka(pid, mulai, PROCESS_SET_INFORMATION)?;
    let ok = unsafe { SetProcessInformation(h.0, PROCESS_MEMORY_PRIORITY, &nilai as *const u32 as *const c_void, 4) };
    if ok == 0 {
        return Err(format!("Couldn't change the memory priority of Roblox process {pid} (error {}).", unsafe { GetLastError() }));
    }
    Ok(())
}

pub fn batas_ws_keras_mb(pid: u32, mulai: u64) -> Result<Option<u64>, String> {
    const QUOTA_LIMITS_HARDWS_MAX_ENABLE: u32 = 0x4;
    let h = buka(pid, mulai, 0)?;
    let (mut min, mut max, mut flags) = (0usize, 0usize, 0u32);
    if unsafe { GetProcessWorkingSetSizeEx(h.0, &mut min, &mut max, &mut flags) } == 0 {
        return Err(format!("Couldn't read the working set limit of process {pid} (error {}).", unsafe { GetLastError() }));
    }
    Ok((flags & QUOTA_LIMITS_HARDWS_MAX_ENABLE != 0).then_some(max as u64 / 1_048_576))
}

pub fn prioritas_memori(pid: u32, mulai: u64) -> Result<u32, String> {
    let h = buka(pid, mulai, 0)?;
    let mut nilai = 0u32;
    let ok = unsafe { GetProcessInformation(h.0, PROCESS_MEMORY_PRIORITY, &mut nilai as *mut u32 as *mut c_void, 4) };
    if ok == 0 {
        return Err(format!("Couldn't read the memory priority of Roblox process {pid} (error {}).", unsafe { GetLastError() }));
    }
    Ok(nilai)
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

#[cfg(test)]
mod tes {
    use super::*;
    use std::os::windows::process::CommandExt;
    use std::process::{Child, Command, Stdio};

    fn ping() -> (Child, u32, u64) {
        let root = std::env::var_os("SystemRoot").unwrap_or_else(|| r"C:\Windows".into());
        let child = Command::new(std::path::Path::new(&root).join(r"System32\PING.EXE"))
            .args(["-n", "30", "127.0.0.1"])
            .stdout(Stdio::null())
            .creation_flags(0x0800_0000)
            .spawn()
            .unwrap();
        let pid = child.id();
        let mulai = crate::sumber::snapshot().into_iter().find(|p| p.pid == pid).unwrap().mulai;
        (child, pid, mulai)
    }

    fn ws(pid: u32) -> u64 {
        crate::sumber::snapshot().into_iter().find(|p| p.pid == pid).unwrap().working_set
    }

    #[test]
    fn trim_menurunkan_working_set_dan_menolak_pid_lain() {
        let (mut anak, pid, mulai) = ping();
        assert_eq!(batas_ws_keras_mb(pid, mulai), Ok(None), "proses biasa tanpa batas keras");
        std::thread::sleep(std::time::Duration::from_millis(300));
        let sebelum = ws(pid);
        trim(pid, mulai).unwrap();
        let sesudah = ws(pid);
        assert!(sesudah < sebelum, "working set {sebelum} -> {sesudah}");
        assert!(trim(pid, mulai.wrapping_sub(1)).is_err(), "waktu mulai lain = proses lain");
        anak.kill().unwrap();
        anak.wait().unwrap();
        assert!(trim(pid, mulai).is_err(), "proses yang sudah keluar");
    }

    #[test]
    fn prioritas_memori_terpasang_lalu_kembali() {
        let (mut anak, pid, mulai) = ping();
        assert_eq!(prioritas_memori(pid, mulai).unwrap(), MEMORY_PRIORITY_NORMAL);
        atur_prioritas_memori(pid, mulai, MEMORY_PRIORITY_VERY_LOW).unwrap();
        assert_eq!(prioritas_memori(pid, mulai).unwrap(), MEMORY_PRIORITY_VERY_LOW);
        atur_prioritas_memori(pid, mulai, MEMORY_PRIORITY_NORMAL).unwrap();
        assert_eq!(prioritas_memori(pid, mulai).unwrap(), MEMORY_PRIORITY_NORMAL);
        assert!(atur_prioritas_memori(pid, mulai ^ 1, MEMORY_PRIORITY_VERY_LOW).is_err());
        assert_eq!(prioritas_memori(pid, mulai).unwrap(), MEMORY_PRIORITY_NORMAL, "pid lain tidak tersentuh");
        anak.kill().unwrap();
        anak.wait().unwrap();
    }

    fn cmd_bertanda(btid: u64) -> (Child, u32, u64) {
        let root = std::env::var_os("SystemRoot").unwrap_or_else(|| r"C:\Windows".into());
        let child = Command::new(std::path::Path::new(&root).join(r"System32\cmd.exe"))
            .raw_arg(format!("/d /c \"ping -n 30 127.0.0.1 >nul & rem +browsertrackerid:{btid}\""))
            .stdout(Stdio::null())
            .creation_flags(0x0800_0000)
            .spawn()
            .unwrap();
        let pid = child.id();
        let mulai = crate::sumber::snapshot().into_iter().find(|p| p.pid == pid).unwrap().mulai;
        (child, pid, mulai)
    }

    #[test]
    fn trim_klien_menolak_proses_milik_akun_lain() {
        let (mut anak, pid, mulai) = cmd_bertanda(574_126_934);
        std::thread::sleep(std::time::Duration::from_millis(300));
        let e = trim_klien(pid, mulai, 574_126_935).unwrap_err();
        assert!(e.contains("no longer the same client"), "{e}");
        trim_klien(pid, mulai, 574_126_934).unwrap();
        anak.kill().unwrap();
        anak.wait().unwrap();
        let (mut p, pid, mulai) = ping();
        assert!(trim_klien(pid, mulai, 574_126_934).is_err());
        trim(pid, mulai).unwrap();
        p.kill().unwrap();
        p.wait().unwrap();
    }

    fn ft(t: i64) -> u64 {
        ((t + 11_644_473_600) as u64) * 10_000_000
    }

    fn calon(pid: u32, ws_mb: f64) -> Calon {
        Calon { pid, mulai: ft(1_000), btid: 7, ws_mb, dikecualikan: false, berbatas: false, depan: false, macet: false }
    }

    #[test]
    fn filetime_bolak_balik() {
        assert_eq!(filetime_ke_unix(ft(1_762_000_000)), 1_762_000_000);
    }

    #[test]
    fn syarat_trim_sesuai_c1() {
        let p = Penjadwal::default();
        let kini = 1_000 + UMUR_MIN_DTK;
        assert_eq!(p.alasan(&calon(1, 2300.0), kini), None);
        assert_eq!(p.alasan(&Calon { dikecualikan: true, ..calon(1, 2300.0) }, kini), Some(Lewati::Dikecualikan));
        assert_eq!(p.alasan(&Calon { depan: true, ..calon(1, 2300.0) }, kini), Some(Lewati::Depan));
        assert_eq!(p.alasan(&Calon { macet: true, ..calon(1, 2300.0) }, kini), Some(Lewati::Macet));
        assert_eq!(p.alasan(&calon(1, 2300.0), kini - 1), Some(Lewati::Memuat), "baru dibuka = memuat");
        assert_eq!(p.alasan(&Calon { berbatas: true, ..calon(1, 2300.0) }, kini), Some(Lewati::Berbatas));
        assert_eq!(p.alasan(&calon(1, AMBANG_TRIM_MB), kini), Some(Lewati::Kecil), "tepat 768 = bukan lebih dari");
        assert_eq!(p.alasan(&calon(1, AMBANG_TRIM_MB + 1.0), kini), None);
    }

    #[test]
    fn satu_trim_per_putaran_dan_jeda_per_klien() {
        let mut p = Penjadwal::default();
        let kini = 5_000;
        let c = [calon(1, 900.0), calon(2, 2300.0), Calon { depan: true, ..calon(3, 3000.0) }];
        assert_eq!(p.pilih(&c, kini), Some((2, ft(1_000), 7)), "terbesar yang layak, bukan yang di depan");
        p.tercatat(2, ft(1_000), kini);
        assert_eq!(p.pilih(&c, kini + 10), Some((1, ft(1_000), 7)));
        p.tercatat(1, ft(1_000), kini + 10);
        assert_eq!(p.pilih(&c, kini + JEDA_TRIM_DTK - 1), None, "keduanya masih dalam jeda");
        assert_eq!(p.pilih(&c, kini + JEDA_TRIM_DTK), Some((2, ft(1_000), 7)));
        let baru = [Calon { mulai: ft(kini + 10), ..calon(2, 2300.0) }];
        assert_eq!(p.pilih(&baru, kini + 20), None, "proses baru masih memuat");
        assert_eq!(p.pilih(&baru, kini + 10 + UMUR_MIN_DTK), Some((2, ft(kini + 10), 7)));
        assert_eq!(p.jejak.len(), 0, "jejak proses yang keluar dibuang");
    }
}
