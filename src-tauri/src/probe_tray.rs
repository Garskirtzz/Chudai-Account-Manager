use crate::{launcher, pengaman, sumber};
use std::io::Write;
use std::time::{Duration, Instant};
use tauri::WebviewWindow;
use webview2_com::ExecuteScriptCompletedHandler;
use windows_core::HSTRING;

const BLOK: usize = 3;
const PEMANASAN_DTK: u64 = 90;
const TERLIHAT_DTK: u64 = 30;
const TERSEMBUNYI_DTK: u64 = 120;

struct Kondisi {
    nama: &'static str,
    target_rendah: bool,
    halaman_tersembunyi: bool,
}

const KONDISI: [Kondisi; 3] = [
    Kondisi { nama: "tersembunyi", target_rendah: false, halaman_tersembunyi: false },
    Kondisi { nama: "target rendah", target_rendah: true, halaman_tersembunyi: false },
    Kondisi { nama: "target rendah + halaman", target_rendah: true, halaman_tersembunyi: true },
];

fn atur_halaman(w: &WebviewWindow, terlihat: bool) -> Result<(), String> {
    w.with_webview(move |pv| {
        if let Err(e) = unsafe { pv.controller().SetIsVisible(terlihat) } {
            crate::store::catat_kejadian(&format!("probe tray: SetIsVisible gagal: {e}"));
        }
    })
    .map_err(|e| e.to_string())
}

async fn baca_halaman(w: &WebviewWindow) -> Result<(String, f64), String> {
    let (kirim, terima) = tokio::sync::oneshot::channel();
    let mulai = Instant::now();
    w.with_webview(move |pv| {
        unsafe {
            let Ok(wv) = pv.controller().CoreWebView2() else { return };
            let selesai = ExecuteScriptCompletedHandler::create(Box::new(move |_, isi| {
                let _ = kirim.send(isi);
                Ok(())
            }));
            if let Err(e) = wv.ExecuteScript(&HSTRING::from("document.visibilityState"), &selesai) {
                crate::store::catat_kejadian(&format!("probe tray: ExecuteScript gagal: {e}"));
            }
        }
    })
    .map_err(|e| e.to_string())?;
    let isi = tokio::time::timeout(Duration::from_secs(30), terima)
        .await
        .map_err(|_| "halaman tidak menjawab dalam 30 detik".to_string())?
        .map_err(|_| "jawaban halaman hilang".to_string())?;
    Ok((isi, mulai.elapsed().as_secs_f64() * 1000.0))
}

fn mb(b: u64) -> f64 {
    b as f64 / 1_048_576.0
}

fn tulis_sampel(f: &mut std::fs::File, blok: usize, fase: &str, detik: u64) -> std::io::Result<()> {
    let anak = launcher::keturunan(std::process::id());
    let snap = sumber::snapshot();
    let kompresi = snap.iter().find(|p| p.nama == "Memory Compression").map_or(0, |p| p.working_set);
    let wv: Vec<_> = snap.iter().filter(|p| anak.contains(&p.pid) && p.nama.eq_ignore_ascii_case("msedgewebview2.exe")).collect();
    writeln!(
        f,
        "{blok},{fase},{detik},{},{:.1},{:.1},{:.1},{},{},{:.1}",
        wv.len(),
        mb(wv.iter().map(|p| p.working_set).sum()),
        mb(wv.iter().map(|p| p.privat).sum()),
        mb(wv.iter().map(|p| p.privat_ram).sum()),
        wv.iter().map(|p| p.waktu_cpu).sum::<u64>() / 10_000,
        wv.iter().map(|p| u64::from(p.hard_fault)).sum::<u64>(),
        mb(kompresi),
    )
}

async fn sampel_selama(f: &mut std::fs::File, blok: usize, fase: &str, dtk: u64) -> Result<(), String> {
    for i in 1..=dtk {
        tokio::time::sleep(Duration::from_secs(1)).await;
        tulis_sampel(f, blok, fase, i).map_err(|e| e.to_string())?;
    }
    Ok(())
}

async fn inti(w: &WebviewWindow, csv: &str) -> Result<(), String> {
    let mut f = std::fs::OpenOptions::new().create_new(true).write(true).open(csv).map_err(|e| format!("{csv}: {e}"))?;
    let mut catatan = std::fs::File::create(format!("{csv}.log")).map_err(|e| e.to_string())?;
    writeln!(f, "blok,fase,detik,proses,ws_mb,privat_mb,privat_ram_mb,cpu_ms,hard_fault,kompresi_mb").map_err(|e| e.to_string())?;
    let _ = w.set_always_on_bottom(true);
    sampel_selama(&mut f, 0, "pemanasan", PEMANASAN_DTK).await?;

    let benih: u64 = rand::random::<u32>().into();
    let mut acak = <rand::rngs::StdRng as rand::SeedableRng>::seed_from_u64(benih);
    writeln!(catatan, "benih {benih}").map_err(|e| e.to_string())?;
    for blok in 1..=BLOK {
        let mut urutan: Vec<usize> = (0..KONDISI.len()).collect();
        rand::seq::SliceRandom::shuffle(&mut urutan[..], &mut acak);
        for i in urutan {
            let k = &KONDISI[i];
            let _ = w.show();
            pengaman::target_memori(w, false);
            atur_halaman(w, true)?;
            let (status, ms) = baca_halaman(w).await?;
            writeln!(catatan, "blok {blok} sebelum {}: terlihat={status} jawab_ms={ms:.0}", k.nama).map_err(|e| e.to_string())?;
            sampel_selama(&mut f, blok, "terlihat", TERLIHAT_DTK).await?;

            let _ = w.hide();
            pengaman::target_memori(w, k.target_rendah);
            atur_halaman(w, !k.halaman_tersembunyi)?;
            let (status, ms) = baca_halaman(w).await?;
            writeln!(catatan, "blok {blok} {}: status={status} jawab_ms={ms:.0}", k.nama).map_err(|e| e.to_string())?;
            sampel_selama(&mut f, blok, k.nama, TERSEMBUNYI_DTK).await?;
        }
    }
    Ok(())
}

async fn inti_segar(app: &tauri::AppHandle, w: &WebviewWindow, csv: &str, mode: &str, ulang: usize) -> Result<(), String> {
    let baru = !std::path::Path::new(csv).exists();
    let mut f = std::fs::OpenOptions::new().create(true).append(true).open(csv).map_err(|e| format!("{csv}: {e}"))?;
    if baru {
        writeln!(f, "blok,fase,detik,proses,ws_mb,privat_mb,privat_ram_mb,cpu_ms,hard_fault,kompresi_mb").map_err(|e| e.to_string())?;
    }
    let _ = w.set_always_on_bottom(true);
    sampel_selama(&mut f, ulang, "pemanasan", PEMANASAN_DTK).await?;
    match mode {
        "tutup" => w.close().map_err(|e| e.to_string())?,
        _ => w.hide().map_err(|e| e.to_string())?,
    }
    tokio::time::sleep(Duration::from_millis(500)).await;
    let tersembunyi = !w.is_visible().map_err(|e| e.to_string())?;
    sampel_selama(&mut f, ulang, mode, 180).await?;
    crate::baki::tampilkan(app);
    tokio::time::sleep(Duration::from_millis(500)).await;
    let terlihat = w.is_visible().map_err(|e| e.to_string())?;
    let (status, ms) = baca_halaman(w).await?;
    let mut catatan = std::fs::OpenOptions::new().create(true).append(true).open(format!("{csv}.log")).map_err(|e| e.to_string())?;
    writeln!(catatan, "ulang {ulang} {mode}: tersembunyi={tersembunyi} kembali={terlihat} status={status} jawab_ms={ms:.0}").map_err(|e| e.to_string())
}

pub async fn segar(app: tauri::AppHandle, csv: String, mode: String, ulang: usize) {
    use tauri::Manager;
    let st = app.state::<crate::AppState>();
    let asli = {
        let mut s = st.store.lock().unwrap_or_else(|e| e.into_inner());
        std::mem::replace(&mut s.tutup_ke_tray, mode == "tutup")
    };
    let hasil = match app.get_webview_window("main") {
        Some(w) => inti_segar(&app, &w, &csv, &mode, ulang).await,
        None => Err("jendela utama tidak ada".into()),
    };
    {
        let mut s = st.store.lock().unwrap_or_else(|e| e.into_inner());
        s.tutup_ke_tray = asli;
        if let Err(e) = s.save() {
            crate::store::catat_kejadian(&format!("probe tray: gagal menyimpan: {e}"));
        }
    }
    if let Err(e) = hasil {
        let _ = std::fs::write(format!("{csv}.galat"), e);
    }
    app.exit(0);
}

pub async fn jalankan(app: tauri::AppHandle, csv: String) {
    use tauri::Manager;
    let hasil = match app.get_webview_window("main") {
        Some(w) => inti(&w, &csv).await,
        None => Err("jendela utama tidak ada".into()),
    };
    if let Err(e) = hasil {
        let _ = std::fs::write(format!("{csv}.galat"), e);
    }
    app.exit(0);
}
