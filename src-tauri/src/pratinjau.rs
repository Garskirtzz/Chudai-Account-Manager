use std::ffi::c_void;
use std::sync::Mutex;

type Hwnd = *mut c_void;

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Rect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Ukuran {
    cx: i32,
    cy: i32,
}

#[repr(C)]
struct Sifat {
    flags: u32,
    tujuan: Rect,
    sumber: Rect,
    opacity: u8,
    terlihat: i32,
    hanya_klien: i32,
}

#[link(name = "dwmapi")]
extern "system" {
    fn DwmRegisterThumbnail(tujuan: Hwnd, sumber: Hwnd, out: *mut isize) -> i32;
    fn DwmUnregisterThumbnail(t: isize) -> i32;
    fn DwmUpdateThumbnailProperties(t: isize, p: *const Sifat) -> i32;
    fn DwmQueryThumbnailSourceSize(t: isize, out: *mut Ukuran) -> i32;
}

const TNP_RECTDESTINATION: u32 = 0x1;
const TNP_OPACITY: u32 = 0x4;
const TNP_VISIBLE: u32 = 0x8;
const TNP_SOURCECLIENTAREAONLY: u32 = 0x10;

static AKTIF: Mutex<Option<(isize, usize)>> = Mutex::new(None);

pub fn pas(sw: i32, sh: i32, x: i32, y: i32, w: i32, h: i32) -> (i32, i32, i32, i32) {
    if sw <= 0 || sh <= 0 || w <= 0 || h <= 0 {
        return (x, y, w.max(0), h.max(0));
    }
    let skala = (w as f64 / sw as f64).min(h as f64 / sh as f64);
    let (pw, ph) = ((sw as f64 * skala).round() as i32, (sh as f64 * skala).round() as i32);
    (x + (w - pw) / 2, y + (h - ph) / 2, pw, ph)
}

pub fn tampilkan(tujuan: usize, sumber: usize, x: i32, y: i32, w: i32, h: i32) -> Result<(), String> {
    let mut g = AKTIF.lock().unwrap_or_else(|e| e.into_inner());
    let t = match *g {
        Some((t, s)) if s == sumber => t,
        lama => {
            if let Some((t, _)) = lama {
                unsafe { DwmUnregisterThumbnail(t) };
            }
            let mut t = 0isize;
            let hr = unsafe { DwmRegisterThumbnail(tujuan as Hwnd, sumber as Hwnd, &mut t) };
            if hr < 0 || t == 0 {
                *g = None;
                return Err(format!("Windows couldn't show that client's preview (0x{:08X}).", hr as u32));
            }
            *g = Some((t, sumber));
            t
        }
    };
    let mut u = Ukuran::default();
    unsafe { DwmQueryThumbnailSourceSize(t, &mut u) };
    let (px, py, pw, ph) = pas(u.cx, u.cy, x, y, w, h);
    let s = Sifat {
        flags: TNP_RECTDESTINATION | TNP_OPACITY | TNP_VISIBLE | TNP_SOURCECLIENTAREAONLY,
        tujuan: Rect { left: px, top: py, right: px + pw, bottom: py + ph },
        sumber: Rect::default(),
        opacity: 255,
        terlihat: 1,
        hanya_klien: 1,
    };
    let hr = unsafe { DwmUpdateThumbnailProperties(t, &s) };
    if hr < 0 {
        return Err(format!("Windows couldn't place that preview (0x{:08X}).", hr as u32));
    }
    Ok(())
}

pub fn tutup() {
    if let Some((t, _)) = AKTIF.lock().unwrap_or_else(|e| e.into_inner()).take() {
        unsafe { DwmUnregisterThumbnail(t) };
    }
}

#[cfg(test)]
mod tes {
    #[test]
    fn pas_rasio_tetap() {
        assert_eq!(super::pas(1920, 1080, 10, 20, 320, 240), (10, 50, 320, 180));
        assert_eq!(super::pas(800, 600, 0, 0, 400, 150), (100, 0, 200, 150));
        assert_eq!(super::pas(0, 0, 5, 5, 100, 100), (5, 5, 100, 100));
    }
}
