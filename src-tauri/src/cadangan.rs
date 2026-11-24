use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::store::{Folder, ServerTersimpan};

pub const MAGIC: &[u8; 8] = b"CAMBAK01";
pub const EKSTENSI: &str = "cambak";
pub const SANDI_MIN: usize = 8;

const PANJANG_KEPALA: usize = 8 + 12 + 16;
const PANJANG_NONCE: usize = 12;
const PANJANG_TAG: usize = 16;
#[cfg(not(test))]
const BIAYA: (u32, u32, u32) = (64 * 1024, 3, 4);
#[cfg(test)]
const BIAYA: (u32, u32, u32) = (1024, 1, 1);
const MAKS_M_KIB: u32 = 1024 * 1024;
const MAKS_T: u32 = 20;
const MAKS_P: u32 = 16;

#[derive(Serialize, Deserialize, Default)]
pub struct Isi {
    pub versi: u32,
    pub dibuat: i64,
    pub akun: Vec<serde_json::Value>,
    #[serde(default)]
    pub folder: Vec<Folder>,
    #[serde(default)]
    pub server: Vec<ServerTersimpan>,
}

#[derive(Debug, PartialEq)]
pub enum Galat {
    BukanCadangan,
    SandiSalah,
}

impl Galat {
    pub fn pesan(&self) -> String {
        match self {
            Galat::BukanCadangan => "This isn't a Chudai Account Manager backup (.cambak), or the file is damaged.".into(),
            Galat::SandiSalah => "Wrong password, or the backup file was changed.".into(),
        }
    }
}

fn kunci(sandi: &str, m: u32, t: u32, p: u32, garam: &[u8]) -> Result<[u8; 32], Galat> {
    let params = Params::new(m, t, p, Some(32)).map_err(|_| Galat::BukanCadangan)?;
    let mut k = [0u8; 32];
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(sandi.as_bytes(), garam, &mut k)
        .map_err(|_| Galat::BukanCadangan)?;
    Ok(k)
}

pub fn kunci_isi(sandi: &str, isi: &Isi) -> Result<Vec<u8>, String> {
    let (m, t, p) = BIAYA;
    let mut garam = [0u8; 16];
    let mut nonce = [0u8; PANJANG_NONCE];
    rand::rngs::OsRng.fill_bytes(&mut garam);
    rand::rngs::OsRng.fill_bytes(&mut nonce);
    let mut keluar = MAGIC.to_vec();
    for v in [m, t, p] {
        keluar.extend_from_slice(&v.to_le_bytes());
    }
    keluar.extend_from_slice(&garam);
    let json = serde_json::to_vec(isi).map_err(|_| "Could not encode the backup.".to_string())?;
    let k = kunci(sandi, m, t, p, &garam).map_err(|e| e.pesan())?;
    let sandiwara = Aes256Gcm::new_from_slice(&k).map_err(|_| "Could not encrypt the backup.".to_string())?;
    let tertutup = sandiwara
        .encrypt(Nonce::from_slice(&nonce), Payload { msg: &json, aad: &keluar })
        .map_err(|_| "Could not encrypt the backup.".to_string())?;
    keluar.extend_from_slice(&nonce);
    keluar.extend_from_slice(&tertutup);
    Ok(keluar)
}

pub fn buka_isi(sandi: &str, data: &[u8]) -> Result<Isi, Galat> {
    if data.len() < PANJANG_KEPALA + PANJANG_NONCE + PANJANG_TAG || !data.starts_with(MAGIC) {
        return Err(Galat::BukanCadangan);
    }
    let (kepala, sisa) = data.split_at(PANJANG_KEPALA);
    let kata = |i: usize| u32::from_le_bytes([kepala[i], kepala[i + 1], kepala[i + 2], kepala[i + 3]]);
    let (m, t, p) = (kata(8), kata(12), kata(16));
    if m > MAKS_M_KIB || t > MAKS_T || p > MAKS_P || m == 0 || t == 0 || p == 0 {
        return Err(Galat::BukanCadangan);
    }
    let k = kunci(sandi, m, t, p, &kepala[20..36])?;
    let (nonce, tertutup) = sisa.split_at(PANJANG_NONCE);
    let sandiwara = Aes256Gcm::new_from_slice(&k).map_err(|_| Galat::BukanCadangan)?;
    let json = sandiwara
        .decrypt(Nonce::from_slice(nonce), Payload { msg: tertutup, aad: kepala })
        .map_err(|_| Galat::SandiSalah)?;
    serde_json::from_slice(&json).map_err(|_| Galat::BukanCadangan)
}

pub fn tulis(jalur: &Path, data: &[u8]) -> Result<(), String> {
    let mut tmp = jalur.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = std::path::PathBuf::from(tmp);
    let r = std::fs::write(&tmp, data).and_then(|_| std::fs::rename(&tmp, jalur));
    if r.is_err() {
        let _ = std::fs::remove_file(&tmp);
    }
    r.map_err(|e| format!("could not write the backup: {e}"))
}

pub fn akun_ke_cadangan(a: &crate::store::Account) -> Result<serde_json::Value, String> {
    let cookie = crate::store::decrypt(&a.cookie_enc)?;
    let mut v = serde_json::to_value(a).map_err(|e| e.to_string())?;
    let o = v.as_object_mut().ok_or("account is not an object")?;
    o.remove("cookie_enc");
    o.insert("cookie".into(), serde_json::Value::String(cookie));
    Ok(v)
}

pub fn akun_dari_cadangan(v: &serde_json::Value) -> Option<(crate::store::Account, String)> {
    let mut v = v.clone();
    let o = v.as_object_mut()?;
    let cookie = o.remove("cookie")?.as_str()?.trim().to_string();
    if cookie.is_empty() || cookie.len() > 8192 || !cookie.bytes().all(|b| b.is_ascii_graphic()) {
        return None;
    }
    o.insert("cookie_enc".into(), serde_json::Value::String(String::new()));
    let a: crate::store::Account = serde_json::from_value(v).ok()?;
    if a.user_id == 0 {
        return None;
    }
    Some((a, cookie))
}

pub fn kunci_server(s: &ServerTersimpan) -> String {
    [s.place_id.trim(), s.link_code.trim(), s.job_id.trim()].join("|")
}

#[cfg(test)]
mod tes {
    use super::*;

    fn isi() -> Isi {
        Isi {
            versi: 1,
            dibuat: 1_700_000_000,
            akun: vec![serde_json::json!({ "id": "x", "alias": "Budi", "user_id": 42, "cookie": "palsu" })],
            folder: vec![Folder { id: "f1".into(), nama: "Farming".into(), ..Default::default() }],
            server: Vec::new(),
        }
    }

    #[test]
    fn pulang_pergi_dan_sandi_salah() {
        let data = kunci_isi("sandi-panjang", &isi()).unwrap();
        let b = buka_isi("sandi-panjang", &data).unwrap();
        assert_eq!((b.versi, b.akun[0]["cookie"].as_str()), (1, Some("palsu")));
        assert_eq!(b.folder[0].nama, "Farming");
        assert_eq!(buka_isi("sandi-lain!!", &data).err(), Some(Galat::SandiSalah));
        assert!(!data.windows(5).any(|w| w == b"palsu"));
    }

    #[test]
    fn menolak_yang_bukan_cadangan() {
        let baik = kunci_isi("sandi-panjang", &isi()).unwrap();
        let mut ajaib = baik.clone();
        ajaib[0] = b'X';
        let mut mahal = baik.clone();
        mahal[8..12].copy_from_slice(&u32::MAX.to_le_bytes());
        for b in [ajaib, mahal, baik[..30].to_vec(), Vec::new()] {
            assert_eq!(buka_isi("sandi-panjang", &b).err(), Some(Galat::BukanCadangan));
        }
        let mut ubah = baik.clone();
        ubah[12..16].copy_from_slice(&2u32.to_le_bytes());
        assert_eq!(buka_isi("sandi-panjang", &ubah).err(), Some(Galat::SandiSalah));
        assert_eq!(buka_isi("sandi-panjang", &baik[..baik.len() - 1]).err(), Some(Galat::SandiSalah));
    }

    #[test]
    fn akun_pulang_pergi() {
        let a = crate::store::Account {
            id: "a1".into(),
            alias: "Budi".into(),
            user_id: 42,
            catatan: "catatan".into(),
            favorit: true,
            cookie_enc: crate::store::encrypt("_|WARNING:-x|_ABC").unwrap(),
            ..Default::default()
        };
        let v = akun_ke_cadangan(&a).unwrap();
        assert!(v.get("cookie_enc").is_none() && v["cookie"] == "_|WARNING:-x|_ABC");
        let (b, c) = akun_dari_cadangan(&v).unwrap();
        assert_eq!((b.alias.as_str(), b.catatan.as_str(), b.favorit, b.user_id, c.as_str()), ("Budi", "catatan", true, 42, "_|WARNING:-x|_ABC"));
        assert!(akun_dari_cadangan(&serde_json::json!({ "user_id": 1 })).is_none(), "tanpa cookie");
        assert!(akun_dari_cadangan(&serde_json::json!({ "user_id": 1, "cookie": "a b" })).is_none(), "cookie tak sah");
    }
}
