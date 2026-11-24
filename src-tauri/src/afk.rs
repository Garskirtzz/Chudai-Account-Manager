use std::ffi::c_void;
use std::time::Duration;

type Hwnd = *mut c_void;

pub const DIAM_MS: u32 = 5_000;
pub const PUTARAN: Duration = Duration::from_secs(10);
pub const ULANG: Duration = Duration::from_secs(30);
const ANTARA: Duration = Duration::from_millis(100);
const F13: u16 = 0x64;
const DIPULIHKAN: Duration = Duration::from_millis(300);
pub const MENIT_BAWAAN: u32 = 15;

pub fn menit_sah(m: u32) -> u32 {
    if m == 0 { MENIT_BAWAAN } else { m.clamp(1, 19) }
}

pub type KlienAfk = (String, String, u32, i64);

#[derive(Debug, PartialEq)]
pub enum Rencana {
    Tunggu,
    Ulang,
    Tekan(Vec<String>),
}

pub fn rencana(klien: &[KlienAfk], kini: i64, menit: u32, diam_ms: u32, layar_penuh: bool) -> Rencana {
    let tiap = i64::from(menit_sah(menit)) * 60;
    let jatuh: Vec<String> = klien.iter().filter(|k| kini - k.3 >= tiap).map(|k| k.0.clone()).collect();
    if jatuh.is_empty() {
        Rencana::Tunggu
    } else if diam_ms < DIAM_MS || layar_penuh {
        Rencana::Ulang
    } else {
        Rencana::Tekan(jatuh)
    }
}

#[repr(C)]
struct LastInputInfo {
    cb_size: u32,
    dw_time: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct MouseInput {
    dx: i32,
    dy: i32,
    mouse_data: u32,
    flags: u32,
    time: u32,
    extra: usize,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct KeybdInput {
    vk: u16,
    scan: u16,
    flags: u32,
    time: u32,
    extra: usize,
}

#[repr(C)]
#[derive(Clone, Copy)]
union InputU {
    mi: MouseInput,
    ki: KeybdInput,
}

#[repr(C)]
struct Input {
    kind: u32,
    u: InputU,
}

const INPUT_MOUSE: u32 = 0;
const INPUT_KEYBOARD: u32 = 1;
const KEYEVENTF_KEYUP: u32 = 0x2;
const KEYEVENTF_SCANCODE: u32 = 0x8;
const MOUSEEVENTF_MOVE: u32 = 0x1;
const SW_MINIMIZE: i32 = 6;
const SW_RESTORE: i32 = 9;

#[link(name = "user32")]
extern "system" {
    fn GetLastInputInfo(plii: *mut LastInputInfo) -> i32;
    fn SendInput(n: u32, inputs: *const Input, size: i32) -> u32;
    fn GetForegroundWindow() -> Hwnd;
    fn SetForegroundWindow(hwnd: Hwnd) -> i32;
    fn BringWindowToTop(hwnd: Hwnd) -> i32;
    fn GetWindowThreadProcessId(hwnd: Hwnd, pid: *mut u32) -> u32;
    fn AttachThreadInput(attach: u32, to: u32, f: i32) -> i32;
    fn IsIconic(hwnd: Hwnd) -> i32;
    fn ShowWindow(hwnd: Hwnd, cmd: i32) -> i32;
}

#[link(name = "kernel32")]
extern "system" {
    fn GetTickCount() -> u32;
    fn GetCurrentThreadId() -> u32;
}

#[link(name = "shell32")]
extern "system" {
    fn SHQueryUserNotificationState(state: *mut i32) -> i32;
}

fn input_terakhir() -> Option<u32> {
    let mut li = LastInputInfo { cb_size: std::mem::size_of::<LastInputInfo>() as u32, dw_time: 0 };
    (unsafe { GetLastInputInfo(&mut li) } != 0).then_some(li.dw_time)
}

pub fn diam_ms() -> u32 {
    match input_terakhir() {
        Some(t) => unsafe { GetTickCount() }.wrapping_sub(t),
        None => 0,
    }
}

pub fn layar_penuh() -> bool {
    let mut s = 0i32;
    if unsafe { SHQueryUserNotificationState(&mut s) } != 0 {
        return false;
    }
    matches!(s, 2..=4)
}

fn kirim(i: &Input) -> bool {
    unsafe { SendInput(1, i, std::mem::size_of::<Input>() as i32) == 1 }
}

fn tombol(scan: u16, flags: u32) {
    let i = Input { kind: INPUT_KEYBOARD, u: InputU { ki: KeybdInput { vk: 0, scan, flags, time: 0, extra: 0 } } };
    kirim(&i);
}

pub(crate) fn ke_depan(hwnd: Hwnd) -> bool {
    let depan = || unsafe { GetForegroundWindow() } == hwnd;
    unsafe {
        if SetForegroundWindow(hwnd) != 0 && depan() {
            return true;
        }
        let utas_depan = GetWindowThreadProcessId(GetForegroundWindow(), std::ptr::null_mut());
        let aku = GetCurrentThreadId();
        if utas_depan != 0 && utas_depan != aku && AttachThreadInput(aku, utas_depan, 1) != 0 {
            BringWindowToTop(hwnd);
            SetForegroundWindow(hwnd);
            AttachThreadInput(aku, utas_depan, 0);
        }
        if depan() {
            return true;
        }
        let dorong = Input { kind: INPUT_MOUSE, u: InputU { mi: MouseInput { dx: 0, dy: 0, mouse_data: 0, flags: MOUSEEVENTF_MOVE, time: 0, extra: 0 } } };
        kirim(&dorong);
        SetForegroundWindow(hwnd);
    }
    depan()
}

#[derive(Debug, PartialEq)]
pub enum Hasil {
    Ya,
    Tidak,
    Terputus,
}

pub fn tekan(hwnd_usize: usize) -> Hasil {
    let hwnd = hwnd_usize as Hwnd;
    let kecil = unsafe { IsIconic(hwnd) } != 0;
    if kecil {
        unsafe { ShowWindow(hwnd, SW_RESTORE) };
        std::thread::sleep(DIPULIHKAN);
    }
    let sebelum = unsafe { GetForegroundWindow() };
    let mut hasil = Hasil::Tidak;
    if ke_depan(hwnd) {
        if unsafe { GetForegroundWindow() } == hwnd {
            tombol(F13, KEYEVENTF_SCANCODE);
            let setelah_turun = input_terakhir();
            std::thread::sleep(Duration::from_millis(40));
            let pemakai = input_terakhir() != setelah_turun;
            tombol(F13, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP);
            std::thread::sleep(Duration::from_millis(40));
            hasil = if pemakai { Hasil::Terputus } else { Hasil::Ya };
        }
    }
    if !sebelum.is_null() && sebelum != hwnd && !ke_depan(sebelum) {
        hasil = Hasil::Terputus;
    }
    if kecil {
        unsafe { ShowWindow(hwnd, SW_MINIMIZE) };
    }
    hasil
}

pub fn jejak_input() -> Option<u32> {
    input_terakhir()
}

pub fn antara() {
    std::thread::sleep(ANTARA);
}
