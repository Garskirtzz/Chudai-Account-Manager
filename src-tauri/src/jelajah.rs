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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn kode_dan_token() {
        assert_eq!(kode_sah(" Computer "), Some("computer".into()));
        assert_eq!(kode_sah("high_end_phone"), Some("high_end_phone".into()));
        assert_eq!(kode_sah(""), None);
        assert_eq!(kode_sah("id&device=x"), None);
        assert_eq!(kode_sah(&"a".repeat(25)), None);
        assert_eq!(token_sah("eyJzdGFydCI6Nn0="), Some("eyJzdGFydCI6Nn0=".into()));
        assert_eq!(token_sah("abc&x=1"), None);
        assert_eq!(token_sah(""), None);
    }

    #[test]
    fn halaman_filter_kategori_dan_iklan() {
        let v = json!({
            "nextSortsPageToken": "TOK=",
            "sorts": [
                { "sortId": "filters_v5", "contentType": "Filters", "filters": [
                    { "filterType": "device", "selectedOptionId": "computer", "filterOptions": [
                        { "optionId": "all", "optionDisplayName": "All Devices" },
                        { "optionId": "computer", "optionDisplayName": "Computer", "optionContextTag": "My device" } ] },
                    { "filterType": "country", "selectedOptionId": "id", "filterOptions": [
                        { "optionId": "all", "optionDisplayName": "All Locations" },
                        { "optionId": "id", "optionDisplayName": "Indonesia", "optionContextTag": "My location" } ] } ] },
                { "sortId": "top-trending", "sortDisplayName": "Top Trending", "contentType": "Games",
                  "topicLayoutData": { "infoText": "Biggest increase." },
                  "games": [
                    { "universeId": 1, "rootPlaceId": 11, "name": "Alpha", "playerCount": 5, "totalUpVotes": 9, "totalDownVotes": 1, "genreL1": "RPG" },
                    { "universeId": 2, "rootPlaceId": 22, "name": "Ad", "isSponsored": true },
                    { "universeId": 3, "rootPlaceId": 0, "name": "No place" } ] },
                { "sortId": "music-top-100", "sortDisplayName": "Music", "contentType": "Songs", "games": [] },
                { "sortId": "top-playing-now", "sortDisplayName": "Top Playing Now", "subtitle": "Results for all devices and locations",
                  "games": [ { "universeId": 4, "rootPlaceId": 44, "name": "Beta" } ] }
            ]
        });
        let h = urai_halaman(&v);
        assert_eq!(h.token, "TOK=");
        assert_eq!(h.perangkat_terpilih, "computer");
        assert_eq!(h.negara_terpilih, "id");
        assert_eq!(h.perangkat[1], OpsiFilter { id: "computer".into(), nama: "Computer".into(), tag: "My device".into() });
        assert_eq!(h.negara.len(), 2);
        assert_eq!(h.kategori.len(), 2, "filters and empty music sort are not shelves");
        let k = &h.kategori[0];
        assert_eq!((k.id.as_str(), k.nama.as_str(), k.info.as_str()), ("top-trending", "Top Trending", "Biggest increase."));
        assert_eq!(k.games.len(), 1, "sponsored and place-less entries are dropped");
        assert_eq!(k.games[0], GameJelajah { universe_id: 1, place_id: 11, name: "Alpha".into(), players: 5, suka: 9, tak_suka: 1, genre: "RPG".into(), icon_url: String::new() });
        assert_eq!(h.kategori[1].catatan, "Results for all devices and locations");
    }

    #[test]
    fn detail_dibaca_dan_deskripsi_dibatasi() {
        let v = json!({ "data": [ {
            "id": 7, "rootPlaceId": 77, "name": "Game", "description": "x".repeat(MAKS_DESKRIPSI + 50),
            "creator": { "name": "Team", "type": "Group", "hasVerifiedBadge": true },
            "playing": 10, "visits": 1000, "favoritedCount": 50, "maxPlayers": 25, "price": null,
            "created": "2025-01-15T08:10:40Z", "updated": "2026-11-17T17:04:55Z",
            "genre_l1": "Simulation", "genre_l2": "Vehicle Sim", "createVipServersAllowed": true } ] });
        let d = urai_detail(&v).unwrap();
        assert_eq!((d.universe_id, d.place_id, d.max_players, d.harga), (7, 77, 25, 0));
        assert!(d.pembuat_grup && d.pembuat_terverifikasi && d.server_pribadi);
        assert_eq!(d.deskripsi.chars().count(), MAKS_DESKRIPSI + 1);
        assert!(urai_detail(&json!({ "data": [] })).is_none());
    }

    #[tokio::test]
    #[ignore]
    async fn jelajah_langsung() {
        let h1 = halaman("", "", "").await.unwrap();
        println!("bawaan: device={} country={} perangkat={} negara={}", h1.perangkat_terpilih, h1.negara_terpilih, h1.perangkat.len(), h1.negara.len());
        let mut token = h1.token.clone();
        let mut semua = h1.kategori.clone();
        while !token.is_empty() {
            let h = halaman(&h1.perangkat_terpilih, &h1.negara_terpilih, &token).await.unwrap();
            assert!(h.perangkat.is_empty(), "filters only on page 1");
            semua.extend(h.kategori);
            token = h.token;
        }
        for k in &semua {
            let ikon = k.games.iter().filter(|g| !g.icon_url.is_empty()).count();
            println!("{} | {} | {} game | {} ikon", k.id, k.nama, k.games.len(), ikon);
            assert!(ikon * 10 >= k.games.len() * 9, "most games get an icon");
        }
        assert!(semua.iter().any(|k| k.id == "top-trending"));
        let g = &semua[0].games[0];
        let d = detail(g.universe_id).await.unwrap();
        println!("detail: {} oleh {} | {} visits | {} gambar", d.name, d.pembuat, d.visits, d.gambar.len());
        assert_eq!(d.place_id, g.place_id);
        let all = halaman("all", "all", "").await.unwrap();
        assert_eq!((all.perangkat_terpilih.as_str(), all.negara_terpilih.as_str()), ("all", "all"));
    }
}
