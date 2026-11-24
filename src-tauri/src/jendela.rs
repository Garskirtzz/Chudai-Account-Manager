use std::ffi::c_void;

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Rect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

type Hwnd = *mut c_void;
type EnumProc = unsafe extern "system" fn(Hwnd, isize) -> i32;

#[link(name = "user32")]
extern "system" {
    fn EnumWindows(cb: EnumProc, lparam: isize) -> i32;
    fn IsWindowVisible(hwnd: Hwnd) -> i32;
    fn GetWindowThreadProcessId(hwnd: Hwnd, pid: *mut u32) -> u32;
    fn GetWindowTextW(hwnd: Hwnd, buf: *mut u16, max: i32) -> i32;
    fn GetWindowRect(hwnd: Hwnd, r: *mut Rect) -> i32;
    fn SetWindowPos(
        hwnd: Hwnd,
        after: Hwnd,
        x: i32,
        y: i32,
        cx: i32,
        cy: i32,
        flags: u32,
    ) -> i32;
    fn ShowWindow(hwnd: Hwnd, cmd: i32) -> i32;
    fn SystemParametersInfoW(action: u32, uparam: u32, pvparam: *mut c_void, fwin: u32) -> i32;
    fn SetForegroundWindow(hwnd: Hwnd) -> i32;
    fn PostMessageW(hwnd: Hwnd, msg: u32, wparam: usize, lparam: isize) -> i32;
    fn GetClassNameW(hwnd: Hwnd, buf: *mut u16, max: i32) -> i32;
    fn IsHungAppWindow(hwnd: Hwnd) -> i32;
    fn GetForegroundWindow() -> Hwnd;
}

const SPI_GETWORKAREA: u32 = 0x0030;
const SW_RESTORE: i32 = 9;
const SW_MINIMIZE: i32 = 6;
const WM_CLOSE: u32 = 0x0010;
const WM_SYSCOMMAND: u32 = 0x0112;
const SC_CLOSE: usize = 0xF060;
const SWP_NOZORDER: u32 = 0x0004;
const SWP_NOACTIVATE: u32 = 0x0010;

#[derive(serde::Serialize, Clone)]
pub struct JendelaInfo {
    pub hwnd: usize,
    pub pid: u32,
    pub judul: String,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

struct Kumpul {
    pid_diterima: Vec<u32>,
    hasil: Vec<JendelaInfo>,
}

unsafe extern "system" fn kumpulkan(hwnd: Hwnd, lparam: isize) -> i32 {
    let k = &mut *(lparam as *mut Kumpul);

    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut pid);
    if !k.pid_diterima.contains(&pid) {
        return 1;
    }

    let mut buf = [0u16; 256];
    let n = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    let judul = String::from_utf16_lossy(&buf[..n.max(0) as usize]);
    if judul.trim().is_empty() {
        return 1;
    }

    let mut r = Rect::default();
    GetWindowRect(hwnd, &mut r);

    k.hasil.push(JendelaInfo {
        hwnd: hwnd as usize,
        pid,
        judul,
        x: r.left,
        y: r.top,
        w: r.right - r.left,
        h: r.bottom - r.top,
    });
    1
}

pub fn daftar() -> Vec<JendelaInfo> {
    let pid_diterima: Vec<u32> = crate::launcher::pid_klien();
    if pid_diterima.is_empty() {
        return Vec::new();
    }
    let mut k = Kumpul {
        pid_diterima,
        hasil: Vec::new(),
    };
    unsafe {
        EnumWindows(kumpulkan, &mut k as *mut Kumpul as isize);
    }
    k.hasil
}

fn area_kerja() -> Rect {
    let mut r = Rect {
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080,
    };
    unsafe {
        SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut r as *mut Rect as *mut c_void, 0);
    }
    r
}

pub fn area_kerja_xywh() -> (i32, i32, i32, i32) {
    let a = area_kerja();
    (a.left, a.top, a.right - a.left, a.bottom - a.top)
}

pub fn pindah(hwnd: usize, x: i32, y: i32, w: i32, h: i32) -> Result<(), String> {
    if hwnd == 0 {
        return Err("Invalid window.".into());
    }
    unsafe {
        let h_ = hwnd as Hwnd;
        ShowWindow(h_, SW_RESTORE);
        if SetWindowPos(h_, std::ptr::null_mut(), x, y, w, h, SWP_NOZORDER | SWP_NOACTIVATE) == 0 {
            return Err("Windows refused to move that window.".into());
        }
    }
    Ok(())
}

unsafe extern "system" fn kumpulkan_game(hwnd: Hwnd, lparam: isize) -> i32 {
    let hasil = &mut *(lparam as *mut Vec<u32>);
    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }
    let mut buf = [0u16; 64];
    let n = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    if String::from_utf16_lossy(&buf[..n.max(0) as usize]) == "WINDOWSCLIENT" {
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, &mut pid);
        hasil.push(pid);
    }
    1
}

pub fn pid_berjendela_game() -> Vec<u32> {
    let mut hasil: Vec<u32> = Vec::new();
    unsafe {
        EnumWindows(kumpulkan_game, &mut hasil as *mut Vec<u32> as isize);
    }
    hasil
}

pub fn pid_depan() -> u32 {
    let mut pid: u32 = 0;
    unsafe {
        let h = GetForegroundWindow();
        if !h.is_null() {
            GetWindowThreadProcessId(h, &mut pid);
        }
    }
    pid
}

pub fn pid_macet() -> Vec<u32> {
    let pid_diterima = crate::launcher::pid_klien();
    if pid_diterima.is_empty() {
        return Vec::new();
    }
    let mut k = Kumpul { pid_diterima, hasil: Vec::new() };
    unsafe {
        EnumWindows(kumpulkan_macet, &mut k as *mut Kumpul as isize);
    }
    let mut pid: Vec<u32> = k.hasil.into_iter().map(|j| j.pid).collect();
    pid.dedup();
    pid
}

unsafe extern "system" fn kumpulkan_macet(hwnd: Hwnd, lparam: isize) -> i32 {
    let k = &mut *(lparam as *mut Kumpul);
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut pid);
    if !k.pid_diterima.contains(&pid) || k.hasil.iter().any(|j| j.pid == pid) {
        return 1;
    }
    let mut buf = [0u16; 256];
    if GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32) <= 0 {
        return 1;
    }
    if IsHungAppWindow(hwnd) != 0 {
        k.hasil.push(JendelaInfo { hwnd: hwnd as usize, pid, judul: String::new(), x: 0, y: 0, w: 0, h: 0 });
    }
    1
}

pub fn kecilkan(hwnd: usize) -> Result<(), String> {
    if hwnd == 0 {
        return Err("Invalid window.".into());
    }
    unsafe {
        ShowWindow(hwnd as Hwnd, SW_MINIMIZE);
    }
    Ok(())
}

pub fn tutup_game_milik(pid: u32) -> usize {
    struct Cari {
        pid: u32,
        n: usize,
    }
    unsafe extern "system" fn tiap(hwnd: Hwnd, lparam: isize) -> i32 {
        let c = &mut *(lparam as *mut Cari);
        if IsWindowVisible(hwnd) == 0 {
            return 1;
        }
        let mut pemilik: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pemilik);
        if pemilik != c.pid {
            return 1;
        }
        let mut buf = [0u16; 64];
        let n = GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        if String::from_utf16_lossy(&buf[..n.max(0) as usize]) == "WINDOWSCLIENT" && PostMessageW(hwnd, WM_SYSCOMMAND, SC_CLOSE, 0) != 0 {
            c.n += 1;
        }
        1
    }
    let mut c = Cari { pid, n: 0 };
    unsafe {
        EnumWindows(tiap, &mut c as *mut Cari as isize);
    }
    c.n
}

pub fn tutup_semua_milik(pid: u32) -> usize {
    struct Cari {
        pid: u32,
        n: usize,
    }
    unsafe extern "system" fn tiap(hwnd: Hwnd, lparam: isize) -> i32 {
        let c = &mut *(lparam as *mut Cari);
        let mut pemilik: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pemilik);
        if pemilik == c.pid && PostMessageW(hwnd, WM_CLOSE, 0, 0) != 0 {
            c.n += 1;
        }
        1
    }
    let mut c = Cari { pid, n: 0 };
    unsafe {
        EnumWindows(tiap, &mut c as *mut Cari as isize);
    }
    c.n
}

pub fn tutup(hwnd: usize) -> Result<(), String> {
    if hwnd == 0 {
        return Err("Invalid window.".into());
    }
    unsafe {
        if PostMessageW(hwnd as Hwnd, WM_CLOSE, 0, 0) == 0 {
            return Err("Windows refused to close that window.".into());
        }
    }
    Ok(())
}

pub fn fokus(hwnd: usize) -> Result<(), String> {
    if hwnd == 0 {
        return Err("Invalid window.".into());
    }
    unsafe {
        let h_ = hwnd as Hwnd;
        ShowWindow(h_, SW_RESTORE);
        SetForegroundWindow(h_);
    }
    Ok(())
}

pub fn susun_kisi(kolom: u32) -> Result<usize, String> {
    let w = daftar();
    if w.is_empty() {
        return Err("No Roblox windows are open.".into());
    }
    let n = w.len() as u32;
    let kol = if kolom == 0 {
        (n as f64).sqrt().ceil() as u32
    } else {
        kolom
    }
    .max(1);
    let baris = n.div_ceil(kol);

    let a = area_kerja();
    let lebar = (a.right - a.left) / kol as i32;
    let tinggi = (a.bottom - a.top) / baris as i32;

    let mut ok = 0;
    for (i, j) in w.iter().enumerate() {
        let c = i as u32 % kol;
        let r = i as u32 / kol;
        if pindah(
            j.hwnd,
            a.left + c as i32 * lebar,
            a.top + r as i32 * tinggi,
            lebar,
            tinggi,
        )
        .is_ok()
        {
            ok += 1;
        }
    }
    Ok(ok)
}

pub fn susun_bertumpuk() -> Result<usize, String> {
    let w = daftar();
    if w.is_empty() {
        return Err("No Roblox windows are open.".into());
    }
    let a = area_kerja();
    let lebar = ((a.right - a.left) as f64 * 0.75) as i32;
    let tinggi = ((a.bottom - a.top) as f64 * 0.75) as i32;
    let geser = 32;

    let ruang = ((a.right - a.left - lebar).min(a.bottom - a.top - tinggi)).max(geser);

    let mut ok = 0;
    for (i, j) in w.iter().enumerate() {
        let d = (i as i32 * geser) % ruang;
        if pindah(j.hwnd, a.left + d, a.top + d, lebar, tinggi).is_ok() {
            ok += 1;
        }
    }
    Ok(ok)
}
