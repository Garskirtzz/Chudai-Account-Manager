use std::path::PathBuf;

const ARG_BAWAAN: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";
const ARG_TANPA_GPU: &str = "--disable-gpu --disable-gpu-compositing";

fn akar() -> PathBuf {
    let mut p = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("ChudaiAccountManager");
    p.push("login");
    p
}

fn penanda() -> PathBuf {
    akar().join("login-berjalan")
}

pub fn terputus_sebelumnya() -> bool {
    penanda().exists()
}

pub fn argumen(tanpa_gpu: bool) -> String {
    if tanpa_gpu {
        format!("{ARG_BAWAAN} {ARG_TANPA_GPU}")
    } else {
        ARG_BAWAAN.to_string()
    }
}

pub fn mulai() -> PathBuf {
    let a = akar();
    if let Ok(isi) = std::fs::read_dir(&a) {
        for e in isi.flatten() {
            if e.file_name().to_string_lossy().starts_with("profil-") {
                let _ = std::fs::remove_dir_all(e.path());
            }
        }
    }
    let _ = std::fs::create_dir_all(&a);
    let _ = std::fs::write(penanda(), b"1");
    a.join(format!("profil-{}", uuid::Uuid::new_v4()))
}

pub fn selesai(profil: PathBuf) {
    let _ = std::fs::remove_file(penanda());
    hapus_profil(profil);
}

pub fn mulai_situs() -> PathBuf {
    let a = akar();
    let _ = std::fs::create_dir_all(&a);
    a.join(format!("situs-{}", uuid::Uuid::new_v4()))
}

pub fn sapu_situs() {
    if let Ok(isi) = std::fs::read_dir(akar()) {
        for e in isi.flatten() {
            if e.file_name().to_string_lossy().starts_with("situs-") {
                let _ = std::fs::remove_dir_all(e.path());
            }
        }
    }
}

pub fn hapus_profil(profil: PathBuf) {
    std::thread::spawn(move || {
        for _ in 0..20 {
            if !profil.exists() || std::fs::remove_dir_all(&profil).is_ok() {
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    });
}

#[cfg(test)]
mod tes {
    #[test]
    fn argumen_tanpa_gpu_tetap_membawa_bawaan_wry() {
        let a = super::argumen(true);
        assert!(a.contains("msSmartScreenProtection") && a.contains("--disable-gpu"));
        assert!(!super::argumen(false).contains("--disable-gpu"));
    }
}
