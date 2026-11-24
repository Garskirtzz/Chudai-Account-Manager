use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone, Debug)]
pub struct Avatar3d {
    pub obj: String,
    pub mtl: String,
    pub tekstur: Vec<String>,
    pub aabb_min: [f64; 3],
    pub aabb_max: [f64; 3],
    pub dari_cache: bool,
    pub usang: bool,
    pub versi: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct StatusAvatar3d {
    pub versi: String,
    pub usang: bool,
}

static JAWABAN_TERAKHIR: std::sync::Mutex<Option<std::collections::HashMap<u64, String>>> = std::sync::Mutex::new(None);

fn catat_jawaban(user_id: u64, versi: &str) {
    let mut m = JAWABAN_TERAKHIR.lock().unwrap_or_else(|e| e.into_inner());
    m.get_or_insert_with(Default::default).insert(user_id, versi.to_string());
}

fn jawaban_terakhir(user_id: u64) -> Option<String> {
    JAWABAN_TERAKHIR.lock().unwrap_or_else(|e| e.into_inner()).as_ref().and_then(|m| m.get(&user_id).cloned())
}

pub fn boleh_tulis(terakhir: Option<&str>, versi: &str) -> bool {
    terakhir.is_none_or(|t| t == versi)
}

async fn tanya_meta(cookies: &[String], user_id: u64) -> Result<String, String> {
    let mut galat = String::from(crate::roblox::AVATAR_3D_DITOLAK);
    for c in cookies {
        match crate::roblox::avatar_3d_meta_url(c, user_id).await {
            Ok(u) => return Ok(u),
            Err(e) if e == crate::roblox::AVATAR_3D_DITOLAK => galat = e,
            Err(e) => return Err(e),
        }
    }
    Err(galat)
}

pub fn urutan_cookie<T>(sendiri: Option<T>, cadangan: Vec<T>, bermasalah: bool) -> Vec<T> {
    let mut urut = Vec::new();
    match sendiri {
        Some(c) if !bermasalah => {
            urut.push(c);
            urut.extend(cadangan);
        }
        Some(c) => {
            urut.extend(cadangan);
            urut.push(c);
        }
        None => urut.extend(cadangan),
    }
    urut
}

pub fn pilih_cadangan(n: usize, user_id: u64) -> Vec<usize> {
    if n == 0 {
        return Vec::new();
    }
    let mulai = (user_id % n as u64) as usize;
    (0..n.min(2)).map(|k| (mulai + k) % n).collect()
}

pub fn ada_model(user_id: u64) -> bool {
    baca_versi(&folder_akun(user_id)).is_some()
}

pub async fn buru(cookies: &[String], user_id: u64, tanya: bool) -> Result<StatusAvatar3d, String> {
    let versi = match jawaban_terakhir(user_id) {
        Some(v) if !tanya => v,
        _ => return periksa(cookies, user_id).await,
    };
    let dir = folder_akun(user_id);
    unduh_model(user_id, &dir, &crate::roblox::host_cdn_3d(&versi), &versi).await.map(|_| StatusAvatar3d { versi, usang: false })
}

pub fn jadwal_buru(umur_detik: u64) -> (u64, u64) {
    if umur_detik < 15 * 60 {
        (15, 60)
    } else if umur_detik < 60 * 60 {
        (60, 300)
    } else {
        (300, 900)
    }
}

fn catat(teks: &str) {
    #[cfg(not(test))]
    crate::store::catat_kejadian(teks);
    #[cfg(test)]
    let _ = teks;
}

static KUNCI_TULIS: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

const MAKS_OBJ: usize = 24 * 1024 * 1024;
const MAKS_TEKSTUR: usize = 4 * 1024 * 1024;
const MAKS_JUMLAH_TEKSTUR: usize = 6;

const BATAS_TOTAL_BYTE: u64 = 150 * 1024 * 1024;
const RUANG_MIN_BYTE: u64 = 1024 * 1024 * 1024;
const JEDA_BERSIH_DETIK: u64 = 600;
const JEDA_TUNGGU: [u64; 4] = [3, 5, 8, 12];

pub fn hash_sah(h: &str) -> bool {
    !h.is_empty() && h.len() <= 160 && h.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

pub fn ganti_nama_tekstur(mtl: &str, tekstur: &[String]) -> String {
    let mut s = mtl.to_string();
    for (i, h) in tekstur.iter().enumerate() {
        s = s.replace(h.as_str(), &format!("tex{i}"));
    }
    s
}

pub fn aabb(meta: &serde_json::Value) -> Option<([f64; 3], [f64; 3])> {
    let ambil = |k: &str| -> Option<[f64; 3]> {
        let v = meta.get("aabb")?.get(k)?;
        Some([v.get("x")?.as_f64()?, v.get("y")?.as_f64()?, v.get("z")?.as_f64()?])
    };
    Some((ambil("min")?, ambil("max")?))
}

fn sekarang() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn folder_akun(user_id: u64) -> PathBuf {
    crate::store::berkas_data("avatar3d").join(user_id.to_string())
}

pub fn hapus_cache(user_id: u64) {
    if let Some(m) = JAWABAN_TERAKHIR.lock().unwrap_or_else(|e| e.into_inner()).as_mut() {
        m.remove(&user_id);
    }
    for p in hapus_cache_di(&crate::store::berkas_data("avatar3d"), user_id) {
        crate::store::catat_kejadian(&format!("Could not remove the 3D avatar cache of a deleted account: {}", p.display()));
    }
}

fn hapus_cache_di(akar: &Path, user_id: u64) -> Vec<PathBuf> {
    if user_id == 0 {
        return Vec::new();
    }
    let dir = akar.join(user_id.to_string());
    [dir.with_extension("baru"), dir.with_extension("lama"), dir]
        .into_iter()
        .filter(|p| {
            let _ = std::fs::remove_dir_all(p);
            p.exists()
        })
        .collect()
}

fn data_url(png: &[u8]) -> String {
    use base64::Engine;
    format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(png))
}

async fn unduh(hash: &str, maks: usize) -> Result<Vec<u8>, String> {
    crate::roblox::unduh_cdn(&crate::roblox::host_cdn_3d(hash), maks).await
}

fn baca_cache(dir: &Path) -> Option<(Avatar3d, String, u64)> {
    let info = std::fs::read_to_string(dir.join("versi.txt")).ok()?;
    let mut baris = info.lines();
    let versi = baris.next()?.trim().to_string();
    let waktu: u64 = baris.next()?.trim().parse().ok()?;
    let jumlah: usize = baris.next()?.trim().parse().ok()?;
    let meta: serde_json::Value = serde_json::from_slice(&std::fs::read(dir.join("meta.json")).ok()?).ok()?;
    let (aabb_min, aabb_max) = aabb(&meta)?;
    let obj = baca_obj(dir)?;
    let mtl = std::fs::read_to_string(dir.join("avatar.mtl")).ok()?;
    let mut tekstur = Vec::new();
    for i in 0..jumlah.min(MAKS_JUMLAH_TEKSTUR) {
        tekstur.push(data_url(&std::fs::read(dir.join(format!("tex{i}.png"))).ok()?));
    }
    Some((Avatar3d { obj, mtl, tekstur, aabb_min, aabb_max, dari_cache: true, usang: false, versi: versi.clone() }, versi, waktu))
}

fn baca_versi(dir: &Path) -> Option<String> {
    let info = std::fs::read_to_string(dir.join("versi.txt")).ok()?;
    let v = info.lines().next()?.trim().to_string();
    (!v.is_empty() && (dir.join("avatar.obj.gz").is_file() || dir.join("avatar.obj").is_file())).then_some(v)
}

fn baca_obj(dir: &Path) -> Option<String> {
    if let Ok(b) = std::fs::read(dir.join("avatar.obj.gz")) {
        return String::from_utf8(crate::roblox::buka_gzip(&b)).ok();
    }
    std::fs::read_to_string(dir.join("avatar.obj")).ok()
}

fn gzip(teks: &str) -> std::io::Result<Vec<u8>> {
    use std::io::Write;
    let mut z = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    z.write_all(teks.as_bytes())?;
    z.finish()
}

#[link(name = "kernel32")]
extern "system" {
    fn GetDiskFreeSpaceExW(dir: *const u16, bebas_pemanggil: *mut u64, total: *mut u64, bebas_total: *mut u64) -> i32;
}

fn ruang_kosong(dir: &Path) -> Option<u64> {
    use std::os::windows::ffi::OsStrExt;
    let mut cek = dir.to_path_buf();
    while !cek.exists() {
        cek = cek.parent()?.to_path_buf();
    }
    let w: Vec<u16> = cek.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let (mut bebas, mut total, mut semua) = (0u64, 0u64, 0u64);
    (unsafe { GetDiskFreeSpaceExW(w.as_ptr(), &mut bebas, &mut total, &mut semua) } != 0).then_some(bebas)
}

#[derive(Debug, Clone, PartialEq)]
pub struct EntriCache {
    pub nama: String,
    pub byte: u64,
    pub waktu: u64,
}

pub fn pilih_hapus(entri: &[EntriCache], aktif: &std::collections::HashSet<u64>, batas: u64) -> Vec<String> {
    if aktif.is_empty() {
        return Vec::new();
    }
    let mut hapus = Vec::new();
    let mut sisa: Vec<&EntriCache> = Vec::new();
    for e in entri {
        match e.nama.parse::<u64>() {
            Ok(uid) if aktif.contains(&uid) => sisa.push(e),
            _ => hapus.push(e.nama.clone()),
        }
    }
    let mut total: u64 = sisa.iter().map(|e| e.byte).sum();
    sisa.sort_by_key(|e| e.waktu);
    for e in sisa {
        if total <= batas {
            break;
        }
        total = total.saturating_sub(e.byte);
        hapus.push(e.nama.clone());
    }
    hapus
}

fn ukuran_folder(dir: &Path) -> u64 {
    std::fs::read_dir(dir).map(|r| r.flatten().filter_map(|e| e.metadata().ok()).filter(|m| m.is_file()).map(|m| m.len()).sum()).unwrap_or(0)
}

fn bersihkan(aktif: &std::collections::HashSet<u64>, paksa: bool) -> usize {
    static TERAKHIR: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let kini = sekarang();
    if !paksa && kini.saturating_sub(TERAKHIR.load(std::sync::atomic::Ordering::Relaxed)) < JEDA_BERSIH_DETIK {
        return 0;
    }
    TERAKHIR.store(kini, std::sync::atomic::Ordering::Relaxed);
    bersihkan_di(&crate::store::berkas_data("avatar3d"), aktif, BATAS_TOTAL_BYTE)
}

fn pulihkan_lama(akar: &Path) {
    let Ok(isi) = std::fs::read_dir(akar) else { return };
    for e in isi.flatten() {
        let nama = e.file_name().to_string_lossy().into_owned();
        if let Some(uid) = nama.strip_suffix(".lama").filter(|u| u.parse::<u64>().is_ok()) {
            let dir = akar.join(uid);
            if !dir.exists() && std::fs::rename(e.path(), &dir).is_ok() {
                catat("avatar3d: restored a cached folder after a failed swap");
            }
        }
    }
}

fn bersihkan_di(akar: &Path, aktif: &std::collections::HashSet<u64>, batas: u64) -> usize {
    pulihkan_lama(akar);
    let akar = akar.to_path_buf();
    let Ok(isi) = std::fs::read_dir(&akar) else { return 0 };
    let entri: Vec<EntriCache> = isi
        .flatten()
        .map(|e| {
            let p = e.path();
            let waktu = std::fs::read_to_string(p.join("versi.txt")).ok().and_then(|x| x.lines().nth(1).and_then(|w| w.trim().parse().ok())).unwrap_or(0);
            EntriCache { nama: e.file_name().to_string_lossy().into_owned(), byte: if p.is_dir() { ukuran_folder(&p) } else { e.metadata().map(|m| m.len()).unwrap_or(0) }, waktu }
        })
        .collect();
    let mut n = 0;
    for nama in pilih_hapus(&entri, aktif, batas) {
        let p = akar.join(&nama);
        let ok = if p.is_dir() { std::fs::remove_dir_all(&p).is_ok() } else { std::fs::remove_file(&p).is_ok() };
        n += ok as usize;
    }
    if n > 0 {
        catat(&format!("avatar3d: removed {n} cached folder(s)"));
    }
    n
}

pub async fn bersihkan_terkunci(aktif: std::collections::HashSet<u64>, paksa: bool) -> usize {
    let _kunci = KUNCI_TULIS.lock().await;
    tauri::async_runtime::spawn_blocking(move || bersihkan(&aktif, paksa)).await.unwrap_or(0)
}

pub fn ganti_folder(tmp: &Path, dir: &Path) -> std::io::Result<()> {
    let lama = dir.with_extension("lama");
    let _ = std::fs::remove_dir_all(&lama);
    let ada = dir.exists();
    if ada {
        std::fs::rename(dir, &lama)?;
    }
    if let Err(e) = std::fs::rename(tmp, dir) {
        if ada {
            let _ = std::fs::rename(&lama, dir);
        }
        return Err(e);
    }
    if ada {
        let _ = std::fs::remove_dir_all(&lama);
    }
    Ok(())
}

fn tulis_versi(dir: &Path, versi: &str, jumlah: usize) -> std::io::Result<()> {
    std::fs::write(dir.join("versi.txt"), format!("{versi}\n{}\n{jumlah}\n", sekarang()))
}

pub async fn ambil(cookies: &[String], user_id: u64, segar: bool) -> Result<Avatar3d, String> {
    let dir = folder_akun(user_id);
    let cache = baca_cache(&dir);
    if let Some((a, _, _)) = &cache {
        if !segar {
            return Ok(a.clone());
        }
    }
    let meta_url = match tanya_meta(cookies, user_id).await {
        Ok(u) => u,
        Err(e) => return cache.map(|(a, _, _)| a).ok_or(e),
    };
    let versi = meta_url.rsplit('/').next().unwrap_or("").to_string();
    catat_jawaban(user_id, &versi);
    if let Some((a, v, _)) = &cache {
        if *v == versi {
            let _kunci = KUNCI_TULIS.lock().await;
            if baca_versi(&dir).as_deref() == Some(versi.as_str()) {
                let _ = tulis_versi(&dir, &versi, a.tekstur.len());
            }
            return Ok(a.clone());
        }
    }
    let mut meta_url = meta_url;
    let mut versi = versi;
    let mut hasil = unduh_model(user_id, &dir, &meta_url, &versi).await;
    for jeda in JEDA_TUNGGU {
        if !matches!(&hasil, Err(e) if e == crate::roblox::AVATAR_3D_BELUM_SIAP) {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_secs(jeda)).await;
        if let Ok(u) = tanya_meta(cookies, user_id).await {
            meta_url = u;
            versi = meta_url.rsplit('/').next().unwrap_or("").to_string();
            catat_jawaban(user_id, &versi);
        }
        hasil = unduh_model(user_id, &dir, &meta_url, &versi).await;
    }
    match hasil {
        Ok(a) => Ok(a),
        Err(e) => match cache {
            Some((mut a, _, _)) => {
                a.usang = true;
                Ok(a)
            }
            None => Err(e),
        },
    }
}

pub async fn periksa(cookies: &[String], user_id: u64) -> Result<StatusAvatar3d, String> {
    let dir = folder_akun(user_id);
    let lama = baca_versi(&dir);
    let meta_url = tanya_meta(cookies, user_id).await?;
    let versi = meta_url.rsplit('/').next().unwrap_or("").to_string();
    catat_jawaban(user_id, &versi);
    if lama.as_deref() == Some(versi.as_str()) {
        let _kunci = KUNCI_TULIS.lock().await;
        let kini = baca_versi(&dir);
        if kini.as_deref() != Some(versi.as_str()) {
            return match kini {
                Some(v) => {
                    let usang = jawaban_terakhir(user_id).is_some_and(|t| t != v);
                    Ok(StatusAvatar3d { versi: v, usang })
                }
                None => Err(crate::roblox::AVATAR_3D_BELUM_SIAP.into()),
            };
        }
        if !dir.join("avatar.obj.gz").is_file() {
            if let Some(obj) = baca_obj(&dir) {
                if gzip(&obj).and_then(|z| std::fs::write(dir.join("avatar.obj.gz"), z)).is_ok() {
                    let _ = std::fs::remove_file(dir.join("avatar.obj"));
                }
            }
        }
        let jumlah = std::fs::read_to_string(dir.join("versi.txt")).ok().and_then(|x| x.lines().nth(2).and_then(|n| n.trim().parse().ok())).unwrap_or(0);
        let _ = tulis_versi(&dir, &versi, jumlah);
        return Ok(StatusAvatar3d { versi, usang: false });
    }
    match unduh_model(user_id, &dir, &meta_url, &versi).await {
        Ok(_) => Ok(StatusAvatar3d { versi, usang: false }),
        Err(e) if e == crate::roblox::AVATAR_3D_BELUM_SIAP => match lama {
            Some(v) => Ok(StatusAvatar3d { versi: v, usang: true }),
            None => Err(e),
        },
        Err(e) => Err(e),
    }
}

async fn unduh_model(user_id: u64, dir: &Path, meta_url: &str, versi: &str) -> Result<Avatar3d, String> {
    if baca_versi(dir).as_deref() == Some(versi) {
        if let Some((a, _, _)) = baca_cache(dir) {
            return Ok(a);
        }
    }
    if !crate::roblox::url_cdn_sah(meta_url) {
        return Err("Roblox returned an unexpected address for the 3D avatar.".into());
    }
    let meta_b = crate::roblox::unduh_cdn(meta_url, 256 * 1024).await?;
    let meta: serde_json::Value = serde_json::from_slice(&meta_b).map_err(|_| "Roblox sent an unreadable 3D avatar description.".to_string())?;
    let (aabb_min, aabb_max) = aabb(&meta).ok_or("The 3D avatar description has no size.")?;
    let hash = |k: &str| meta.get(k).and_then(|x| x.as_str()).filter(|h| hash_sah(h)).map(str::to_string);
    let obj_h = hash("obj").ok_or("The 3D avatar has no model file.")?;
    let mtl_h = hash("mtl").ok_or("The 3D avatar has no material file.")?;
    let tex_h: Vec<String> = meta
        .get("textures")
        .and_then(|x| x.as_array())
        .map(|a| a.iter().filter_map(|x| x.as_str()).filter(|h| hash_sah(h)).take(MAKS_JUMLAH_TEKSTUR).map(str::to_string).collect())
        .unwrap_or_default();

    let obj_b = unduh(&obj_h, MAKS_OBJ).await?;
    let mtl_b = unduh(&mtl_h, 512 * 1024).await?;
    let mut tex_b = Vec::new();
    for h in &tex_h {
        tex_b.push(unduh(h, MAKS_TEKSTUR).await?);
    }
    let obj = String::from_utf8(obj_b).map_err(|_| "The 3D avatar model is not text.".to_string())?;
    let mtl = ganti_nama_tekstur(&String::from_utf8_lossy(&mtl_b), &tex_h);

    let _kunci = KUNCI_TULIS.lock().await;
    let model = Avatar3d { obj, mtl, tekstur: tex_b.iter().map(|b| data_url(b)).collect(), aabb_min, aabb_max, dari_cache: false, usang: false, versi: versi.to_string() };
    if !boleh_tulis(jawaban_terakhir(user_id).as_deref(), versi) {
        return Ok(model);
    }
    let tmp = dir.with_extension("baru");
    let _ = std::fs::remove_dir_all(&tmp);
    let simpan = || -> std::io::Result<()> {
        if ruang_kosong(dir).is_some_and(|b| b < RUANG_MIN_BYTE) {
            return Err(std::io::Error::other("less than 1 GB free on the drive"));
        }
        std::fs::create_dir_all(&tmp)?;
        std::fs::write(tmp.join("meta.json"), serde_json::to_vec(&serde_json::json!({ "aabb": meta.get("aabb") })).unwrap_or_default())?;
        std::fs::write(tmp.join("avatar.obj.gz"), gzip(&model.obj)?)?;
        std::fs::write(tmp.join("avatar.mtl"), &model.mtl)?;
        for (i, b) in tex_b.iter().enumerate() {
            std::fs::write(tmp.join(format!("tex{i}.png")), b)?;
        }
        tulis_versi(&tmp, versi, tex_b.len())?;
        ganti_folder(&tmp, dir)
    };
    if let Err(e) = simpan() {
        let _ = std::fs::remove_dir_all(&tmp);
        catat(&format!("avatar3d: cache not saved: {e}"));
    }
    Ok(model)
}

#[cfg(test)]
mod tes {
    use super::*;

    fn e(nama: &str, mb: u64, waktu: u64) -> EntriCache {
        EntriCache { nama: nama.into(), byte: mb * 1024 * 1024, waktu }
    }

    #[test]
    fn bersih_buang_akun_hilang_dan_sisa_sementara() {
        let aktif: std::collections::HashSet<u64> = [1, 2].into_iter().collect();
        let h = pilih_hapus(&[e("1", 1, 10), e("2", 1, 20), e("3", 1, 30), e("1.baru", 1, 0), e("aneh.txt", 0, 0)], &aktif, 1000 * 1024 * 1024);
        assert_eq!(h, vec!["3", "1.baru", "aneh.txt"]);
    }

    #[test]
    fn bersih_batas_total_hapus_yang_terlama_dipakai() {
        let aktif: std::collections::HashSet<u64> = [1, 2, 3].into_iter().collect();
        let h = pilih_hapus(&[e("1", 60, 300), e("2", 60, 100), e("3", 60, 200)], &aktif, 150 * 1024 * 1024);
        assert_eq!(h, vec!["2"]);
    }

    #[test]
    fn bersih_aktif_kosong_tidak_menghapus_apa_pun() {
        let kosong = std::collections::HashSet::new();
        assert!(pilih_hapus(&[e("1", 1, 10), e("2.baru", 1, 0)], &kosong, 0).is_empty());
    }

    fn folder_uji(nama: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("cam-uji-avatar3d-{}-{nama}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn hapus_cache_membuang_folder_akun_dan_sisanya_saja() {
        let akar = folder_uji("hapus");
        for n in ["123", "123.baru", "123.lama", "456"] {
            std::fs::create_dir_all(akar.join(n)).unwrap();
            std::fs::write(akar.join(n).join("versi.txt"), "v").unwrap();
        }
        assert!(hapus_cache_di(&akar, 123).is_empty(), "nothing left over");
        assert!(!akar.join("123").exists() && !akar.join("123.baru").exists() && !akar.join("123.lama").exists());
        assert!(akar.join("456").join("versi.txt").is_file(), "another account's cache stays");
        assert!(hapus_cache_di(&akar, 0).is_empty());
        assert!(akar.join("456").exists());
    }

    #[test]
    fn ganti_folder_mengganti_dan_membuang_yang_lama() {
        let akar = folder_uji("ganti");
        let (dir, tmp) = (akar.join("123"), akar.join("123.baru"));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("versi.txt"), "lama").unwrap();
        std::fs::create_dir_all(&tmp).unwrap();
        std::fs::write(tmp.join("versi.txt"), "baru").unwrap();
        ganti_folder(&tmp, &dir).unwrap();
        assert_eq!(std::fs::read_to_string(dir.join("versi.txt")).unwrap(), "baru");
        assert!(!tmp.exists() && !akar.join("123.lama").exists());
        let _ = std::fs::remove_dir_all(&akar);
    }

    #[test]
    fn ganti_folder_gagal_menyisakan_yang_lama() {
        let akar = folder_uji("gagal");
        let dir = akar.join("123");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("versi.txt"), "lama").unwrap();
        assert!(ganti_folder(&akar.join("tidak-ada.baru"), &dir).is_err());
        assert_eq!(std::fs::read_to_string(dir.join("versi.txt")).unwrap(), "lama");
        assert!(!akar.join("123.lama").exists());
        let _ = std::fs::remove_dir_all(&akar);
    }

    #[test]
    fn jadwal_buru_rapat_dulu_lalu_jarang() {
        assert_eq!(jadwal_buru(0), (15, 60));
        assert_eq!(jadwal_buru(15 * 60 - 1), (15, 60));
        assert_eq!(jadwal_buru(15 * 60), (60, 300));
        assert_eq!(jadwal_buru(3600), (300, 900));
    }

    #[test]
    fn cookie_sendiri_dulu_kecuali_akun_bermasalah() {
        assert_eq!(urutan_cookie(Some("a"), vec!["x", "y"], false), vec!["a", "x", "y"]);
        assert_eq!(urutan_cookie(Some("a"), vec!["x", "y"], true), vec!["x", "y", "a"]);
        assert_eq!(urutan_cookie(None, vec!["x"], false), vec!["x"]);
        assert!(urutan_cookie::<&str>(None, vec![], false).is_empty());
    }

    #[test]
    fn cadangan_maksimal_dua_dan_tersebar() {
        assert!(pilih_cadangan(0, 7).is_empty());
        assert_eq!(pilih_cadangan(1, 7), vec![0]);
        assert_eq!(pilih_cadangan(5, 7), vec![2, 3]);
        assert_eq!(pilih_cadangan(5, 9), vec![4, 0]);
    }

    #[test]
    fn hanya_jawaban_terakhir_yang_boleh_ditulis() {
        assert!(boleh_tulis(None, "v1"));
        assert!(boleh_tulis(Some("v2"), "v2"));
        assert!(!boleh_tulis(Some("v2"), "v1"));
    }

    #[test]
    fn jawaban_terakhir_menang() {
        catat_jawaban(9_000_000_001, "v2");
        catat_jawaban(9_000_000_001, "v1");
        assert!(!boleh_tulis(jawaban_terakhir(9_000_000_001).as_deref(), "v2"));
        assert!(boleh_tulis(jawaban_terakhir(9_000_000_001).as_deref(), "v1"));
    }

    #[test]
    fn bersih_memulihkan_lama_yang_tertinggal() {
        let akar = folder_uji("pulih");
        let aktif: std::collections::HashSet<u64> = [123, 456].into_iter().collect();
        std::fs::create_dir_all(akar.join("123.lama")).unwrap();
        std::fs::write(akar.join("123.lama").join("versi.txt"), "v\n1\n0\n").unwrap();
        std::fs::create_dir_all(akar.join("456")).unwrap();
        std::fs::create_dir_all(akar.join("456.lama")).unwrap();
        bersihkan_di(&akar, &aktif, u64::MAX);
        assert!(akar.join("123").join("versi.txt").is_file());
        assert!(!akar.join("123.lama").exists());
        assert!(akar.join("456").exists() && !akar.join("456.lama").exists());
        let _ = std::fs::remove_dir_all(&akar);
    }

    #[test]
    fn url_cdn_hanya_https_rbxcdn() {
        use crate::roblox::url_cdn_sah;
        assert!(url_cdn_sah("https://t7.rbxcdn.com/30DAY-Avatar-AB-Obj"));
        assert!(url_cdn_sah("https://tr.rbxcdn.com/30DAY-Avatar-AB-Png/720/720/Avatar/Png/noFilter"));
        assert!(!url_cdn_sah("http://t7.rbxcdn.com/x"));
        assert!(!url_cdn_sah("https://rbxcdn.com.contoh.net/x"));
        assert!(!url_cdn_sah("https://user@t7.rbxcdn.com/x"));
        assert!(!url_cdn_sah("https://t7.rbxcdn.com:8443/x"));
        assert!(!url_cdn_sah(""));
    }

    #[test]
    fn gzip_dibuka_dengan_batas() {
        use crate::roblox::buka_gzip_maks;
        let z = gzip(&"a".repeat(10_000)).unwrap();
        assert_eq!(buka_gzip_maks(&z, 10_000).unwrap().len(), 10_000);
        assert!(buka_gzip_maks(&z, 9_999).is_err());
        assert!(buka_gzip_maks(b"bukan gzip", 3).is_err());
        assert_eq!(buka_gzip_maks(b"teks", 4).unwrap(), b"teks");
    }

    #[test]
    fn obj_gzip_bolak_balik() {
        let teks = "v 0 0 0\nv 1 0 0\nf 1 2 1\n".repeat(200);
        let z = gzip(&teks).unwrap();
        assert!(z.len() < teks.len() / 4);
        assert_eq!(String::from_utf8(crate::roblox::buka_gzip(&z)).unwrap(), teks);
    }

    #[test]
    fn hash_hanya_huruf_angka_strip() {
        assert!(hash_sah("30DAY-Avatar-0123ABCdef"));
        assert!(hash_sah("c0ffee0123456789"));
        assert!(!hash_sah(""));
        assert!(!hash_sah("../etc"));
        assert!(!hash_sah("a/b"));
        assert!(!hash_sah("x.rbxcdn.com"));
        assert!(!hash_sah("a?b=c"));
        assert!(!hash_sah(&"a".repeat(161)));
    }

    #[test]
    fn nama_tekstur_diganti_berurutan() {
        let mtl = "map_Kd 30DAY-AAA\nmap_d 30DAY-AAA\nmap_Kd 30DAY-BBB\n";
        let s = ganti_nama_tekstur(mtl, &["30DAY-AAA".into(), "30DAY-BBB".into()]);
        assert_eq!(s, "map_Kd tex0\nmap_d tex0\nmap_Kd tex1\n");
    }

    #[test]
    fn aabb_dibaca() {
        let m: serde_json::Value = serde_json::json!({ "aabb": { "min": { "x": -1.5, "y": 100.0, "z": -0.8 }, "max": { "x": 1.5, "y": 105.5, "z": 1.1 } } });
        assert_eq!(aabb(&m), Some(([-1.5, 100.0, -0.8], [1.5, 105.5, 1.1])));
        assert_eq!(aabb(&serde_json::json!({})), None);
    }
}
