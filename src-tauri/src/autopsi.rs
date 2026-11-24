use std::os::windows::process::CommandExt;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const KLIEN: &str = "RobloxPlayerBeta.exe";

pub fn kesimpulan(jenis: &str, umur_dtk: i64, ada_log: bool, ada_dump: bool, ada_galat_windows: bool) -> String {
    match () {
        _ if jenis == "macet" => "The client stopped responding and was closed. The end of its log shows what it was doing.".into(),
        _ if ada_dump || ada_galat_windows => "The client itself crashed (see the crash dump / Windows' record).".into(),
        _ if !ada_log => "It ended before writing a log, with no crash recorded: it didn't start properly (antivirus, a damaged Roblox install or its version).".into(),
        _ if umur_dtk < 30 => "It ended early by itself with no crash recorded: something closed it, or it closed itself (an update or the anti-cheat).".into(),
        _ => "It ended with no crash recorded: closed by hand, by another program or by itself.".into(),
    }
}

fn dump_sejak(sejak: i64) -> Vec<String> {
    let Some(akar) = dirs::data_local_dir().map(|d| d.join("Roblox").join("logs").join("crashes")) else { return Vec::new() };
    let batas = UNIX_EPOCH + Duration::from_secs(sejak.max(0) as u64);
    let mut hasil = Vec::new();
    let mut tumpuk = vec![akar];
    while let Some(d) = tumpuk.pop() {
        let Ok(isi) = std::fs::read_dir(&d) else { continue };
        for e in isi.flatten() {
            let Ok(m) = e.metadata() else { continue };
            if m.is_dir() {
                tumpuk.push(e.path());
            } else if e.path().extension().is_some_and(|x| x.eq_ignore_ascii_case("dmp")) && m.modified().is_ok_and(|t| t >= batas) {
                hasil.push(format!("{} ({} KB)", e.file_name().to_string_lossy(), m.len() >> 10));
            }
        }
    }
    hasil
}

pub fn event_galat(ms: i64) -> String {
    let root = std::env::var_os("SystemRoot").unwrap_or_else(|| "C:\\Windows".into());
    std::process::Command::new(Path::new(&root).join(r"System32\wevtutil.exe"))
        .args(["qe", "Application", "/f:xml", "/rd:true", "/c:50"])
        .arg(format!("/q:*[System[Provider[@Name='Application Error'] and TimeCreated[timediff(@SystemTime) <= {ms}]]]"))
        .creation_flags(0x0800_0000)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
        .unwrap_or_default()
}

pub fn galat_untuk(xml: &str, pid: u32) -> Vec<String> {
    let isian = |ev: &str, nama: &str| {
        let buka = format!("<Data Name='{nama}'>");
        let mulai = ev.find(&buka)? + buka.len();
        Some(ev[mulai..].split("</Data>").next()?.to_owned())
    };
    xml.split("<Event ")
        .filter(|ev| isian(ev, "AppName").is_some_and(|n| n.eq_ignore_ascii_case(KLIEN)))
        .filter(|ev| isian(ev, "ProcessId").and_then(|p| u32::from_str_radix(p.trim_start_matches("0x"), 16).ok()) == Some(pid))
        .map(|ev| {
            let a = |n| isian(ev, n).unwrap_or_else(|| "?".into());
            format!("Windows: exception {} in {} {} (client {})", a("ExceptionCode"), a("ModuleName"), a("ModuleVersion"), a("AppVersion"))
        })
        .collect()
}

pub fn periksa(jenis: &str, pid: Option<u32>, sejak: i64, umur_dtk: i64, ada_log: bool) -> String {
    let dump = dump_sejak(sejak);
    let galat = match pid {
        Some(p) => {
            let kini = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
            galat_untuk(&event_galat(((kini - sejak).max(0) + 60) * 1000), p)
        }
        None => Vec::new(),
    };
    let mut baris = vec![kesimpulan(jenis, umur_dtk, ada_log, !dump.is_empty(), !galat.is_empty())];
    baris.extend(galat);
    baris.extend(dump.into_iter().map(|d| format!("Crash dump: {d}")));
    baris.join(" · ")
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn kesimpulan_dari_bukti_terkuat() {
        assert!(kesimpulan("crash", 8, true, true, false).contains("itself crashed"));
        assert!(kesimpulan("crash", 8, false, false, true).contains("itself crashed"));
        assert!(kesimpulan("crash", 8, false, false, false).contains("before writing a log"));
        assert!(kesimpulan("crash", 8, true, false, false).contains("ended early"));
        assert!(kesimpulan("crash", 900, true, false, false).contains("no crash recorded"));
        assert!(kesimpulan("macet", 900, true, true, true).contains("stopped responding"));
    }

    #[test]
    fn hanya_galat_klien_ini() {
        let ev = |app: &str, pid: &str| {
            format!("<Event xmlns='x'><EventData><Data Name='AppName'>{app}</Data><Data Name='AppVersion'>0.745</Data><Data Name='ModuleName'>d3d11.dll</Data><Data Name='ModuleVersion'>10.0</Data><Data Name='ExceptionCode'>c0000005</Data><Data Name='ProcessId'>{pid}</Data></EventData></Event>")
        };
        let xml = [ev("RobloxPlayerBeta.exe", "0x988"), ev("RobloxPlayerBeta.exe", "0x10"), ev("lain.exe", "0x988")].concat();
        assert_eq!(galat_untuk(&xml, 0x988), ["Windows: exception c0000005 in d3d11.dll 10.0 (client 0.745)"]);
        assert!(galat_untuk("", 1).is_empty());
    }
}
