use serde::Serialize;
use serde_json::Value;

const MAKS_GAME: usize = 100;
const IKON_PER_MINTA: usize = 100;
const MAKS_DESKRIPSI: usize = 4000;
const MAKS_GAMBAR: usize = 5;

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
pub struct GameJelajah {
    pub universe_id: u64,
    pub place_id: u64,
    pub name: String,
    pub players: i64,
    pub suka: i64,
    pub tak_suka: i64,
    pub genre: String,
    pub icon_url: String,
}

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
pub struct KategoriJelajah {
    pub id: String,
    pub nama: String,
    pub info: String,
    pub catatan: String,
    pub games: Vec<GameJelajah>,
}

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
pub struct OpsiFilter {
    pub id: String,
    pub nama: String,
    pub tag: String,
}

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
pub struct HalamanJelajah {
    pub kategori: Vec<KategoriJelajah>,
    pub perangkat: Vec<OpsiFilter>,
    pub negara: Vec<OpsiFilter>,
    pub perangkat_terpilih: String,
    pub negara_terpilih: String,
    pub token: String,
}

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
pub struct DetailGame {
    pub universe_id: u64,
    pub place_id: u64,
    pub name: String,
    pub deskripsi: String,
    pub pembuat: String,
    pub pembuat_grup: bool,
    pub pembuat_terverifikasi: bool,
    pub playing: i64,
    pub visits: u64,
    pub favorit: u64,
    pub max_players: i64,
    pub dibuat: String,
    pub diperbarui: String,
    pub genre: String,
    pub subgenre: String,
    pub harga: i64,
    pub server_pribadi: bool,
    pub gambar: Vec<String>,
}

pub fn kode_sah(s: &str) -> Option<String> {
    let t = s.trim().to_ascii_lowercase();
    (!t.is_empty() && t.len() <= 24 && t.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')).then_some(t)
}

pub fn token_sah(s: &str) -> Option<String> {
    let t = s.trim();
    (!t.is_empty() && t.len() <= 4096 && t.chars().all(|c| c.is_ascii_alphanumeric() || "+/=_-".contains(c))).then(|| t.to_string())
}

fn teks(v: &Value, k: &str) -> String {
    v.get(k).and_then(|x| x.as_str()).unwrap_or_default().to_string()
}

fn opsi(f: &Value) -> Vec<OpsiFilter> {
    f.get("filterOptions")
        .and_then(|x| x.as_array())
        .into_iter()
        .flatten()
        .filter_map(|o| {
            let id = teks(o, "optionId");
            (!id.is_empty()).then(|| OpsiFilter { id, nama: teks(o, "optionDisplayName"), tag: teks(o, "optionContextTag") })
        })
        .collect()
}

pub fn urai_halaman(v: &Value) -> HalamanJelajah {
    let mut h = HalamanJelajah { token: teks(v, "nextSortsPageToken"), ..Default::default() };
    for s in v.get("sorts").and_then(|x| x.as_array()).into_iter().flatten() {
        if let Some(filter) = s.get("filters").and_then(|x| x.as_array()) {
            for f in filter {
                match f.get("filterType").and_then(|x| x.as_str()) {
                    Some("device") => {
                        h.perangkat = opsi(f);
                        h.perangkat_terpilih = teks(f, "selectedOptionId");
                    }
                    Some("country") => {
                        h.negara = opsi(f);
                        h.negara_terpilih = teks(f, "selectedOptionId");
                    }
                    _ => {}
                }
            }
            continue;
        }
        let mut games = Vec::new();
        for g in s.get("games").and_then(|x| x.as_array()).into_iter().flatten() {
            if g.get("isSponsored").and_then(|x| x.as_bool()) == Some(true) {
                continue;
            }
            let place_id = g.get("rootPlaceId").and_then(|x| x.as_u64()).unwrap_or(0);
            if place_id == 0 {
                continue;
            }
            games.push(GameJelajah {
                universe_id: g.get("universeId").and_then(|x| x.as_u64()).unwrap_or(0),
                place_id,
                name: teks(g, "name"),
                players: g.get("playerCount").and_then(|x| x.as_i64()).unwrap_or(0),
                suka: g.get("totalUpVotes").and_then(|x| x.as_i64()).unwrap_or(0),
                tak_suka: g.get("totalDownVotes").and_then(|x| x.as_i64()).unwrap_or(0),
                genre: teks(g, "genreL1"),
                icon_url: String::new(),
            });
            if games.len() >= MAKS_GAME {
                break;
            }
        }
        if games.is_empty() {
            continue;
        }
        let info = s.get("topicLayoutData").map(|t| teks(t, "infoText")).unwrap_or_default();
        h.kategori.push(KategoriJelajah { id: teks(s, "sortId"), nama: teks(s, "sortDisplayName"), info, catatan: teks(s, "subtitle"), games });
    }
    h
}

pub fn urai_detail(v: &Value) -> Option<DetailGame> {
    let d = v.get("data")?.as_array()?.first()?;
    let c = d.get("creator").cloned().unwrap_or(Value::Null);
    let mut deskripsi = teks(d, "description");
    if deskripsi.chars().count() > MAKS_DESKRIPSI {
        deskripsi = deskripsi.chars().take(MAKS_DESKRIPSI).collect::<String>() + "…";
    }
    Some(DetailGame {
        universe_id: d.get("id").and_then(|x| x.as_u64()).unwrap_or(0),
        place_id: d.get("rootPlaceId").and_then(|x| x.as_u64()).unwrap_or(0),
        name: teks(d, "name"),
        deskripsi,
        pembuat: teks(&c, "name"),
        pembuat_grup: c.get("type").and_then(|x| x.as_str()) == Some("Group"),
        pembuat_terverifikasi: c.get("hasVerifiedBadge").and_then(|x| x.as_bool()).unwrap_or(false),
        playing: d.get("playing").and_then(|x| x.as_i64()).unwrap_or(0),
        visits: d.get("visits").and_then(|x| x.as_u64()).unwrap_or(0),
        favorit: d.get("favoritedCount").and_then(|x| x.as_u64()).unwrap_or(0),
        max_players: d.get("maxPlayers").and_then(|x| x.as_i64()).unwrap_or(0),
        dibuat: teks(d, "created"),
        diperbarui: teks(d, "updated"),
        genre: teks(d, "genre_l1"),
        subgenre: teks(d, "genre_l2"),
        harga: d.get("price").and_then(|x| x.as_i64()).unwrap_or(0),
        server_pribadi: d.get("createVipServersAllowed").and_then(|x| x.as_bool()).unwrap_or(false),
        gambar: Vec::new(),
    })
}

async fn ambil_json(url: String) -> Result<Value, String> {
    let r = crate::roblox::client()?.get(url).send().await.map_err(|e| format!("Roblox could not be reached: {e}"))?;
    let status = r.status();
    if !status.is_success() {
        return Err(format!("Roblox answered HTTP {}.", status.as_u16()));
    }
    r.json::<Value>().await.map_err(|e| format!("Roblox's answer was unreadable: {e}"))
}

async fn pasang_ikon(kategori: &mut [KategoriJelajah]) {
    let mut ids: Vec<u64> = kategori.iter().flat_map(|k| k.games.iter().map(|g| g.universe_id)).filter(|&u| u != 0).collect();
    ids.sort_unstable();
    ids.dedup();
    let mut tugas = tokio::task::JoinSet::new();
    for potong in ids.chunks(IKON_PER_MINTA) {
        let daftar = potong.iter().map(|u| u.to_string()).collect::<Vec<_>>().join(",");
        tugas.spawn(ambil_json(format!(
            "https://thumbnails.roblox.com/v1/games/icons?universeIds={daftar}&size=256x256&format=Png&returnPolicy=PlaceHolder&isCircular=false"
        )));
    }
    let mut ikon = std::collections::HashMap::new();
    while let Some(h) = tugas.join_next().await {
        let Ok(Ok(v)) = h else { continue };
        for item in v.get("data").and_then(|x| x.as_array()).into_iter().flatten() {
            let id = item.get("targetId").and_then(|x| x.as_u64()).unwrap_or(0);
            let url = teks(item, "imageUrl");
            if id != 0 && url.starts_with("https://") {
                ikon.insert(id, url);
            }
        }
    }
    for k in kategori.iter_mut() {
        for g in k.games.iter_mut() {
            if let Some(u) = ikon.get(&g.universe_id) {
                g.icon_url = u.clone();
            }
        }
    }
}

pub async fn halaman(perangkat: &str, negara: &str, token: &str) -> Result<HalamanJelajah, String> {
    let mut url = format!("https://apis.roblox.com/explore-api/v1/get-sorts?sessionId={}", uuid::Uuid::new_v4());
    if let Some(p) = kode_sah(perangkat) {
        url.push_str(&format!("&device={p}"));
    }
    if let Some(n) = kode_sah(negara) {
        url.push_str(&format!("&country={n}"));
    }
    if let Some(t) = token_sah(token) {
        url.push_str(&format!("&sortsPageToken={}", urlencoding::encode(&t)));
    }
    let v = ambil_json(url).await?;
    let mut h = urai_halaman(&v);
    pasang_ikon(&mut h.kategori).await;
    Ok(h)
}

pub async fn detail(universe_id: u64) -> Result<DetailGame, String> {
    if universe_id == 0 {
        return Err("No game was given.".into());
    }
    let (info, gambar) = tokio::join!(
        ambil_json(format!("https://games.roblox.com/v1/games?universeIds={universe_id}")),
        ambil_json(format!(
            "https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds={universe_id}&countPerUniverse={MAKS_GAMBAR}&defaults=true&size=768x432&format=Png&isCircular=false"
        )),
    );
    let mut d = urai_detail(&info?).ok_or("Roblox has no details for this game.")?;
    if let Ok(v) = gambar {
        d.gambar = v
            .get("data")
            .and_then(|x| x.as_array())
            .and_then(|a| a.first())
            .and_then(|u| u.get("thumbnails"))
            .and_then(|x| x.as_array())
            .into_iter()
            .flatten()
            .map(|t| teks(t, "imageUrl"))
            .filter(|u| u.starts_with("https://"))
            .take(MAKS_GAMBAR)
            .collect();
    }
    Ok(d)
}
