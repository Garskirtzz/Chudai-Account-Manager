use md5::{Digest, Md5};
use serde::Serialize;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

const CDN: &str = "https://setup.rbxcdn.com";

fn folder_paket(nama: &str) -> Option<&'static str> {
    Some(match nama {
        "RobloxApp.zip" | "redist.zip" | "WebView2.zip" => "",
        "shaders.zip" => "shaders/",
        "ssl.zip" => "ssl/",
        "WebView2RuntimeInstaller.zip" => "WebView2RuntimeInstaller/",
        "content-avatar.zip" => "content/avatar/",
        "content-configs.zip" => "content/configs/",
        "content-fonts.zip" => "content/fonts/",
        "content-sky.zip" => "content/sky/",
        "content-sounds.zip" => "content/sounds/",
        "content-textures2.zip" => "content/textures/",
        "content-models.zip" => "content/models/",
        "content-platform-fonts.zip" => "PlatformContent/pc/fonts/",
        "content-platform-dictionaries.zip" => "PlatformContent/pc/shared_compression_dictionaries/",
        "content-terrain.zip" => "PlatformContent/pc/terrain/",
        "content-textures3.zip" => "PlatformContent/pc/textures/",
        "extracontent-luapackages.zip" => "ExtraContent/LuaPackages/",
        "extracontent-translations.zip" => "ExtraContent/translations/",
        "extracontent-models.zip" => "ExtraContent/models/",
        "extracontent-textures.zip" => "ExtraContent/textures/",
        "extracontent-places.zip" => "ExtraContent/places/",
        _ => return None,
    })
}

const APP_SETTINGS: &str = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Settings>\n\t<ContentFolder>content</ContentFolder>\n\t<BaseUrl>http://www.roblox.com</BaseUrl>\n</Settings>\n";

struct Paket {
    nama: String,
    md5: String,
    ukuran: u64,
}

#[derive(Serialize, Clone, Default)]
pub struct Kemajuan {
    pub aktif: bool,
    pub versi: String,
    pub tahap: String,
    pub paket_ke: usize,
    pub jumlah_paket: usize,
    pub byte_selesai: u64,
    pub byte_total: u64,
    pub galat: String,
    pub hasil: String,
    pub dilewati: Vec<String>,
    #[serde(skip)]
    pub batal: bool,
}

fn keadaan() -> &'static Mutex<Kemajuan> {
    static K: std::sync::OnceLock<Mutex<Kemajuan>> = std::sync::OnceLock::new();
    K.get_or_init(|| Mutex::new(Kemajuan::default()))
}

fn ubah(f: impl FnOnce(&mut Kemajuan)) {
    let mut k = match keadaan().lock() {
        Ok(k) => k,
        Err(e) => e.into_inner(),
    };
    f(&mut k);
}

pub fn status() -> Kemajuan {
    match keadaan().lock() {
        Ok(k) => k.clone(),
        Err(e) => e.into_inner().clone(),
    }
}

pub fn batalkan() {
    ubah(|k| k.batal = true);
}

fn dibatalkan() -> bool {
    keadaan().lock().map(|k| k.batal).unwrap_or(false)
}

pub fn folder_induk() -> PathBuf {
    let mut p = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("ChudaiAccountManager");
    p.push("Versions");
    p
}

pub fn normalkan_hash(teks: &str) -> Option<String> {
    let t = teks.trim().to_ascii_lowercase();
    let inti = t.strip_prefix("version-").unwrap_or(&t);
    (inti.len() == 16 && inti.chars().all(|c| c.is_ascii_hexdigit()))
        .then(|| format!("version-{inti}"))
}

fn klien_unduh() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .read_timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("could not create the HTTP client: {e}"))
}

pub async fn terbaru() -> Result<(String, String), String> {
    let v: serde_json::Value = klien_unduh()?
        .get("https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer")
        .timeout(Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| format!("could not reach Roblox: {e}"))?
        .json()
        .await
        .map_err(|e| format!("unreadable version reply: {e}"))?;
    let hash = v.get("clientVersionUpload").and_then(|x| x.as_str()).unwrap_or("");
    let versi = v.get("version").and_then(|x| x.as_str()).unwrap_or("");
    if hash.is_empty() {
        return Err("Roblox did not report a current version.".into());
    }
    Ok((hash.to_string(), versi.to_string()))
}

async fn manifest(c: &reqwest::Client, hash: &str) -> Result<Vec<Paket>, String> {
    let resp = c
        .get(format!("{CDN}/{hash}-rbxPkgManifest.txt"))
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("could not reach the Roblox CDN: {e}"))?;
    if resp.status().as_u16() == 404 || resp.status().as_u16() == 403 {
        return Err(format!("Roblox has no client called {hash}. Check the version hash."));
    }
    if !resp.status().is_success() {
        return Err(format!("The Roblox CDN answered HTTP {} for {hash}.", resp.status()));
    }
    let teks = resp.text().await.map_err(|e| format!("manifest unreadable: {e}"))?;

    let baris: Vec<&str> = teks.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
    if baris.first() != Some(&"v0") {
        return Err("The package manifest has an unknown format.".into());
    }
    let mut hasil = Vec::new();
    for k in baris[1..].chunks(4) {
        if k.len() < 4 {
            break;
        }
        hasil.push(Paket {
            nama: k[0].to_string(),
            md5: k[1].to_ascii_lowercase(),
            ukuran: k[2].parse().unwrap_or(0),
        });
    }
    if hasil.is_empty() {
        return Err("The package manifest lists no packages.".into());
    }
    Ok(hasil)
}

pub async fn periksa(hash: &str) -> Result<(usize, u64), String> {
    let c = klien_unduh()?;
    let p = manifest(&c, hash).await?;
    let dipasang: Vec<&Paket> = p.iter().filter(|x| folder_paket(&x.nama).is_some()).collect();
    Ok((dipasang.len(), dipasang.iter().map(|x| x.ukuran).sum()))
}

async fn unduh_paket(c: &reqwest::Client, hash: &str, p: &Paket, awal: u64) -> Result<Vec<u8>, String> {
    let mut galat = String::new();
    for coba in 1..=3 {
        if dibatalkan() {
            return Err("Download cancelled.".into());
        }
        match unduh_sekali(c, hash, p, awal).await {
            Ok(b) => return Ok(b),
            Err(e) => {
                galat = e;
                ubah(|k| k.byte_selesai = awal);
                if coba < 3 {
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }
    Err(format!("{}: {galat}", p.nama))
}

async fn unduh_sekali(c: &reqwest::Client, hash: &str, p: &Paket, awal: u64) -> Result<Vec<u8>, String> {
    let mut resp = c
        .get(format!("{CDN}/{hash}-{}", p.nama))
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let mut isi = Vec::with_capacity(p.ukuran as usize);
    while let Some(potong) = resp.chunk().await.map_err(|e| format!("connection dropped: {e}"))? {
        if dibatalkan() {
            return Err("Download cancelled.".into());
        }
        isi.extend_from_slice(&potong);
        let n = awal + isi.len() as u64;
        ubah(|k| k.byte_selesai = n);
    }
    if isi.len() as u64 != p.ukuran {
        return Err(format!("size mismatch ({} of {} bytes)", isi.len(), p.ukuran));
    }
    let md5 = format!("{:x}", Md5::digest(&isi));
    if md5 != p.md5 {
        return Err("checksum mismatch (MD5 differs from the manifest)".into());
    }
    Ok(isi)
}

fn jalur_aman(akar: &Path, awalan: &str, nama: &str) -> Option<PathBuf> {
    let mut p = akar.to_path_buf();
    for bagian in format!("{awalan}{nama}").replace('\\', "/").split('/') {
        if bagian.is_empty() || bagian == "." {
            continue;
        }
        if bagian == ".." || bagian.contains(':') {
            return None;
        }
        p.push(bagian);
    }
    Some(p)
}

fn ekstrak(isi: Vec<u8>, akar: &Path, awalan: &str) -> Result<(), String> {
    let mut zip = zip::ZipArchive::new(std::io::Cursor::new(isi))
        .map_err(|e| format!("not a valid zip: {e}"))?;
    for i in 0..zip.len() {
        let mut e = zip.by_index(i).map_err(|e| format!("damaged zip entry: {e}"))?;
        let Some(tujuan) = jalur_aman(akar, awalan, e.name()) else {
            return Err(format!("refused unsafe path in package: {}", e.name()));
        };
        if e.is_dir() {
            std::fs::create_dir_all(&tujuan).map_err(|x| format!("could not create a folder: {x}"))?;
            continue;
        }
        if let Some(induk) = tujuan.parent() {
            std::fs::create_dir_all(induk).map_err(|x| format!("could not create a folder: {x}"))?;
        }
        let mut buf = Vec::with_capacity(e.size() as usize);
        e.read_to_end(&mut buf).map_err(|x| format!("could not unpack {}: {x}", e.name()))?;
        std::fs::write(&tujuan, buf).map_err(|x| format!("could not write {}: {x}", tujuan.display()))?;
    }
    Ok(())
}

pub async fn pasang(hash: String) -> Result<PathBuf, String> {
    let akhir = folder_induk().join(&hash);
    let exe = akhir.join("RobloxPlayerBeta.exe");
    if exe.exists() {
        return Ok(exe);
    }
    let sementara = folder_induk().join(format!("{hash}.partial"));
    let _ = std::fs::remove_dir_all(&sementara);
    std::fs::create_dir_all(&sementara).map_err(|e| format!("could not create the version folder: {e}"))?;

    let c = klien_unduh()?;
    ubah(|k| k.tahap = "Reading the package manifest".into());
    let semua = manifest(&c, &hash).await?;

    let (dipasang, dilewati): (Vec<Paket>, Vec<Paket>) =
        semua.into_iter().partition(|p| folder_paket(&p.nama).is_some());
    let tak_dikenal: Vec<String> = dilewati
        .iter()
        .filter(|p| p.nama.ends_with(".zip"))
        .map(|p| p.nama.clone())
        .collect();
    let total: u64 = dipasang.iter().map(|p| p.ukuran).sum();
    let jumlah = dipasang.len();
    ubah(|k| {
        k.byte_total = total;
        k.jumlah_paket = jumlah;
        k.dilewati = tak_dikenal;
    });

    let mut selesai = 0u64;
    for (i, p) in dipasang.iter().enumerate() {
        ubah(|k| {
            k.paket_ke = i + 1;
            k.tahap = format!("Downloading {}", p.nama);
        });
        let isi = unduh_paket(&c, &hash, p, selesai).await?;
        selesai += p.ukuran;

        ubah(|k| k.tahap = format!("Unpacking {}", p.nama));
        let akar = sementara.clone();
        let awalan = folder_paket(&p.nama).unwrap_or("").to_string();
        let nama = p.nama.clone();
        tokio::task::spawn_blocking(move || ekstrak(isi, &akar, &awalan))
            .await
            .map_err(|e| format!("{nama}: unpacking crashed: {e}"))?
            .map_err(|e| format!("{nama}: {e}"))?;
    }

    std::fs::write(sementara.join("AppSettings.xml"), APP_SETTINGS)
        .map_err(|e| format!("could not write AppSettings.xml: {e}"))?;
    if !sementara.join("RobloxPlayerBeta.exe").exists() {
        return Err("The download finished but RobloxPlayerBeta.exe is missing.".into());
    }
    let _ = std::fs::remove_dir_all(&akhir);
    std::fs::rename(&sementara, &akhir).map_err(|e| format!("could not finish the install: {e}"))?;
    Ok(exe)
}

pub fn bersihkan_sisa(hash: &str) {
    let _ = std::fs::remove_dir_all(folder_induk().join(format!("{hash}.partial")));
}

pub fn mulai(hash: &str) -> Result<(), String> {
    let mut k = match keadaan().lock() {
        Ok(k) => k,
        Err(e) => e.into_inner(),
    };
    if k.aktif {
        return Err(format!("{} is still downloading.", k.versi));
    }
    *k = Kemajuan {
        aktif: true,
        versi: hash.to_string(),
        tahap: "Starting".into(),
        ..Default::default()
    };
    Ok(())
}

pub fn selesai(hasil: Result<PathBuf, String>) {
    ubah(|k| {
        k.aktif = false;
        k.batal = false;
        match hasil {
            Ok(p) => {
                k.hasil = p.to_string_lossy().to_string();
                k.tahap = "Installed".into();
            }
            Err(e) => {
                k.galat = e;
                k.tahap = "Failed".into();
            }
        }
    });
}

#[cfg(test)]
mod uji {
    use super::*;

    #[test]
    fn jalur_zip_berbahaya_ditolak() {
        let akar = Path::new(r"C:\v");
        assert!(jalur_aman(akar, "", r"..\..\Windows\x.dll").is_none());
        assert!(jalur_aman(akar, "content/", "../../x").is_none());
        assert!(jalur_aman(akar, "", r"C:\Windows\x.dll").is_none());
        assert_eq!(
            jalur_aman(akar, "content/fonts/", r"families\a.json").unwrap(),
            Path::new(r"C:\v").join("content").join("fonts").join("families").join("a.json")
        );
    }

    #[test]
    fn hash_versi_dinormalkan() {
        assert_eq!(normalkan_hash("9AC8595712B447A7").as_deref(), Some("version-9ac8595712b447a7"));
        assert_eq!(normalkan_hash(" version-9ac8595712b447a7 ").as_deref(), Some("version-9ac8595712b447a7"));
        assert!(normalkan_hash("version-hidden").is_none());
        assert!(normalkan_hash("version-9ac8595712b447a").is_none());
        assert!(normalkan_hash("../../etc").is_none());
    }

    #[test]
    fn folder_unduhan_dikenali_per_komponen() {
        let induk = folder_induk();
        assert!(crate::klien::milik_unduhan(&induk.join("version-9ac8595712b447a7")));
        assert!(!crate::klien::milik_unduhan(&induk));
        assert!(!crate::klien::milik_unduhan(&induk.join("a").join("b")));
        let tetangga = PathBuf::from(format!("{}-lain", induk.display())).join("version-x");
        assert!(!crate::klien::milik_unduhan(&tetangga));
    }
}
