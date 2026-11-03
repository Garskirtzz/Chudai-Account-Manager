use serde::Serialize;
use std::ffi::c_void;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct Klien {
    pub folder: String,
    pub path: String,
    pub versi: String,
    pub bawaan: bool,
    pub diunduh: bool,
    pub ada: bool,
}

#[link(name = "version")]
extern "system" {
    fn GetFileVersionInfoSizeW(lptstr_filename: *const u16, lpdw_handle: *mut u32) -> u32;
    fn GetFileVersionInfoW(
        lptstr_filename: *const u16,
        dw_handle: u32,
        dw_len: u32,
        lp_data: *mut c_void,
    ) -> i32;
    fn VerQueryValueW(
        p_block: *const c_void,
        lp_sub_block: *const u16,
        lplp_buffer: *mut *mut c_void,
        pu_len: *mut u32,
    ) -> i32;
}

#[repr(C)]
struct VsFixedFileInfo {
    dw_signature: u32,
    dw_struc_version: u32,
    dw_file_version_ms: u32,
    dw_file_version_ls: u32,
    dw_product_version_ms: u32,
    dw_product_version_ls: u32,
    dw_file_flags_mask: u32,
    dw_file_flags: u32,
    dw_file_os: u32,
    dw_file_type: u32,
    dw_file_subtype: u32,
    dw_file_date_ms: u32,
    dw_file_date_ls: u32,
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn versi_file(exe: &Path) -> String {
    let path = wide(&exe.to_string_lossy());
    unsafe {
        let mut handle = 0u32;
        let ukuran = GetFileVersionInfoSizeW(path.as_ptr(), &mut handle);
        if ukuran == 0 {
            return String::new();
        }
        let mut buf = vec![0u8; ukuran as usize];
        if GetFileVersionInfoW(path.as_ptr(), 0, ukuran, buf.as_mut_ptr() as *mut c_void) == 0 {
            return String::new();
        }
        let sub = wide("\\");
        let mut ptr: *mut c_void = std::ptr::null_mut();
        let mut len = 0u32;
        if VerQueryValueW(
            buf.as_ptr() as *const c_void,
            sub.as_ptr(),
            &mut ptr,
            &mut len,
        ) == 0
            || ptr.is_null()
        {
            return String::new();
        }
        let info = &*(ptr as *const VsFixedFileInfo);
        format!(
            "{}.{}.{}.{}",
            info.dw_file_version_ms >> 16,
            info.dw_file_version_ms & 0xFFFF,
            info.dw_file_version_ls >> 16,
            info.dw_file_version_ls & 0xFFFF
        )
    }
}

pub fn normalkan(dipilih: &str) -> Option<PathBuf> {
    let p = PathBuf::from(dipilih.trim());
    if p.is_file() && p.file_name()?.eq_ignore_ascii_case("RobloxPlayerBeta.exe") {
        return Some(p);
    }
    if p.is_dir() {
        let langsung = p.join("RobloxPlayerBeta.exe");
        if langsung.exists() {
            return Some(langsung);
        }
        if let Ok(baca) = std::fs::read_dir(&p) {
            for e in baca.flatten() {
                let kandidat = e.path().join("RobloxPlayerBeta.exe");
                if kandidat.exists() {
                    return Some(kandidat);
                }
            }
        }
    }
    None
}

fn buat(exe: &Path, bawaan: bool) -> Klien {
    let folder = exe
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    Klien {
        folder,
        path: exe.to_string_lossy().to_string(),
        versi: versi_file(exe),
        bawaan,
        diunduh: exe.parent().is_some_and(milik_unduhan),
        ada: exe.exists(),
    }
}

pub fn terpasang() -> Vec<Klien> {
    let mut hasil = Vec::new();
    let Some(mut dir) = dirs::data_local_dir() else { return hasil };
    dir.push("Roblox");
    dir.push("Versions");

    let Ok(baca) = std::fs::read_dir(&dir) else { return hasil };
    for e in baca.flatten() {
        let exe = e.path().join("RobloxPlayerBeta.exe");
        if exe.exists() {
            hasil.push(buat(&exe, true));
        }
    }
    hasil.sort_by(|a, b| b.versi.cmp(&a.versi));
    hasil
}

pub fn semua(kustom: &[String]) -> Vec<Klien> {
    let mut hasil = terpasang();
    for p in kustom {
        let exe = PathBuf::from(p);
        hasil.push(buat(&exe, false));
    }
    hasil
}

pub fn milik_unduhan(folder: &Path) -> bool {
    let induk = crate::unduh::folder_induk();
    let a: Vec<String> = induk.components().map(|c| c.as_os_str().to_string_lossy().to_lowercase()).collect();
    let b: Vec<String> = folder.components().map(|c| c.as_os_str().to_string_lossy().to_lowercase()).collect();
    b.len() == a.len() + 1 && b.starts_with(&a)
}
