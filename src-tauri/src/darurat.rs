use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use std::time::Duration;

#[allow(clashing_extern_declarations)]
#[link(name = "user32")]
extern "system" {
    fn RegisterHotKey(hwnd: *mut std::ffi::c_void, id: i32, mods: u32, vk: u32) -> i32;
    fn UnregisterHotKey(hwnd: *mut std::ffi::c_void, id: i32) -> i32;
    fn GetMessageW(msg: *mut Pesan, hwnd: *mut std::ffi::c_void, min: u32, max: u32) -> i32;
    fn PostThreadMessageW(tid: u32, msg: u32, w: usize, l: isize) -> i32;
    fn PeekMessageW(msg: *mut Pesan, hwnd: *mut std::ffi::c_void, min: u32, max: u32, hapus: u32) -> i32;
}
#[link(name = "kernel32")]
extern "system" {
    fn GetCurrentThreadId() -> u32;
}

#[repr(C)]
struct Pesan {
    hwnd: *mut std::ffi::c_void,
    message: u32,
    wparam: usize,
    lparam: isize,
    time: u32,
    pt: [i32; 2],
    _pribadi: u32,
}

const WM_HOTKEY: u32 = 0x0312;
const WM_ATUR: u32 = 0x8000 + 41;
const MOD_ALT: u32 = 0x0001;
const MOD_CONTROL: u32 = 0x0002;
const MOD_NOREPEAT: u32 = 0x4000;
const VK_END: u32 = 0x23;
const ID: i32 = 0xCA4;

static UTAS: AtomicU32 = AtomicU32::new(0);
static JAWAB: Mutex<Option<Sender<Result<(), String>>>> = Mutex::new(None);

pub fn mulai(aksi: impl Fn() + Send + 'static) {
    let (siap_tx, siap_rx) = channel();
    let _ = std::thread::Builder::new().name("cam-darurat".into()).spawn(move || unsafe {
        let mut m: Pesan = std::mem::zeroed();
        PeekMessageW(&mut m, std::ptr::null_mut(), 0, 0, 0);
        UTAS.store(GetCurrentThreadId(), Ordering::SeqCst);
        let _ = siap_tx.send(());
        let mut terdaftar = false;
        while GetMessageW(&mut m, std::ptr::null_mut(), 0, 0) > 0 {
            match m.message {
                WM_HOTKEY if m.wparam as i32 == ID => aksi(),
                WM_ATUR => {
                    let hasil = if m.wparam != 0 {
                        if terdaftar || RegisterHotKey(std::ptr::null_mut(), ID, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_END) != 0 {
                            terdaftar = true;
                            Ok(())
                        } else {
                            Err("Ctrl+Alt+End is already used by another program, so the emergency hotkey couldn't be turned on.".to_string())
                        }
                    } else {
                        if terdaftar {
                            UnregisterHotKey(std::ptr::null_mut(), ID);
                        }
                        terdaftar = false;
                        Ok(())
                    };
                    if let Some(tx) = JAWAB.lock().unwrap_or_else(|e| e.into_inner()).take() {
                        let _ = tx.send(hasil);
                    }
                }
                _ => {}
            }
        }
    });
    let _ = siap_rx.recv_timeout(Duration::from_secs(2));
}

pub fn atur(aktif: bool) -> Result<(), String> {
    let tid = UTAS.load(Ordering::SeqCst);
    if tid == 0 {
        return Err("The emergency hotkey isn't available.".into());
    }
    let (tx, rx) = channel();
    *JAWAB.lock().unwrap_or_else(|e| e.into_inner()) = Some(tx);
    if unsafe { PostThreadMessageW(tid, WM_ATUR, usize::from(aktif), 0) } == 0 {
        return Err("The emergency hotkey isn't available.".into());
    }
    rx.recv_timeout(Duration::from_secs(2)).unwrap_or_else(|_| Err("The emergency hotkey didn't answer.".into()))
}
