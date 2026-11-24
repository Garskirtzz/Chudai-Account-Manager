use std::ffi::c_void;

const CF_UNICODETEXT: u32 = 13;
const GMEM_MOVEABLE: u32 = 0x0002;

#[link(name = "user32")]
extern "system" {
    fn OpenClipboard(hwnd: *mut c_void) -> i32;
    fn CloseClipboard() -> i32;
    fn EmptyClipboard() -> i32;
    fn SetClipboardData(format: u32, mem: *mut c_void) -> *mut c_void;
    fn RegisterClipboardFormatW(nama: *const u16) -> u32;
    fn GetClipboardSequenceNumber() -> u32;
}

#[link(name = "kernel32")]
extern "system" {
    fn GlobalAlloc(flags: u32, bytes: usize) -> *mut c_void;
    fn GlobalLock(mem: *mut c_void) -> *mut c_void;
    fn GlobalUnlock(mem: *mut c_void) -> i32;
    fn GlobalFree(mem: *mut c_void) -> *mut c_void;
}

pub fn salin(teks: &str) -> Result<(), String> {
    tulis(teks, false)
}

pub fn salin_rahasia(teks: &str, detik: u64) -> Result<(), String> {
    tulis(teks, true)?;
    let urutan = unsafe { GetClipboardSequenceNumber() };
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(detik));
        if unsafe { GetClipboardSequenceNumber() } == urutan {
            kosongkan();
        }
    });
    Ok(())
}

fn kosongkan() {
    unsafe {
        for _ in 0..20 {
            if OpenClipboard(std::ptr::null_mut()) != 0 {
                EmptyClipboard();
                CloseClipboard();
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
    }
}

unsafe fn penanda(nama: &str, nilai: u32) {
    let w: Vec<u16> = nama.encode_utf16().chain(Some(0)).collect();
    let f = RegisterClipboardFormatW(w.as_ptr());
    if f == 0 {
        return;
    }
    let mem = GlobalAlloc(GMEM_MOVEABLE, 4);
    if mem.is_null() {
        return;
    }
    let p = GlobalLock(mem) as *mut u32;
    if !p.is_null() {
        *p = nilai;
        GlobalUnlock(mem);
    }
    if SetClipboardData(f, mem).is_null() {
        GlobalFree(mem);
    }
}

fn tulis(teks: &str, rahasia: bool) -> Result<(), String> {
    let utf16: Vec<u16> = teks.replace("\r\n", "\n").replace('\n', "\r\n").encode_utf16().chain(Some(0)).collect();
    unsafe {
        let mut buka = false;
        for _ in 0..20 {
            if OpenClipboard(std::ptr::null_mut()) != 0 {
                buka = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        if !buka {
            return Err("The clipboard is in use by another app. Try again.".into());
        }
        let hasil = (|| {
            if EmptyClipboard() == 0 {
                return Err("Could not clear the clipboard.".to_string());
            }
            let mem = GlobalAlloc(GMEM_MOVEABLE, utf16.len() * 2);
            if mem.is_null() {
                return Err("Out of memory.".to_string());
            }
            let p = GlobalLock(mem) as *mut u16;
            if p.is_null() {
                GlobalFree(mem);
                return Err("Out of memory.".to_string());
            }
            std::ptr::copy_nonoverlapping(utf16.as_ptr(), p, utf16.len());
            GlobalUnlock(mem);
            if SetClipboardData(CF_UNICODETEXT, mem).is_null() {
                GlobalFree(mem);
                return Err("Could not write to the clipboard.".to_string());
            }
            if rahasia {
                penanda("ExcludeClipboardContentFromMonitorProcessing", 0);
                penanda("CanIncludeInClipboardHistory", 0);
                penanda("CanUploadToCloudClipboard", 0);
            }
            Ok(())
        })();
        CloseClipboard();
        hasil
    }
}
