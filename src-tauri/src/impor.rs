pub const TANDA: &str = "_|WARNING:-DO-NOT-SHARE-THIS.";

const ENTROPI_RAM: &[u8] = b"ROBLOX ACCOUNT MANAGER | :) | BROUGHT TO YOU BUY ic3w0lf";
const KEPALA_RAM_BERSANDI: &[u8] = b"Roblox Account Manager created by ic3w0lf22 @ github.com .......";

#[derive(Debug, Clone, Default)]
pub struct Entri {
    pub label: String,
    pub cookie: Option<String>,
    pub alias: String,
    pub catatan: String,
    pub lewati: Option<String>,
}

fn cookie_di_baris(baris: &str) -> Vec<String> {
    let mut hasil = Vec::new();
    let mut sisa = baris;
    while let Some(i) = sisa.find(TANDA) {
        let ekor = &sisa[i..];
        let badan = ekor.find("|_").map_or(TANDA.len(), |j| j + 2);
        let akhir = ekor[badan..]
            .find(|c: char| !c.is_ascii_graphic() || "\"';,:".contains(c))
            .map_or(ekor.len(), |j| badan + j);
        if akhir > badan {
            hasil.push(ekor[..akhir].to_string());
        }
        sisa = &ekor[akhir.max(TANDA.len())..];
    }
    hasil
}

pub fn urai_teks(teks: &str) -> Vec<Entri> {
    let mut hasil: Vec<Entri> = Vec::new();
    let mut lihat: Vec<(String, usize)> = Vec::new();
    for (n, baris) in teks.lines().enumerate() {
        let no = n + 1;
        if baris.trim().is_empty() {
            continue;
        }
        let ada = cookie_di_baris(baris);
        if ada.is_empty() {
            hasil.push(Entri {
                label: format!("Line {no}"),
                lewati: Some(format!("No cookie on this line (a cookie starts with {TANDA}).")),
                ..Default::default()
            });
            continue;
        }
        for c in ada {
            let label = format!("Line {no}");
            if let Some((_, dulu)) = lihat.iter().find(|(x, _)| *x == c) {
                hasil.push(Entri { label, lewati: Some(format!("Same cookie as line {dulu}.")), ..Default::default() });
            } else {
                lihat.push((c.clone(), no));
                hasil.push(Entri { label, cookie: Some(c), ..Default::default() });
            }
        }
    }
    hasil
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "PascalCase")]
struct AkunRam {
    #[serde(default)]
    security_token: Option<String>,
    #[serde(default)]
    alias: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    username: Option<String>,
}

fn urai_json_ram(json: &[u8]) -> Result<Vec<Entri>, String> {
    let json = json.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(json);
    let daftar: Vec<AkunRam> =
        serde_json::from_slice(json).map_err(|_| "That isn't a Roblox Account Manager AccountData.json.".to_string())?;
    let mut lihat: Vec<String> = Vec::new();
    Ok(daftar
        .into_iter()
        .enumerate()
        .map(|(i, a)| {
            let nama = a.username.clone().filter(|u| !u.trim().is_empty());
            let label = match &nama {
                Some(u) => format!("Account {} ({u})", i + 1),
                None => format!("Account {}", i + 1),
            };
            let cookie = a.security_token.map(|t| t.trim().to_string()).filter(|t| !t.is_empty());
            let lewati = match &cookie {
                None => Some("No cookie saved for this account in Roblox Account Manager.".to_string()),
                Some(c) if lihat.contains(c) => Some("Same cookie as an earlier account in the file.".to_string()),
                Some(c) => {
                    lihat.push(c.clone());
                    None
                }
            };
            Entri {
                label,
                cookie: if lewati.is_none() { cookie } else { None },
                alias: a.alias.unwrap_or_default().trim().chars().take(64).collect(),
                catatan: a.description.unwrap_or_default().trim_end().chars().take(2000).collect(),
                lewati,
            }
        })
        .collect())
}

pub fn urai_berkas_ram(data: &[u8]) -> Result<Vec<Entri>, String> {
    if data.starts_with(KEPALA_RAM_BERSANDI) {
        return Err("This file is locked with a Roblox Account Manager password. Remove the password in Roblox \
                    Account Manager, then import again."
            .into());
    }
    let polos = data.trim_ascii_start();
    if polos.starts_with(b"[") || data.starts_with(b"\xEF\xBB\xBF") {
        return urai_json_ram(data);
    }
    match crate::store::dpapi_buka(data, ENTROPI_RAM) {
        Ok(isi) => urai_json_ram(&isi),
        Err(_) => Err("This file couldn't be decrypted. It must come from Roblox Account Manager on this PC, used by \
                       the same Windows user."
            .into()),
    }
}
