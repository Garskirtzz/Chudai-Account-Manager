use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

pub const UMUR_MAKS: Duration = Duration::from_secs(24 * 3600);

fn dir_log() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("Roblox").join("logs"))
}

fn berkas(dir: &Path) -> Vec<(PathBuf, u64, SystemTime)> {
    let mut hasil = Vec::new();
    let mut tumpuk = vec![dir.to_path_buf()];
    while let Some(d) = tumpuk.pop() {
        let Ok(isi) = std::fs::read_dir(&d) else { continue };
        for e in isi.flatten() {
            let Ok(m) = e.metadata() else { continue };
            if m.is_dir() {
                tumpuk.push(e.path());
            } else if let Ok(t) = m.modified() {
                hasil.push((e.path(), m.len(), t));
            }
        }
    }
    hasil
}

pub fn usang(diubah: SystemTime, kini: SystemTime, umur: Duration) -> bool {
    kini.duration_since(diubah).is_ok_and(|d| d > umur)
}

#[derive(serde::Serialize, Default, Debug, PartialEq)]
pub struct InfoLog {
    pub berkas: usize,
    pub mb: f64,
    pub usang_berkas: usize,
    pub usang_mb: f64,
}

pub fn info_log() -> InfoLog {
    let Some(d) = dir_log() else { return InfoLog::default() };
    let kini = SystemTime::now();
    let b = berkas(&d);
    let mb = |x: u64| (x as f64 / 1048576.0 * 10.0).round() / 10.0;
    let usang: Vec<_> = b.iter().filter(|x| usang(x.2, kini, UMUR_MAKS)).collect();
    InfoLog {
        berkas: b.len(),
        mb: mb(b.iter().map(|x| x.1).sum()),
        usang_berkas: usang.len(),
        usang_mb: mb(usang.iter().map(|x| x.1).sum()),
    }
}

pub fn bersihkan_log() -> (usize, f64) {
    let Some(d) = dir_log() else { return (0, 0.0) };
    let kini = SystemTime::now();
    let (mut n, mut byte) = (0usize, 0u64);
    for (p, ukuran, t) in berkas(&d) {
        if usang(t, kini, UMUR_MAKS) && std::fs::remove_file(&p).is_ok() {
            n += 1;
            byte += ukuran;
        }
    }
    (n, (byte as f64 / 1048576.0 * 10.0).round() / 10.0)
}

pub fn detik_sah(menit: u32) -> Result<u32, String> {
    let d = menit.saturating_mul(60);
    if !(60..=7 * 24 * 3600).contains(&d) {
        return Err("Pick a time from 1 minute to 7 days from now.".into());
    }
    Ok(d)
}

pub fn shutdown_exe(arg: &[&str]) -> Result<(i32, String), String> {
    use std::os::windows::process::CommandExt;
    let root = std::env::var_os("SystemRoot").map(PathBuf::from).unwrap_or_else(|| r"C:\Windows".into());
    let out = std::process::Command::new(root.join(r"System32\shutdown.exe"))
        .args(arg)
        .creation_flags(0x0800_0000)
        .output()
        .map_err(|e| format!("couldn't run shutdown.exe: {e}"))?;
    Ok((out.status.code().unwrap_or(-1), String::from_utf8_lossy(&out.stderr).trim().to_string()))
}
