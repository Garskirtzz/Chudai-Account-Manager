use std::collections::HashMap;
use std::ffi::c_void;
use std::sync::Mutex;

type Hwnd = *mut c_void;

#[repr(C)]
#[derive(Clone, Copy, Default, Debug, PartialEq)]
pub struct Rect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Point {
    x: i32,
    y: i32,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Penempatan {
    length: u32,
    flags: u32,
    show_cmd: u32,
    min: Point,
    max: Point,
    normal: Rect,
}

#[link(name = "user32")]
extern "system" {
    fn GetWindowLongPtrW(hwnd: Hwnd, idx: i32) -> isize;
    fn SetWindowLongPtrW(hwnd: Hwnd, idx: i32, v: isize) -> isize;
    fn SetWindowPos(hwnd: Hwnd, after: Hwnd, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> i32;
    fn GetWindowRect(hwnd: Hwnd, r: *mut Rect) -> i32;
    fn GetClientRect(hwnd: Hwnd, r: *mut Rect) -> i32;
    fn IsIconic(hwnd: Hwnd) -> i32;
    fn IsZoomed(hwnd: Hwnd) -> i32;
    fn IsWindow(hwnd: Hwnd) -> i32;
    fn IsHungAppWindow(hwnd: Hwnd) -> i32;
    fn ShowWindow(hwnd: Hwnd, cmd: i32) -> i32;
    fn GetForegroundWindow() -> Hwnd;
    fn GetWindowPlacement(hwnd: Hwnd, p: *mut Penempatan) -> i32;
    fn SetWindowPlacement(hwnd: Hwnd, p: *const Penempatan) -> i32;
    fn GetClassNameW(hwnd: Hwnd, buf: *mut u16, max: i32) -> i32;
}

const GWL_STYLE: i32 = -16;
const WS_CAPTION: u32 = 0x00C0_0000;
const WS_THICKFRAME: u32 = 0x0004_0000;
const WS_SYSMENU: u32 = 0x0008_0000;
const WS_MINIMIZEBOX: u32 = 0x0002_0000;
const WS_MAXIMIZEBOX: u32 = 0x0001_0000;
const WS_POPUP: u32 = 0x8000_0000;
pub const SWP_NOSIZE: u32 = 0x0001;
pub const SWP_NOMOVE: u32 = 0x0002;
pub const SWP_NOZORDER: u32 = 0x0004;
pub const SWP_NOACTIVATE: u32 = 0x0010;
const SWP_FRAMECHANGED: u32 = 0x0020;
const SW_SHOWNOACTIVATE: i32 = 4;
const SW_SHOWMAXIMIZED: u32 = 3;

pub fn gaya_bebas(gaya: u32) -> u32 {
    (gaya & !(WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX)) | WS_POPUP
}

pub fn gaya_berbingkai(gaya: u32) -> u32 {
    (gaya & !WS_POPUP) | WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX
}

pub fn masih_gaya_cam(kini: u32, asli: u32) -> bool {
    const BERUBAH_SENDIRI: u32 = 0x2000_0000 | 0x0100_0000 | 0x1000_0000;
    kini & !BERUBAH_SENDIRI == gaya_berbingkai(asli) & !BERUBAH_SENDIRI
}

fn jendela_game(hwnd: usize) -> bool {
    let mut b = [0u16; 64];
    let n = unsafe { GetClassNameW(h(hwnd), b.as_mut_ptr(), b.len() as i32) };
    String::from_utf16_lossy(&b[..n.max(0) as usize]) == "WINDOWSCLIENT"
}

pub fn pasang_bingkai(hwnd: usize) -> bool {
    let g = gaya(hwnd);
    if g & WS_CAPTION == WS_CAPTION || !jendela_game(hwnd) {
        return false;
    }
    pasang_gaya(hwnd, gaya_berbingkai(g));
    unsafe {
        SetWindowPos(h(hwnd), std::ptr::null_mut(), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
    }
    true
}

pub fn gaya_seret(gaya: u32) -> u32 {
    (gaya & !WS_THICKFRAME) | WS_POPUP
}

fn h(hwnd: usize) -> Hwnd {
    hwnd as Hwnd
}

pub fn ada(hwnd: usize) -> bool {
    unsafe { IsWindow(h(hwnd)) != 0 }
}

pub fn gaya(hwnd: usize) -> u32 {
    unsafe { GetWindowLongPtrW(h(hwnd), GWL_STYLE) as u32 }
}

fn pasang_gaya(hwnd: usize, g: u32) {
    unsafe { SetWindowLongPtrW(h(hwnd), GWL_STYLE, g as i32 as isize) };
}

pub fn kotak(hwnd: usize) -> Option<Rect> {
    let mut r = Rect::default();
    (unsafe { GetWindowRect(h(hwnd), &mut r) } != 0).then_some(r)
}

pub fn ukuran_klien(hwnd: usize) -> Option<(u32, u32)> {
    let mut r = Rect::default();
    (unsafe { GetClientRect(h(hwnd), &mut r) } != 0).then(|| ((r.right - r.left).max(0) as u32, (r.bottom - r.top).max(0) as u32))
}

pub fn bingkai(hwnd: usize) -> Option<(i32, i32)> {
    let w = kotak(hwnd)?;
    let c = ukuran_klien(hwnd)?;
    Some((w.right - w.left - c.0 as i32, w.bottom - w.top - c.1 as i32))
}

pub fn minimize(hwnd: usize) -> bool {
    unsafe { IsIconic(h(hwnd)) != 0 }
}

pub fn maksimal(hwnd: usize) -> bool {
    unsafe { IsZoomed(h(hwnd)) != 0 }
}

pub fn macet(hwnd: usize) -> bool {
    unsafe { IsHungAppWindow(h(hwnd)) != 0 }
}

pub fn normalkan(hwnd: usize) {
    if minimize(hwnd) || maksimal(hwnd) {
        unsafe { ShowWindow(h(hwnd), SW_SHOWNOACTIVATE) };
    }
}

pub fn ubah_bebas(hwnd: usize, x: i32, y: i32, w: i32, t: i32, tetap_tempat: bool) {
    static SEDANG: Mutex<Vec<usize>> = Mutex::new(Vec::new());
    for _ in 0..100 {
        let mut s = SEDANG.lock().unwrap_or_else(|e| e.into_inner());
        if !s.contains(&hwnd) {
            s.push(hwnd);
            break;
        }
        drop(s);
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    let asli = gaya(hwnd);
    pasang_gaya(hwnd, gaya_bebas(asli));
    let tempat = if tetap_tempat { SWP_NOMOVE } else { 0 };
    unsafe {
        SetWindowPos(h(hwnd), std::ptr::null_mut(), x, y, w, t, SWP_NOZORDER | SWP_NOACTIVATE | tempat);
    }
    pasang_gaya(hwnd, asli);
    unsafe {
        SetWindowPos(h(hwnd), std::ptr::null_mut(), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
    }
    SEDANG.lock().unwrap_or_else(|e| e.into_inner()).retain(|x| *x != hwnd);
}

struct Kecil {
    ukuran: (u32, u32),
    asli: Option<Penempatan>,
    gaya_asli: Option<u32>,
    diatur: std::time::Instant,
}

static KECIL: Mutex<Option<HashMap<usize, Kecil>>> = Mutex::new(None);

fn daftar_kecil<R>(f: impl FnOnce(&mut HashMap<usize, Kecil>) -> R) -> R {
    let mut g = KECIL.lock().unwrap_or_else(|e| e.into_inner());
    f(g.get_or_insert_with(HashMap::new))
}

pub fn ukuran_kecil(hwnd: usize) -> Option<(u32, u32)> {
    daftar_kecil(|d| d.get(&hwnd).map(|k| k.ukuran))
}

pub fn kecilkan(hwnd: usize, w: u32, t: u32) -> Result<(u32, u32), String> {
    if !ada(hwnd) {
        return Err("That client's window has closed.".into());
    }
    if macet(hwnd) {
        return Err("That client isn't responding.".into());
    }
    let asli = daftar_kecil(|d| d.get(&hwnd).and_then(|k| k.asli)).or_else(|| {
        let mut p = Penempatan { length: std::mem::size_of::<Penempatan>() as u32, ..Default::default() };
        (unsafe { GetWindowPlacement(h(hwnd), &mut p) } != 0).then_some(p)
    });
    let gaya_asli = daftar_kecil(|d| d.get(&hwnd).map(|k| k.gaya_asli)).unwrap_or_else(|| {
        let g = gaya(hwnd);
        (g & WS_CAPTION != WS_CAPTION).then_some(g)
    });
    normalkan(hwnd);
    pasang_bingkai(hwnd);
    let (fw, fh) = bingkai(hwnd).unwrap_or((0, 0));
    ubah_bebas(hwnd, 0, 0, w as i32 + fw, t as i32 + fh, true);
    daftar_kecil(|d| d.insert(hwnd, Kecil { ukuran: (w, t), asli, gaya_asli, diatur: std::time::Instant::now() }));
    ukuran_klien(hwnd).ok_or_else(|| "That client's window has closed.".into())
}

pub fn ukuran_normal(hwnd: usize) -> Result<(u32, u32), String> {
    if !ada(hwnd) {
        return Err("That client's window has closed.".into());
    }
    let seret = {
        let mut s = SERET.lock().unwrap_or_else(|e| e.into_inner());
        if s.as_ref().is_some_and(|x| x.0 == hwnd) { s.take() } else { None }
    };
    if let Some((_, _, Some(g))) = seret {
        pasang_gaya(hwnd, g);
    }
    let (asli, gaya_asli) = daftar_kecil(|d| d.remove(&hwnd)).map(|k| (k.asli, k.gaya_asli)).unwrap_or((None, None));
    if let Some(g) = gaya_asli.filter(|g| masih_gaya_cam(gaya(hwnd), *g)) {
        pasang_gaya(hwnd, g);
        unsafe {
            SetWindowPos(h(hwnd), std::ptr::null_mut(), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
        }
    }
    match asli {
        Some(mut p) => {
            if p.show_cmd != SW_SHOWMAXIMIZED {
                p.show_cmd = SW_SHOWNOACTIVATE as u32;
            }
            unsafe { SetWindowPlacement(h(hwnd), &p) };
        }
        None => {
            normalkan(hwnd);
            unsafe { SetWindowPos(h(hwnd), std::ptr::null_mut(), 0, 0, 1280, 720, SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE) };
        }
    }
    ukuran_klien(hwnd).ok_or_else(|| "That client's window has closed.".into())
}

pub fn jaga() {
    let calon: Vec<(usize, (u32, u32))> = daftar_kecil(|d| {
        d.retain(|hw, _| ada(*hw));
        d.iter().filter(|(_, k)| k.diatur.elapsed().as_secs() >= 60).map(|(hw, k)| (*hw, k.ukuran)).collect()
    });
    let depan = unsafe { GetForegroundWindow() } as usize;
    for (hw, (w, t)) in calon {
        let berjudul = gaya(hw) & WS_CAPTION == WS_CAPTION;
        if hw == depan || minimize(hw) || maksimal(hw) || macet(hw) || (berjudul && ukuran_klien(hw) == Some((w, t))) {
            continue;
        }
        pasang_bingkai(hw);
        let (fw, fh) = bingkai(hw).unwrap_or((0, 0));
        ubah_bebas(hw, 0, 0, w as i32 + fw, t as i32 + fh, true);
        daftar_kecil(|d| {
            if let Some(k) = d.get_mut(&hw) {
                k.diatur = std::time::Instant::now();
                if let Some(c) = ukuran_klien(hw) {
                    k.ukuran = c;
                }
            }
        });
    }
}

fn ingat_ukuran(hwnd: usize) {
    if maksimal(hwnd) || minimize(hwnd) {
        return;
    }
    if let Some(c) = ukuran_klien(hwnd) {
        daftar_kecil(|d| {
            if let Some(k) = d.get_mut(&hwnd) {
                k.ukuran = c;
                k.diatur = std::time::Instant::now();
            }
        });
    }
}

pub fn kisi(n: usize, area: (i32, i32, i32, i32), sel: (i32, i32)) -> Vec<(i32, i32)> {
    let (ax, ay, aw, ah) = area;
    if n == 0 || aw <= 0 || ah <= 0 {
        return Vec::new();
    }
    let (sw, st) = (sel.0.max(1), sel.1.max(1));
    let kolom = (aw / sw).max(1) as usize;
    let per = kolom * (ah / st).max(1) as usize;
    (0..n)
        .map(|i| {
            let s = i % per;
            (ax + (s % kolom) as i32 * sw, ay + (s / kolom) as i32 * st)
        })
        .collect()
}

pub fn pindahkan(hwnd: usize, x: i32, y: i32) {
    unsafe { SetWindowPos(h(hwnd), std::ptr::null_mut(), x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE) };
}

type ProsesPeristiwa = unsafe extern "system" fn(isize, u32, Hwnd, i32, i32, u32, u32);

#[link(name = "user32")]
extern "system" {
    fn SetWinEventHook(min: u32, max: u32, modul: Hwnd, cb: ProsesPeristiwa, pid: u32, tid: u32, flags: u32) -> isize;
    fn GetMessageW(msg: *mut [u64; 8], hwnd: Hwnd, min: u32, max: u32) -> i32;
    fn DispatchMessageW(msg: *const [u64; 8]) -> isize;
    fn GetCursorPos(p: *mut Point) -> i32;
}

const EVENT_SYSTEM_MOVESIZESTART: u32 = 0x000A;
const EVENT_SYSTEM_MOVESIZEEND: u32 = 0x000B;
const WINEVENT_SKIPOWNPROCESS: u32 = 0x0002;
const TEPI: i32 = 8;

static SERET: Mutex<Option<(usize, Rect, Option<u32>)>> = Mutex::new(None);

pub fn di_tepi(r: Rect, x: i32, y: i32) -> bool {
    let dekat = |a: i32, b: i32| (a - b).abs() <= TEPI;
    dekat(x, r.left) || dekat(x, r.right) || dekat(y, r.top) || dekat(y, r.bottom)
}

unsafe extern "system" fn peristiwa(_: isize, ev: u32, hwnd: Hwnd, obj: i32, _: i32, _: u32, _: u32) {
    if obj != 0 {
        return;
    }
    let hw = hwnd as usize;
    if ukuran_kecil(hw).is_none() {
        return;
    }
    let Some(r) = kotak(hw) else { return };
    if ev == EVENT_SYSTEM_MOVESIZESTART {
        let mut p = Point::default();
        GetCursorPos(&mut p);
        let gaya_asli = (!di_tepi(r, p.x, p.y)).then(|| gaya(hw));
        if let Some(g) = gaya_asli {
            pasang_gaya(hw, gaya_seret(g));
        }
        *SERET.lock().unwrap_or_else(|e| e.into_inner()) = Some((hw, r, gaya_asli));
        return;
    }
    let Some((_, awal, gaya_asli)) = SERET.lock().unwrap_or_else(|e| e.into_inner()).take().filter(|s| s.0 == hw) else { return };
    match gaya_asli {
        Some(g) => {
            pasang_gaya(hw, g);
            SetWindowPos(h(hw), std::ptr::null_mut(), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
            let lebar = |x: Rect| x.right - x.left;
            let tinggi = |x: Rect| x.bottom - x.top;
            if !maksimal(hw) && (lebar(r) > lebar(awal) + 2 || tinggi(r) > tinggi(awal) + 2) {
                let (x, y, w, t) = (r.left, r.top, lebar(awal), tinggi(awal));
                std::thread::spawn(move || ubah_bebas(hw, x, y, w, t, false));
            }
        }
        None => ingat_ukuran(hw),
    }
}

pub fn mulai_pengawas() {
    let _ = std::thread::Builder::new().name("cam-seret".into()).spawn(|| unsafe {
        let hook = SetWinEventHook(EVENT_SYSTEM_MOVESIZESTART, EVENT_SYSTEM_MOVESIZEEND, std::ptr::null_mut(), peristiwa, 0, 0, WINEVENT_SKIPOWNPROCESS);
        if hook == 0 {
            crate::store::catat_kejadian("Window drag watcher unavailable: a tiny client grows to Roblox's minimum when dragged.");
            return;
        }
        let mut msg = [0u64; 8];
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            DispatchMessageW(&msg);
        }
    });
}

#[cfg(test)]
mod tes {

    #[test]
    fn gaya_berbingkai_memberi_judul_pada_fullscreen_roblox() {
        let g = super::gaya_berbingkai(0x1600_0000);
        assert_eq!(g, 0x16cf_0000, "the normal Roblox window style (measured with a title bar)");
        assert_eq!(super::gaya_berbingkai(0x9600_0000) & 0x8000_0000, 0);
        assert_eq!(super::gaya_berbingkai(0x16cf_0000), 0x16cf_0000);
    }

    #[test]
    fn normal_size_hanya_mengembalikan_borderless_bila_gaya_masih_milik_cam() {
        let asli = 0x1600_0000;
        assert!(super::masih_gaya_cam(0x16cf_0000, asli), "still CAM's title-bar style");
        assert!(super::masih_gaya_cam(0x36cf_0000, asli), "minimized is still CAM's style");
        assert!(!super::masih_gaya_cam(0x1600_0000, asli), "borderless again (Roblox/F11): leave it");
        assert!(!super::masih_gaya_cam(0x16c0_0000, asli), "changed by someone else: leave it");
    }

    use super::*;

    #[test]
    fn kisi_sel_tetap_dan_tepi() {
        let area = (0, 40, 1920, 1000);
        let k = kisi(16, area, (336, 279));
        assert_eq!(k[4], (1344, 40));
        assert_eq!(k[5], (0, 319));
        assert_eq!(k[15], (0, 40), "yang ke-16 mulai lagi dari kiri atas");
        assert!(kisi(0, area, (300, 200)).is_empty());
        let r = Rect { left: 100, top: 100, right: 435, bottom: 318 };
        assert!(di_tepi(r, 102, 200) && di_tepi(r, 300, 316));
        assert!(!di_tepi(r, 250, 120), "judul = pindah");
    }

    #[test]
    fn gaya_sekali_pakai() {
        let biasa = 0x16CF_0000u32;
        let b = gaya_bebas(biasa);
        assert_eq!(b & (WS_THICKFRAME | WS_CAPTION), 0);
        assert_ne!(b & WS_POPUP, 0);
        let s = gaya_seret(biasa);
        assert_eq!(s & WS_THICKFRAME, 0);
        assert_ne!(s & WS_CAPTION, 0, "judul tetap saat diseret");
    }
}
