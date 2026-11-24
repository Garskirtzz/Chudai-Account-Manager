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

pub fn kunci() -> Kunci {
    let berkas: Vec<File> = berkas_sesi()
        .into_iter()
        .filter(|p| p.exists())
        .filter_map(|p| std::fs::OpenOptions::new().read(true).share_mode(0).open(p).ok())
        .collect();
    let jumlah = berkas.len();
    Kunci { _berkas: berkas, jumlah }
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

pub fn sidik() -> Vec<(u128, u64)> {
    berkas_sesi()
        .iter()
        .map(|p| {
            std::fs::metadata(p)
                .map(|m| {
                    let t = m
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_millis())
                        .unwrap_or(0);
                    (t, m.len())
                })
                .unwrap_or((0, 0))
        })
        .collect()
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

#[cfg(test)]
mod tes {
    #[test]
    fn berkas_sesi_menunjuk_localstorage_roblox() {
        let b = super::berkas_sesi();
        assert_eq!(b.len(), 2);
        assert!(b[0].ends_with("Roblox/LocalStorage/RobloxCookies.dat") || b[0].ends_with("Roblox\\LocalStorage\\RobloxCookies.dat"));
    }

    #[test]
    fn cek_akun_setelah_join() {
        use super::{cek_akun, CekAkun};
        assert_eq!(cek_akun(&[], 5), CekAkun::BelumTerbaca);
        assert_eq!(cek_akun(&[5], 5), CekAkun::Cocok);
        assert_eq!(cek_akun(&[7], 5), CekAkun::Salah(7));
    }

    #[test]
    fn peluncuran_menahan_pelepasan() {
        use std::sync::atomic::Ordering;
        let p = super::Proteksi::default();
        p.rawat(|| false);
        assert!(!p.status().0, "tanpa kunci: tidak ada yang berubah");
        *p.kunci.lock().unwrap() = Some(super::Kunci { _berkas: Vec::new(), jumlah: 0 });
        p.luncur.fetch_add(1, Ordering::SeqCst);
        p.rawat(|| false);
        assert!(p.status().0, "peluncuran berjalan: kunci harus tetap");
        p.luncur.fetch_sub(1, Ordering::SeqCst);
        p.rawat(|| true);
        assert!(p.status().0, "klien masih ada: kunci harus tetap");
        p.rawat(|| false);
        assert!(!p.status().0, "sepi: kunci dilepas");
    }
}
