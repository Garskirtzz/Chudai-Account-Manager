use std::path::{Path, PathBuf};

const SENSITIF: [&str; 14] = [
    "gameinfo", "ticket", "placelauncher", "roblosecurity", "cookie", "accesscode", "linkcode", "authorization",
    "bearer", "joinscript", "webhook", "password", "roblox-player:", "csrf",
];

pub fn baris_aman(baris: &str, nama: &[String]) -> Option<String> {
    let kecil = baris.to_ascii_lowercase();
    if SENSITIF.iter().any(|k| kecil.contains(k)) {
        return None;
    }
    let mut s = samarkan_folder_pengguna(baris);
    for kunci in ["userid:", "userId=", "user key: app:", "rbxid=", "browserid=", "browserTrackerId=", "BTID is overriden to ", "websiteBTId is "] {
        s = samarkan_setelah(&s, kunci);
    }
    s = samarkan_ipv4(&s);
    s = samarkan_uuid(&s);
    for n in nama.iter().filter(|n| n.chars().count() >= 3) {
        s = s.replace(n.as_str(), "<account>");
    }
    Some(s)
}

fn samarkan_folder_pengguna(s: &str) -> String {
    let mut hasil = String::with_capacity(s.len());
    let mut sisa = s;
    loop {
        let i = [r"\Users\", "/Users/"].iter().filter_map(|p| sisa.find(p).map(|i| (i, p.len()))).min();
        let Some((i, n)) = i else {
            hasil.push_str(sisa);
            return hasil;
        };
        hasil.push_str(&sisa[..i + n]);
        let akhir = sisa[i + n..].find(['\\', '/', ' ', '"']).map_or(sisa.len(), |j| i + n + j);
        hasil.push_str("<user>");
        sisa = &sisa[akhir..];
    }
}

fn samarkan_setelah(s: &str, kunci: &str) -> String {
    let mut hasil = String::with_capacity(s.len());
    let mut sisa = s;
    while let Some(i) = sisa.find(kunci) {
        let mulai = i + kunci.len();
        hasil.push_str(&sisa[..mulai]);
        let angka = sisa[mulai..].bytes().take_while(|b| b.is_ascii_digit()).count();
        if angka > 0 {
            hasil.push_str("<id>");
        }
        sisa = &sisa[mulai + angka..];
    }
    hasil.push_str(sisa);
    hasil
}

fn samarkan_ipv4(s: &str) -> String {
    let b = s.as_bytes();
    let mut hasil = String::with_capacity(s.len());
    let mut i = 0;
    while i < b.len() {
        let batas_kiri = i == 0 || !(b[i - 1].is_ascii_digit() || b[i - 1] == b'.');
        if batas_kiri && b[i].is_ascii_digit() {
            let mut j = i;
            let mut bagian = 0;
            let mut sah = true;
            while bagian < 4 {
                let d = b[j..].iter().take_while(|c| c.is_ascii_digit()).count();
                if d == 0 || d > 3 {
                    sah = false;
                    break;
                }
                j += d;
                bagian += 1;
                if bagian < 4 {
                    if j < b.len() && b[j] == b'.' {
                        j += 1;
                    } else {
                        sah = false;
                        break;
                    }
                }
            }
            let batas_kanan = j >= b.len() || !(b[j].is_ascii_digit() || (b[j] == b'.' && b.get(j + 1).is_some_and(u8::is_ascii_digit)));
            if sah && batas_kanan {
                hasil.push_str("<ip>");
                i = j;
                continue;
            }
        }
        let ch = s[i..].chars().next().unwrap_or(' ');
        hasil.push(ch);
        i += ch.len_utf8();
    }
    hasil
}

fn samarkan_uuid(s: &str) -> String {
    const POLA: [usize; 5] = [8, 4, 4, 4, 12];
    let b = s.as_bytes();
    let cocok = |i: usize| -> Option<usize> {
        if i > 0 && b[i - 1].is_ascii_hexdigit() {
            return None;
        }
        let mut j = i;
        for (k, n) in POLA.iter().enumerate() {
            if j + n > b.len() || !b[j..j + n].iter().all(u8::is_ascii_hexdigit) {
                return None;
            }
            j += n;
            if k < 4 {
                if b.get(j) != Some(&b'-') {
                    return None;
                }
                j += 1;
            }
        }
        (j >= b.len() || !b[j].is_ascii_hexdigit()).then_some(j)
    };
    let mut hasil = String::with_capacity(s.len());
    let mut i = 0;
    while i < b.len() {
        if let Some(j) = cocok(i) {
            hasil.push_str("<uuid>");
            i = j;
            continue;
        }
        let ch = s[i..].chars().next().unwrap_or(' ');
        hasil.push(ch);
        i += ch.len_utf8();
    }
    hasil
}

fn log_terbaru(dir: &Path, n: usize) -> Vec<PathBuf> {
    let Ok(rd) = std::fs::read_dir(dir) else { return Vec::new() };
    let mut v: Vec<(std::time::SystemTime, PathBuf)> = rd
        .flatten()
        .filter(|e| {
            let nama = e.file_name().to_string_lossy().to_string();
            nama.contains("_Player_") && nama.ends_with(".log") && !nama.contains("CrashHandler")
        })
        .filter_map(|e| Some((e.metadata().ok()?.modified().ok()?, e.path())))
        .collect();
    v.sort_by(|a, b| b.0.cmp(&a.0));
    v.into_iter().take(n).map(|(_, p)| p).collect()
}

pub fn ekor_log_roblox(dir: &Path, nama: &[String], maks_berkas: usize, maks_baris: usize) -> String {
    let berkas = log_terbaru(dir, maks_berkas);
    if berkas.is_empty() {
        return "(no Roblox client logs)".into();
    }
    let mut keluar = String::new();
    for p in berkas {
        let isi = std::fs::read(&p).map(|b| String::from_utf8_lossy(&b).to_string()).unwrap_or_default();
        let aman: Vec<String> = isi.lines().filter_map(|l| baris_aman(l, nama)).collect();
        let dibuang = isi.lines().count() - aman.len();
        keluar.push_str(&format!(
            "-- {} ({} lines left out as sensitive)\n",
            p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
            dibuang
        ));
        for l in aman.iter().skip(aman.len().saturating_sub(maks_baris)) {
            let l: String = l.chars().take(300).collect();
            keluar.push_str(&l);
            keluar.push('\n');
        }
    }
    keluar
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn baris_rahasia_dibuang_utuh() {
        let n: Vec<String> = Vec::new();
        for l in [
            r#"2026-11-04T07:08:10Z,5.9,1a2b,6 [FLog::UpdateController] Update thread: start ""C:\R\RobloxPlayerInstaller.exe" roblox-player:1+launchmode:play+gameinfo:ABCDEF"#,
            "[FLog::Output] placelauncherurl:https%3A%2F%2Fassetgame.roblox.com%2Fgame%2FPlaceLauncher.ashx%3FaccessCode%3Dabc",
            "Set-Cookie: .ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE",
            "joinScript {\"ClientTicket\":\"x\"}",
            "privateServerLinkCode=1234 linkCode=1234",
        ] {
            assert_eq!(baris_aman(l, &n), None, "{l}");
        }
    }

    #[test]
    fn data_pribadi_disamarkan() {
        let nama = vec!["AkunContoh".to_string(), "ab".to_string()];
        let l = r"2026-11-04,1.2,3f,6 [FLog::Output] ! Joining game 'c63bf72f-b8d0-4675-8d80-887388c603a3' place 920587237 at 128.116.45.12 userid:12345678, C:\Users\pemakai\AppData\Local\Roblox AkunContoh ab";
        let s = baris_aman(l, &nama).unwrap();
        assert!(s.contains("Joining game '<uuid>'"), "{s}");
        assert!(s.contains("at <ip>"), "{s}");
        assert!(s.contains("userid:<id>"), "{s}");
        assert!(s.contains(r"C:\Users\<user>\AppData"), "{s}");
        assert!(s.contains("<account>") && !s.contains("AkunContoh"), "{s}");
        assert!(s.ends_with(" ab"), "nama < 3 huruf tidak diganti (terlalu umum): {s}");
        assert!(s.contains("place 920587237"), "place id publik tetap: {s}");
        let s = baris_aman("[FLog::DataModelPatchConfigurer] Load configs for user key: app:4932399053762268634 BTID is overriden to 574126934.", &nama).unwrap();
        assert_eq!(s, "[FLog::DataModelPatchConfigurer] Load configs for user key: app:<id> BTID is overriden to <id>.");
    }

    #[test]
    fn versi_dan_waktu_bukan_ip() {
        let n: Vec<String> = Vec::new();
        let s = baris_aman("0.745.0.7451137 at 1.2.3.4.5 and 10.0.0.1:53640 v1.22", &n).unwrap();
        assert_eq!(s, "0.745.0.7451137 at 1.2.3.4.5 and <ip>:53640 v1.22");
    }

    #[test]
    fn ekor_log_dari_berkas() {
        let dir = std::env::temp_dir().join(format!("cam-uji-saring-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        std::fs::write(dir.join("0.745_20261104T070805Z_Player_DD1DD_last.log"), "a\nUpdate thread: start gameinfo:X\nb userid:42\n").unwrap();
        std::fs::write(dir.join("0.745_20261104T070805Z_Player_030E6_CrashHandler_last.log"), "crash\n").unwrap();
        let s = ekor_log_roblox(&dir, &[], 3, 10);
        assert!(s.contains("Player_DD1DD") && !s.contains("CrashHandler"), "{s}");
        assert!(s.contains("(1 lines left out as sensitive)") && s.contains("b userid:<id>") && !s.contains("gameinfo"), "{s}");
    }
}
