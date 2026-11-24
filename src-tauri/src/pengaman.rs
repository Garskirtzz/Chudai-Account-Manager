use tauri::Url;
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2, ICoreWebView2Environment7, ICoreWebView2ProcessFailedEventArgs2, ICoreWebView2Settings3,
    ICoreWebView2Settings4, ICoreWebView2_19, ICoreWebView2_2, COREWEBVIEW2_COOKIE_SAME_SITE_KIND_LAX,
    COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
    COREWEBVIEW2_PROCESS_FAILED_KIND, COREWEBVIEW2_PROCESS_FAILED_REASON, COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL,
};
use webview2_com::{NavigationStartingEventHandler, ProcessFailedEventHandler, WebResourceRequestedEventHandler};
use windows_core::{Interface, HSTRING, PWSTR};

const VAR_WEBVIEW2: [&str; 5] = [
    "WEBVIEW2_BROWSER_EXECUTABLE_FOLDER",
    "WEBVIEW2_USER_DATA_FOLDER",
    "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
    "WEBVIEW2_RELEASE_CHANNELS",
    "WEBVIEW2_CHANNEL_SEARCH_KIND",
];

pub fn bersihkan_env() -> Vec<&'static str> {
    let ada: Vec<&'static str> = VAR_WEBVIEW2.into_iter().filter(|v| std::env::var_os(v).is_some()).collect();
    for v in &ada {
        std::env::remove_var(v);
    }
    ada
}

fn host_roblox(h: &str) -> bool {
    h == "roblox.com" || h.ends_with(".roblox.com")
}

pub fn izin_login(url: &Url) -> bool {
    if url.as_str() == "about:blank" {
        return true;
    }
    url.scheme() == "https"
        && url.username().is_empty()
        && url.password().is_none()
        && url.port().is_none()
        && url.host_str().is_some_and(|h| {
            host_roblox(h) || ["apple.com", "google.com"].iter().any(|d| h == *d || h.ends_with(&format!(".{d}")))
        })
}

pub fn izin_utama(url: &Url) -> bool {
    let host = url.host_str();
    (host == Some("tauri.localhost") && url.port().is_none() && url.username().is_empty())
        || url.scheme() == "tauri"
        || (cfg!(dev) && host == Some("localhost"))
}

fn teks(p: PWSTR) -> String {
    webview2_com::take_pwstr(p)
}

fn nama_jenis(k: COREWEBVIEW2_PROCESS_FAILED_KIND) -> &'static str {
    match k.0 {
        0 => "browser process exited",
        1 => "render process exited",
        2 => "render process unresponsive",
        3 => "frame render process exited",
        4 => "utility process exited",
        5 => "sandbox helper exited",
        6 => "GPU process exited",
        7 => "PPAPI plugin exited",
        8 => "PPAPI broker exited",
        _ => "unknown process exited",
    }
}

fn nama_sebab(r: COREWEBVIEW2_PROCESS_FAILED_REASON) -> &'static str {
    match r.0 {
        0 => "unexpected",
        1 => "unresponsive",
        2 => "terminated",
        3 => "crashed",
        4 => "launch failed",
        5 => "out of memory",
        6 => "profile deleted",
        _ => "other",
    }
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Jenis {
    Utama,
    Login,
    Situs,
}

pub fn target_memori(w: &tauri::WebviewWindow, rendah: bool) {
    let level = if rendah { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW } else { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL };
    let hasil = w.with_webview(move |pv| {
        let r = unsafe { pv.controller().CoreWebView2().and_then(|wv| wv.cast::<ICoreWebView2_19>()).and_then(|wv| wv.SetMemoryUsageTargetLevel(level)) };
        if let Err(e) = r {
            crate::store::catat_kejadian(&format!("WebView2 memory target not set: {e}"));
        }
    });
    if let Err(e) = hasil {
        crate::store::catat_kejadian(&format!("WebView2 memory target not set: {e}"));
    }
}

pub fn keraskan(pv: &tauri::webview::PlatformWebview, jenis: Jenis, profil: Option<&std::path::Path>) -> Result<(), String> {
    let r: windows_core::Result<Result<(), String>> = (|| unsafe {
        let wv: ICoreWebView2 = pv.controller().CoreWebView2()?;
        let s = wv.Settings()?;
        if let Ok(s3) = s.cast::<ICoreWebView2Settings3>() {
            s3.SetAreBrowserAcceleratorKeysEnabled(false)?;
        }
        if jenis != Jenis::Utama {
            s.SetAreDefaultContextMenusEnabled(false)?;
            s.SetAreDevToolsEnabled(false)?;
            if let Ok(s4) = s.cast::<ICoreWebView2Settings4>() {
                s4.SetIsPasswordAutosaveEnabled(false)?;
                s4.SetIsGeneralAutofillEnabled(false)?;
            }
        }

        let izin: fn(&Url) -> bool = if jenis == Jenis::Utama { izin_utama } else { izin_login };
        let label = match jenis {
            Jenis::Utama => "main window",
            Jenis::Login => "sign-in window",
            Jenis::Situs => "roblox.com window",
        };
        let penjaga = NavigationStartingEventHandler::create(Box::new(move |_, args| {
            if let Some(args) = args {
                let mut p = PWSTR::null();
                args.Uri(&mut p)?;
                let uri = teks(p);
                let url = uri.parse::<Url>();
                if !url.as_ref().is_ok_and(izin) {
                    args.SetCancel(true)?;
                    let ringkas = url.map(|u| format!("{}://{}", u.scheme(), u.host_str().unwrap_or(""))).unwrap_or_else(|_| "(unparseable)".into());
                    crate::store::catat_kejadian(&format!("Blocked navigation in the {label} to {ringkas}"));
                }
            }
            Ok(())
        }));
        let mut token = 0i64;
        wv.add_NavigationStarting(&penjaga, &mut token)?;

        let catat = ProcessFailedEventHandler::create(Box::new(move |_, args| {
            if let Some(args) = args {
                let mut k = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
                let _ = args.ProcessFailedKind(&mut k);
                let mut baris = format!("WebView2 failure in the {label}: {}", nama_jenis(k));
                if let Ok(a2) = args.cast::<ICoreWebView2ProcessFailedEventArgs2>() {
                    let mut r = COREWEBVIEW2_PROCESS_FAILED_REASON::default();
                    let mut kode = 0i32;
                    let _ = a2.Reason(&mut r);
                    let _ = a2.ExitCode(&mut kode);
                    let mut desk = PWSTR::null();
                    let _ = a2.ProcessDescription(&mut desk);
                    let desk = teks(desk);
                    baris.push_str(&format!(" ({}, exit code {kode:#x}{})", nama_sebab(r), if desk.is_empty() { String::new() } else { format!(", {desk}") }));
                }
                crate::store::catat_kejadian(&baris);
            }
            Ok(())
        }));
        let mut token2 = 0i64;
        wv.add_ProcessFailed(&catat, &mut token2)?;

        if let Some(profil) = profil {
            if let Ok(env7) = pv.environment().cast::<ICoreWebView2Environment7>() {
                let mut p = PWSTR::null();
                env7.UserDataFolder(&mut p)?;
                let dipakai = teks(p);
                let sama = std::path::Path::new(&dipakai).canonicalize().ok() == profil.canonicalize().ok();
                if !sama {
                    return Ok(Err(format!(
                        "The sign-in window was redirected to another browser profile ({dipakai}) by a \
                         WebView2 policy on this PC, so it was closed to keep accounts apart."
                    )));
                }
            }
        }
        Ok(Ok(()))
    })();
    match r {
        Ok(x) => x,
        Err(e) => Err(format!("WebView2 setup failed: {e}")),
    }
}

const POLA_KELUAR: [&str; 2] = ["https://auth.roblox.com/v1/logout*", "https://auth.roblox.com/v2/logout*"];

fn cocok_pola(pola: &str, uri: &str) -> bool {
    let (p, u) = (pola.to_ascii_lowercase(), uri.to_ascii_lowercase());
    match p.strip_suffix('*') {
        Some(awal) => u.starts_with(awal),
        None => u == p,
    }
}

unsafe fn pasang_cookie_situs(wv: &ICoreWebView2, cookie: &str) -> windows_core::Result<()> {
    let mgr = wv.cast::<ICoreWebView2_2>()?.CookieManager()?;
    let c = mgr.CreateCookie(
        &HSTRING::from(".ROBLOSECURITY"),
        &HSTRING::from(cookie),
        &HSTRING::from(".roblox.com"),
        &HSTRING::from("/"),
    )?;
    c.SetIsHttpOnly(true)?;
    c.SetIsSecure(true)?;
    c.SetSameSite(COREWEBVIEW2_COOKIE_SAME_SITE_KIND_LAX)?;
    mgr.AddOrUpdateCookie(&c)
}

pub async fn ganti_cookie_uji(w: &tauri::WebviewWindow, cookie: String) -> Result<(), String> {
    let (kirim, terima) = tokio::sync::oneshot::channel();
    w.with_webview(move |pv| {
        let r = unsafe { pv.controller().CoreWebView2().and_then(|wv| pasang_cookie_situs(&wv, &cookie)) };
        let _ = kirim.send(r.map_err(|e| e.to_string()));
    })
    .map_err(|e| e.to_string())?;
    terima.await.unwrap_or(Err("jendela tertutup".into()))
}

fn siapkan_situs(pv: &tauri::webview::PlatformWebview, cookie: &str, pola_uji: &[String]) -> windows_core::Result<u32> {
    unsafe {
        let wv: ICoreWebView2 = pv.controller().CoreWebView2()?;
        let env = pv.environment();
        let mut pola: Vec<String> = POLA_KELUAR.iter().map(|s| s.to_string()).collect();
        pola.extend(pola_uji.iter().cloned());
        for p in &pola {
            wv.AddWebResourceRequestedFilter(&HSTRING::from(p.as_str()), COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL)?;
        }
        let blokir = WebResourceRequestedEventHandler::create(Box::new(move |_, args| {
            if let Some(args) = args {
                let mut p = PWSTR::null();
                args.Request()?.Uri(&mut p)?;
                let uri = teks(p);
                if pola.iter().any(|x| cocok_pola(x, &uri)) {
                    let jawab = env.CreateWebResourceResponse(
                        None,
                        403,
                        &HSTRING::from("Blocked by Chudai Account Manager"),
                        &HSTRING::from("Content-Type: application/json"),
                    )?;
                    args.SetResponse(&jawab)?;
                    crate::store::catat_kejadian("Blocked a Roblox sign-out in the roblox.com window (it would end the stored session).");
                }
            }
            Ok(())
        }));
        let mut token = 0i64;
        wv.add_WebResourceRequested(&blokir, &mut token)?;

        pasang_cookie_situs(&wv, cookie)?;

        let mut pid = 0u32;
        wv.BrowserProcessId(&mut pid)?;
        Ok(pid)
    }
}

pub async fn siapkan_situs_jendela(
    w: &tauri::WebviewWindow,
    profil: std::path::PathBuf,
    cookie: String,
    pola_uji: Vec<String>,
) -> Result<u32, String> {
    let (kirim, terima) = tokio::sync::oneshot::channel();
    w.with_webview(move |pv| {
        let r = keraskan(&pv, Jenis::Situs, Some(&profil))
            .and_then(|_| siapkan_situs(&pv, &cookie, &pola_uji).map_err(|e| format!("WebView2 setup failed: {e}")));
        let _ = kirim.send(r);
    })
    .map_err(|e| format!("WebView2 setup failed: {e}"))?;
    terima.await.unwrap_or(Err("The window closed before it was ready.".into()))
}

pub async fn keraskan_jendela(w: &tauri::WebviewWindow, jenis: Jenis, profil: Option<std::path::PathBuf>) -> Result<(), String> {
    let (kirim, terima) = tokio::sync::oneshot::channel();
    w.with_webview(move |pv| {
        let _ = kirim.send(keraskan(&pv, jenis, profil.as_deref()));
    })
    .map_err(|e| format!("WebView2 setup failed: {e}"))?;
    terima.await.unwrap_or(Err("The window closed before it was ready.".into()))
}

#[cfg(test)]
mod tes {
    use super::*;

    fn u(s: &str) -> Url {
        s.parse().unwrap()
    }

    #[test]
    fn login_hanya_roblox_dan_penyedia_masuk() {
        for ok in [
            "https://www.roblox.com/login",
            "https://roblox.com/",
            "https://auth.roblox.com/v2/login",
            "https://appleid.apple.com/auth/authorize",
            "https://accounts.google.com/o/oauth2",
            "about:blank",
        ] {
            assert!(izin_login(&u(ok)), "{ok}");
        }
        for bad in [
            "http://www.roblox.com/login",
            "https://www.roblox.com.evil.example/login",
            "https://evilroblox.com/",
            "https://www.roblox.com:8443/",
            "https://user@www.roblox.com/",
            "https://example.com/",
            "https://notapple.com/",
            "file:///C:/Windows/win.ini",
            "http://tauri.localhost/",
            "javascript:alert(1)",
        ] {
            assert!(!izin_login(&u(bad)), "{bad}");
        }
    }

    #[test]
    fn pola_keluar_roblox() {
        let kena = |u: &str| POLA_KELUAR.iter().any(|p| cocok_pola(p, u));
        assert!(kena("https://auth.roblox.com/v2/logout"));
        assert!(kena("https://auth.roblox.com/v1/logoutfromallsessionsandreauthenticate"));
        assert!(kena("https://AUTH.roblox.com/v2/Logout?x=1"));
        assert!(!kena("https://auth.roblox.com/v2/login"));
        assert!(!kena("https://www.roblox.com/logout"));
        assert!(!kena("https://auth.roblox.com.evil.example/v2/logout"));
    }

    #[test]
    fn utama_hanya_halaman_cam() {
        assert!(izin_utama(&u("http://tauri.localhost/index.html")));
        assert!(izin_utama(&u("https://tauri.localhost/")));
        assert!(!izin_utama(&u("https://www.roblox.com/")));
        assert!(!izin_utama(&u("http://tauri.localhost:8080/")));
        assert!(!izin_utama(&u("https://tauri.localhost.evil.example/")));
    }

    #[test]
    fn env_webview2_dibuang() {
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--remote-debugging-port=9222");
        let ada = bersihkan_env();
        assert!(ada.contains(&"WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"));
        assert!(std::env::var_os("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_none());
    }
}
