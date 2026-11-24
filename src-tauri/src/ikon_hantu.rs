use std::ffi::c_void;
use std::ptr::null_mut;
use std::sync::atomic::{AtomicBool, Ordering};

static SIBUK: AtomicBool = AtomicBool::new(false);
static ULANG: AtomicBool = AtomicBool::new(false);

const WM_MOUSEMOVE: u32 = 0x0200;
const WM_MOUSELEAVE: u32 = 0x02A3;
const SMTO_ABORTIFHUNG: u32 = 0x0002;
const LANGKAH: i32 = 6;
const TITIK_MAKS: usize = 20_000;
const BATAS_PESAN_MS: u32 = 200;

#[repr(C)]
#[derive(Default)]
struct Kotak {
    kiri: i32,
    atas: i32,
    kanan: i32,
    bawah: i32,
}

#[link(name = "user32")]
extern "system" {
    fn FindWindowW(kelas: *const u16, judul: *const u16) -> *mut c_void;
    fn FindWindowExW(induk: *mut c_void, setelah: *mut c_void, kelas: *const u16, judul: *const u16) -> *mut c_void;
    fn GetClientRect(h: *mut c_void, r: *mut Kotak) -> i32;
    fn SendMessageTimeoutW(h: *mut c_void, msg: u32, w: usize, l: isize, flags: u32, ms: u32, hasil: *mut usize) -> isize;
}

fn lebar(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn titik_sapuan(w: i32, h: i32, langkah: i32, maks: usize) -> Vec<(i32, i32)> {
    let mut v = Vec::new();
    if w <= 0 || h <= 0 || langkah <= 0 {
        return v;
    }
    let mut y = langkah / 2;
    while y < h {
        let mut x = langkah / 2;
        while x < w {
            if v.len() >= maks {
                return v;
            }
            v.push((x, y));
            x += langkah;
        }
        y += langkah;
    }
    v
}

fn lparam(x: i32, y: i32) -> isize {
    (((y as u32 & 0xFFFF) << 16) | (x as u32 & 0xFFFF)) as i32 as isize
}

unsafe fn toolbar_di(induk: *mut c_void, v: &mut Vec<*mut c_void>) {
    if induk.is_null() {
        return;
    }
    let kelas = lebar("ToolbarWindow32");
    let mut setelah = null_mut();
    loop {
        let t = FindWindowExW(induk, setelah, kelas.as_ptr(), std::ptr::null());
        if t.is_null() || v.len() >= 8 {
            break;
        }
        v.push(t);
        setelah = t;
    }
}

fn toolbar_tray() -> Vec<*mut c_void> {
    let mut v = Vec::new();
    unsafe {
        let taskbar = FindWindowW(lebar("Shell_TrayWnd").as_ptr(), std::ptr::null());
        if !taskbar.is_null() {
            let notif = FindWindowExW(taskbar, null_mut(), lebar("TrayNotifyWnd").as_ptr(), std::ptr::null());
            if !notif.is_null() {
                toolbar_di(FindWindowExW(notif, null_mut(), lebar("SysPager").as_ptr(), std::ptr::null()), &mut v);
            }
        }
        toolbar_di(FindWindowW(lebar("NotifyIconOverflowWindow").as_ptr(), std::ptr::null()), &mut v);
    }
    v
}

pub fn bersihkan() -> usize {
    gabung(&SIBUK, &ULANG, &sapu_semua)
}

struct Lepas<'a>(&'a AtomicBool);

impl Drop for Lepas<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

fn gabung(sibuk: &AtomicBool, ulang: &AtomicBool, sapu: &dyn Fn() -> usize) -> usize {
    let mut n = 0;
    loop {
        if sibuk.swap(true, Ordering::AcqRel) {
            ulang.store(true, Ordering::Release);
            return n;
        }
        {
            let _lepas = Lepas(sibuk);
            loop {
                ulang.store(false, Ordering::Release);
                n += sapu();
                if !ulang.load(Ordering::Acquire) {
                    break;
                }
            }
        }
        if !ulang.swap(false, Ordering::AcqRel) {
            return n;
        }
    }
}

fn sapu_semua() -> usize {
    let mut n = 0;
    for tb in toolbar_tray() {
        let mut k = Kotak::default();
        if unsafe { GetClientRect(tb, &mut k) } == 0 {
            continue;
        }
        for (x, y) in titik_sapuan(k.kanan - k.kiri, k.bawah - k.atas, LANGKAH, TITIK_MAKS) {
            let mut hasil = 0usize;
            let ok = unsafe { SendMessageTimeoutW(tb, WM_MOUSEMOVE, 0, lparam(x, y), SMTO_ABORTIFHUNG, BATAS_PESAN_MS, &mut hasil) };
            if ok == 0 {
                break;
            }
            n += 1;
        }
        let mut hasil = 0usize;
        unsafe { SendMessageTimeoutW(tb, WM_MOUSELEAVE, 0, 0, SMTO_ABORTIFHUNG, BATAS_PESAN_MS, &mut hasil) };
    }
    n
}
