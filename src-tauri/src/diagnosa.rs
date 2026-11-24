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

#[cfg(test)]
mod tes {
    use super::*;
    use crate::store::Pembatasan;

    #[test]
    fn ringkasan_akun_tanpa_nama() {
        let mut a = Account { alias: "RahasiaSatu".into(), banned: Some(false), ..Default::default() };
        a.pembatasan = Some(Pembatasan { jenis: "ban".into(), berakhir: "2026-11-13T23:38:21Z".into(), ..Default::default() });
        let b = Account { alias: "RahasiaDua".into(), pembatasan: Some(Pembatasan { jenis: "lock".into(), ..Default::default() }), ..Default::default() };
        let c = Account { alias: "RahasiaTiga".into(), last_error: "x".into(), ..Default::default() };
        let d = Account { alias: "RahasiaEmpat".into(), ..Default::default() };
        let r = ringkas_akun(&[a, b, c, d], "2026-11-12T00:00:00Z");
        assert!(r.contains("Accounts: 4"), "{r}");
        assert!(r.contains("cookie rejected: 1"));
        assert!(r.contains("restricted by Roblox: 2 (ban 1, lock 1)"), "{r}");
        assert!(r.contains("never checked: 1"), "{r}");
        assert!(r.contains("2026-11-13T23:38"));
        assert!(!r.contains("Rahasia"), "tanpa nama akun");
        let r2 = ringkas_akun(&[Account { pembatasan: Some(Pembatasan { jenis: "ban".into(), berakhir: "2026-11-01T00:00:00Z".into(), ..Default::default() }), ..Default::default() }], "2026-11-12T00:00:00Z");
        assert!(r2.contains("1 already ended"), "{r2}");
    }

    #[test]
    fn label_dari_icacls() {
        let low = "C:\\X MESINKU\\CodexSandboxUsers:(OI)(CI)(M)\n   Everyone:(CI)(DENY)(DC)\n   Mandatory Label\\Low Mandatory Level:(OI)(CI)(NW)\n";
        let r = label_integritas(low);
        assert!(r.starts_with("integrity Low"), "{r}");
        assert!(r.contains("CodexSandboxUsers") && r.contains("(DENY)"), "{r}");
        assert!(!r.contains("MESINKU"), "nama mesin dibuang: {r}");
        assert!(label_integritas("C:\\X BUILTIN\\Administrators:(I)(F)\n").starts_with("integrity not shown"));
        assert!(label_integritas("C:\\X Mandatory Label\\Medium Mandatory Level:(I)(NW)").starts_with("integrity Medium"));
    }

    #[test]
    fn tanggal_utc() {
        assert_eq!(iso_utc(0), "1970-01-01T00:00:00Z");
        assert_eq!(iso_utc(1_767_225_600), "2026-01-01T00:00:00Z");
        assert_eq!(iso_utc(1_772_323_199), "2026-02-28T23:59:59Z");
        assert_eq!(iso_utc(951_782_400), "2000-02-29T00:00:00Z", "kabisat");
        assert_eq!(lalu(11_100), "3h 05m ago");
        assert_eq!(lalu(-5), "0s ago");
    }

    #[test]
    fn nama_disamarkan() {
        let nama = vec!["Budi".to_string(), "Budiman".to_string(), "x".to_string()];
        assert_eq!(samarkan_nama("Budiman putus; Budi juga; x tetap", &nama), "<account> putus; <account> juga; x tetap");
        assert_eq!(samarkan_nama("BUDIMAN dan budi", &nama), "<account> dan <account>", "T13-07: huruf diabaikan");
    }

    #[test]
    fn teks_bebas_disaring() {
        let nama = vec!["AkunRahasia".to_string()];
        let t = teks_aman("Disconnected AkunRahasia userid:123456789 from 10.1.2.3 job 6a1b2c3d-1111-2222-3333-444455556666 place 93978595733734 code 277", &nama);
        assert!(!t.contains("AkunRahasia") && !t.contains("123456789") && !t.contains("10.1.2.3"), "{t}");
        assert!(!t.contains("6a1b2c3d-1111") && !t.contains("93978595733734"), "{t}");
        assert!(t.contains("code 277"), "kode galat pendek tetap: {t}");
        assert!(teks_aman("ticket=abc .ROBLOSECURITY", &nama).starts_with("(withheld"));
        assert_eq!(samarkan_angka_panjang("a 12345 b 1234567"), "a 12345 b <n>");
        assert_eq!(samarkan_ipv6("from [2001:db8::1]:443 at 12:34:56"), "from [<ip>]:443 at 12:34:56");
        assert_eq!(samarkan_ipv6("peer fe80::1%12, ok"), "peer <ip>%12, ok");
        assert!(!teks_aman("lost 2001:db8:0:1:2:3:4:5", &nama).contains("2001:db8"));
    }
}
