use serde::Serialize;
use std::collections::HashMap;

const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                  (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

#[derive(Serialize, Clone, Default)]
pub struct UserInfo {
    pub user_id: u64,
    pub username: String,
    pub display_name: String,
    pub robux: i64,
    pub premium: bool,
    pub plus: bool,
    pub avatar_url: String,
    pub banned: Option<bool>,
    pub email_ok: Option<bool>,
    pub dua_langkah: Option<Vec<String>>,
    pub pembatasan: Option<Option<crate::store::Pembatasan>>,
}

const METODE_2FA: [&str; 8] = ["Email", "SMS", "Authenticator", "RecoveryCode", "SecurityKey", "CrossDevice", "Password", "Passkey"];

pub fn urai_2fa(v: &serde_json::Value) -> Vec<String> {
    v.get("methods")
        .and_then(|m| m.as_array())
        .into_iter()
        .flatten()
        .filter(|m| m.get("enabled").and_then(|e| e.as_bool()).unwrap_or(false))
        .filter_map(|m| match m.get("mediaType")? {
            serde_json::Value::Number(n) => METODE_2FA.get(n.as_u64()? as usize).copied(),
            serde_json::Value::String(s) => METODE_2FA.iter().find(|x| x.eq_ignore_ascii_case(s)).copied(),
            _ => None,
        })
        .filter(|n| !matches!(*n, "RecoveryCode" | "Password"))
        .map(String::from)
        .collect()
}

pub async fn avatar_url(user_id: u64) -> String {
    let url = format!(
        "https://thumbnails.roblox.com/v1/users/avatar-headshot\
         ?userIds={user_id}&size=150x150&format=Png&isCircular=false"
    );
    let Ok(c) = client() else { return String::new() };
    let Ok(resp) = c.get(url).send().await else {
        return String::new();
    };
    let Ok(v) = resp.json::<serde_json::Value>().await else {
        return String::new();
    };
    v.get("data")
        .and_then(|d| d.get(0))
        .and_then(|d| d.get("imageUrl"))
        .and_then(|u| u.as_str())
        .unwrap_or_default()
        .to_string()
}

const TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);
const TIMEOUT_SAMBUNG: std::time::Duration = std::time::Duration::from_secs(10);

pub(crate) fn client() -> Result<reqwest::Client, String> {
    static C: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    if let Some(c) = C.get() {
        return Ok(c.clone());
    }
    let c = reqwest::Client::builder()
        .user_agent(UA)
        .timeout(TIMEOUT)
        .connect_timeout(TIMEOUT_SAMBUNG)
        .build()
        .map_err(|e| format!("could not create the HTTP client: {e}"))?;
    Ok(C.get_or_init(|| c).clone())
}

fn cookie_header(cookie: &str) -> String {
    let c = cookie.trim();
    if c.starts_with(".ROBLOSECURITY=") {
        c.to_string()
    } else {
        format!(".ROBLOSECURITY={c}")
    }
}

type PenerimaRotasi = Box<dyn Fn(&str, &str) + Send + Sync>;
static ROTASI: std::sync::OnceLock<PenerimaRotasi> = std::sync::OnceLock::new();
static TOKEN: std::sync::Mutex<Vec<(u64, String)>> = std::sync::Mutex::new(Vec::new());

pub fn pasang_penerima_rotasi(f: impl Fn(&str, &str) + Send + Sync + 'static) {
    let _ = ROTASI.set(Box::new(f));
}

pub fn mentah(cookie: &str) -> String {
    let c = cookie.trim();
    c.strip_prefix(".ROBLOSECURITY=").unwrap_or(c).to_string()
}

fn sidik(cookie: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    mentah(cookie).hash(&mut h);
    h.finish()
}

fn token_untuk(cookie: &str) -> String {
    let k = sidik(cookie);
    TOKEN.lock().unwrap_or_else(|e| e.into_inner()).iter().find(|x| x.0 == k).map(|x| x.1.clone()).unwrap_or_default()
}

fn simpan_token(cookie: &str, token: &str) {
    let k = sidik(cookie);
    let mut v = TOKEN.lock().unwrap_or_else(|e| e.into_inner());
    v.retain(|x| x.0 != k);
    v.push((k, token.to_string()));
    let n = v.len();
    if n > 64 {
        v.drain(..n - 64);
    }
}

pub fn cookie_rotasi<'a>(lama: &str, set_cookie: impl Iterator<Item = &'a str>) -> Option<String> {
    let lama = mentah(lama);
    for s in set_cookie {
        let Some(i) = s.find(".ROBLOSECURITY=") else { continue };
        let v = s[i + ".ROBLOSECURITY=".len()..].split(';').next().unwrap_or("").trim();
        if v.len() > 100 && v != lama {
            return Some(v.to_string());
        }
    }
    None
}

fn catat_rotasi(lama: &str, r: &reqwest::Response) -> Option<String> {
    let baru = cookie_rotasi(lama, r.headers().get_all("set-cookie").iter().filter_map(|h| h.to_str().ok()))?;
    if let Some(f) = ROTASI.get() {
        f(&mentah(lama), &baru);
    }
    Some(baru)
}

pub fn lupakan_token(cookie: &str) {
    if cookie.is_empty() {
        return;
    }
    let k = sidik(cookie);
    TOKEN.lock().unwrap_or_else(|e| e.into_inner()).retain(|x| x.0 != k);
}

pub async fn keluar(cookie: &str) -> Result<(), String> {
    let http = client()?;
    let r = kirim(cookie, true, |c, t| {
        dengan_csrf(
            http.post("https://auth.roblox.com/v2/logout")
                .header("Cookie", cookie_header(c))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com"),
            t,
        )
    })
    .await
    .map_err(|e| format!("network error: {e}"))?;
    let st = r.status();
    lupakan_token(cookie);
    if st.is_success() || st == reqwest::StatusCode::UNAUTHORIZED {
        Ok(())
    } else {
        Err(format!("Roblox answered {}", st.as_u16()))
    }
}

fn dengan_csrf(rb: reqwest::RequestBuilder, token: &str) -> reqwest::RequestBuilder {
    if token.is_empty() { rb } else { rb.header("X-CSRF-TOKEN", token) }
}

pub(crate) async fn kirim(
    cookie: &str,
    csrf: bool,
    buat: impl Fn(&str, &str) -> reqwest::RequestBuilder,
) -> Result<reqwest::Response, reqwest::Error> {
    let mut c = mentah(cookie);
    let token = if csrf { token_untuk(&c) } else { String::new() };
    let r = buat(&c, &token).send().await?;
    if let Some(baru) = catat_rotasi(&c, &r) {
        c = baru;
    }
    if csrf && r.status() == reqwest::StatusCode::FORBIDDEN {
        if let Some(t) = r.headers().get("x-csrf-token").and_then(|v| v.to_str().ok()).map(str::to_string) {
            simpan_token(&c, &t);
            let r2 = buat(&c, &t).send().await?;
            catat_rotasi(&c, &r2);
            return Ok(r2);
        }
    }
    Ok(r)
}

pub async fn auth_ticket(cookie: &str) -> Result<String, String> {
    let http = client()?;
    let resp = kirim(cookie, true, |c, t| {
        dengan_csrf(
            http
                .post("https://auth.roblox.com/v1/authentication-ticket/")
                .header("Cookie", cookie_header(c))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json")
                .body("{}"),
            t,
        )
    })
    .await
    .map_err(|e| format!("ticket request failed: {e}"))?;

    let status = resp.status();
    if let Some(t) = resp
        .headers()
        .get("rbx-authentication-ticket")
        .and_then(|v| v.to_str().ok())
    {
        return Ok(t.to_string());
    }

    Err(match status.as_u16() {
        401 | 403 => format!(
            "Roblox rejected this cookie (HTTP {status}). It was revoked \
             or expired -- grab a fresh one and paste it again."
        ),
        400 | 415 => format!(
            "The ticket request was rejected for its shape (HTTP {status}). That is \
             a bug in this app, not your cookie."
        ),
        429 => "Too many ticket requests; wait a moment and try again.".into(),
        _ => format!("Roblox returned no authentication ticket (HTTP {status})."),
    })
}

pub async fn refresh_cookie(cookie: &str) -> Result<String, String> {
    let ticket = auth_ticket(cookie).await?;
    let token = token_untuk(cookie);

    let client = reqwest::Client::builder()
        .user_agent(UA)
        .timeout(TIMEOUT)
        .connect_timeout(TIMEOUT_SAMBUNG)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| format!("could not create the HTTP client: {e}"))?;

    let tebus = |tok: &str| {
        dengan_csrf(
            client
                .post("https://auth.roblox.com/v1/authentication-ticket/redeem")
                .header("Origin", "https://www.roblox.com")
                .header("Referer", "https://www.roblox.com/")
                .header("RBXAuthenticationNegotiation", "1")
                .header("Content-Type", "application/json")
                .body(format!("{{\"authenticationTicket\":\"{ticket}\"}}")),
            tok,
        )
    };
    let mut resp = tebus(&token).send().await.map_err(|e| format!("ticket redemption failed: {e}"))?;
    if resp.status() == reqwest::StatusCode::FORBIDDEN {
        if let Some(t) = resp.headers().get("x-csrf-token").and_then(|v| v.to_str().ok()).map(str::to_string) {
            resp = tebus(&t).send().await.map_err(|e| format!("ticket redemption failed: {e}"))?;
        }
    }

    let status = resp.status();

    let mut nama_cookie: Vec<String> = Vec::new();
    let mut rbx_len: Option<usize> = None;

    for hv in resp.headers().get_all("set-cookie") {
        let Ok(s) = hv.to_str() else {
            nama_cookie.push("<non-ascii>".into());
            continue;
        };
        let nama = s.split('=').next().unwrap_or("").trim();
        nama_cookie.push(nama.to_string());

        if let Some(i) = s.find(".ROBLOSECURITY=") {
            let rest = &s[i + ".ROBLOSECURITY=".len()..];
            let val = rest.split(';').next().unwrap_or("").trim();
            rbx_len = Some(val.len());
            if val.len() > 100 {
                return Ok(val.to_string());
            }
        }
    }

    let jejak = if let Some(n) = rbx_len {
        format!("cookie present but only {n} characters long")
    } else {
        format!("cookies returned: [{}]", nama_cookie.join(", "))
    };
    Err(format!(
        "Roblox returned no new cookie (HTTP {status}; {jejak}). \
         Keeping the old one."
    ))
}

#[derive(Serialize, Clone, Default)]
pub struct GameHasil {
    pub place_id: u64,
    pub universe_id: u64,
    pub name: String,
    pub players: i64,
    pub icon_url: String,
}

pub async fn cari_game(query: &str) -> Result<Vec<GameHasil>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }

    let url = format!(
        "https://apis.roblox.com/search-api/omni-search\
         ?searchQuery={}&pageToken=&sessionId={}&pageType=all",
        urlencoding::encode(q),
        uuid::Uuid::new_v4()
    );

    let v: serde_json::Value = client()?
        .get(url)
        .send()
        .await
        .map_err(|e| format!("search failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("search results were unreadable: {e}"))?;

    let mut hasil: Vec<GameHasil> = Vec::new();
    for grup in v.get("searchResults").and_then(|x| x.as_array()).into_iter().flatten() {
        for c in grup.get("contents").and_then(|x| x.as_array()).into_iter().flatten() {
            if c.get("contentType").and_then(|x| x.as_str()) != Some("Game") {
                continue;
            }
            let place_id = c.get("rootPlaceId").and_then(|x| x.as_u64()).unwrap_or(0);
            if place_id == 0 {
                continue;
            }
            hasil.push(GameHasil {
                place_id,
                universe_id: c.get("universeId").and_then(|x| x.as_u64()).unwrap_or(0),
                name: c
                    .get("name")
                    .and_then(|x| x.as_str())
                    .unwrap_or_default()
                    .to_string(),
                players: c.get("playerCount").and_then(|x| x.as_i64()).unwrap_or(0),
                icon_url: String::new(),
            });
            if hasil.len() >= 25 {
                break;
            }
        }
        if hasil.len() >= 25 {
            break;
        }
    }

    let ids: Vec<String> = hasil
        .iter()
        .filter(|g| g.universe_id != 0)
        .map(|g| g.universe_id.to_string())
        .collect();

    if !ids.is_empty() {
        let url = format!(
            "https://thumbnails.roblox.com/v1/games/icons\
             ?universeIds={}&size=128x128&format=Png&returnPolicy=PlaceHolder",
            ids.join(",")
        );
        if let Ok(resp) = client()?.get(url).send().await {
            if let Ok(v) = resp.json::<serde_json::Value>().await {
                for item in v.get("data").and_then(|x| x.as_array()).into_iter().flatten() {
                    let id = item.get("targetId").and_then(|x| x.as_u64()).unwrap_or(0);
                    let img = item
                        .get("imageUrl")
                        .and_then(|x| x.as_str())
                        .unwrap_or_default();
                    if let Some(g) = hasil.iter_mut().find(|g| g.universe_id == id) {
                        g.icon_url = img.to_string();
                    }
                }
            }
        }
    }

    Ok(hasil)
}

pub async fn info_place(place_id: u64) -> (String, String) {
    let Ok(c) = client() else { return (String::new(), String::new()) };

    let uid = match c
        .get(format!(
            "https://apis.roblox.com/universes/v1/places/{place_id}/universe"
        ))
        .send()
        .await
    {
        Ok(r) => match r.json::<serde_json::Value>().await {
            Ok(v) => v.get("universeId").and_then(|x| x.as_u64()).unwrap_or(0),
            Err(_) => 0,
        },
        Err(_) => 0,
    };
    if uid == 0 {
        return (String::new(), String::new());
    }

    let nama = match c
        .get(format!("https://games.roblox.com/v1/games?universeIds={uid}"))
        .send()
        .await
    {
        Ok(r) => match r.json::<serde_json::Value>().await {
            Ok(v) => v
                .get("data")
                .and_then(|d| d.get(0))
                .filter(|d| d.get("id").and_then(|x| x.as_u64()).unwrap_or(0) != 0)
                .and_then(|d| d.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or_default()
                .to_string(),
            Err(_) => String::new(),
        },
        Err(_) => String::new(),
    };
    if nama.is_empty() {
        return (String::new(), String::new());
    }

    let ikon = match c
        .get(format!(
            "https://thumbnails.roblox.com/v1/games/icons?universeIds={uid}&size=128x128&format=Png&returnPolicy=PlaceHolder"
        ))
        .send()
        .await
    {
        Ok(r) => match r.json::<serde_json::Value>().await {
            Ok(v) => v
                .get("data")
                .and_then(|d| d.get(0))
                .and_then(|d| d.get("imageUrl"))
                .and_then(|u| u.as_str())
                .unwrap_or_default()
                .to_string(),
            Err(_) => String::new(),
        },
        Err(_) => String::new(),
    };

    (nama, ikon)
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Cek {
    Mati,
    Terikat,
    Verifikasi,
    Dibatasi,
    Sementara,
}

pub fn golongkan(status: u16, ada_tantangan: bool, badan: &str) -> (Cek, String) {
    let galat = serde_json::from_str::<serde_json::Value>(badan).ok().and_then(|v| v.get("errors")?.get(0).cloned());
    let kode = galat.as_ref().and_then(|e| Some((e.get("code")?.as_i64()?, e.get("subcode").and_then(|x| x.as_i64()).unwrap_or(0))));
    let pesan = galat.as_ref().and_then(|e| e.get("message")?.as_str()).unwrap_or("");
    match status {
        401 if kode == Some((9002, 2)) => (
            Cek::Terikat,
            "Roblox now requires a bound session for this account. Sign in to it again (Add Account → Log in with browser).".into(),
        ),
        401 => (Cek::Mati, "Roblox rejected this cookie: it was signed out or expired. Sign in to the account again.".into()),
        403 if ada_tantangan => (
            Cek::Verifikasi,
            "Roblox wants a human check (captcha) for this account. Sign in to it again with Log in with browser.".into(),
        ),
        403 if pesan.trim().trim_end_matches('.').trim_end().eq_ignore_ascii_case("User is moderated") => (Cek::Dibatasi, "Roblox has restricted this account.".into()),
        429 => (Cek::Sementara, "Roblox is limiting requests right now; the account wasn't checked.".into()),
        s => (Cek::Sementara, format!("Roblox answered HTTP {s}; the account wasn't checked.")),
    }
}

pub async fn probe_emote(cookie: &str, uid: u64, ids_tambahan: &[u64]) -> Vec<String> {
    let Ok(c) = client() else { return vec!["klien HTTP gagal".into()] };
    let mut out = Vec::new();
    let mut ids: Vec<u64> = ids_tambahan.to_vec();
    let cari = "https://catalog.roblox.com/v1/search/items?category=AvatarAnimations&subcategory=EmoteAnimations&creatorName=Roblox&limit=10";
    match c.get(cari).send().await {
        Ok(r) => {
            let st = r.status().as_u16();
            let j: serde_json::Value = r.json().await.unwrap_or_default();
            let n0 = ids.len();
            for x in j.get("data").and_then(|d| d.as_array()).cloned().unwrap_or_default() {
                if x.get("itemType").and_then(|t| t.as_str()) == Some("Asset") {
                    if let Some(id) = x.get("id").and_then(|i| i.as_u64()) { if ids.len() < n0 + 3 { ids.push(id) } }
                }
            }
            out.push(format!("katalog emote Roblox: HTTP {st}, diambil {} id", ids.len() - n0));
        }
        Err(e) => out.push(format!("katalog galat: {e}")),
    }
    let inv = format!("https://inventory.roblox.com/v2/users/{uid}/inventory/61?limit=10&sortOrder=Desc");
    match kirim(cookie, false, |k, _| c.get(&inv).header("Cookie", cookie_header(k))).await {
        Ok(r) => {
            let st = r.status().as_u16();
            let j: serde_json::Value = r.json().await.unwrap_or_default();
            let milik: Vec<u64> = j.get("data").and_then(|d| d.as_array()).cloned().unwrap_or_default().iter().filter_map(|x| x.get("assetId").and_then(|i| i.as_u64())).collect();
            out.push(format!("inventaris emote akun probe: HTTP {st}, {} emote dimiliki", milik.len()));
            if let Some(m) = milik.first() { if !ids.contains(m) { ids.push(*m) } }
        }
        Err(e) => out.push(format!("inventaris galat: {e}")),
    }
    for id in ids {
        let info = format!("https://economy.roblox.com/v2/assets/{id}/details");
        let (nama, jenis) = match c.get(&info).send().await {
            Ok(r) => { let j: serde_json::Value = r.json().await.unwrap_or_default(); (j.get("Name").and_then(|n| n.as_str()).unwrap_or("?").to_string(), j.get("AssetTypeId").and_then(|t| t.as_u64()).unwrap_or(0)) }
            Err(_) => ("?".into(), 0),
        };
        let milik_url = format!("https://inventory.roblox.com/v1/users/{uid}/items/Asset/{id}/is-owned");
        let milik = match kirim(cookie, false, |k, _| c.get(&milik_url).header("Cookie", cookie_header(k))).await {
            Ok(r) => r.text().await.unwrap_or_default().trim().to_string(),
            Err(_) => "?".into(),
        };
        out.push(format!("— emote {id} \"{nama}\" (assetType {jenis}), dimiliki akun probe: {milik}"));
        out.extend(unduh_aset_probe(&c, cookie, id, "  ").await);
    }
    out
}

async fn unduh_aset_probe(c: &reqwest::Client, cookie: &str, id: u64, awal: &str) -> Vec<String> {
    let mut out = Vec::new();
    let url = format!("https://assetdelivery.roblox.com/v1/asset/?id={id}");
    match c.get(&url).send().await {
        Ok(r) => out.push(format!("{awal}tanpa cookie: HTTP {}", r.status().as_u16())),
        Err(e) => out.push(format!("{awal}tanpa cookie galat: {e}")),
    }
    match kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_header(k))).await {
        Ok(r) => {
            let st = r.status().as_u16();
            let jenis = r.headers().get("content-type").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
            let b = r.bytes().await.unwrap_or_default().to_vec();
            let b = if b.starts_with(&[0x1f, 0x8b]) { buka_gzip(&b) } else { b };
            let teks = String::from_utf8_lossy(&b);
            let format = if b.starts_with(b"<roblox!") { "rbxm biner" } else if b.starts_with(b"<roblox") { "rbxm XML" } else if teks.trim_start().starts_with('{') { "JSON" } else { "lain" };
            let kelas: Vec<&str> = ["KeyframeSequence", "Keyframe", "Pose", "Animation", "AnimationId", "CurveAnimation"].into_iter().filter(|k| teks.contains(k)).collect();
            let pesan = if format == "JSON" { teks.chars().take(160).collect::<String>() } else { String::new() };
            out.push(format!("{awal}dengan cookie: HTTP {st}, {jenis}, {} B, {format}, kelas {kelas:?} {pesan}", b.len()));
            if awal == "  " && st == 200 {
                let anak = teks.match_indices("rbxassetid://").filter_map(|(i, _)| teks[i + 13..].chars().take_while(|ch| ch.is_ascii_digit()).collect::<String>().parse::<u64>().ok()).find(|x| *x != id);
                let anak = anak.or_else(|| teks.match_indices("asset/?id=").filter_map(|(i, _)| teks[i + 10..].chars().take_while(|ch| ch.is_ascii_digit()).collect::<String>().parse::<u64>().ok()).find(|x| *x != id));
                if let Some(a) = anak {
                    out.push(format!("{awal}-> animasi di dalamnya: {a}"));
                    out.extend(Box::pin(unduh_aset_probe(c, cookie, a, "    ")).await);
                }
            }
        }
        Err(e) => out.push(format!("{awal}dengan cookie galat: {e}")),
    }
    out
}

pub async fn probe_status(cookie: &str, uid: u64) -> Vec<String> {
    let Ok(c) = client() else { return vec!["klien HTTP gagal".into()] };
    let daftar = [
        ("authenticated", "https://users.roblox.com/v1/users/authenticated".to_string()),
        ("not-approved", "https://usermoderation.roblox.com/v1/not-approved".to_string()),
        ("not-approved-v2", "https://usermoderation.roblox.com/v2/not-approved".to_string()),
        ("currency", "https://economy.roblox.com/v1/user/currency".to_string()),
        ("email", "https://accountsettings.roblox.com/v1/email".to_string()),
        ("settings-json", "https://www.roblox.com/my/settings/json".to_string()),
        ("home", "https://www.roblox.com/home".to_string()),
    ];
    let mut out = Vec::new();
    for (nama, url) in daftar {
        match kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_header(k))).await {
            Ok(r) => {
                let st = r.status().as_u16();
                let tant = r.headers().contains_key("rblx-challenge-id");
                let akhir = r.url().path().to_string();
                let badan = r.text().await.unwrap_or_default();
                let v: Option<serde_json::Value> = serde_json::from_str(&badan).ok();
                let isi = match (nama, &v) {
                    (_, Some(j)) if j.get("errors").is_some() => format!("errors={}", j["errors"]),
                    ("authenticated", Some(j)) => format!("id cocok={}", j.get("id").and_then(|x| x.as_u64()) == Some(uid)),
                    ("not-approved", Some(j)) => {
                        let mut k: Vec<String> = j.as_object().map(|o| o.keys().cloned().collect()).unwrap_or_default();
                        k.sort();
                        format!(
                            "keys={k:?} type={} begin={} end={} pesan_len={}",
                            j.get("punishmentTypeDescription").unwrap_or(&serde_json::Value::Null),
                            j.get("beginDate").unwrap_or(&serde_json::Value::Null),
                            j.get("endDate").unwrap_or(&serde_json::Value::Null),
                            j.get("messageToUser").and_then(|m| m.as_str()).map_or(0, str::len)
                        )
                    }
                    ("not-approved-v2", Some(j)) => {
                        fn pendek(v: &serde_json::Value) -> serde_json::Value {
                            match v {
                                serde_json::Value::String(t) if t.chars().count() > 40 => serde_json::Value::String(format!("<{} char>", t.chars().count())),
                                serde_json::Value::Array(a) => serde_json::Value::Array(a.iter().map(pendek).collect()),
                                serde_json::Value::Object(o) => serde_json::Value::Object(o.iter().map(|(k, x)| (k.clone(), pendek(x))).collect()),
                                lain => lain.clone(),
                            }
                        }
                        pendek(j).to_string()
                    }
                    ("email", Some(j)) => format!("verified={}", j.get("verified").unwrap_or(&serde_json::Value::Null)),
                    ("settings-json", Some(j)) => {
                        let o = j.as_object().cloned().unwrap_or_default();
                        let mut p: Vec<String> = o
                            .iter()
                            .filter(|(k, _)| { let l = k.to_ascii_lowercase(); l.contains("lock") || l.contains("ban") || l.contains("moderat") || l.contains("restrict") || l.contains("suspend") })
                            .map(|(k, x)| format!("{k}={x}"))
                            .collect();
                        p.sort();
                        format!("{} keys; {}", o.len(), p.join(", "))
                    }
                    (_, Some(_)) => "json".into(),
                    (_, None) => format!("bukan json, {} byte", badan.len()),
                };
                out.push(format!("  {nama}: HTTP {st}{} akhir={akhir} | {isi}", if tant { " +challenge" } else { "" }));
            }
            Err(e) => out.push(format!("  {nama}: galat jaringan ({})", e.without_url())),
        }
    }
    let publik = async {
        let v: serde_json::Value = c.get(format!("https://users.roblox.com/v1/users/{uid}")).send().await.ok()?.json().await.ok()?;
        Some(v.get("isBanned").cloned().unwrap_or(serde_json::Value::Null))
    }
    .await;
    out.push(format!("  publik isBanned: {publik:?}"));
    out
}

pub fn urai_pembatasan(v2: &serde_json::Value, v1: Option<&serde_json::Value>) -> Option<crate::store::Pembatasan> {
    let r = v2.get("restriction").filter(|r| r.is_object())?;
    let teks = |v: Option<&serde_json::Value>| v.and_then(|x| x.as_str()).unwrap_or("").to_string();
    let sumber = r.get("source").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
    let mut p = crate::store::Pembatasan {
        jenis: "other".into(),
        label: String::new(),
        mulai: teks(r.get("startTime")),
        berakhir: teks(r.get("endTime")),
        sumber,
    };
    match sumber {
        1 => {
            if let Some(v1) = v1.filter(|v| v.get("punishmentTypeDescription").is_some()) {
                p.label = teks(v1.get("punishmentTypeDescription"));
                let mulai = teks(v1.get("beginDate"));
                let akhir = teks(v1.get("endDate"));
                if !mulai.is_empty() {
                    p.mulai = mulai;
                }
                if !akhir.is_empty() {
                    p.berakhir = akhir;
                }
            }
            let l = p.label.to_ascii_lowercase();
            p.jenis = if l.is_empty() {
                "other"
            } else if l.starts_with("delete") || l.starts_with("account deleted") || l.starts_with("poison") {
                "terminated"
            } else if l.starts_with("warn") || l.starts_with("remind") || l.starts_with("note") || l.starts_with("moderator note") {
                "warn"
            } else {
                "ban"
            }
            .into();
        }
        4 => p.jenis = "deactivated".into(),
        5 => p.jenis = "lock".into(),
        _ => {}
    }
    Some(p)
}

pub fn banned_sesi_diterima(publik: Option<bool>) -> Option<bool> {
    Some(publik.unwrap_or(false))
}

pub async fn baca_pembatasan(cookie: &str) -> Result<Option<crate::store::Pembatasan>, String> {
    let c = client()?;
    let ambil = |url: &'static str| {
        let c = c.clone();
        async move {
            let r = kirim(cookie, false, |k, _| c.get(url).header("Cookie", cookie_header(k)))
                .await
                .map_err(|e| format!("Network error; the restriction wasn't read ({}).", e.without_url()))?;
            if !r.status().is_success() {
                return Err(format!("Roblox answered HTTP {} for the restriction details.", r.status().as_u16()));
            }
            r.json::<serde_json::Value>().await.map_err(|_| "Roblox's restriction details were unreadable.".to_string())
        }
    };
    let v2 = ambil("https://usermoderation.roblox.com/v2/not-approved").await?;
    let butuh_v1 = v2.get("restriction").and_then(|r| r.get("source")).and_then(|x| x.as_u64()) == Some(1);
    let v1 = if butuh_v1 { ambil("https://usermoderation.roblox.com/v1/not-approved").await.ok() } else { None };
    Ok(urai_pembatasan(&v2, v1.as_ref()))
}

pub async fn user_info(cookie: &str) -> Result<UserInfo, String> {
    user_info_cek(cookie).await.map_err(|(_, m)| m)
}

pub async fn user_info_cek(cookie: &str) -> Result<UserInfo, (Cek, String)> {
    let c = client().map_err(|e| (Cek::Sementara, e))?;

    let resp = kirim(cookie, false, |k, _| c.get("https://users.roblox.com/v1/users/authenticated").header("Cookie", cookie_header(k)))
        .await
        .map_err(|e| (Cek::Sementara, format!("Network error; the account wasn't checked ({}).", e.without_url())))?;
    let status = resp.status();
    let tantangan = resp.headers().contains_key("rblx-challenge-id");
    let badan = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(golongkan(status.as_u16(), tantangan, &badan));
    }
    let me: serde_json::Value = serde_json::from_str(&badan)
        .map_err(|_| (Cek::Sementara, "Roblox's answer was unreadable; the account wasn't checked.".to_string()))?;

    let user_id = me
        .get("id")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| (Cek::Mati, "Roblox rejected this cookie (no user id returned).".to_string()))?;

    let mut info = UserInfo {
        user_id,
        username: me
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        display_name: me
            .get("displayName")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        ..Default::default()
    };

    let robux = async {
        let resp = kirim(cookie, false, |k, _| c.get("https://economy.roblox.com/v1/user/currency").header("Cookie", cookie_header(k)))
            .await
            .ok()?;
        let v = resp.json::<serde_json::Value>().await.ok()?;
        v.get("robux").and_then(|x| x.as_i64())
    };
    let premium = async {
        let url = format!("https://premiumfeatures.roblox.com/v1/users/{user_id}/validate-membership");
        let resp = kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_header(k))).await.ok()?;
        Some(resp.text().await.ok()?.trim() == "true")
    };
    let plus = async {
        let v: serde_json::Value = c
            .post("https://apis.roblox.com/user-profile-api/v1/user/profiles/get-profiles")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "userIds": [user_id], "fields": ["hasRobloxSubscription"] }))
            .send()
            .await
            .ok()?
            .json()
            .await
            .ok()?;
        v.get("profileDetails")?.get(0)?.get("hasRobloxSubscription")?.as_bool()
    };
    let banned = async {
        let v: serde_json::Value = c.get(format!("https://users.roblox.com/v1/users/{user_id}")).send().await.ok()?.json().await.ok()?;
        v.get("isBanned").and_then(|b| b.as_bool())
    };
    let email = async {
        let r = kirim(cookie, false, |k, _| c.get("https://accountsettings.roblox.com/v1/email").header("Cookie", cookie_header(k))).await.ok()?;
        if !r.status().is_success() {
            return None;
        }
        r.json::<serde_json::Value>().await.ok()?.get("verified").and_then(|b| b.as_bool())
    };
    let dua = async {
        let url = format!("https://twostepverification.roblox.com/v1/users/{user_id}/configuration");
        let r = kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_header(k))).await.ok()?;
        if !r.status().is_success() {
            return None;
        }
        Some(urai_2fa(&r.json::<serde_json::Value>().await.ok()?))
    };
    let batas = async { baca_pembatasan(cookie).await.ok() };
    let (robux, premium, plus, avatar, banned, email, dua, batas) = tokio::join!(robux, premium, plus, avatar_url(user_id), banned, email, dua, batas);
    info.robux = robux.unwrap_or(0);
    info.premium = premium.unwrap_or(false);
    info.plus = plus.unwrap_or(false);
    info.avatar_url = avatar;
    info.banned = banned_sesi_diterima(banned);
    info.email_ok = email;
    info.dua_langkah = dua;
    info.pembatasan = batas;

    Ok(info)
}

pub async fn resolve_share_link(
    cookie: &str,
    code: &str,
) -> Result<serde_json::Value, String> {
    let c = client()?;
    let resp = kirim(cookie, true, |k, t| {
        dengan_csrf(
            c.post("https://apis.roblox.com/sharelinks/v1/resolve-link")
                .header("Cookie", cookie_header(k))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({ "linkId": code, "linkType": "Server" })),
            t,
        )
    })
    .await
    .map_err(|e| format!("share link request failed: {e}"))?;

    let status = resp.status();
    let teks = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!("share link HTTP {status}: {teks}"));
    }
    serde_json::from_str(&teks).map_err(|e| format!("share link reply unreadable: {e}: {teks}"))
}

#[derive(serde::Serialize, Clone)]
pub struct ServerInfo {
    pub job_id: String,
    pub playing: u32,
    pub max_players: u32,
    pub fps: f64,
    pub ping: u32,
}

pub async fn daftar_server(
    place_id: u64,
    cursor: &str,
) -> Result<(Vec<ServerInfo>, String), String> {
    daftar_server_urut(place_id, cursor, false, false, None).await
}

pub async fn daftar_server_urut(
    place_id: u64,
    cursor: &str,
    turun: bool,
    tanpa_penuh: bool,
    cookie: Option<&str>,
) -> Result<(Vec<ServerInfo>, String), String> {
    let mut url = format!(
        "https://games.roblox.com/v1/games/{place_id}/servers/Public?sortOrder={}&excludeFullGames={tanpa_penuh}&limit=100",
        if turun { "Desc" } else { "Asc" }
    );
    if !cursor.is_empty() {
        url.push_str("&cursor=");
        url.push_str(&urlencoding::encode(cursor));
    }
    let c = client()?;
    let r = match cookie {
        Some(k) => kirim(k, false, |k, _| c.get(&url).header("Cookie", cookie_header(k))).await,
        None => c.get(&url).send().await,
    }
    .map_err(|e| format!("could not fetch servers: {}", e.without_url()))?;
    let st = r.status();
    if st.as_u16() == 429 {
        return Err("Roblox is limiting server list requests right now. Try again in a minute.".into());
    }
    if !st.is_success() {
        return Err(format!("Roblox answered HTTP {st} for the server list."));
    }
    let v: serde_json::Value = r.json().await.map_err(|e| format!("server list unreadable: {e}"))?;

    let lanjut = v
        .get("nextPageCursor")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();

    let mut hasil = Vec::new();
    if let Some(data) = v.get("data").and_then(|x| x.as_array()) {
        for it in data {
            hasil.push(ServerInfo {
                job_id: it
                    .get("id")
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .to_string(),
                playing: it.get("playing").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
                max_players: it.get("maxPlayers").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
                fps: it.get("fps").and_then(|x| x.as_f64()).unwrap_or(0.0),
                ping: it.get("ping").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
            });
        }
    }
    Ok((hasil, lanjut))
}

pub async fn alamat_server(cookie: &str, place_id: u64, job_id: &str) -> Option<String> {
    let c = client().ok()?;
    let teks = kirim(cookie, true, |k, t| {
        dengan_csrf(
            c.post("https://gamejoin.roblox.com/v1/join-game-instance")
                .header("Cookie", cookie_header(k))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json")
                .header("User-Agent", "Roblox/WinInet")
                .json(&serde_json::json!({ "placeId": place_id, "gameId": job_id })),
            t,
        )
    })
    .await
    .ok()?
    .text()
    .await
    .ok()?;

    let v: serde_json::Value = serde_json::from_str(&teks).ok()?;

    let js = match v.get("joinScript") {
        Some(x) if !x.is_null() => x,
        _ => return None,
    };

    let ambil = |k: &str| -> Option<String> {
        js.get(k)?
            .as_array()?
            .first()?
            .get("Address")?
            .as_str()
            .map(|s| s.to_string())
    };
    ambil("UdmuxEndpoints")
        .or_else(|| ambil("ServerConnections"))
        .or_else(|| {
            js.get("MachineAddress")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string())
        })
        .filter(|ip| !ip_privat(ip))
}

fn ip_privat(ip: &str) -> bool {
    ip.starts_with("10.")
        || ip.starts_with("192.168.")
        || ip.starts_with("127.")
        || ip
            .strip_prefix("172.")
            .and_then(|r| r.split('.').next())
            .and_then(|o| o.parse::<u8>().ok())
            .map(|o| (16..=31).contains(&o))
            .unwrap_or(false)
}

pub async fn wilayah_ip(ip: &str) -> Option<String> {
    let v: serde_json::Value = client()
        .ok()?
        .get(format!(
            "http://ip-api.com/json/{ip}?fields=status,country,regionName,city"
        ))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    if v.get("status").and_then(|x| x.as_str()) != Some("success") {
        return None;
    }
    let kota = v.get("city").and_then(|x| x.as_str()).unwrap_or("");
    let negara = v.get("country").and_then(|x| x.as_str()).unwrap_or("");
    Some(if kota.is_empty() {
        negara.to_string()
    } else {
        format!("{kota}, {negara}")
    })
}

pub async fn user_id_dari_username(username: &str) -> Result<(u64, String), String> {
    let v: serde_json::Value = client()?
        .post("https://users.roblox.com/v1/usernames/users")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "usernames": [username],
            "excludeBannedUsers": false
        }))
        .send()
        .await
        .map_err(|e| format!("lookup failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("lookup reply unreadable: {e}"))?;

    let d = v
        .get("data")
        .and_then(|x| x.as_array())
        .and_then(|a| a.first())
        .ok_or_else(|| format!("No Roblox user named {username}."))?;
    let id = d
        .get("id")
        .and_then(|x| x.as_u64())
        .ok_or("User reply had no id.")?;
    let nama = d
        .get("name")
        .and_then(|x| x.as_str())
        .unwrap_or(username)
        .to_string();
    Ok((id, nama))
}

pub async fn kehadiran_pemain(cookie: &str, user_id: u64) -> Option<(u64, String)> {
    let c = client().ok()?;
    let v: serde_json::Value = kirim(cookie, true, |k, t| {
        dengan_csrf(
            c.post("https://presence.roblox.com/v1/presence/users")
                .header("Cookie", cookie_header(k))
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({ "userIds": [user_id] })),
            t,
        )
    })
    .await
    .ok()?
    .json()
    .await
    .ok()?;
    let p = v.get("userPresences")?.as_array()?.first()?;
    let place = p.get("placeId").and_then(|x| x.as_u64()).unwrap_or(0);
    let job = p
        .get("gameId")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    if place == 0 {
        return None;
    }
    Some((place, job))
}

async fn aksi(
    cookie: &str,
    metode: reqwest::Method,
    url: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let c = client()?;
    let r = kirim(cookie, true, |k, t| {
        let req = dengan_csrf(
            c.request(metode.clone(), url)
                .header("Cookie", cookie_header(k))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json"),
            t,
        );
        match &body {
            Some(b) => req.json(b),
            None => req.body("{}"),
        }
    })
    .await
    .map_err(|e| format!("request failed: {e}"))?;
    let st = r.status();
    let teks = r.text().await.unwrap_or_default();
    let v: serde_json::Value = serde_json::from_str(&teks).unwrap_or(serde_json::json!({}));
    if st.is_success() {
        return Ok(v);
    }
    let pesan = v
        .get("errors")
        .and_then(|e| e.as_array())
        .and_then(|a| a.first())
        .and_then(|e| e.get("message"))
        .and_then(|m| m.as_str())
        .unwrap_or("")
        .to_string();
    Err(if pesan.is_empty() {
        format!("HTTP {st}")
    } else {
        pesan
    })
}

const BLOKIR_API: &str = "https://apis.roblox.com/user-blocking-api/v1/users";

fn cookie_btid(cookie: &str, btid: u64, uid: u64) -> String {
    format!("{}; RBXEventTrackerV2=CreateDate=1/1/2026 12:00:00 AM&rbxid={uid}&browserid={btid}", cookie_header(cookie))
}

pub async fn blokir(cookie: &str, btid: u64, uid: u64, target: u64, buka: bool) -> Result<(), String> {
    let c = client()?;
    let url = format!("{BLOKIR_API}/{target}/{}", if buka { "unblock-user" } else { "block-user" });
    let r = kirim(cookie, true, |k, t| {
        dengan_csrf(
            c.post(&url)
                .header("Cookie", cookie_btid(k, btid, uid))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json")
                .body("{}"),
            t,
        )
    })
    .await
    .map_err(|e| format!("request failed: {}", e.without_url()))?;
    let st = r.status();
    if st.is_success() {
        return Ok(());
    }
    let teks = r.text().await.unwrap_or_default();
    let pesan = serde_json::from_str::<serde_json::Value>(&teks)
        .ok()
        .and_then(|v| {
            v.get("errors").and_then(|e| e.get(0)).and_then(|e| e.get("message")).and_then(|m| m.as_str()).map(str::to_string)
                .or_else(|| v.get("error").and_then(|e| e.as_str()).map(str::to_string))
                .or_else(|| v.as_str().map(str::to_string))
        })
        .filter(|m| !m.is_empty());
    Err(pesan.unwrap_or_else(|| format!("HTTP {st}")))
}

pub async fn daftar_diblokir(cookie: &str, btid: u64, uid: u64) -> Result<Vec<(u64, String)>, String> {
    let c = client()?;
    let mut ids: Vec<u64> = Vec::new();
    let mut cursor = String::new();
    for _ in 0..20 {
        let url = format!("{BLOKIR_API}/get-blocked-users?cursor={cursor}&count=50");
        let r = kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_btid(k, btid, uid)))
            .await
            .map_err(|e| format!("request failed: {}", e.without_url()))?;
        let st = r.status();
        let v: serde_json::Value = r.json().await.unwrap_or_default();
        if !st.is_success() {
            return Err(format!("Roblox answered HTTP {st} for the blocked list."));
        }
        let d = v.get("data").cloned().unwrap_or_default();
        for x in d.get("blockedUserIds").and_then(|a| a.as_array()).into_iter().flatten() {
            if let Some(id) = x.as_u64() {
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
        }
        match d.get("cursor").and_then(|x| x.as_str()).filter(|s| !s.is_empty()) {
            Some(n) => cursor = urlencoding::encode(n).into_owned(),
            None => break,
        }
    }
    let mut nama: std::collections::HashMap<u64, String> = std::collections::HashMap::new();
    for potong in ids.chunks(200) {
        if let Ok(r) = c
            .post("https://users.roblox.com/v1/users")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "userIds": potong, "excludeBannedUsers": false }))
            .send()
            .await
        {
            if let Ok(v) = r.json::<serde_json::Value>().await {
                for u in v.get("data").and_then(|a| a.as_array()).into_iter().flatten() {
                    if let (Some(id), Some(n)) = (u.get("id").and_then(|x| x.as_u64()), u.get("name").and_then(|x| x.as_str())) {
                        nama.insert(id, n.to_string());
                    }
                }
            }
        }
    }
    Ok(ids.into_iter().map(|id| (id, nama.get(&id).cloned().unwrap_or_else(|| "?".into()))).collect())
}

pub async fn set_display_name(cookie: &str, user_id: u64, nama_baru: &str) -> Result<(), String> {
    aksi(
        cookie,
        reqwest::Method::PATCH,
        &format!("https://users.roblox.com/v1/users/{user_id}/display-names"),
        Some(serde_json::json!({ "newDisplayName": nama_baru })),
    )
    .await
    .map(|_| ())
}

pub async fn minta_teman(cookie: &str, user_id: u64) -> Result<(), String> {
    aksi(
        cookie,
        reqwest::Method::POST,
        &format!("https://friends.roblox.com/v1/users/{user_id}/request-friendship"),
        None,
    )
    .await
    .map(|_| ())
}

pub async fn nama_dari_user_id(user_id: u64) -> Option<String> {
    let v: serde_json::Value = client()
        .ok()?
        .get(format!("https://users.roblox.com/v1/users/{user_id}"))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    v.get("name")?.as_str().map(|s| s.to_string())
}

pub async fn alamat_server_mentah(cookie: &str, place_id: u64, job_id: &str) -> String {
    let Ok(c) = client() else {
        return "client gagal".into();
    };
    match kirim(cookie, true, |k, t| {
        dengan_csrf(
            c.post("https://gamejoin.roblox.com/v1/join-game-instance")
                .header("Cookie", cookie_header(k))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json")
                .header("User-Agent", "Roblox/WinInet")
                .json(&serde_json::json!({ "placeId": place_id, "gameId": job_id })),
            t,
        )
    })
    .await
    {
        Ok(r) => {
            let st = r.status();
            let t = r.text().await.unwrap_or_default();
            format!("HTTP {st} :: {}", &t[..t.len().min(2600)])
        }
        Err(e) => format!("kirim gagal: {e}"),
    }
}

pub async fn status_join(cookie: &str, place_id: u64, job_id: &str) -> (i64, String) {
    let Ok(c) = client() else {
        return (-1, "client gagal".into());
    };
    let r = kirim(cookie, true, |k, t| {
        dengan_csrf(
            c.post("https://gamejoin.roblox.com/v1/join-game-instance")
                .header("Cookie", cookie_header(k))
                .header("Referer", "https://www.roblox.com/")
                .header("Origin", "https://www.roblox.com")
                .header("Content-Type", "application/json")
                .header("User-Agent", "Roblox/WinInet")
                .json(&serde_json::json!({ "placeId": place_id, "gameId": job_id })),
            t,
        )
    })
    .await;
    let Ok(r) = r else {
        return (-1, "kirim gagal".into());
    };
    let t = r.text().await.unwrap_or_default();
    let v: serde_json::Value = serde_json::from_str(&t).unwrap_or(serde_json::json!({}));
    (
        v.get("status").and_then(|x| x.as_i64()).unwrap_or(-1),
        v.get("message")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string(),
    )
}

static CACHE_WILAYAH: std::sync::OnceLock<std::sync::Mutex<HashMap<String, String>>> =
    std::sync::OnceLock::new();

fn cache() -> &'static std::sync::Mutex<HashMap<String, String>> {
    CACHE_WILAYAH.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

pub async fn wilayah_ip_banyak(ips: &[String]) -> HashMap<String, String> {
    let mut hasil = HashMap::new();
    let mut perlu: Vec<String> = Vec::new();
    {
        let c = cache().lock().unwrap_or_else(|e| e.into_inner());
        for ip in ips {
            match c.get(ip) {
                Some(w) => {
                    hasil.insert(ip.clone(), w.clone());
                }
                None => {
                    if !perlu.contains(ip) {
                        perlu.push(ip.clone());
                    }
                }
            }
        }
    }
    if perlu.is_empty() {
        return hasil;
    }

    for potongan in perlu.chunks(100) {
        let Ok(c) = client() else { break };
        let badan: Vec<serde_json::Value> = potongan
            .iter()
            .map(|ip| serde_json::json!({ "query": ip, "fields": "status,country,city,query" }))
            .collect();
        let Ok(r) = c.post("http://ip-api.com/batch").json(&badan).send().await else {
            break;
        };
        let Ok(v) = r.json::<serde_json::Value>().await else {
            break;
        };
        let Some(arr) = v.as_array() else { break };
        let mut simpan = cache().lock().unwrap_or_else(|e| e.into_inner());
        for it in arr {
            let ip = it.get("query").and_then(|x| x.as_str()).unwrap_or("");
            if ip.is_empty() || it.get("status").and_then(|x| x.as_str()) != Some("success") {
                continue;
            }
            let kota = it.get("city").and_then(|x| x.as_str()).unwrap_or("");
            let negara = it.get("country").and_then(|x| x.as_str()).unwrap_or("");
            let w = if kota.is_empty() {
                negara.to_string()
            } else {
                format!("{kota}, {negara}")
            };
            simpan.insert(ip.to_string(), w.clone());
            hasil.insert(ip.to_string(), w);
        }
    }
    hasil
}

#[cfg(test)]
mod tes_c2 {
    use super::*;

    #[test]
    fn rotasi_cookie_dari_set_cookie() {
        let lama = "_|WARNING:-x|_".to_string() + &"A".repeat(200);
        let baru = "_|WARNING:-x|_".to_string() + &"B".repeat(200);
        let h1 = format!(".ROBLOSECURITY={baru}; domain=.roblox.com; path=/; secure; HttpOnly");
        assert_eq!(cookie_rotasi(&lama, [h1.as_str()].into_iter()), Some(baru.clone()));
        let h2 = format!(".ROBLOSECURITY={lama}; path=/");
        assert_eq!(cookie_rotasi(&lama, [h2.as_str()].into_iter()), None);
        assert_eq!(cookie_rotasi(&lama, [".ROBLOSECURITY=; expires=Thu, 01 Jan 1970"].into_iter()), None);
        assert_eq!(cookie_rotasi(&lama, ["GuestData=UserID=-1; path=/"].into_iter()), None);
        assert_eq!(cookie_rotasi(&format!(".ROBLOSECURITY={lama}"), [h2.as_str()].into_iter()), None);
    }

    #[test]
    fn token_per_cookie() {
        simpan_token("cookie-a", "tok-a");
        simpan_token(".ROBLOSECURITY=cookie-b", "tok-b");
        assert_eq!(token_untuk(".ROBLOSECURITY=cookie-a"), "tok-a");
        assert_eq!(token_untuk("cookie-b"), "tok-b");
        assert_eq!(token_untuk("cookie-c"), "");
        simpan_token("cookie-a", "tok-a2");
        assert_eq!(token_untuk("cookie-a"), "tok-a2");
    }
}

#[cfg(test)]
mod tes_c4 {
    use super::*;

    #[test]
    fn golongan_galat_cookie() {
        assert_eq!(golongkan(401, false, r#"{"errors":[{"code":9002,"subcode":2,"message":"x"}]}"#).0, Cek::Terikat);
        assert_eq!(golongkan(401, false, r#"{"errors":[{"code":0,"message":"Authorization has been denied"}]}"#).0, Cek::Mati);
        assert_eq!(golongkan(401, false, "").0, Cek::Mati, "badan kosong tetap 401");
        assert_eq!(golongkan(403, true, "").0, Cek::Verifikasi);
        assert_eq!(golongkan(429, false, "").0, Cek::Sementara);
        assert_eq!(golongkan(503, false, "<html>").0, Cek::Sementara);
        assert_eq!(golongkan(403, false, "").0, Cek::Sementara, "403 tanpa tantangan tidak menandai akun");
        assert_eq!(golongkan(403, false, r#"{"errors":[{"code":0,"message":"User is moderated"}]}"#).0, Cek::Dibatasi);
        assert_eq!(golongkan(403, false, r#"{"errors":[{"code":0,"message":"Token Validation Failed"}]}"#).0, Cek::Sementara);
        assert_eq!(golongkan(403, false, r#"{"errors":[{"code":0,"message":" user is moderated. "}]}"#).0, Cek::Dibatasi, "T8-03");
    }
}

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
pub struct TemanOnline {
    pub user_id: u64,
    pub username: String,
    pub display_name: String,
    pub status: String,
    pub lokasi: String,
    pub place_id: u64,
}

pub fn gabung_teman(presence: &serde_json::Value, nama: &std::collections::HashMap<u64, (String, String)>) -> Vec<TemanOnline> {
    let mut hasil: Vec<TemanOnline> = presence
        .get("userPresences")
        .and_then(|d| d.as_array())
        .into_iter()
        .flatten()
        .filter_map(|p| {
            let id = p.get("userId")?.as_u64()?;
            let status = match p.get("userPresenceType").and_then(|x| x.as_u64())? {
                1 => "Online",
                2 => "InGame",
                3 => "InStudio",
                _ => return None,
            };
            let (username, display_name) = nama.get(&id).cloned().unwrap_or_default();
            Some(TemanOnline {
                user_id: id,
                username,
                display_name,
                status: status.to_string(),
                lokasi: p.get("lastLocation").and_then(|s| s.as_str()).unwrap_or("").to_string(),
                place_id: p.get("placeId").and_then(|s| s.as_u64()).unwrap_or(0),
            })
        })
        .filter(|t| !t.username.is_empty())
        .collect();
    hasil.sort_by_key(|t| (t.status != "InGame", t.username.to_lowercase()));
    hasil
}

pub async fn teman_online(cookie: &str, user_id: u64) -> Result<Vec<TemanOnline>, String> {
    let c = client()?;
    let url = format!("https://friends.roblox.com/v1/users/{user_id}/friends");
    let r = kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_header(k)))
        .await
        .map_err(|e| format!("request failed: {}", e.without_url()))?;
    let st = r.status();
    if !st.is_success() {
        return Err(format!("Roblox answered HTTP {st} for the friends list."));
    }
    let v: serde_json::Value = r.json().await.unwrap_or_default();
    let ids: Vec<u64> = v.get("data").and_then(|d| d.as_array()).into_iter().flatten().filter_map(|x| x.get("id")?.as_u64()).take(200).collect();
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let mut semua: Vec<serde_json::Value> = Vec::new();
    for potong in ids.chunks(50) {
        let r = kirim(cookie, true, |k, t| {
            dengan_csrf(
                c.post("https://presence.roblox.com/v1/presence/users")
                    .header("Cookie", cookie_header(k))
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({ "userIds": potong })),
                t,
            )
        })
        .await
        .map_err(|e| format!("request failed: {}", e.without_url()))?;
        if !r.status().is_success() {
            return Err(format!("Roblox answered HTTP {} for friends' status.", r.status()));
        }
        let p: serde_json::Value = r.json().await.unwrap_or_default();
        semua.extend(p.get("userPresences").and_then(|d| d.as_array()).cloned().unwrap_or_default());
    }
    let presence = serde_json::json!({ "userPresences": semua });
    let online: Vec<u64> = semua
        .iter()
        .filter(|p| p.get("userPresenceType").and_then(|x| x.as_u64()).is_some_and(|t| (1..=3).contains(&t)))
        .filter_map(|p| p.get("userId")?.as_u64())
        .collect();
    let mut nama = std::collections::HashMap::new();
    if !online.is_empty() {
        if let Ok(r) = c
            .post("https://users.roblox.com/v1/users")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "userIds": online, "excludeBannedUsers": true }))
            .send()
            .await
        {
            if let Ok(u) = r.json::<serde_json::Value>().await {
                for x in u.get("data").and_then(|d| d.as_array()).into_iter().flatten() {
                    if let Some(id) = x.get("id").and_then(|i| i.as_u64()) {
                        let s = |k: &str| x.get(k).and_then(|v| v.as_str()).unwrap_or("").to_string();
                        nama.insert(id, (s("name"), s("displayName")));
                    }
                }
            }
        }
    }
    Ok(gabung_teman(&presence, &nama))
}

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
pub struct ServerPribadi {
    pub vip_id: u64,
    pub nama: String,
    pub pemilik: String,
    pub playing: u32,
    pub max_players: u32,
    pub job_id: String,
    pub access_code: String,
}

pub fn urai_server_pribadi(v: &serde_json::Value) -> (Vec<ServerPribadi>, String) {
    let guid = |s: Option<&str>| s.filter(|x| crate::pantau::adalah_uuid(x)).unwrap_or("").to_string();
    let daftar = v
        .get("data")
        .and_then(|d| d.as_array())
        .into_iter()
        .flatten()
        .filter(|x| x.get("vipServerId").and_then(|i| i.as_u64()).is_some())
        .map(|x| ServerPribadi {
            vip_id: x.get("vipServerId").and_then(|i| i.as_u64()).unwrap_or(0),
            nama: x.get("name").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            pemilik: x.get("owner").and_then(|o| o.get("name")).and_then(|s| s.as_str()).unwrap_or("").to_string(),
            playing: x.get("playing").and_then(|n| n.as_u64()).unwrap_or(0) as u32,
            max_players: x.get("maxPlayers").and_then(|n| n.as_u64()).unwrap_or(0) as u32,
            job_id: guid(x.get("id").and_then(|s| s.as_str())),
            access_code: guid(x.get("accessCode").and_then(|s| s.as_str())),
        })
        .collect();
    (daftar, v.get("nextPageCursor").and_then(|s| s.as_str()).unwrap_or("").to_string())
}

pub async fn server_pribadi(cookie: &str, place_id: u64, cursor: &str) -> Result<(Vec<ServerPribadi>, String), String> {
    let c = client()?;
    let mut url = format!("https://games.roblox.com/v1/games/{place_id}/private-servers?sortOrder=Desc&excludeFullGames=false");
    if !cursor.is_empty() {
        url.push_str("&cursor=");
        url.push_str(&urlencoding::encode(cursor));
    }
    let r = kirim(cookie, false, |k, _| c.get(&url).header("Cookie", cookie_header(k)))
        .await
        .map_err(|e| format!("request failed: {}", e.without_url()))?;
    let st = r.status();
    if !st.is_success() {
        return Err(format!("Roblox answered HTTP {st} for the private servers."));
    }
    Ok(urai_server_pribadi(&r.json().await.unwrap_or_default()))
}

#[cfg(test)]
mod tes_d {
    use super::*;

    #[test]
    fn teman_dan_pribadi() {
        let v = serde_json::json!({ "userPresences": [
            { "userPresenceType": 1, "lastLocation": "Website", "placeId": null, "gameId": null, "userId": 2 },
            { "userPresenceType": 2, "lastLocation": "Adopt Me!", "placeId": 920587237, "gameId": "x", "userId": 3 },
            { "userPresenceType": 0, "lastLocation": "", "userId": 5 },
            { "userPresenceType": 2, "lastLocation": "Tanpa nama", "userId": 4 },
        ]});
        let nama: std::collections::HashMap<u64, (String, String)> =
            [(2, ("Budi".to_string(), "B".to_string())), (3, ("andi".to_string(), "A".to_string())), (5, ("off".to_string(), String::new()))].into_iter().collect();
        let t = gabung_teman(&v, &nama);
        assert_eq!(t.len(), 2);
        assert_eq!((t[0].username.as_str(), t[0].status.as_str(), t[0].place_id), ("andi", "InGame", 920587237));
        let p = serde_json::json!({ "data": [
            { "vipServerId": 1, "name": "Farm", "owner": { "name": "Budi" }, "playing": 3, "maxPlayers": 12,
              "id": "ea4b153e-d9f8-497a-b266-7bd9d7060a4c", "accessCode": "bad&code" },
            { "name": "tanpa id" },
        ], "nextPageCursor": "abc" });
        let (d, k) = urai_server_pribadi(&p);
        assert_eq!((d.len(), k.as_str()), (1, "abc"));
        assert_eq!(d[0].vip_id, 1);
        assert_eq!((d[0].nama.as_str(), d[0].pemilik.as_str(), d[0].access_code.as_str()), ("Farm", "Budi", ""), "kode non-GUID dibuang");
    }
}

#[cfg(test)]
mod tes_status {
    #[test]
    fn metode_2fa_aktif() {
        let v = serde_json::json!({ "methods": [
            { "mediaType": 2, "enabled": true }, { "mediaType": "Email", "enabled": true },
            { "mediaType": 3, "enabled": true }, { "mediaType": 1, "enabled": false }, { "mediaType": 99, "enabled": true },
        ]});
        assert_eq!(super::urai_2fa(&v), vec!["Authenticator".to_string(), "Email".to_string()]);
        assert!(super::urai_2fa(&serde_json::json!({})).is_empty());
    }
}

#[cfg(test)]
mod tes_pembatasan {
    use super::*;
    use serde_json::json;

    #[test]
    fn pembatasan_dari_jawaban_terukur() {
        assert_eq!(urai_pembatasan(&json!({"restriction": null}), None), None);
        let v2 = json!({"restriction":{"durationSeconds":null,"endTime":null,"moderationStatus":2,"source":1,"startTime":"2026-11-06T23:38:21.237Z"}});
        let v1 = json!({"punishmentTypeDescription":"Ban 7 Days","beginDate":"2026-11-06T23:38:21.172Z","endDate":"2026-11-13T23:38:21.172Z"});
        let p = urai_pembatasan(&v2, Some(&v1)).unwrap();
        assert_eq!((p.jenis.as_str(), p.label.as_str(), p.berakhir.as_str(), p.sumber), ("ban", "Ban 7 Days", "2026-11-13T23:38:21.172Z", 1));
        let p = urai_pembatasan(&v2, None).unwrap();
        assert_eq!((p.jenis.as_str(), p.label.as_str(), p.berakhir.as_str(), p.sumber), ("other", "", "", 1));
        let kunci = json!({"restriction":{"endTime":null,"moderationStatus":2,"source":5,"startTime":"2026-11-05T15:48:57.389Z"}});
        let p = urai_pembatasan(&kunci, None).unwrap();
        assert_eq!((p.jenis.as_str(), p.mulai.as_str(), p.sumber), ("lock", "2026-11-05T15:48:57.389Z", 5));
        assert_eq!(urai_pembatasan(&v2, Some(&json!({"punishmentTypeDescription":"Delete"}))).unwrap().jenis, "terminated");
        assert_eq!(urai_pembatasan(&v2, Some(&json!({"punishmentTypeDescription":"Warn"}))).unwrap().jenis, "warn");
        for (label, jenis) in [("Account Deleted", "terminated"), ("Poison", "terminated"), ("Moderator Note", "warn"), ("Reminder", "warn")] {
            assert_eq!(urai_pembatasan(&v2, Some(&json!({ "punishmentTypeDescription": label }))).unwrap().jenis, jenis, "{label}");
        }
        assert_eq!(urai_pembatasan(&json!({"restriction":{"source":4}}), None).unwrap().jenis, "deactivated");
        assert_eq!(urai_pembatasan(&json!({"restriction":{"source":2}}), None).unwrap().jenis, "other");
    }

    #[test]
    fn banned_pada_sesi_diterima() {
        assert_eq!(banned_sesi_diterima(None), Some(false), "profil publik gagal dibaca");
        assert_eq!(banned_sesi_diterima(Some(false)), Some(false));
        assert_eq!(banned_sesi_diterima(Some(true)), Some(true));
    }

    #[test]
    fn pembatasan_lama_dibersihkan_saat_sesi_diterima() {
        let mut a = crate::store::Account::default();
        a.pembatasan = Some(crate::store::Pembatasan { jenis: "ban".into(), ..Default::default() });
        a.pasang_pembatasan_sehat(None);
        assert_eq!(a.pembatasan, None, "403 hilang = ban sudah berakhir");
        a.pembatasan = Some(crate::store::Pembatasan { jenis: "other".into(), sumber: 2, ..Default::default() });
        a.pasang_pembatasan_sehat(None);
        assert!(a.pembatasan.is_some(), "jenis lain dipertahankan bila tak terbaca");
        a.pembatasan = Some(crate::store::Pembatasan { jenis: "warn".into(), sumber: 1, ..Default::default() });
        a.pasang_pembatasan_sehat(None);
        assert!(a.pembatasan.is_some(), "T8-04: peringatan dipertahankan bila v2 tak terbaca");
        a.pasang_pembatasan_sehat(Some(None));
        assert_eq!(a.pembatasan, None);
    }
}


pub fn host_cdn_3d(hash: &str) -> String {
    let mut i: u32 = 31;
    for b in hash.bytes() {
        i ^= b as u32;
    }
    format!("https://t{}.rbxcdn.com/{}", i % 8, hash)
}

pub fn buka_gzip(b: &[u8]) -> Vec<u8> {
    if b.len() > 2 && b[0] == 0x1f && b[1] == 0x8b {
        let mut out = Vec::new();
        if std::io::Read::read_to_end(&mut flate2::read::GzDecoder::new(b), &mut out).is_ok() {
            return out;
        }
    }
    b.to_vec()
}

pub async fn avatar_badan_url(user_id: u64) -> String {
    let url = format!("https://thumbnails.roblox.com/v1/users/avatar?userIds={user_id}&size=720x720&format=Png&isCircular=false");
    let Ok(c) = client() else { return String::new() };
    let Ok(r) = c.get(url).send().await else { return String::new() };
    let Ok(v) = r.json::<serde_json::Value>().await else { return String::new() };
    let url = v.get("data").and_then(|d| d.get(0)).and_then(|d| d.get("imageUrl")).and_then(|u| u.as_str()).unwrap_or_default();
    if url_cdn_sah(url) { url.to_string() } else { String::new() }
}

pub fn url_cdn_sah(url: &str) -> bool {
    url.strip_prefix("https://").and_then(|r| r.split('/').next()).is_some_and(|h| h.ends_with(".rbxcdn.com") && !h.contains('@') && !h.contains(':'))
}

pub async fn avatar_3d_meta_url(cookie: &str, user_id: u64) -> Result<String, String> {
    let c = client()?;
    let url = format!("https://thumbnails.roblox.com/v1/users/avatar-3d?userId={user_id}");
    for _ in 0..6 {
        let r = kirim(cookie, false, |ck, _| c.get(&url).header("Cookie", format!(".ROBLOSECURITY={ck}")))
            .await
            .map_err(|e| format!("Couldn't reach Roblox for the 3D avatar: {e}"))?;
        let status = r.status();
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(AVATAR_3D_DITOLAK.into());
        }
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(AVATAR_3D_DIBATASI.into());
        }
        if !status.is_success() {
            return Err(format!("Roblox answered {} for the 3D avatar.", status.as_u16()));
        }
        let v: serde_json::Value = r.json().await.unwrap_or_default();
        let img = v.get("imageUrl").and_then(|x| x.as_str()).unwrap_or("");
        if !img.is_empty() {
            return Ok(img.to_string());
        }
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
    }
    Err("Roblox is still preparing this 3D avatar. Try again in a minute.".into())
}

pub const AVATAR_3D_BELUM_SIAP: &str = "Roblox hasn't finished preparing this 3D avatar yet.";
pub const AVATAR_3D_DITOLAK: &str = "Roblox refused the 3D avatar request. Refresh the account to check its sign-in.";
pub const AVATAR_3D_DIBATASI: &str = "Roblox is limiting 3D avatar requests for now.";

pub fn buka_gzip_maks(b: &[u8], maks: usize) -> Result<Vec<u8>, ()> {
    if b.len() > 2 && b[0] == 0x1f && b[1] == 0x8b {
        let mut out = Vec::new();
        let mut z = std::io::Read::take(flate2::read::GzDecoder::new(b), maks as u64 + 1);
        std::io::Read::read_to_end(&mut z, &mut out).map_err(|_| ())?;
        return if out.len() > maks { Err(()) } else { Ok(out) };
    }
    if b.len() > maks { Err(()) } else { Ok(b.to_vec()) }
}

pub async fn unduh_cdn(url: &str, maks: usize) -> Result<Vec<u8>, String> {
    let c = client()?;
    let r = c.get(url).send().await.map_err(|e| format!("Couldn't download the 3D avatar: {e}"))?;
    if r.status() == reqwest::StatusCode::FORBIDDEN || r.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AVATAR_3D_BELUM_SIAP.into());
    }
    if !r.status().is_success() {
        return Err(format!("The 3D avatar file answered {}.", r.status().as_u16()));
    }
    const BESAR: &str = "A 3D avatar file is larger than expected.";
    if r.content_length().is_some_and(|n| n as usize > maks) {
        return Err(BESAR.into());
    }
    let mut r = r;
    let mut b = Vec::new();
    while let Some(c) = r.chunk().await.map_err(|e| format!("Couldn't download the 3D avatar: {e}"))? {
        if b.len() + c.len() > maks {
            return Err(BESAR.into());
        }
        b.extend_from_slice(&c);
    }
    buka_gzip_maks(&b, maks).map_err(|_| BESAR.to_string())
}

pub async fn diagnosa_avatar_3d(cookie: &str, user_id: u64) -> Vec<String> {
    let mut out = Vec::new();
    let Ok(c) = client() else { return vec!["client gagal".into()] };
    async fn cdn(c: &reqwest::Client, url: &str, out: &mut Vec<String>) -> Option<Vec<u8>> {
        let r = match c.get(url).send().await {
            Ok(r) => r,
            Err(e) => {
                out.push(format!("    GET {url} -> galat jaringan: {e}"));
                return None;
            }
        };
        let st = r.status();
        out.push(format!("    GET {url} -> {}", st.as_u16()));
        for (k, v) in r.headers() {
            if k.as_str().eq_ignore_ascii_case("set-cookie") {
                continue;
            }
            out.push(format!("      {}: {}", k, v.to_str().unwrap_or("?")));
        }
        let b = r.bytes().await.unwrap_or_default();
        let isi = buka_gzip(&b);
        if !st.is_success() {
            out.push(format!("      isi ({} B): {}", b.len(), String::from_utf8_lossy(&isi[..isi.len().min(500)]).replace('\n', " ")));
            return None;
        }
        Some(isi)
    }
    async fn api(c: &reqwest::Client, cookie: &str, url: &str, out: &mut Vec<String>) -> Option<String> {
        for _ in 0..6 {
            let r = match kirim(cookie, false, |ck, _| c.get(url).header("Cookie", format!(".ROBLOSECURITY={ck}"))).await {
                Ok(r) => r,
                Err(e) => {
                    out.push(format!("  API {url} -> galat jaringan: {e}"));
                    return None;
                }
            };
            let st = r.status().as_u16();
            let teks = r.text().await.unwrap_or_default();
            out.push(format!("  API {url} -> {st}: {}", &teks[..teks.len().min(400)]));
            let v: serde_json::Value = serde_json::from_str(&teks).unwrap_or_default();
            if let Some(u) = v.get("imageUrl").and_then(|x| x.as_str()).filter(|x| !x.is_empty()) {
                return Some(u.to_string());
            }
            if st != 200 {
                return None;
            }
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        }
        None
    }
    let uji = [
        ("avatar akun ini", format!("https://thumbnails.roblox.com/v1/users/avatar-3d?userId={user_id}")),
        ("avatar pengguna lain (userId 1)", "https://thumbnails.roblox.com/v1/users/avatar-3d?userId=1".to_string()),
        ("aset katalog (topi 1028606)", "https://thumbnails.roblox.com/v1/assets-thumbnail-3d?assetId=1028606".to_string()),
    ];
    for (nama, url) in uji {
        out.push(format!("== {nama}"));
        let Some(meta) = api(&c, cookie, &url, &mut out).await else { continue };
        out.push("  metadata (tanpa cookie):".into());
        let Some(m) = cdn(&c, &meta, &mut out).await else { continue };
        let v: serde_json::Value = serde_json::from_slice(&m).unwrap_or_default();
        out.push(format!("    kunci metadata: {:?}", v.as_object().map(|o| o.keys().cloned().collect::<Vec<_>>()).unwrap_or_default()));
        for k in ["obj", "mtl"] {
            if let Some(h) = v.get(k).and_then(|x| x.as_str()) {
                out.push(format!("  {k}:"));
                let _ = cdn(&c, &host_cdn_3d(h), &mut out).await.map(|b| out.push(format!("      ok {} B", b.len())));
            }
        }
        if let Some(t) = v.get("textures").and_then(|x| x.as_array()).and_then(|a| a.first()).and_then(|x| x.as_str()) {
            out.push("  tekstur pertama:".into());
            let _ = cdn(&c, &host_cdn_3d(t), &mut out).await.map(|b| out.push(format!("      ok {} B", b.len())));
        }
    }
    out.push("== pembanding: avatar 2D publik".into());
    if let Ok(r) = c.get(format!("https://thumbnails.roblox.com/v1/users/avatar?userIds={user_id}&size=720x720&format=Png")).send().await {
        let v: serde_json::Value = r.json().await.unwrap_or_default();
        if let Some(u) = v.pointer("/data/0/imageUrl").and_then(|x| x.as_str()) {
            let _ = cdn(&c, u, &mut out).await.map(|b| out.push(format!("      ok {} B", b.len())));
        }
    }
    out
}

pub async fn diagnosa_avatar_3d_banyak(cookie: &str, uid: &[(String, u64)]) -> Vec<String> {
    let mut out = Vec::new();
    let Ok(c) = client() else { return out };
    for (nama, id) in uid {
        let url = format!("https://thumbnails.roblox.com/v1/users/avatar-3d?userId={id}");
        let mut baris = format!("{nama:<22}");
        let mut img = String::new();
        for _ in 0..6 {
            let Ok(r) = kirim(cookie, false, |ck, _| c.get(&url).header("Cookie", format!(".ROBLOSECURITY={ck}"))).await else { break };
            let st = r.status().as_u16();
            let v: serde_json::Value = r.json().await.unwrap_or_default();
            let state = v.get("state").and_then(|x| x.as_str()).unwrap_or("?").to_string();
            img = v.get("imageUrl").and_then(|x| x.as_str()).unwrap_or("").to_string();
            baris = format!("{nama:<22} API {st} {state:<10}");
            if !img.is_empty() || st != 200 {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        }
        if !img.is_empty() {
            match c.get(&img).send().await {
                Ok(r) => {
                    let lm = r.headers().get("last-modified").and_then(|v| v.to_str().ok()).unwrap_or("-").to_string();
                    let ex = r.headers().get("x-amz-expiration").and_then(|v| v.to_str().ok()).unwrap_or("-").to_string();
                    let _ = &ex;
                    baris += &format!(" {} -> {} | dibuat {lm}", img.rsplit('/').next().unwrap_or(""), r.status().as_u16());
                }
                Err(e) => baris += &format!(" metadata galat {e}"),
            }
        }
        out.push(baris);
    }
    out
}
