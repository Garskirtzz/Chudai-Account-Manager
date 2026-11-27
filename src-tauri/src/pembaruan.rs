use serde::Serialize;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Clone, Default)]
pub struct InfoUpdate {
    pub versi: String,
    pub catatan: String,
    pub tanggal: String,
}

#[derive(Serialize, Clone)]
pub struct Kemajuan {
    pub tahap: &'static str,
    pub diunduh: u64,
    pub total: u64,
    pub pesan: String,
}

static KEMAJUAN: Mutex<Kemajuan> = Mutex::new(Kemajuan { tahap: "diam", diunduh: 0, total: 0, pesan: String::new() });

fn setel(tahap: &'static str, diunduh: u64, total: u64, pesan: String) {
    if let Ok(mut k) = KEMAJUAN.lock() {
        *k = Kemajuan { tahap, diunduh, total, pesan };
    }
}

fn pesan(e: tauri_plugin_updater::Error) -> String {
    let t = e.to_string();
    let l = t.to_ascii_lowercase();
    if l.contains("signature") {
        "The downloaded update failed the signature check and was not installed.".into()
    } else if l.contains("dns") || l.contains("connect") || l.contains("timed out") || l.contains("network") || l.contains("request") {
        "You may be offline, or GitHub is unreachable.".into()
    } else {
        format!("Update failed: {t}")
    }
}

#[tauri::command]
pub async fn cek_update(app: AppHandle) -> Result<Option<InfoUpdate>, String> {
    let u = app.updater().map_err(pesan)?;
    match u.check().await.map_err(pesan)? {
        Some(up) => Ok(Some(InfoUpdate {
            versi: up.version.clone(),
            catatan: up.body.clone().unwrap_or_default(),
            tanggal: up.date.map(|d| d.date().to_string()).unwrap_or_default(),
        })),
        None => Ok(None),
    }
}

const MACET: std::time::Duration = std::time::Duration::from_secs(120);
const PESAN_MACET: &str = "The download stopped: no data arrived for 2 minutes. Check the connection and try again.";

#[derive(Clone)]
struct JamData {
    mulai: std::time::Instant,
    terakhir: std::sync::Arc<std::sync::atomic::AtomicU64>,
}

impl JamData {
    fn baru() -> Self {
        Self { mulai: std::time::Instant::now(), terakhir: std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0)) }
    }
    fn kini(&self) -> u64 {
        self.mulai.elapsed().as_millis() as u64
    }
    fn ada_data(&self) {
        self.terakhir.store(self.kini(), std::sync::atomic::Ordering::Relaxed);
    }
    fn terakhir(&self) -> u64 {
        self.terakhir.load(std::sync::atomic::Ordering::Relaxed)
    }
}

fn macet(tahap: &str, data_terakhir_ms: u64, kini: u64, batas: std::time::Duration) -> bool {
    tahap == "mengunduh" && kini.saturating_sub(data_terakhir_ms) > batas.as_millis() as u64
}

fn sedang_berjalan(tahap: &str) -> bool {
    tahap == "mengunduh" || tahap == "memasang"
}

async fn dengan_penjaga<F>(kerja: F, jam: JamData, periksa: std::time::Duration, batas: std::time::Duration, tahap: impl Fn() -> &'static str) -> Result<(), String>
where
    F: std::future::Future<Output = Result<(), String>>,
{
    let jaga = async {
        loop {
            tokio::time::sleep(periksa).await;
            if macet(tahap(), jam.terakhir(), jam.kini(), batas) {
                return;
            }
        }
    };
    tokio::select! {
        h = kerja => h,
        _ = jaga => Err(PESAN_MACET.to_string()),
    }
}

#[tauri::command]
pub fn pasang_update(app: AppHandle) -> Result<(), String> {
    if !crate::launcher::pid_klien().is_empty() {
        return Err("Close all Roblox clients first. Installing the update closes Chudai Account Manager, which would also close running clients.".into());
    }
    if KEMAJUAN.lock().map(|k| sedang_berjalan(k.tahap)).unwrap_or(false) {
        return Ok(());
    }
    setel("mengunduh", 0, 0, String::new());
    tauri::async_runtime::spawn(async move {
        let jam = JamData::baru();
        let jam_data = jam.clone();
        let kerja = async {
            let up = app
                .updater()
                .map_err(pesan)?
                .check()
                .await
                .map_err(pesan)?
                .ok_or_else(|| "No update is available any more.".to_string())?;
            let mut diunduh = 0u64;
            up.download_and_install(
                |potong, total| {
                    diunduh += potong as u64;
                    jam_data.ada_data();
                    setel("mengunduh", diunduh, total.unwrap_or(0), String::new());
                },
                || setel("memasang", 0, 0, String::new()),
            )
            .await
            .map_err(pesan)?;
            app.restart();
            #[allow(unreachable_code)]
            Ok::<(), String>(())
        };
        let hasil = dengan_penjaga(kerja, jam, std::time::Duration::from_secs(5), MACET, || {
            KEMAJUAN.lock().map(|k| k.tahap).unwrap_or("diam")
        })
        .await;
        if let Err(e) = hasil {
            setel("galat", 0, 0, e);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn status_update() -> Kemajuan {
    KEMAJUAN.lock().map(|k| k.clone()).unwrap_or(Kemajuan { tahap: "diam", diunduh: 0, total: 0, pesan: String::new() })
}

const REPO: &str = "https://github.com/Garskirtzz/Chudai-Account-Manager";

#[tauri::command]
pub fn buka_repo() -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .arg(REPO)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Couldn't open the browser: {e}"))
}
