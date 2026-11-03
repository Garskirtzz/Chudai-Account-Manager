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
    pub avatar_url: String,
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

fn client() -> Result<reqwest::Client, String> {
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

pub async fn csrf_token(cookie: &str) -> Result<String, String> {
    let resp = client()?
        .post("https://auth.roblox.com/v2/logout")
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
        .await
        .map_err(|e| format!("CSRF request failed: {e}"))?;

    resp.headers()
        .get("x-csrf-token")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| {
            "Roblox did not return an x-csrf-token. The cookie has most likely \
             expired or been revoked."
                .to_string()
        })
}

pub async fn auth_ticket(cookie: &str) -> Result<String, String> {
    let token = csrf_token(cookie).await?;
    auth_ticket_token(cookie, &token).await
}

async fn auth_ticket_token(cookie: &str, token: &str) -> Result<String, String> {
    let resp = client()?
        .post("https://auth.roblox.com/v1/authentication-ticket/")
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("X-CSRF-TOKEN", token)
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
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
    let token = csrf_token(cookie).await?;
    let ticket = auth_ticket_token(cookie, &token).await?;

    let client = reqwest::Client::builder()
        .user_agent(UA)
        .timeout(TIMEOUT)
        .connect_timeout(TIMEOUT_SAMBUNG)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| format!("could not create the HTTP client: {e}"))?;

    let resp = client
        .post("https://auth.roblox.com/v1/authentication-ticket/redeem")
        .header("Origin", "https://www.roblox.com")
        .header("Referer", "https://www.roblox.com/")
        .header("X-CSRF-TOKEN", token)
        .header("RBXAuthenticationNegotiation", "1")
        .header("Content-Type", "application/json")
        .body(format!("{{\"authenticationTicket\":\"{ticket}\"}}"))
        .send()
        .await
        .map_err(|e| format!("ticket redemption failed: {e}"))?;

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

pub async fn user_info(cookie: &str) -> Result<UserInfo, String> {
    let c = client()?;
    let ch = cookie_header(cookie);

    let me: serde_json::Value = c
        .get("https://users.roblox.com/v1/users/authenticated")
        .header("Cookie", &ch)
        .send()
        .await
        .map_err(|e| format!("could not fetch the profile: {e}"))?
        .json()
        .await
        .map_err(|_| {
            "Profile response unreadable -- the cookie has most likely expired."
                .to_string()
        })?;

    let user_id = me
        .get("id")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| "Roblox rejected this cookie (no user id returned).".to_string())?;

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
        let resp = c
            .get("https://economy.roblox.com/v1/user/currency")
            .header("Cookie", &ch)
            .send()
            .await
            .ok()?;
        let v = resp.json::<serde_json::Value>().await.ok()?;
        v.get("robux").and_then(|x| x.as_i64())
    };
    let premium = async {
        let resp = c
            .get(format!(
                "https://premiumfeatures.roblox.com/v1/users/{user_id}/validate-membership"
            ))
            .header("Cookie", &ch)
            .send()
            .await
            .ok()?;
        Some(resp.text().await.ok()?.trim() == "true")
    };
    let (robux, premium, avatar) = tokio::join!(robux, premium, avatar_url(user_id));
    info.robux = robux.unwrap_or(0);
    info.premium = premium.unwrap_or(false);
    info.avatar_url = avatar;

    Ok(info)
}

pub async fn resolve_share_link(
    cookie: &str,
    code: &str,
) -> Result<serde_json::Value, String> {
    let token = csrf_token(cookie).await?;
    let resp = client()?
        .post("https://apis.roblox.com/sharelinks/v1/resolve-link")
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("X-CSRF-TOKEN", token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "linkId": code, "linkType": "Server" }))
        .send()
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
    let mut url = format!(
        "https://games.roblox.com/v1/games/{place_id}/servers/Public?sortOrder=Asc&limit=100"
    );
    if !cursor.is_empty() {
        url.push_str("&cursor=");
        url.push_str(&urlencoding::encode(cursor));
    }
    let v: serde_json::Value = client()?
        .get(url)
        .send()
        .await
        .map_err(|e| format!("could not fetch servers: {e}"))?
        .json()
        .await
        .map_err(|e| format!("server list unreadable: {e}"))?;

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
    let token = csrf_token(cookie).await.ok()?;
    alamat_server_token(cookie, &token, place_id, job_id).await
}

pub async fn alamat_server_token(
    cookie: &str,
    token: &str,
    place_id: u64,
    job_id: &str,
) -> Option<String> {
    let teks = client()
        .ok()?
        .post("https://gamejoin.roblox.com/v1/join-game-instance")
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("X-CSRF-TOKEN", token)
        .header("Content-Type", "application/json")
        .header("User-Agent", "Roblox/WinInet")
        .json(&serde_json::json!({ "placeId": place_id, "gameId": job_id }))
        .send()
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
    let v: serde_json::Value = client()
        .ok()?
        .post("https://presence.roblox.com/v1/presence/users")
        .header("Cookie", cookie_header(cookie))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "userIds": [user_id] }))
        .send()
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
    let token = csrf_token(cookie).await?;
    let mut req = client()?
        .request(metode, url)
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("X-CSRF-TOKEN", token)
        .header("Content-Type", "application/json");
    req = match body {
        Some(b) => req.json(&b),
        None => req.body("{}"),
    };
    let r = req.send().await.map_err(|e| format!("request failed: {e}"))?;
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

pub async fn blokir(cookie: &str, user_id: u64, buka: bool) -> Result<(), String> {
    let apa = if buka { "unblock" } else { "block" };
    aksi(
        cookie,
        reqwest::Method::POST,
        &format!("https://accountsettings.roblox.com/v1/users/{user_id}/{apa}"),
        None,
    )
    .await
    .map(|_| ())
}

pub async fn daftar_diblokir(cookie: &str) -> Result<Vec<(u64, String)>, String> {
    let v = aksi(
        cookie,
        reqwest::Method::GET,
        "https://accountsettings.roblox.com/v1/users/get-detailed-blocked-users",
        None,
    )
    .await?;
    let mut hasil = Vec::new();
    if let Some(a) = v.get("blockedUsers").and_then(|x| x.as_array()) {
        for u in a {
            let id = u.get("userId").and_then(|x| x.as_u64()).unwrap_or(0);
            let nama = u
                .get("name")
                .and_then(|x| x.as_str())
                .unwrap_or("?")
                .to_string();
            if id != 0 {
                hasil.push((id, nama));
            }
        }
    }
    Ok(hasil)
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
    let Ok(token) = csrf_token(cookie).await else {
        return "csrf gagal".into();
    };
    let Ok(c) = client() else {
        return "client gagal".into();
    };
    match c
        .post("https://gamejoin.roblox.com/v1/join-game-instance")
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("X-CSRF-TOKEN", token)
        .header("Content-Type", "application/json")
        .header(
            "User-Agent",
            "Roblox/WinInet",
        )
        .json(&serde_json::json!({ "placeId": place_id, "gameId": job_id }))
        .send()
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
    let Ok(token) = csrf_token(cookie).await else {
        return (-1, "csrf gagal".into());
    };
    let Ok(c) = client() else {
        return (-1, "client gagal".into());
    };
    let r = c
        .post("https://gamejoin.roblox.com/v1/join-game-instance")
        .header("Cookie", cookie_header(cookie))
        .header("Referer", "https://www.roblox.com/")
        .header("Origin", "https://www.roblox.com")
        .header("X-CSRF-TOKEN", token)
        .header("Content-Type", "application/json")
        .header("User-Agent", "Roblox/WinInet")
        .json(&serde_json::json!({ "placeId": place_id, "gameId": job_id }))
        .send()
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
        let c = cache().lock().unwrap();
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
        let mut simpan = cache().lock().unwrap();
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
