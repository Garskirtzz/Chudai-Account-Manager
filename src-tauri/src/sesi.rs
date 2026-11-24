use std::fs::File;
use std::os::windows::fs::OpenOptionsExt;
use std::path::PathBuf;

pub fn berkas_sesi() -> Vec<PathBuf> {
    let Some(d) = dirs::data_local_dir() else { return Vec::new() };
    let dir = d.join("Roblox").join("LocalStorage");
    vec![dir.join("RobloxCookies.dat"), dir.join("appStorage.json")]
}

pub struct Kunci {
    _berkas: Vec<File>,
    pub jumlah: usize,
}

pub fn kunci_penuh() -> Kunci {
    const GENERIC_READ: u32 = 0x8000_0000;
    let berkas: Vec<File> = berkas_sesi()
        .into_iter()
        .filter_map(|p| {
            if let Some(d) = p.parent() {
                let _ = std::fs::create_dir_all(d);
            }
            std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .access_mode(GENERIC_READ)
                .share_mode(0)
                .open(p)
                .ok()
        })
        .collect();
    let jumlah = berkas.len();
    Kunci { _berkas: berkas, jumlah }
}

pub fn userid_log_sejak(sejak: i64) -> Vec<u64> {
    let Some(dir) = dirs::data_local_dir().map(|d| d.join("Roblox").join("logs")) else { return Vec::new() };
    let Ok(baca) = std::fs::read_dir(dir) else { return Vec::new() };
    let mut hasil = Vec::new();
    for e in baca.flatten() {
        let ubah = e
            .metadata()
            .ok()
            .and_then(|m| m.created().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        if ubah < sejak {
            continue;
        }
        let Ok(isi) = std::fs::read(e.path()) else { continue };
        let teks = String::from_utf8_lossy(&isi);
        for (i, _) in teks.match_indices("userid:") {
            let angka: String = teks[i + 7..].chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(n) = angka.parse::<u64>() {
                if !hasil.contains(&n) {
                    hasil.push(n);
                }
            }
        }
    }
    hasil
}

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

fn kini() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[derive(Default)]
pub struct Proteksi {
    kunci: Mutex<Option<Kunci>>,
    luncur: AtomicUsize,
    terakhir_luncur: Mutex<i64>,
}

pub struct Peluncuran<'a>(&'a Proteksi);

impl Drop for Peluncuran<'_> {
    fn drop(&mut self) {
        self.0.luncur.fetch_sub(1, Ordering::SeqCst);
    }
}

fn kunci_mutex<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl Proteksi {
    pub fn mulai_luncur(&self) -> Peluncuran<'_> {
        self.luncur.fetch_add(1, Ordering::SeqCst);
        *kunci_mutex(&self.terakhir_luncur) = kini();
        self.pasang();
        Peluncuran(self)
    }

    pub fn pasang(&self) -> usize {
        let mut k = kunci_mutex(&self.kunci);
        let total = berkas_sesi().len();
        if k.as_ref().map(|x| x.jumlah) == Some(total) {
            return total;
        }
        *k = None;
        let x = kunci_penuh();
        let n = x.jumlah;
        *k = Some(x);
        n
    }

    pub fn lepas(&self) {
        *kunci_mutex(&self.kunci) = None;
    }

    pub fn status(&self) -> (bool, usize, usize) {
        let k = kunci_mutex(&self.kunci);
        (k.is_some(), k.as_ref().map(|x| x.jumlah).unwrap_or(0), berkas_sesi().len())
    }

    pub fn rawat(&self, ada_klien: impl FnOnce() -> bool) {
        let mut k = kunci_mutex(&self.kunci);
        if k.is_none() {
            return;
        }
        let tenang = kini() - *kunci_mutex(&self.terakhir_luncur) > 90;
        if self.luncur.load(Ordering::SeqCst) == 0 && tenang && !ada_klien() {
            *k = None;
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum CekAkun {
    BelumTerbaca,
    Cocok,
    Salah(u64),
}

pub fn cek_akun(terbaca: &[u64], harapan: u64) -> CekAkun {
    if terbaca.is_empty() {
        CekAkun::BelumTerbaca
    } else if terbaca.contains(&harapan) {
        CekAkun::Cocok
    } else {
        CekAkun::Salah(terbaca[0])
    }
}
