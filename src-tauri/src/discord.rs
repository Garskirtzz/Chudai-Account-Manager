use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};

const JEDA: Duration = Duration::from_secs(2);
const MAKS_ANTRE: usize = 50;
const MAKS_BARIS: usize = 15;
const MAKS_ISI: usize = 1900;
const MAKS_PER_BARIS: usize = 300;
const HOST: [&str; 6] = ["discord.com", "ptb.discord.com", "canary.discord.com", "discordapp.com", "ptb.discordapp.com", "canary.discordapp.com"];

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Acara {
    #[serde(default = "ya")]
    pub putus: bool,
    #[serde(default = "ya")]
    pub crash: bool,
    #[serde(default = "ya")]
    pub login: bool,
    #[serde(default)]
    pub rejoin: bool,
    #[serde(default = "ya")]
    pub batch: bool,
}

fn ya() -> bool {
    true
}

impl Default for Acara {
    fn default() -> Self {
        Self { putus: true, crash: true, login: true, rejoin: false, batch: true }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Jenis {
    Putus,
    Crash,
    Login,
    Rejoin,
    Batch,
}

impl Jenis {
    fn diminta(self, a: &Acara) -> bool {
        match self {
            Jenis::Putus => a.putus,
            Jenis::Crash => a.crash,
            Jenis::Login => a.login,
            Jenis::Rejoin => a.rejoin,
            Jenis::Batch => a.batch,
        }
    }

    fn ikon(self) -> &'static str {
        match self {
            Jenis::Putus => "🔌",
            Jenis::Crash => "💥",
            Jenis::Login => "🔑",
            Jenis::Rejoin => "🔁",
            Jenis::Batch => "🚀",
        }
    }
}

pub fn urai_webhook(teks: &str) -> Result<(String, String), String> {
    let salah = || "Paste a Discord webhook URL: https://discord.com/api/webhooks/<id>/<token>".to_string();
    let u = reqwest::Url::parse(teks.trim()).map_err(|_| salah())?;
    let host = u.host_str().filter(|h| HOST.contains(h)).ok_or_else(salah)?.to_owned();
    if u.scheme() != "https" || !u.username().is_empty() || u.password().is_some() || u.port().is_some() || u.query().is_some() || u.fragment().is_some() {
        return Err(salah());
    }
    let bagian: Vec<&str> = u.path_segments().ok_or_else(salah)?.collect();
    let [api, webhooks, id, token] = bagian[..] else { return Err(salah()) };
    let id_ok = (1..=25).contains(&id.len()) && id.bytes().all(|b| b.is_ascii_digit());
    let token_ok = (1..=128).contains(&token.len()) && token.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');
    if api != "api" || webhooks != "webhooks" || !id_ok || !token_ok {
        return Err(salah());
    }
    Ok((format!("https://{host}/api/webhooks/{id}/{token}"), id.to_owned()))
}

pub fn samaran(id: &str) -> String {
    format!("…{}", &id[id.len().saturating_sub(4)..])
}

pub fn aman(s: &str) -> String {
    s.chars().fold(String::with_capacity(s.len()), |mut o, c| {
        if c.is_control() {
            o.push(' ');
            return o;
        }
        if matches!(c, '\\' | '*' | '_' | '~' | '`' | '|' | '>' | '[' | ']' | '@' | '#' | ':') {
            o.push('\\');
        }
        o.push(c);
        o
    })
}

fn potong(b: &str) -> String {
    if b.chars().count() <= MAKS_PER_BARIS {
        return b.to_owned();
    }
    b.chars().take(MAKS_PER_BARIS - 1).chain(std::iter::once('…')).collect()
}

pub fn susun(baris: &[String]) -> String {
    let mut isi: Vec<String> = Vec::new();
    let mut panjang = 0;
    for b in baris.iter().take(MAKS_BARIS) {
        let b = potong(b);
        let n = b.encode_utf16().count() + 1;
        if panjang + n > MAKS_ISI {
            break;
        }
        panjang += n;
        isi.push(b);
    }
    if baris.len() > isi.len() {
        isi.push(format!("…and {} more.", baris.len() - isi.len()));
    }
    isi.join("\n")
}

struct Keadaan {
    url: Option<String>,
    acara: Acara,
    antre: VecDeque<String>,
}

fn keadaan() -> &'static Mutex<Keadaan> {
    static K: std::sync::OnceLock<Mutex<Keadaan>> = std::sync::OnceLock::new();
    K.get_or_init(|| Mutex::new(Keadaan { url: None, acara: Acara::default(), antre: VecDeque::new() }))
}

static MENGIRIM: AtomicBool = AtomicBool::new(false);

pub fn pasang(url: Option<String>, acara: Acara) {
    let mut k = keadaan().lock().unwrap_or_else(|e| e.into_inner());
    if url.is_none() {
        k.antre.clear();
    }
    k.url = url;
    k.acara = acara;
}

pub fn kabar(jenis: Jenis, teks: &str) {
    {
        let mut k = keadaan().lock().unwrap_or_else(|e| e.into_inner());
        if k.url.is_none() || !jenis.diminta(&k.acara) {
            return;
        }
        if k.antre.len() >= MAKS_ANTRE {
            k.antre.pop_front();
        }
        k.antre.push_back(format!("{} {teks}", jenis.ikon()));
    }
    if !MENGIRIM.swap(true, Ordering::SeqCst) {
        tauri::async_runtime::spawn(pengirim());
    }
}

async fn pengirim() {
    loop {
        tokio::time::sleep(JEDA).await;
        let (url, baris) = {
            let mut k = keadaan().lock().unwrap_or_else(|e| e.into_inner());
            let Some(url) = k.url.clone() else {
                k.antre.clear();
                MENGIRIM.store(false, Ordering::SeqCst);
                return;
            };
            if k.antre.is_empty() {
                MENGIRIM.store(false, Ordering::SeqCst);
                return;
            }
            (url, k.antre.drain(..).collect::<Vec<_>>())
        };
        if let Err(e) = kirim(&url, &susun(&baris)).await {
            crate::store::catat_kejadian(&format!("Discord notification not sent: {e}"));
        }
    }
}

pub async fn kirim(url: &str, isi: &str) -> Result<(), String> {
    let badan = serde_json::json!({ "content": isi, "allowed_mentions": { "parse": [] }, "username": "Chudai Account Manager" });
    let c = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "could not create the HTTP client".to_string())?;
    for coba in 0..2 {
        let r = c.post(url).json(&badan).send().await.map_err(|e| if e.is_timeout() { "Discord didn't answer in time".to_string() } else { "could not reach Discord".to_string() })?;
        let st = r.status();
        if st.is_success() {
            return Ok(());
        }
        if st.as_u16() == 429 && coba == 0 {
            let detik = r.json::<serde_json::Value>().await.ok().and_then(|v| v.get("retry_after").and_then(|x| x.as_f64())).unwrap_or(2.0);
            tokio::time::sleep(Duration::from_secs_f64(detik.clamp(0.5, 30.0))).await;
            continue;
        }
        return Err(match st.as_u16() {
            401 | 403 | 404 => "Discord refused the webhook (it was deleted or the URL is wrong)".into(),
            n => format!("Discord answered HTTP {n}"),
        });
    }
    Err("Discord kept asking to slow down".into())
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn hanya_webhook_discord_asli() {
        let (u, id) = urai_webhook(" https://discord.com/api/webhooks/123456789/abc_DEF-9 ").unwrap();
        assert_eq!((u.as_str(), id.as_str()), ("https://discord.com/api/webhooks/123456789/abc_DEF-9", "123456789"));
        assert!(urai_webhook("https://ptb.discordapp.com/api/webhooks/1/x").is_ok());
        for buruk in [
            "http://discord.com/api/webhooks/1/x",
            "https://evil.com/api/webhooks/1/x",
            "https://discord.com.evil.com/api/webhooks/1/x",
            "https://discord.com:8443/api/webhooks/1/x",
            "https://a:b@discord.com/api/webhooks/1/x",
            "https://discord.com/api/webhooks/1/x?wait=true",
            "https://discord.com/api/webhooks/1/x#f",
            "https://discord.com/api/webhooks/abc/x",
            "https://discord.com/api/webhooks/1/x/extra",
            "https://discord.com/api/webhooks/1/x%20y",
            "bukan url",
        ] {
            assert!(urai_webhook(buruk).is_err(), "{buruk}");
        }
        assert_eq!(samaran("123456789"), "…6789");
        assert_eq!(samaran("12"), "…12");
    }

    #[test]
    fn nama_aman_dan_pesan_dibatasi() {
        assert_eq!(aman("a_b*@everyone"), "a\\_b\\*\\@everyone");
        let baris: Vec<String> = (0..20).map(|i| i.to_string()).collect();
        let isi = susun(&baris);
        assert_eq!(isi.lines().count(), 16);
        assert!(isi.ends_with("…and 5 more."));
        assert_eq!(aman("a\nb\r"), "a b ");
    }

    #[test]
    fn pesan_tidak_melewati_batas_discord() {
        let panjang = |s: &str| s.encode_utf16().count();
        let isi = susun(&vec!["🔌 ".to_string() + &"x".repeat(250); 15]);
        assert!(panjang(&isi) <= 2000, "{}", panjang(&isi));
        assert!(isi.contains("more."), "sisanya dihitung");
        let isi = susun(&["y".repeat(5000)]);
        assert_eq!(isi.chars().count(), MAKS_PER_BARIS);
        assert!(isi.ends_with('…'));
    }

    #[test]
    fn hanya_jenis_yang_diminta() {
        let a = Acara::default();
        assert!(Jenis::Crash.diminta(&a) && !Jenis::Rejoin.diminta(&a));
        let lama: Acara = serde_json::from_str("{}").unwrap();
        assert_eq!(lama, Acara::default(), "bawaan untuk data lama");
    }
}
