use std::io::{Read, Write};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tauri::Manager;

pub const ID_APLIKASI: &str = "1565723721597980672";
const GAMBAR: &str = "chudai";

const OP_SALAM: u32 = 0;
const OP_PERINTAH: u32 = 1;
const OP_TUTUP: u32 = 2;
const OP_PING: u32 = 3;
const OP_PONG: u32 = 4;

const JEDA_KIRIM: Duration = Duration::from_millis(4500);
const DENYUT: Duration = Duration::from_secs(1);
const COBA_LAGI: Duration = Duration::from_secs(5);
const BATAS_JAWAB: Duration = Duration::from_secs(5);

static HALAMAN: Mutex<String> = Mutex::new(String::new());

pub fn set_halaman(nama: &str) {
    let nama: String = nama.chars().filter(|c| c.is_alphanumeric() || *c == ' ').take(32).collect();
    *HALAMAN.lock().unwrap_or_else(|e| e.into_inner()) = nama.trim().to_string();
}

fn halaman() -> String {
    HALAMAN.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

pub fn bingkai(op: u32, isi: &Value) -> Vec<u8> {
    let teks = isi.to_string();
    let mut b = Vec::with_capacity(8 + teks.len());
    b.extend_from_slice(&op.to_le_bytes());
    b.extend_from_slice(&(teks.len() as u32).to_le_bytes());
    b.extend_from_slice(teks.as_bytes());
    b
}

pub fn teks_status(main: bool, halaman: &str, indonesia: bool) -> String {
    use crate::bahasa::pilih_untuk;
    if main {
        pilih_untuk(indonesia, "Playing Roblox with Chudai", "Bermain Roblox dengan Chudai").to_string()
    } else if halaman.is_empty() {
        pilih_untuk(indonesia, "Managing Roblox accounts", "Mengelola akun Roblox").to_string()
    } else {
        pilih_untuk(indonesia, &format!("Viewing {halaman}"), &format!("Melihat {halaman}")).to_string()
    }
}

pub fn teks_jumlah(n: usize, indonesia: bool) -> Option<String> {
    use crate::bahasa::pilih_untuk;
    match n {
        0 => None,
        1 => Some(pilih_untuk(indonesia, "1 client open", "1 klien terbuka").to_string()),
        n => Some(pilih_untuk(indonesia, &format!("{n} clients open"), &format!("{n} klien terbuka")).to_string()),
    }
}

pub fn aktivitas(teks: &str, baris2: Option<&str>, sejak: i64) -> Value {
    let mut a = json!({
        "details": teks,
        "timestamps": { "start": sejak },
        "assets": { "large_image": GAMBAR, "large_text": "Chudai" },
    });
    if let Some(b) = baris2 {
        a["state"] = json!(b);
    }
    a
}

trait Saluran: Read + Write {
    fn tersedia(&mut self) -> std::io::Result<usize>;
    fn intip(&mut self, buf: &mut [u8]) -> std::io::Result<usize>;
}

#[link(name = "kernel32")]
extern "system" {
    fn PeekNamedPipe(pipa: isize, buf: *mut u8, ukuran: u32, dibaca: *mut u32, tersedia: *mut u32, sisa_pesan: *mut u32) -> i32;
}

struct Pipa(std::fs::File);

impl Read for Pipa {
    fn read(&mut self, b: &mut [u8]) -> std::io::Result<usize> {
        self.0.read(b)
    }
}
impl Write for Pipa {
    fn write(&mut self, b: &[u8]) -> std::io::Result<usize> {
        self.0.write(b)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.0.flush()
    }
}
impl Saluran for Pipa {
    fn tersedia(&mut self) -> std::io::Result<usize> {
        let mut ada = 0u32;
        let h = std::os::windows::io::AsRawHandle::as_raw_handle(&self.0) as isize;
        if unsafe { PeekNamedPipe(h, std::ptr::null_mut(), 0, std::ptr::null_mut(), &mut ada, std::ptr::null_mut()) } == 0 {
            return Err(std::io::Error::last_os_error());
        }
        Ok(ada as usize)
    }
    fn intip(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let (mut dibaca, mut ada) = (0u32, 0u32);
        let h = std::os::windows::io::AsRawHandle::as_raw_handle(&self.0) as isize;
        if unsafe { PeekNamedPipe(h, buf.as_mut_ptr(), buf.len() as u32, &mut dibaca, &mut ada, std::ptr::null_mut()) } == 0 {
            return Err(std::io::Error::last_os_error());
        }
        Ok(dibaca as usize)
    }
}

struct Koneksi {
    pipa: Box<dyn Saluran + Send>,
}

impl Koneksi {
    fn tulis(&mut self, op: u32, isi: &Value) -> Result<(), String> {
        self.pipa.write_all(&bingkai(op, isi)).map_err(|e| e.to_string())
    }

    fn ambil_siap(&mut self) -> Result<Option<(u32, Value)>, String> {
        let ada = self.pipa.tersedia().map_err(|e| e.to_string())?;
        if ada < 8 {
            return Ok(None);
        }
        let mut kepala = [0u8; 8];
        if self.pipa.intip(&mut kepala).map_err(|e| e.to_string())? < 8 {
            return Ok(None);
        }
        let n = u32::from_le_bytes([kepala[4], kepala[5], kepala[6], kepala[7]]) as usize;
        if n > 64 * 1024 {
            return Err("Discord sent an oversized frame".into());
        }
        if ada < 8 + n {
            return Ok(None);
        }
        let mut semua = vec![0u8; 8 + n];
        self.pipa.read_exact(&mut semua).map_err(|e| e.to_string())?;
        let op = u32::from_le_bytes([semua[0], semua[1], semua[2], semua[3]]);
        let v: Value = serde_json::from_slice(&semua[8..]).unwrap_or(Value::Null);
        if op == OP_TUTUP {
            return Err(format!("Discord closed the connection: {}", v["message"]));
        }
        Ok(Some((op, v)))
    }

    fn kuras(&mut self) -> Result<(), String> {
        while let Some((op, v)) = self.ambil_siap()? {
            if op == OP_PING {
                self.tulis(OP_PONG, &v)?;
            }
        }
        Ok(())
    }

    fn tunggu(&mut self, batas: Duration, cocok: impl Fn(&Value) -> bool) -> Result<Value, String> {
        let akhir = Instant::now() + batas;
        loop {
            match self.ambil_siap()? {
                Some((OP_PING, v)) => self.tulis(OP_PONG, &v)?,
                Some((OP_PONG, _)) => {}
                Some((_, v)) if cocok(&v) => return Ok(v),
                Some(_) => {}
                None if Instant::now() >= akhir => return Err("Discord did not answer".into()),
                None => std::thread::sleep(Duration::from_millis(15)),
            }
        }
    }

    fn kirim(&mut self, aktivitas: &Value, nonce: u64, batas: Duration) -> Result<(), String> {
        self.kuras()?;
        let nonce = nonce.to_string();
        let perintah = json!({
            "cmd": "SET_ACTIVITY",
            "args": { "pid": std::process::id(), "activity": aktivitas },
            "nonce": nonce,
        });
        self.tulis(OP_PERINTAH, &perintah)?;
        let jawab = self.tunggu(batas, |v| v["nonce"] == nonce)?;
        if jawab["evt"] == "ERROR" {
            crate::store::catat_kejadian(&format!("Discord status refused: {}", jawab["data"]["message"]));
        }
        Ok(())
    }
}

fn sambung_pipa(n: u32) -> Option<Koneksi> {
    let pipa = std::fs::OpenOptions::new().read(true).write(true).open(format!(r"\\.\pipe\discord-ipc-{n}")).ok()?;
    let mut k = Koneksi { pipa: Box::new(Pipa(pipa)) };
    k.tulis(OP_SALAM, &json!({ "v": 1, "client_id": ID_APLIKASI })).ok()?;
    k.tunggu(BATAS_JAWAB, |v| v["evt"] == "READY").ok()?;
    Some(k)
}

fn sambung() -> Option<Koneksi> {
    (0..10).find_map(sambung_pipa)
}

fn detik_unix() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

fn jumlah_klien_cam(app: &tauri::AppHandle) -> usize {
    let klien = crate::launcher::klien_terperinci_segar(Duration::from_secs(5));
    if klien.iter().all(|k| k.btid == 0) {
        return 0;
    }
    let s = app.state::<crate::AppState>();
    let s = s.store.lock().unwrap_or_else(|e| e.into_inner());
    klien.iter().filter(|k| k.btid != 0 && s.accounts.iter().any(|a| a.browser_tracker_id == k.btid)).count()
}

pub fn mulai(app: tauri::AppHandle) {
    if ID_APLIKASI.is_empty() {
        return;
    }
    let _ = std::thread::Builder::new().name("discord-status".into()).spawn(move || {
        let mut koneksi: Option<Koneksi> = None;
        let mut terkirim: Option<String> = None;
        let mut kirim_terakhir: Option<Instant> = None;
        let mut coba_terakhir: Option<Instant> = None;
        let mut sejak = (false, detik_unix());
        let buka = detik_unix();
        let mut nonce = 0u64;
        loop {
            std::thread::sleep(DENYUT);
            let mati = {
                let s = app.state::<crate::AppState>();
                let s = s.store.lock().unwrap_or_else(|e| e.into_inner());
                s.discord_kehadiran_mati
            };
            if mati {
                if let Some(mut k) = koneksi.take() {
                    nonce += 1;
                    let _ = k.kirim(&Value::Null, nonce, BATAS_JAWAB);
                }
                terkirim = None;
                continue;
            }
            if koneksi.as_mut().is_some_and(|k| k.kuras().is_err()) {
                koneksi = None;
                terkirim = None;
            }
            let n = jumlah_klien_cam(&app);
            let main = n > 0;
            if main != sejak.0 {
                sejak = (main, if main { detik_unix() } else { buka });
            }
            let id = crate::bahasa::indonesia();
            let teks = teks_status(main, &halaman(), id);
            let baris2 = teks_jumlah(n, id);
            let kunci = format!("{teks}
{}", baris2.as_deref().unwrap_or(""));
            if terkirim.as_deref() == Some(kunci.as_str()) || kirim_terakhir.is_some_and(|t| t.elapsed() < JEDA_KIRIM) {
                continue;
            }
            if koneksi.is_none() {
                if coba_terakhir.is_some_and(|t| t.elapsed() < COBA_LAGI) {
                    continue;
                }
                coba_terakhir = Some(Instant::now());
                koneksi = sambung();
                terkirim = None;
            }
            let Some(k) = koneksi.as_mut() else { continue };
            nonce += 1;
            kirim_terakhir = Some(Instant::now());
            match k.kirim(&aktivitas(&teks, baris2.as_deref(), sejak.1), nonce, BATAS_JAWAB) {
                Ok(()) => terkirim = Some(kunci),
                Err(_) => {
                    koneksi = None;
                    terkirim = None;
                }
            }
        }
    });
}
