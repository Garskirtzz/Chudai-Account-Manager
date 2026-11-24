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
    pub ukuran_mb: u64,
    pub protokol: bool,
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

#[link(name = "advapi32")]
extern "system" {
    fn RegGetValueW(hkey: isize, sub_key: *const u16, value: *const u16, flags: u32, typ: *mut u32, data: *mut c_void, len: *mut u32) -> i32;
}

pub fn exe_dari_perintah(cmd: &str) -> Option<String> {
    let c = cmd.trim();
    let exe = if let Some(sisa) = c.strip_prefix('"') {
        sisa.split('"').next()?
    } else if let Some(i) = c.to_ascii_lowercase().rfind(".exe") {
        &c[..i + 4]
    } else {
        c.split_whitespace().next()?
    };
    (!exe.is_empty()).then(|| exe.to_string())
}

pub fn exe_protokol() -> Option<PathBuf> {
    const HKCR: isize = 0x8000_0000u32 as i32 as isize;
    const HKCU: isize = 0x8000_0001u32 as i32 as isize;
    const RRF_RT_SZ: u32 = 0x2 | 0x4;
    for (kunci, sub) in [(HKCU, r"Software\Classes\roblox-player\shell\open\command"), (HKCR, r"roblox-player\shell\open\command")] {
        let sub = wide(sub);
        let mut buf = vec![0u16; 1024];
        let mut len = (buf.len() * 2) as u32;
        let ok = unsafe { RegGetValueW(kunci, sub.as_ptr(), std::ptr::null(), RRF_RT_SZ, std::ptr::null_mut(), buf.as_mut_ptr() as *mut c_void, &mut len) };
        if ok == 0 {
            let n = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
            if let Some(exe) = exe_dari_perintah(&String::from_utf16_lossy(&buf[..n])) {
                return Some(PathBuf::from(exe));
            }
        }
    }
    None
}

fn sama_jalur(a: &Path, b: &Path) -> bool {
    let kanon = |p: &Path| std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf()).to_string_lossy().to_lowercase();
    a.to_string_lossy().to_lowercase() == b.to_string_lossy().to_lowercase() || kanon(a) == kanon(b)
}

pub fn adalah_reparse(p: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
    std::fs::symlink_metadata(p).map_or(true, |m| m.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0)
}

pub fn ukuran_folder(dir: &Path) -> u64 {
    let mut total = 0u64;
    let mut antre = vec![dir.to_path_buf()];
    while let Some(d) = antre.pop() {
        let Ok(baca) = std::fs::read_dir(&d) else { continue };
        for e in baca.flatten() {
            let Ok(t) = e.file_type() else { continue };
            if t.is_dir() {
                antre.push(e.path());
            } else if let Ok(m) = e.metadata() {
                total += m.len();
            }
        }
    }
    total
}

pub fn folder_versi() -> Option<PathBuf> {
    Some(dirs::data_local_dir()?.join("Roblox").join("Versions"))
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
        ukuran_mb: exe.parent().map_or(0, |d| ukuran_folder(d) / (1024 * 1024)),
        protokol: false,
    }
}

pub fn terpasang() -> Vec<Klien> {
    let mut hasil = Vec::new();
    let Some(dir) = folder_versi() else { return hasil };
    let Ok(baca) = std::fs::read_dir(&dir) else { return hasil };
    let proto = exe_protokol();
    for e in baca.flatten() {
        if !e.file_name().to_string_lossy().to_ascii_lowercase().starts_with("version-") {
            continue;
        }
        let exe = e.path().join("RobloxPlayerBeta.exe");
        if exe.exists() {
            let mut k = buat(&exe, true);
            k.protokol = proto.as_deref().is_some_and(|p| sama_jalur(p, &exe));
            hasil.push(k);
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

const AWALAN_HAPUS: &str = "_cam-hapus-";

pub fn boleh_dihapus(folder: &Path, induk: &Path, protokol: Option<&Path>) -> Result<(), String> {
    let a: Vec<String> = induk.components().map(|c| c.as_os_str().to_string_lossy().to_lowercase()).collect();
    let b: Vec<String> = folder.components().map(|c| c.as_os_str().to_string_lossy().to_lowercase()).collect();
    if !(b.len() == a.len() + 1 && b.starts_with(&a)) {
        return Err("Only versions in Roblox's own Versions folder can be deleted here.".into());
    }
    if !b.last().is_some_and(|n| n.starts_with("version-")) {
        return Err("That folder is not a Roblox version folder.".into());
    }
    if protokol.is_some_and(|p| p.parent().is_some_and(|d| sama_jalur(d, folder))) {
        return Err("That is the current Roblox version (the one Roblox itself opens). It can't be deleted here.".into());
    }
    Ok(())
}

pub fn hapus_terpasang(exe: &Path) -> Result<u64, String> {
    let induk = folder_versi().ok_or("Roblox's Versions folder was not found.")?;
    let folder = exe.parent().ok_or("Invalid version path.")?.to_path_buf();
    if !folder.join("RobloxPlayerBeta.exe").exists() {
        return Err("That folder has no RobloxPlayerBeta.exe; it was left alone.".into());
    }
    let proto = exe_protokol().ok_or("CAM couldn't determine the current Roblox version, so nothing was deleted. Launch Roblox once, then try again.")?;
    boleh_dihapus(&folder, &induk, Some(&proto))?;
    if adalah_reparse(&folder) || adalah_reparse(&induk) {
        return Err("That version folder is a link to another location; CAM leaves it alone.".into());
    }
    if !crate::launcher::proses_dalam_folder(&folder).is_empty() {
        return Err("A Roblox process from that version is still running (a game or Roblox's tray process). Close it first.".into());
    }
    bersihkan_sisa(&induk);
    let ukuran = ukuran_folder(&folder);
    let nama = folder.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let sementara = induk.join(format!("{AWALAN_HAPUS}{nama}"));
    std::fs::rename(&folder, &sementara).map_err(|e| format!("Windows is still using files in that version ({e}). Close Roblox and try again."))?;
    std::fs::remove_dir_all(&sementara).map_err(|e| format!("The version was removed from the list, but some files could not be deleted yet ({e}). CAM retries on the next delete."))?;
    Ok(ukuran)
}

fn bersihkan_sisa(induk: &Path) {
    let Ok(baca) = std::fs::read_dir(induk) else { return };
    for e in baca.flatten() {
        if e.file_name().to_string_lossy().starts_with(AWALAN_HAPUS) && !adalah_reparse(&e.path()) {
            let _ = std::fs::remove_dir_all(e.path());
        }
    }
}

#[cfg(test)]
mod tes_hapus_versi {
    use super::*;

    #[test]
    fn exe_dari_perintah_protokol() {
        assert_eq!(exe_dari_perintah(r#""C:\R\Versions\version-a\RobloxPlayerBeta.exe" %1"#).as_deref(), Some(r"C:\R\Versions\version-a\RobloxPlayerBeta.exe"));
        assert_eq!(exe_dari_perintah(r"C:\R\x.exe %1").as_deref(), Some(r"C:\R\x.exe"));
        assert_eq!(exe_dari_perintah("  "), None);
        assert_eq!(exe_dari_perintah(r"C:\Program Files\R\RobloxPlayerBeta.exe %1").as_deref(), Some(r"C:\Program Files\R\RobloxPlayerBeta.exe"));
        assert_eq!(exe_dari_perintah(r"C:\Some.exe Folder\RobloxPlayerBeta.exe %1").as_deref(), Some(r"C:\Some.exe Folder\RobloxPlayerBeta.exe"), "T10-03R");
    }

    #[test]
    fn junction_tidak_diikuti_saat_menghapus() {
        let dasar = std::env::temp_dir().join(format!("cam-junction-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dasar);
        let target = dasar.join("target");
        let versi = dasar.join("version-x");
        std::fs::create_dir_all(&target).unwrap();
        std::fs::create_dir_all(&versi).unwrap();
        std::fs::write(target.join("penting.txt"), b"jangan dihapus").unwrap();
        let tautan = versi.join("tautan");
        let ok = std::process::Command::new("cmd")
            .args(["/c", "mklink", "/J"])
            .arg(&tautan)
            .arg(&target)
            .output()
            .unwrap()
            .status
            .success();
        assert!(ok, "mklink /J gagal");
        assert!(adalah_reparse(&tautan), "junction dikenali");
        assert!(!adalah_reparse(&versi), "folder biasa bukan reparse");
        std::fs::remove_dir_all(&versi).unwrap();
        assert!(!versi.exists());
        assert!(target.join("penting.txt").exists(), "isi target junction TIDAK boleh ikut terhapus");
        let _ = std::fs::remove_dir_all(&dasar);
    }

    #[test]
    fn hanya_versi_lama_di_folder_versions() {
        let induk = Path::new(r"C:\U\AppData\Local\Roblox\Versions");
        let proto = Path::new(r"C:\U\AppData\Local\Roblox\Versions\version-baru\RobloxPlayerBeta.exe");
        assert!(boleh_dihapus(&induk.join("version-lama"), induk, Some(proto)).is_ok());
        assert!(boleh_dihapus(&induk.join("VERSION-Lama"), induk, Some(proto)).is_ok(), "huruf besar/kecil");
        assert!(boleh_dihapus(&induk.join("version-baru"), induk, Some(proto)).is_err(), "versi protokol");
        assert!(boleh_dihapus(&induk.join("Version-BARU"), induk, Some(proto)).is_err(), "versi protokol, beda huruf");
        assert!(boleh_dihapus(&induk.join("_cam-hapus-version-x"), induk, Some(proto)).is_err());
        assert!(boleh_dihapus(induk, induk, Some(proto)).is_err(), "folder Versions sendiri");
        assert!(boleh_dihapus(&induk.join("version-a").join("sub"), induk, Some(proto)).is_err(), "bukan anak langsung");
        assert!(boleh_dihapus(Path::new(r"C:\Lain\version-a"), induk, Some(proto)).is_err(), "di luar Versions");
        assert!(boleh_dihapus(Path::new(r"C:\U\AppData\Local\Roblox\Versions-lain\version-a"), induk, None).is_err());
        assert!(boleh_dihapus(&induk.join(".."), induk, Some(proto)).is_err());
        assert!(boleh_dihapus(&induk.join("version-a").join("..").join("version-b"), induk, Some(proto)).is_err());
        assert!(boleh_dihapus(Path::new(r"\\srv\share\Roblox\Versions\version-a"), induk, Some(proto)).is_err());
        assert!(boleh_dihapus(Path::new(r"\\?\C:\U\AppData\Local\Roblox\Versions\version-a"), induk, Some(proto)).is_err());
        assert!(boleh_dihapus(Path::new(r"D:\U\AppData\Local\Roblox\Versions\version-a"), induk, Some(proto)).is_err());
    }
}
