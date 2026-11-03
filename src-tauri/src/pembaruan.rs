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

#[tauri::command]
pub fn pasang_update(app: AppHandle) -> Result<(), String> {
    if !crate::launcher::pid_klien().is_empty() {
        return Err("Close all Roblox clients first. Installing the update closes Chudai Account Manager, which would also close running clients.".into());
    }
    if KEMAJUAN.lock().map(|k| k.tahap == "mengunduh" || k.tahap == "memasang").unwrap_or(false) {
        return Ok(());
    }
    setel("mengunduh", 0, 0, String::new());
    tauri::async_runtime::spawn(async move {
        let hasil = async {
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
                    setel("mengunduh", diunduh, total.unwrap_or(0), String::new());
                },
                || setel("memasang", 0, 0, String::new()),
            )
            .await
            .map_err(pesan)?;
            app.restart();
            #[allow(unreachable_code)]
            Ok::<(), String>(())
        }
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
