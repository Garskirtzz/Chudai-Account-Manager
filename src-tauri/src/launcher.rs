use std::collections::HashMap;
use std::ffi::c_void;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

const SW_SHOWNORMAL: i32 = 1;

#[link(name = "kernel32")]
extern "system" {
    fn CreateMutexW(
        lp_attrs: *mut c_void,
        b_initial_owner: i32,
        lp_name: *const u16,
    ) -> *mut c_void;
    fn CloseHandle(h_object: *mut c_void) -> i32;
    fn GetLastError() -> u32;
}

const TH32CS_SNAPPROCESS: u32 = 0x2;
const MAX_PATH: usize = 260;

#[repr(C)]
struct ProcessEntry32W {
    dw_size: u32,
    cnt_usage: u32,
    th32_process_id: u32,
    th32_default_heap_id: usize,
    th32_module_id: u32,
    cnt_threads: u32,
    th32_parent_process_id: u32,
    pc_pri_class_base: i32,
    dw_flags: u32,
    sz_exe_file: [u16; MAX_PATH],
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateToolhelp32Snapshot(dw_flags: u32, th32_process_id: u32) -> *mut c_void;
    fn Process32FirstW(h_snapshot: *mut c_void, lppe: *mut ProcessEntry32W) -> i32;
    fn Process32NextW(h_snapshot: *mut c_void, lppe: *mut ProcessEntry32W) -> i32;
}

pub fn klien_berjalan() -> Vec<(u32, String)> {
    let mut hasil = Vec::new();
    for pid in pid_klien() {
        let path = jalur_proses(pid);
        hasil.push((pid, path));
    }
    hasil
}

const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
const PROCESS_TERMINATE: u32 = 0x0001;
const SYNCHRONIZE: u32 = 0x0010_0000;

#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut c_void;
    fn QueryFullProcessImageNameW(
        proc: *mut c_void,
        flags: u32,
        buf: *mut u16,
        size: *mut u32,
    ) -> i32;
    fn TerminateProcess(proc: *mut c_void, code: u32) -> i32;
}

fn jalur_proses(pid: u32) -> String {
    unsafe {
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if h.is_null() {
            return String::new();
        }
        let mut buf = vec![0u16; 1024];
        let mut n = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut n);
        CloseHandle(h);
        if ok == 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..n as usize])
    }
}

pub fn pid_klien() -> Vec<u32> {
    klien_terperinci().into_iter().map(|k| k.pid).collect()
}

pub(crate) fn pid_roblox_mentah() -> Vec<u32> {
    let mut hasil = Vec::new();
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap.is_null() || snap as isize == -1 {
            return hasil;
        }
        let mut e: ProcessEntry32W = std::mem::zeroed();
        e.dw_size = std::mem::size_of::<ProcessEntry32W>() as u32;
        let mut ok = Process32FirstW(snap, &mut e);
        while ok != 0 {
            let len = e.sz_exe_file.iter().position(|&c| c == 0).unwrap_or(MAX_PATH);
            if String::from_utf16_lossy(&e.sz_exe_file[..len])
                .eq_ignore_ascii_case("RobloxPlayerBeta.exe")
            {
                hasil.push(e.th32_process_id);
            }
            ok = Process32NextW(snap, &mut e);
        }
        CloseHandle(snap);
    }
    hasil
}

pub fn proses_dalam_folder(folder: &std::path::Path) -> Vec<u32> {
    let nama: Vec<String> = std::fs::read_dir(folder)
        .map(|r| {
            r.flatten()
                .map(|e| e.file_name().to_string_lossy().to_lowercase())
                .filter(|n| n.ends_with(".exe"))
                .collect()
        })
        .unwrap_or_default();
    if nama.is_empty() {
        return Vec::new();
    }
    let awal = format!("{}\\", folder.to_string_lossy().trim_end_matches('\\').to_lowercase());
    let mut hasil = Vec::new();
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap.is_null() || snap as isize == -1 {
            return hasil;
        }
        let mut e: ProcessEntry32W = std::mem::zeroed();
        e.dw_size = std::mem::size_of::<ProcessEntry32W>() as u32;
        let mut ok = Process32FirstW(snap, &mut e);
        while ok != 0 {
            let len = e.sz_exe_file.iter().position(|&c| c == 0).unwrap_or(MAX_PATH);
            let exe = String::from_utf16_lossy(&e.sz_exe_file[..len]).to_lowercase();
            if nama.contains(&exe) {
                let jalur = jalur_proses(e.th32_process_id).to_lowercase();
                if jalur.is_empty() || jalur.starts_with(&awal) {
                    hasil.push(e.th32_process_id);
                }
            }
            ok = Process32NextW(snap, &mut e);
        }
        CloseHandle(snap);
    }
    hasil
}

pub fn jumlah_klien() -> usize {
    pid_klien().len()
}

#[link(name = "shell32")]
extern "system" {
    fn ShellExecuteW(
        hwnd: *mut c_void,
        lp_operation: *const u16,
        lp_file: *const u16,
        lp_parameters: *const u16,
        lp_directory: *const u16,
        n_show_cmd: i32,
    ) -> *mut c_void;
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

const NAMA_MUTEX: &str = "ROBLOX_singletonMutex";
const NAMA_EVENT: &str = "ROBLOX_singletonEvent";
const ERROR_ACCESS_DENIED: u32 = 5;
const ERROR_INVALID_HANDLE: u32 = 6;
const ERROR_ALREADY_EXISTS: u32 = 183;
const WAIT_OBJECT_0: u32 = 0;
const WAIT_ABANDONED: u32 = 0x80;

#[link(name = "kernel32")]
extern "system" {
    fn WaitForSingleObject(h: *mut c_void, ms: u32) -> u32;
    fn ReleaseMutex(h: *mut c_void) -> i32;
}

pub struct SingletonGuard {
    berhenti: Option<std::sync::mpsc::Sender<()>>,
    utas: Option<std::thread::JoinHandle<()>>,
    pub keterangan: String,
}

pub const PESAN_ROBLOX_JALAN: &str = "A Roblox game opened before multi-instance was turned on is still running, so the next client would close it. Close Roblox, then turn multi-instance on.";

impl Default for SingletonGuard {
    fn default() -> Self {
        Self::new()
    }
}

impl SingletonGuard {
    pub fn new() -> Self {
        Self { berhenti: None, utas: None, keterangan: String::new() }
    }

    pub fn aktif(&self) -> bool {
        self.utas.is_some()
    }

    pub fn nyalakan(&mut self) -> Result<(), String> {
        if self.aktif() {
            return Ok(());
        }
        akhiri_tray_diam();
        let (kirim_hasil, terima_hasil) = std::sync::mpsc::channel::<Result<String, String>>();
        let (kirim_henti, terima_henti) = std::sync::mpsc::channel::<()>();
        let utas = std::thread::Builder::new()
            .name("cam-singleton".into())
            .spawn(move || pegang_nama(kirim_hasil, terima_henti))
            .map_err(|e| format!("Could not start multi-instance: {e}"))?;
        match terima_hasil.recv_timeout(std::time::Duration::from_secs(10)) {
            Ok(Ok(ket)) => {
                self.keterangan = ket;
                self.berhenti = Some(kirim_henti);
                self.utas = Some(utas);
                Ok(())
            }
            Ok(Err(e)) => {
                let _ = utas.join();
                Err(e)
            }
            Err(_) => Err("Multi-instance did not start in time.".into()),
        }
    }

    pub fn matikan(&mut self) {
        self.berhenti = None;
        if let Some(u) = self.utas.take() {
            let _ = u.join();
        }
        self.keterangan.clear();
    }
}

impl Drop for SingletonGuard {
    fn drop(&mut self) {
        self.matikan();
    }
}

fn pegang_nama(hasil: std::sync::mpsc::Sender<Result<String, String>>, henti: std::sync::mpsc::Receiver<()>) {
    unsafe {
        let null = std::ptr::null_mut();
        let we = wide(NAMA_EVENT);
        let he = CreateMutexW(null, 0, we.as_ptr());
        let ke = GetLastError();
        let ket_event = if he.is_null() {
            match ke {
                ERROR_INVALID_HANDLE if !pid_klien().is_empty() => {
                    let _ = hasil.send(Err(PESAN_ROBLOX_JALAN.into()));
                    return;
                }
                ERROR_INVALID_HANDLE => "event held by another program".to_string(),
                ERROR_ACCESS_DENIED => "held by a program running as administrator".to_string(),
                k => {
                    let _ = hasil.send(Err(format!("Could not create {NAMA_EVENT} (code {k}).")));
                    return;
                }
            }
        } else if ke == ERROR_ALREADY_EXISTS {
            "shared with another program's multi-instance".to_string()
        } else {
            "held by this app".to_string()
        };

        let wm = wide(NAMA_MUTEX);
        let hm = CreateMutexW(null, 1, wm.as_ptr());
        let km = GetLastError();
        let coba_miliki = |h: *mut c_void| -> bool {
            let w = WaitForSingleObject(h, 0);
            w == WAIT_OBJECT_0 || w == WAIT_ABANDONED
        };
        let mut milik = !hm.is_null() && km != ERROR_ALREADY_EXISTS;
        if !hm.is_null() && !milik {
            milik = coba_miliki(hm);
        }
        let ket_mutex = if hm.is_null() {
            match km {
                ERROR_ACCESS_DENIED => "held by a program running as administrator".to_string(),
                k => format!("unavailable (code {k})"),
            }
        } else if milik {
            "owned by this app".to_string()
        } else {
            "owned by another program".to_string()
        };
        let _ = hasil.send(Ok(format!("{NAMA_EVENT}: {ket_event}; {NAMA_MUTEX}: {ket_mutex}")));

        loop {
            match henti.recv_timeout(std::time::Duration::from_secs(1)) {
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    if !milik && !hm.is_null() {
                        milik = coba_miliki(hm);
                    }
                }
                _ => break,
            }
        }
        if milik {
            ReleaseMutex(hm);
        }
        if !hm.is_null() {
            CloseHandle(hm);
        }
        if !he.is_null() {
            CloseHandle(he);
        }
    }
}

pub enum Tujuan {
    Publik { place_id: u64 },
    Server { place_id: u64, job_id: String },
    Pribadi {
        place_id: u64,
        link_code: String,
        access_code: String,
    },
    Ikuti { user_id: u64 },
}

fn bersihkan_token(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

pub fn place_launcher_url(t: &Tujuan, btid: u64) -> String {
    match t {
        Tujuan::Publik { place_id } => format!(
            "https://assetgame.roblox.com/game/PlaceLauncher.ashx\
             ?request=RequestGame&browserTrackerId={btid}&placeId={place_id}\
             &isPlayTogetherGame=false"
        ),
        Tujuan::Server { place_id, job_id } => {
            let job_id = bersihkan_token(job_id);
            format!(
            "https://assetgame.roblox.com/game/PlaceLauncher.ashx\
             ?request=RequestGameJob&browserTrackerId={btid}&placeId={place_id}\
             &gameId={job_id}&isPlayTogetherGame=false"
            )
        }
        Tujuan::Pribadi {
            place_id,
            link_code,
            access_code,
        } => {
            let ac = bersihkan_token(access_code);
            if !ac.is_empty() {
                let percobaan = uuid::Uuid::new_v4().to_string();
                return format!(
                    "https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestPrivateGame&browserTrackerId={btid}&placeId={place_id}&accessCode={ac}&joinAttemptId={percobaan}&joinAttemptOrigin=privateServerListJoin"
                );
            }
            let link_code = bersihkan_token(link_code);
            format!(
            "https://assetgame.roblox.com/game/PlaceLauncher.ashx\
             ?request=RequestPrivateGame&browserTrackerId={btid}&placeId={place_id}\
             &linkCode={link_code}"
            )
        }
        Tujuan::Ikuti { user_id } => format!(
            "https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestFollowUser&browserTrackerId={btid}&userId={user_id}"
        ),
    }
}

pub fn uri_luncur(ticket: &str, t: &Tujuan, btid: u64) -> String {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let url = place_launcher_url(t, btid);
    format!(
        "roblox-player:1+launchmode:play+gameinfo:{ticket}\
         +launchtime:{ms}+placelauncherurl:{}\
         +browsertrackerid:{btid}+robloxLocale:en_us+gameLocale:en_us+channel:",
        urlencoding::encode(&url)
    )
}

pub fn exe_klien(klien_path: &str) -> Option<String> {
    if !klien_path.trim().is_empty() && std::path::Path::new(klien_path).exists() {
        return Some(klien_path.to_string());
    }
    let dir = crate::fps::berkas_setting("")?;
    let exe = dir.parent()?.join("RobloxPlayerBeta.exe");
    exe.exists().then(|| exe.to_string_lossy().to_string())
}

pub fn pilih_alih(auto: &str, alih: Option<&(String, String)>, ada: impl Fn(&str) -> bool) -> Option<String> {
    let (dari, ke) = alih?;
    (dari.eq_ignore_ascii_case(auto) && !ke.eq_ignore_ascii_case(auto) && ada(ke)).then(|| ke.clone())
}

fn peluncuran() -> &'static Mutex<HashMap<u64, (u32, String)>> {
    static P: OnceLock<Mutex<HashMap<u64, (u32, String)>>> = OnceLock::new();
    P.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn catat_peluncuran(btid: u64, pid: u32, exe: &str) {
    if let Ok(mut m) = peluncuran().lock() {
        m.insert(btid, (pid, exe.to_string()));
    }
}

pub fn ambil_peluncuran(btid: u64) -> Option<(u32, String)> {
    peluncuran().lock().ok()?.remove(&btid)
}

#[derive(Clone, Debug, Default)]
pub struct OpsiProses {
    pub batas_ws_mb: Option<u64>,
    pub prioritas_rendah: bool,
    pub eco: bool,
    pub memori_rendah: bool,
    pub core: Option<u32>,
    pub cpu_persen_x100: Option<u32>,
    pub argumen: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct ProsesDibuat {
    pub pid: u32,
    pub peringatan: Option<String>,
    pub mulai: u64,
    pub ws_terpasang: bool,
    #[allow(dead_code)]
    pub job_cpu: Option<usize>,
}

const MAKS_ARGUMEN_KARAKTER: usize = 512;
const MAKS_ARGUMEN: usize = 32;

pub fn argumen_luncur(teks: &str) -> Result<Vec<String>, String> {
    if teks.chars().count() > MAKS_ARGUMEN_KARAKTER {
        return Err(format!("Launch arguments can be at most {MAKS_ARGUMEN_KARAKTER} characters."));
    }
    if let Some(c) = teks.chars().find(|&c| (c.is_control() && c != ' ' && c != '\t') || "\"'&|<>^".contains(c)) {
        return Err(if c.is_control() {
            "Launch arguments can't contain line breaks or control characters.".into()
        } else {
            format!("Launch arguments can't contain {c}")
        });
    }
    let kata: Vec<String> = teks.split_whitespace().map(str::to_owned).collect();
    if kata.len() > MAKS_ARGUMEN {
        return Err(format!("Launch arguments can be at most {MAKS_ARGUMEN} words."));
    }
    if kata.iter().any(|k| k.to_ascii_lowercase().starts_with("roblox-player:")) {
        return Err("Launch arguments can't contain another roblox-player: link.".into());
    }
    Ok(kata)
}

pub fn argumen_untuk(milik_akun: Option<&str>, bawaan: &str) -> Result<Vec<String>, String> {
    argumen_luncur(milik_akun.unwrap_or(bawaan))
}

#[repr(C)]
struct InfoCpuJob {
    control_flags: u32,
    cpu_rate: u32,
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateJobObjectW(attr: *mut c_void, nama: *const u16) -> *mut c_void;
    fn SetInformationJobObject(job: *mut c_void, kelas: u32, info: *const c_void, len: u32) -> i32;
    fn AssignProcessToJobObject(job: *mut c_void, proc: *mut c_void) -> i32;
}

const JOB_CPU_RATE_CONTROL: u32 = 15;
const JOB_CPU_ENABLE: u32 = 0x1;
const JOB_CPU_HARD_CAP: u32 = 0x4;

unsafe fn pasang_job_cpu(proc: *mut c_void, rate_x100: u32) -> Result<*mut c_void, String> {
    let job = CreateJobObjectW(std::ptr::null_mut(), std::ptr::null());
    if job.is_null() {
        return Err(format!("CPU limit job (error {})", GetLastError()));
    }
    if rate_x100 > 0 {
        let info = InfoCpuJob { control_flags: JOB_CPU_ENABLE | JOB_CPU_HARD_CAP, cpu_rate: rate_x100.min(10_000) };
        if SetInformationJobObject(job, JOB_CPU_RATE_CONTROL, &info as *const _ as *const c_void, std::mem::size_of::<InfoCpuJob>() as u32) == 0 {
            let e = GetLastError();
            CloseHandle(job);
            return Err(format!("CPU limit (error {e})"));
        }
    }
    if AssignProcessToJobObject(job, proc) == 0 {
        let e = GetLastError();
        CloseHandle(job);
        return Err(format!("CPU limit assign (error {e})"));
    }
    Ok(job)
}

#[repr(C)]
struct StartupInfoW {
    cb: u32,
    reserved: *mut u16,
    desktop: *mut u16,
    title: *mut u16,
    x: u32, y: u32, x_size: u32, y_size: u32,
    x_count_chars: u32, y_count_chars: u32, fill_attribute: u32, flags: u32,
    show_window: u16, cb_reserved2: u16,
    reserved2: *mut u8,
    std_input: *mut c_void, std_output: *mut c_void, std_error: *mut c_void,
}

#[repr(C)]
struct ProcessInformation {
    process: *mut c_void,
    thread: *mut c_void,
    pid: u32,
    tid: u32,
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateProcessW(
        app: *const u16, cmd: *mut u16, pa: *mut c_void, ta: *mut c_void, inherit: i32,
        flags: u32, env: *mut c_void, cwd: *const u16, si: *mut StartupInfoW, pi: *mut ProcessInformation,
    ) -> i32;
    fn ResumeThread(thread: *mut c_void) -> u32;
    fn SetProcessWorkingSetSizeEx(proc: *mut c_void, min: usize, max: usize, flags: u32) -> i32;
    fn GetProcessTimes(proc: *mut c_void, buat: *mut u64, keluar: *mut u64, kernel: *mut u64, user: *mut u64) -> i32;
    fn SetProcessInformation(proc: *mut c_void, class: u32, info: *const c_void, len: u32) -> i32;
    fn SetProcessAffinityMask(proc: *mut c_void, mask: usize) -> i32;
    fn GetCurrentProcess() -> *mut c_void;
}

#[repr(C)]
struct TokenPrivilege {
    count: u32,
    luid_low: u32,
    luid_high: i32,
    attributes: u32,
}

#[link(name = "advapi32")]
extern "system" {
    fn OpenProcessToken(proc: *mut c_void, access: u32, token: *mut *mut c_void) -> i32;
    fn LookupPrivilegeValueW(system: *const u16, name: *const u16, luid: *mut u64) -> i32;
    fn AdjustTokenPrivileges(token: *mut c_void, disable_all: i32, new: *mut TokenPrivilege, len: u32, prev: *mut c_void, ret: *mut u32) -> i32;
}

const TOKEN_ADJUST_PRIVILEGES: u32 = 0x0020;
const TOKEN_QUERY: u32 = 0x0008;
const SE_PRIVILEGE_ENABLED: u32 = 0x2;
const QUOTA_LIMITS_HARDWS_MIN_DISABLE: u32 = 0x2;
const QUOTA_LIMITS_HARDWS_MAX_ENABLE: u32 = 0x4;

pub(crate) fn aktifkan_hak_working_set() -> bool {
    unsafe {
        let mut token = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut luid = 0u64;
        let nama = wide("SeIncreaseWorkingSetPrivilege");
        let ok = LookupPrivilegeValueW(std::ptr::null(), nama.as_ptr(), &mut luid) != 0 && {
            let mut tp = TokenPrivilege {
                count: 1,
                luid_low: luid as u32,
                luid_high: (luid >> 32) as i32,
                attributes: SE_PRIVILEGE_ENABLED,
            };
            AdjustTokenPrivileges(token, 0, &mut tp, 0, std::ptr::null_mut(), std::ptr::null_mut()) != 0
                && GetLastError() == 0
        };
        CloseHandle(token);
        ok
    }
}

const CREATE_SUSPENDED: u32 = 0x0000_0004;
const PROCESS_MEMORY_PRIORITY: u32 = 0;
const PROCESS_POWER_THROTTLING: u32 = 4;
const MEMORY_PRIORITY_VERY_LOW: u32 = 1;
const POWER_THROTTLING_EXECUTION_SPEED: u32 = 0x1;
const POWER_THROTTLING_IGNORE_TIMER_RESOLUTION: u32 = 0x4;

#[repr(C)]
struct PowerThrottling {
    version: u32,
    control_mask: u32,
    state_mask: u32,
}

pub fn mask_core(n: u32) -> usize {
    let n = n.clamp(1, usize::BITS - 1);
    (1usize << n) - 1
}
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x0000_4000;

pub fn luncurkan_terbatas(
    ticket: &str,
    t: &Tujuan,
    btid: u64,
    exe: &str,
    opsi: OpsiProses,
) -> Result<ProsesDibuat, String> {
    let uri = uri_luncur(ticket, t, btid);
    let mut baris = format!("\"{exe}\" {uri}");
    for a in &opsi.argumen {
        baris.push(' ');
        baris.push_str(a);
    }
    let mut cmd = wide(&baris);
    let app = wide(exe);
    let mut peringatan = None;
    let mut ws_terpasang = false;
    unsafe {
        let mut si: StartupInfoW = std::mem::zeroed();
        si.cb = std::mem::size_of::<StartupInfoW>() as u32;
        let mut pi: ProcessInformation = std::mem::zeroed();
        let mut flags = CREATE_SUSPENDED;
        if opsi.prioritas_rendah {
            flags |= BELOW_NORMAL_PRIORITY_CLASS;
        }
        if CreateProcessW(app.as_ptr(), cmd.as_mut_ptr(), std::ptr::null_mut(), std::ptr::null_mut(), 0,
            flags, std::ptr::null_mut(), std::ptr::null(), &mut si, &mut pi) == 0
        {
            return Err(format!("could not start the Roblox client (error {})", GetLastError()));
        }
        let mut gagal: Vec<String> = Vec::new();
        let mut job_cpu = None;
        if let Some(r) = opsi.cpu_persen_x100 {
            match pasang_job_cpu(pi.process, r) {
                Ok(j) => job_cpu = Some(j as usize),
                Err(e) => gagal.push(e),
            }
        }
        if let Some(mb) = opsi.batas_ws_mb {
            let hak = aktifkan_hak_working_set();
            let ok = SetProcessWorkingSetSizeEx(
                pi.process,
                16 * 1024 * 1024,
                (mb as usize) * 1024 * 1024,
                QUOTA_LIMITS_HARDWS_MAX_ENABLE | QUOTA_LIMITS_HARDWS_MIN_DISABLE,
            ) != 0;
            ws_terpasang = ok;
            if !ok {
                peringatan = Some(format!(
                    "RAM limit was not applied (error {}{})",
                    GetLastError(),
                    if hak { "" } else { ", privilege unavailable" }
                ));
            }
        }
        if opsi.eco {
            let pt = PowerThrottling {
                version: 1,
                control_mask: POWER_THROTTLING_EXECUTION_SPEED | POWER_THROTTLING_IGNORE_TIMER_RESOLUTION,
                state_mask: POWER_THROTTLING_EXECUTION_SPEED | POWER_THROTTLING_IGNORE_TIMER_RESOLUTION,
            };
            if SetProcessInformation(pi.process, PROCESS_POWER_THROTTLING, &pt as *const _ as *const c_void, std::mem::size_of::<PowerThrottling>() as u32) == 0 {
                gagal.push(format!("efficiency mode (error {})", GetLastError()));
            }
        }
        if opsi.memori_rendah {
            let v = MEMORY_PRIORITY_VERY_LOW;
            if SetProcessInformation(pi.process, PROCESS_MEMORY_PRIORITY, &v as *const _ as *const c_void, 4) == 0 {
                gagal.push(format!("memory priority (error {})", GetLastError()));
            }
        }
        if let Some(n) = opsi.core {
            if SetProcessAffinityMask(pi.process, mask_core(n)) == 0 {
                gagal.push(format!("core limit (error {})", GetLastError()));
            }
        }
        if !gagal.is_empty() {
            let teks = format!("not applied: {}", gagal.join(", "));
            peringatan = Some(match peringatan {
                Some(p) => format!("{p}; {teks}"),
                None => teks,
            });
        }
        let (mut mulai, mut x, mut y, mut z) = (0u64, 0u64, 0u64, 0u64);
        GetProcessTimes(pi.process, &mut mulai, &mut x, &mut y, &mut z);
        ResumeThread(pi.thread);
        CloseHandle(pi.thread);
        CloseHandle(pi.process);
        Ok(ProsesDibuat { pid: pi.pid, peringatan, mulai, ws_terpasang, job_cpu })
    }
}

pub fn luncurkan(
    ticket: &str,
    t: &Tujuan,
    btid: u64,
    exe: Option<&str>,
    argumen: &[String],
) -> Result<(), String> {
    let uri = uri_luncur(ticket, t, btid);

    let otomatis;
    let exe = match exe.filter(|p| !p.trim().is_empty()) {
        None if !argumen.is_empty() => {
            otomatis = exe_klien("").ok_or(
                "Launch arguments need RobloxPlayerBeta.exe, and no installed Roblox version was found. \
                 Install Roblox, or clear the launch arguments.",
            )?;
            Some(otomatis.as_str())
        }
        e => e,
    };

    if let Some(path) = exe.filter(|p| !p.trim().is_empty()) {
        if !std::path::Path::new(path).exists() {
            return Err(format!(
                "Roblox client not found at:
{path}

That version may have been deleted by a Roblox update. Pick another version on the Client versions page."
            ));
        }
        return std::process::Command::new(path)
            .arg(&uri)
            .args(argumen)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("could not start the Roblox client: {e}"));
    }

    unsafe {
        let file = wide(&uri);
        let op = wide("open");
        let hinst = ShellExecuteW(
            std::ptr::null_mut(),
            op.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
        let kode = hinst as isize;
        if kode <= 32 {
            return Err(format!(
                "Windows refused to open the roblox-player: protocol (code {kode}). \
                 That usually means the Roblox client is not installed, or its \
                 protocol registration is broken."
            ));
        }
    }
    Ok(())
}

const PROCESS_COMMAND_LINE_INFORMATION: u32 = 60;

#[repr(C)]
struct UnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

#[link(name = "ntdll")]
extern "system" {
    fn NtQueryInformationProcess(
        proc: *mut c_void,
        class: u32,
        info: *mut c_void,
        len: u32,
        ret_len: *mut u32,
    ) -> i32;
}

pub fn baris_perintah(pid: u32) -> Option<String> {
    unsafe {
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if h.is_null() {
            return None;
        }
        let hasil = baca_baris_perintah(h);
        CloseHandle(h);
        hasil
    }
}

pub(crate) unsafe fn baca_baris_perintah(h: *mut c_void) -> Option<String> {
    let mut perlu: u32 = 0;
    NtQueryInformationProcess(
        h,
        PROCESS_COMMAND_LINE_INFORMATION,
        std::ptr::null_mut(),
        0,
        &mut perlu,
    );
    if perlu < std::mem::size_of::<UnicodeString>() as u32 || perlu > 64 * 1024 {
        return None;
    }

    let mut buf = vec![0u8; perlu as usize];
    let mut ret = 0u32;
    if NtQueryInformationProcess(
        h,
        PROCESS_COMMAND_LINE_INFORMATION,
        buf.as_mut_ptr() as *mut c_void,
        perlu,
        &mut ret,
    ) != 0
    {
        return None;
    }

    let us = &*(buf.as_ptr() as *const UnicodeString);
    if us.buffer.is_null() || us.length == 0 {
        return None;
    }
    let jml = (us.length / 2) as usize;
    if jml * 2 > perlu as usize {
        return None;
    }
    Some(String::from_utf16_lossy(std::slice::from_raw_parts(
        us.buffer, jml,
    )))
}

pub fn btid_dari_baris(baris: &str) -> Option<u64> {
    let kecil = baris.to_ascii_lowercase();
    let b = kecil.as_bytes();
    let kunci = b"browsertrackerid";
    if b.len() < kunci.len() {
        return None;
    }

    let mut dari = 0usize;
    while dari + kunci.len() <= b.len() {
        let Some(rel) = b[dari..].windows(kunci.len()).position(|w| w == kunci) else {
            return None;
        };
        let mut i = dari + rel + kunci.len();

        if b[i..].starts_with(b"%3d") {
            i += 3;
        } else {
            while i < b.len() && matches!(b[i], b':' | b'=' | b' ') {
                i += 1;
            }
        }

        let mulai = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        if i > mulai {
            if let Some(v) = std::str::from_utf8(&b[mulai..i])
                .ok()
                .and_then(|t| t.parse::<u64>().ok())
            {
                return Some(v);
            }
        }
        dari = dari + rel + kunci.len();
    }
    None
}

#[derive(serde::Serialize, Clone)]
pub struct KlienProses {
    pub pid: u32,
    pub exe: String,
    pub btid: u64,
}

static BACAAN: AtomicUsize = AtomicUsize::new(0);

fn cache() -> &'static Mutex<HashMap<u32, (String, u64, bool)>> {
    static C: OnceLock<Mutex<HashMap<u32, (String, u64, bool)>>> = OnceLock::new();
    C.get_or_init(|| Mutex::new(HashMap::new()))
}

static TERAKHIR: Mutex<Option<(std::time::Instant, Vec<KlienProses>)>> = Mutex::new(None);

pub fn klien_terperinci_segar(umur: std::time::Duration) -> Vec<KlienProses> {
    if let Some((t, v)) = TERAKHIR.lock().unwrap_or_else(|e| e.into_inner()).as_ref() {
        if t.elapsed() < umur {
            return v.clone();
        }
    }
    klien_terperinci()
}

pub fn klien_terperinci() -> Vec<KlienProses> {
    let hasil = klien_terperinci_baru();
    *TERAKHIR.lock().unwrap_or_else(|e| e.into_inner()) = Some((std::time::Instant::now(), hasil.clone()));
    hasil
}

fn klien_terperinci_baru() -> Vec<KlienProses> {
    let pids = pid_roblox_mentah();

    let mut c = match cache().lock() {
        Ok(c) => c,
        Err(e) => e.into_inner(),
    };

    c.retain(|pid, _| pids.contains(pid));

    for pid in &pids {
        if c.contains_key(pid) {
            continue;
        }
        BACAAN.fetch_add(1, Ordering::Relaxed);
        let exe = jalur_proses(*pid);
        let baris = baris_perintah(*pid);
        let btid = baris.as_deref().and_then(btid_dari_baris).unwrap_or(0);
        let tray = baris.as_deref().is_some_and(adalah_tray);
        if exe.is_empty() && btid == 0 {
            continue;
        }
        c.insert(*pid, (exe, btid, tray));
    }

    let ada_tray = pids.iter().any(|p| c.get(p).is_some_and(|x| x.2));
    let game = if ada_tray { crate::jendela::pid_berjendela_game() } else { Vec::new() };
    pids.into_iter()
        .filter_map(|pid| {
            let (exe, btid, tray) = c.get(&pid).cloned().unwrap_or_default();
            (!tray || game.contains(&pid)).then_some(KlienProses { pid, exe, btid })
        })
        .collect()
}

pub fn tray_diam() -> Vec<u32> {
    let _ = klien_terperinci();
    let pids = pid_roblox_mentah();
    let game = crate::jendela::pid_berjendela_game();
    let c = match cache().lock() {
        Ok(c) => c,
        Err(e) => e.into_inner(),
    };
    pids.into_iter()
        .filter(|p| c.get(p).is_some_and(|x| x.2) && !game.contains(p))
        .collect()
}

pub fn akhiri_tray_diam() -> usize {
    let mut n = 0;
    for pid in tray_diam() {
        let masih_tray = baris_perintah(pid).as_deref().is_some_and(adalah_tray)
            && !crate::jendela::pid_berjendela_game().contains(&pid);
        if !masih_tray {
            continue;
        }
        unsafe {
            let h = OpenProcess(PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if h.is_null() {
                continue;
            }
            let mut buf = vec![0u16; 1024];
            let mut len = buf.len() as u32;
            let exe_ok = QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut len) != 0
                && String::from_utf16_lossy(&buf[..len as usize])
                    .to_ascii_lowercase()
                    .ends_with("\\robloxplayerbeta.exe");
            if exe_ok && TerminateProcess(h, 0) != 0 {
                n += 1;
            }
            CloseHandle(h);
        }
    }
    if n > 0 {
        let mulai = std::time::Instant::now();
        while mulai.elapsed() < std::time::Duration::from_secs(3) && !tray_diam().is_empty() {
            std::thread::sleep(std::time::Duration::from_millis(150));
        }
        crate::ikon_hantu::bersihkan();
    }
    n
}

pub fn akhiri_klien(pid: u32) -> bool {
    let ok = unsafe {
        let mut h = OpenProcess(PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, 0, pid);
        let bisa_tunggu = !h.is_null();
        if h.is_null() {
            h = OpenProcess(PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        }
        if h.is_null() {
            return false;
        }
        let mut buf = vec![0u16; 1024];
        let mut len = buf.len() as u32;
        let exe_ok = QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut len) != 0
            && String::from_utf16_lossy(&buf[..len as usize])
                .to_ascii_lowercase()
                .ends_with("\\robloxplayerbeta.exe");
        let ok = exe_ok && TerminateProcess(h, 0) != 0;
        if ok && bisa_tunggu {
            WaitForSingleObject(h, 2000);
        }
        CloseHandle(h);
        ok
    };
    if ok {
        crate::ikon_hantu::bersihkan();
    }
    ok
}

pub fn adalah_tray(baris: &str) -> bool {
    baris.to_ascii_lowercase().contains("--launch-to-tray")
}
