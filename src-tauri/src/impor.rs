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

#[cfg(test)]
mod tes {
    use super::*;

    fn c(isi: &str) -> String {
        format!("{TANDA}--Sharing-this-will-allow-someone-to-log-in-as-you.|_{isi}")
    }

    #[test]
    fn berkas_ram_cakupan_mesin_dan_kolom_aslinya() {
        let json = format!(
            "[{{\"Valid\":true,\"SecurityToken\":\"{}\",\"Username\":\"nama\",\"LastUse\":\"2024-07-18T00:30:40\",\"Group\":\"Default\",\"UserID\":1,\"Fields\":{{}},\"BrowserTrackerID\":\"7\",\"Alias\":\"Farm\",\"Description\":\"catatan\",\"Password\":\"rahasia\"}}]",
            c("MMM")
        );
        let blob = crate::store::dpapi_tutup_mesin(json.as_bytes(), ENTROPI_RAM).unwrap();
        let e = urai_berkas_ram(&blob).unwrap();
        assert_eq!(e.len(), 1);
        assert_eq!((e[0].cookie.as_deref(), e[0].alias.as_str(), e[0].catatan.as_str()), (Some(c("MMM").as_str()), "Farm", "catatan"));
        assert!(!format!("{:?}", e[0]).contains("rahasia"), "password tidak ikut");
    }

    #[test]
    fn baris_teks() {
        let teks = format!(
            "budi:rahasia:{a}\n\n{b}\nbaris tanpa cookie\n\"{a}\"; x\nnama:{b2}:lagi\n",
            a = c("AAA111"),
            b = c("BBB222"),
            b2 = c("CCC333"),
        );
        let e = urai_teks(&teks);
        let ringkas: Vec<(String, Option<String>, bool)> =
            e.iter().map(|x| (x.label.clone(), x.cookie.clone(), x.lewati.is_some())).collect();
        assert_eq!(ringkas[0], ("Line 1".into(), Some(c("AAA111")), false), "user:pass:cookie -> cookie saja, sandi dibuang");
        assert_eq!(ringkas[1], ("Line 3".into(), Some(c("BBB222")), false));
        assert_eq!(ringkas[2].0, "Line 4");
        assert!(ringkas[2].2 && ringkas[2].1.is_none(), "baris tanpa cookie dilewati");
        assert_eq!(e[3].lewati.as_deref(), Some("Same cookie as line 1."));
        assert_eq!(ringkas[4], ("Line 6".into(), Some(c("CCC333")), false), "berhenti di ':' setelah cookie");
        assert_eq!(e.len(), 5, "baris kosong tidak dihitung");
        assert!(e.iter().all(|x| !x.label.contains("rahasia")));
    }

    #[test]
    fn json_ram() {
        let json = format!(
            "\u{feff}[{{\"SecurityToken\":\"{a}\",\"Username\":\"Budi\",\"Alias\":\"Farm 1\",\"Description\":\"catatan\",\"Password\":\"x\"}},\
             {{\"SecurityToken\":\"\",\"Username\":\"Kosong\"}},{{\"SecurityToken\":\"{a}\"}}]",
            a = c("AAA")
        );
        let e = urai_berkas_ram(json.as_bytes()).unwrap();
        assert_eq!(e.len(), 3);
        assert_eq!((e[0].alias.as_str(), e[0].catatan.as_str(), e[0].cookie.is_some()), ("Farm 1", "catatan", true));
        assert_eq!(e[0].label, "Account 1 (Budi)");
        assert!(e[1].lewati.is_some() && e[1].cookie.is_none());
        assert!(e[2].lewati.as_deref().unwrap().contains("Same cookie"));
        assert!(urai_berkas_ram(b"{}").is_err());
        assert!(urai_berkas_ram(KEPALA_RAM_BERSANDI).unwrap_err().contains("password"));
    }

    #[test]
    fn dpapi_ram_dengan_entropi() {
        let json = format!("[{{\"SecurityToken\":\"{}\"}}]", c("ZZZ"));
        let blob = crate::store::dpapi_tutup(json.as_bytes(), ENTROPI_RAM).unwrap();
        let e = urai_berkas_ram(&blob).unwrap();
        assert_eq!(e[0].cookie.as_deref(), Some(c("ZZZ").as_str()));
        assert!(crate::store::dpapi_buka(&blob, b"lain").is_err());
    }
}
