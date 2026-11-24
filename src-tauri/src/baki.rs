use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

const ID: &str = "cam";

static TAMPIL: Mutex<Option<(Vec<(String, String)>, Vec<(String, String)>)>> = Mutex::new(None);

pub fn segarkan_paksa(app: &AppHandle) {
    *TAMPIL.lock().unwrap_or_else(|e| e.into_inner()) = None;
    segarkan(app);
}

fn isi(app: &AppHandle) -> (Vec<(String, String)>, Vec<(String, String)>) {
    let st = app.state::<crate::AppState>();
    let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
    (
        s.folder.iter().map(|f| (f.id.clone(), f.nama.clone())).collect(),
        s.server_tersimpan.iter().map(|x| (x.id.clone(), x.nama.clone())).collect(),
    )
}

fn menu(app: &AppHandle, (folder, server): &(Vec<(String, String)>, Vec<(String, String)>)) -> tauri::Result<Menu<tauri::Wry>> {
    let m = Menu::new(app)?;
    use crate::bahasa::pilih;
    m.append(&MenuItem::with_id(app, "tampil", pilih("Show Chudai Account Manager", "Tampilkan Chudai Account Manager"), true, None::<&str>)?)?;
    m.append(&PredefinedMenuItem::separator(app)?)?;
    let sub = Submenu::with_id(app, "folder", pilih("Launch folder", "Luncurkan folder"), !folder.is_empty())?;
    for (id, nama) in folder {
        sub.append(&MenuItem::with_id(app, format!("folder:{id}"), nama, true, None::<&str>)?)?;
    }
    m.append(&sub)?;
    let sub = Submenu::with_id(app, "server", pilih("Saved servers", "Server tersimpan"), !server.is_empty())?;
    for (id, nama) in server {
        sub.append(&MenuItem::with_id(app, format!("server:{id}"), nama, true, None::<&str>)?)?;
    }
    m.append(&sub)?;
    m.append(&PredefinedMenuItem::separator(app)?)?;
    m.append(&MenuItem::with_id(app, "tutup", pilih("Close all clients", "Tutup semua klien"), true, None::<&str>)?)?;
    m.append(&MenuItem::with_id(app, "akhiri", pilih("End all Roblox", "Akhiri semua Roblox"), true, None::<&str>)?)?;
    m.append(&PredefinedMenuItem::separator(app)?)?;
    m.append(&MenuItem::with_id(app, "keluar", pilih("Quit", "Keluar"), true, None::<&str>)?)?;
    Ok(m)
}

pub fn tampilkan(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        crate::pengaman::target_memori(&w, false);
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn ke_ui(app: &AppHandle, jenis: &str, id: &str) {
    tampilkan(app);
    if let Some(w) = app.get_webview_window("main") {
        let arg = serde_json::to_string(&[jenis, id]).unwrap_or_default();
        let _ = w.eval(&format!("window.__camTray && window.__camTray(...{arg})"));
    }
}

fn segarkan(app: &AppHandle) {
    let baru = isi(app);
    if TAMPIL.lock().unwrap_or_else(|e| e.into_inner()).as_ref() == Some(&baru) {
        return;
    }
    if let (Some(t), Ok(m)) = (app.tray_by_id(ID), menu(app, &baru)) {
        if t.set_menu(Some(m)).is_ok() {
            *TAMPIL.lock().unwrap_or_else(|e| e.into_inner()) = Some(baru);
        }
    }
}

fn pilih(app: &AppHandle, id: &str) {
    match id {
        "tampil" => tampilkan(app),
        "keluar" => app.exit(0),
        "tutup" | "akhiri" => {
            let h = app.clone();
            let paksa = id == "akhiri";
            std::thread::spawn(move || {
                let st = h.state::<crate::AppState>();
                let n = crate::tutup_semua_klien_inti(&st.pelacak, paksa);
                st.pelacak.catat(
                    format!("Tray: {} {n} Roblox client{}; pending rejoins cancelled.", if paksa { "ended" } else { "closed" }, if n == 1 { "" } else { "s" }),
                    "info",
                );
            });
        }
        lain => {
            if let Some(f) = lain.strip_prefix("folder:") {
                ke_ui(app, "folder", f);
            } else if let Some(s) = lain.strip_prefix("server:") {
                ke_ui(app, "server", s);
            }
        }
    }
}

pub fn pasang(app: &AppHandle) -> tauri::Result<()> {
    let awal = isi(app);
    let mut b = TrayIconBuilder::with_id(ID)
        .tooltip("Chudai Account Manager")
        .menu(&menu(app, &awal)?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| pilih(app, e.id().as_ref()))
        .on_tray_icon_event(|t, e| match e {
            TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } => tampilkan(t.app_handle()),
            TrayIconEvent::Enter { .. } => segarkan(t.app_handle()),
            _ => {}
        });
    if let Some(ikon) = app.default_window_icon() {
        b = b.icon(ikon.clone());
    }
    b.build(app)?;
    *TAMPIL.lock().unwrap_or_else(|e| e.into_inner()) = Some(awal);
    Ok(())
}
