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
