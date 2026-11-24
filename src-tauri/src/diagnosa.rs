use crate::store::Account;

pub fn iso_utc(detik: i64) -> String {
    let hari = detik.div_euclid(86_400);
    let sisa = detik.rem_euclid(86_400);
    let z = hari + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z", sisa / 3600, sisa % 3600 / 60, sisa % 60)
}

pub fn lalu(detik: i64) -> String {
    let d = detik.max(0);
    if d >= 3600 {
        format!("{}h {:02}m ago", d / 3600, d % 3600 / 60)
    } else if d >= 60 {
        format!("{}m ago", d / 60)
    } else {
        format!("{d}s ago")
    }
}

pub fn ringkas_akun(akun: &[Account], kini_iso: &str) -> String {
    let mut jenis: std::collections::BTreeMap<&str, usize> = Default::default();
    let mut akhir_ban: Vec<&str> = Vec::new();
    for a in akun {
        if let Some(p) = &a.pembatasan {
            *jenis.entry(p.jenis.as_str()).or_default() += 1;
            if p.jenis == "ban" && !p.berakhir.is_empty() {
                akhir_ban.push(p.berakhir.as_str());
            }
        }
    }
    akhir_ban.sort();
    let lewat = akhir_ban.iter().filter(|t| **t <= kini_iso).count();
    let rincian = if jenis.is_empty() { "none".to_string() } else { jenis.iter().map(|(k, n)| format!("{k} {n}")).collect::<Vec<_>>().join(", ") };
    format!(
        "Accounts: {} | cookie rejected: {} | restricted by Roblox: {} ({rincian}) | never checked: {}\nBans end: {}{}",
        akun.len(),
        akun.iter().filter(|a| !a.last_error.is_empty()).count(),
        akun.iter().filter(|a| a.pembatasan.is_some()).count(),
        akun.iter().filter(|a| a.banned.is_none() && a.last_error.is_empty() && a.pembatasan.is_none()).count(),
        if akhir_ban.is_empty() { "-".to_string() } else { akhir_ban.iter().map(|t| t.get(..16).unwrap_or(t)).collect::<Vec<_>>().join(", ") },
        if lewat > 0 { format!(" ({lewat} already ended: Refresh, or reactivate on roblox.com)") } else { String::new() }
    )
}

pub fn label_integritas(icacls: &str) -> String {
    let mut label = "not shown (Medium if none is set; icacls output may be localized)".to_string();
    let mut catatan: Vec<String> = Vec::new();
    for baris in icacls.lines() {
        let b = baris.trim();
        if let Some(i) = b.find("Mandatory Label\\") {
            let sisa = &b[i + "Mandatory Label\\".len()..];
            label = sisa.split(" Mandatory Level").next().unwrap_or(sisa).to_string();
        } else if b.contains("CodexSandbox") || b.contains("(DENY)") || b.contains("S-1-4-") {
            let ace = b.rsplit(|c: char| c.is_whitespace()).next().unwrap_or(b);
            let ace = match ace.find('\\') {
                Some(i) => &ace[i + 1..],
                None => ace,
            };
            catatan.push(ace.to_string());
        }
    }
    if catatan.is_empty() {
        format!("integrity {label}")
    } else {
        format!("integrity {label}; sandbox/deny ACEs: {}", catatan.join(", "))
    }
}

pub fn samarkan_nama(teks: &str, nama: &[String]) -> String {
    let mut t = teks.to_string();
    let mut urut: Vec<&String> = nama.iter().filter(|n| n.trim().chars().count() >= 2).collect();
    urut.sort_by_key(|n| std::cmp::Reverse(n.len()));
    for n in urut {
        let cari = n.to_ascii_lowercase();
        let mut hasil = String::with_capacity(t.len());
        let mut sisa = t.as_str();
        while let Some(i) = sisa.to_ascii_lowercase().find(&cari) {
            hasil.push_str(&sisa[..i]);
            hasil.push_str("<account>");
            sisa = &sisa[i + n.len()..];
        }
        hasil.push_str(sisa);
        t = hasil;
    }
    t
}

pub fn samarkan_ipv6(teks: &str) -> String {
    let mirip = |t: &str| {
        t.matches(':').count() >= 2 && (t.contains("::") || t.chars().any(|c| c.is_ascii_alphabetic()))
    };
    let mut hasil = String::with_capacity(teks.len());
    let mut deret = String::new();
    let tutup = |deret: &mut String, hasil: &mut String| {
        if mirip(deret) {
            hasil.push_str("<ip>");
        } else {
            hasil.push_str(deret);
        }
        deret.clear();
    };
    for c in teks.chars() {
        if c.is_ascii_hexdigit() || c == ':' || c == '.' {
            deret.push(c);
        } else {
            tutup(&mut deret, &mut hasil);
            hasil.push(c);
        }
    }
    tutup(&mut deret, &mut hasil);
    hasil
}

pub fn samarkan_angka_panjang(teks: &str) -> String {
    let mut hasil = String::with_capacity(teks.len());
    let mut deret = String::new();
    let tutup = |deret: &mut String, hasil: &mut String| {
        if deret.len() >= 6 {
            hasil.push_str("<n>");
        } else {
            hasil.push_str(deret);
        }
        deret.clear();
    };
    for c in teks.chars() {
        if c.is_ascii_digit() {
            deret.push(c);
        } else {
            tutup(&mut deret, &mut hasil);
            hasil.push(c);
        }
    }
    tutup(&mut deret, &mut hasil);
    hasil
}

pub fn teks_aman(teks: &str, nama: &[String]) -> String {
    match crate::saring::baris_aman(teks, nama) {
        Some(s) => samarkan_angka_panjang(&samarkan_ipv6(&samarkan_nama(&s, nama))),
        None => "(withheld: may contain sensitive data)".into(),
    }
}
