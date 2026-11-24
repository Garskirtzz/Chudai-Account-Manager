use std::path::PathBuf;

const PENANDA: &[u8] = b"Connection accepted";
const MULAI_GAME: &[u8] = b"Launching experience at";

fn folder_log() -> Option<PathBuf> {
    let mut p = dirs::data_local_dir()?;
    p.push("Roblox");
    p.push("logs");
    Some(p)
}

pub fn waktu_baris(b: &[u8]) -> Option<i64> {
    if b.len() < 19 || b[4] != b'-' || b[7] != b'-' || b[10] != b'T' || b[13] != b':' || b[16] != b':' {
        return None;
    }
    let angka = |a: usize, z: usize| -> Option<i64> {
        std::str::from_utf8(&b[a..z]).ok()?.parse::<i64>().ok()
    };
    let (y, m, d) = (angka(0, 4)?, angka(5, 7)?, angka(8, 10)?);
    let (jam, mnt, dtk) = (angka(11, 13)?, angka(14, 16)?, angka(17, 19)?);
    let y2 = if m <= 2 { y - 1 } else { y };
    let era = if y2 >= 0 { y2 } else { y2 - 399 } / 400;
    let yoe = y2 - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let hari = era * 146_097 + doe - 719_468;
    Some(hari * 86_400 + jam * 3_600 + mnt * 60 + dtk)
}

fn memuat(baris: &[u8], kata: &[u8]) -> bool {
    baris.windows(kata.len()).any(|w| w == kata)
}

pub fn join_dalam(isi: &[u8], baru: bool, sejak: i64) -> bool {
    if baru {
        return memuat(isi, PENANDA);
    }
    let mut mulai_game = false;
    for baris in isi.split(|&c| c == b'\n') {
        if !mulai_game {
            if memuat(baris, MULAI_GAME) && waktu_baris(baris).is_some_and(|t| t + 2 >= sejak) {
                mulai_game = true;
            }
        } else if memuat(baris, PENANDA) {
            return true;
        }
    }
    false
}

pub fn jumlah_join_sejak(sejak: i64) -> usize {
    let Some(dir) = folder_log() else { return 0 };
    let Ok(baca) = std::fs::read_dir(&dir) else { return 0 };
    let detik = |t: std::io::Result<std::time::SystemTime>| {
        t.ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0)
    };

    let mut n = 0;
    for e in baca.flatten() {
        let p = e.path();
        if p.extension().map(|x| x != "log").unwrap_or(true) {
            continue;
        }
        let Ok(meta) = e.metadata() else { continue };
        let dibuat = detik(meta.created().or_else(|_| meta.modified()));
        let diubah = detik(meta.modified());
        if diubah + 5 < sejak {
            continue;
        }
        if let Ok(isi) = std::fs::read(&p) {
            if join_dalam(&isi, dibuat + 5 >= sejak, sejak) {
                n += 1;
            }
        }
    }
    n
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn cap_waktu_log() {
        assert_eq!(waktu_baris(b"2026-10-30T22:56:48.002Z,190.0,1cf0,6,Info x"), Some(1_793_401_008));
        assert_eq!(waktu_baris(b"1970-01-01T00:00:00.000Z,"), Some(0));
        assert_eq!(waktu_baris(b"[FLog::Output] All use of Roblox"), None);
    }

    const WARM: &[u8] = b"2026-10-30T22:53:40.000Z,1,a,6 [FLog::Systray] Systray initialized in sync mode\n\
2026-10-30T22:56:46.934Z,2,a,6,Warning [FLog::DataModelStarterModule] Launching experience at 93978595733734\n\
2026-10-30T22:56:48.002Z,3,a,6,Info [DFLog::NetworkClient] Connection accepted from 128.116.50.33|51979\n";

    #[test]
    fn warm_start_terdeteksi_dari_log_lama() {
        let luncur = 1_793_401_005;
        assert!(join_dalam(WARM, false, luncur));
    }

    #[test]
    fn sambungan_lama_tanpa_launching_tidak_dihitung() {
        let luncur = 1_793_401_100;
        assert!(!join_dalam(WARM, false, luncur));
        let reconnect: &[u8] = b"2026-10-30T23:10:00.000Z,9,a,6,Info [DFLog::NetworkClient] Connection accepted from 1.2.3.4|5\n";
        assert!(!join_dalam(reconnect, false, 1_793_401_005));
    }

    #[test]
    fn cold_start_cukup_penanda() {
        assert!(join_dalam(b"... Connection accepted from 1.2.3.4|5", true, 0));
        assert!(!join_dalam(b"... loading", true, 0));
    }
}
