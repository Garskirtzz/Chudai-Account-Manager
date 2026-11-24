use std::collections::HashMap;

pub const BATAS_DTK: i64 = 30;

pub fn sisa(tray: bool, tanpa_jendela_dtk: i64, pernah_di_game: bool, putus: bool) -> bool {
    !tray && tanpa_jendela_dtk >= BATAS_DTK && pernah_di_game && putus
}

pub fn periksa(tanpa: &mut HashMap<u32, i64>, kini: i64) -> Vec<(u32, u64)> {
    let klien = crate::launcher::klien_terperinci_segar(std::time::Duration::from_secs(9));
    let game = crate::jendela::pid_berjendela_game();
    tanpa.retain(|pid, _| klien.iter().any(|k| k.pid == *pid) && !game.contains(pid));
    let mut hasil = Vec::new();
    for k in klien.iter().filter(|k| k.btid != 0 && !game.contains(&k.pid)) {
        let sejak = *tanpa.entry(k.pid).or_insert(kini);
        if kini - sejak < BATAS_DTK {
            continue;
        }
        let tray = crate::launcher::baris_perintah(k.pid).as_deref().is_some_and(crate::launcher::adalah_tray);
        let f = crate::pantau::dir_log()
            .and_then(|d| crate::pantau::cari_log(&d, k.btid, kini - 6 * 3600))
            .map(|p| crate::pantau::fakta_log(&p));
        let Some(f) = f else { continue };
        if sisa(tray, kini - sejak, f.job.is_some(), f.putus) {
            hasil.push((k.pid, k.btid));
        }
    }
    hasil
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn hanya_sisa_yang_pasti() {
        assert!(sisa(false, 31, true, true), "game ditutup, proses tertinggal");
        assert!(!sisa(true, 999, true, true), "proses tray dibiarkan");
        assert!(!sisa(false, 29, true, true), "belum 30 dtk");
        assert!(!sisa(false, 999, false, true), "belum pernah masuk game (mis. masih memuat)");
        assert!(!sisa(false, 999, true, false), "masih tersambung (mis. jendela tersembunyi alat lain)");
    }

    #[test]
    fn log_sungguhan_sisa_proses() {
        let mut f = crate::pantau::Fakta::default();
        for b in [
            "2026-11-04T22:11:55.698Z,1.698849,9534,6 [FLog::Output] ! Joining game '6b33e709-53b9-42a5-bffd-1de02aa1d12c' place 189707 at 10.204.2.6",
            "2026-11-04T22:11:57.010Z,3.010696,2edc,7 [FLog::Network] Replicator created: 000001093EE26310",
            "2026-11-04T22:14:00.901Z,126.901840,0df4,6 [FLog::SingleSurfaceApp] shutDown: (stage:UGCGame).",
            "2026-11-04T22:14:00.958Z,126.958115,0df4,7 [FLog::Network] Sending disconnect with reason: 285",
            "2026-11-04T22:14:02.615Z,128.615463,5ab0,6,Info [FLog::SessionL2ValidationHelper] onSessionHeartbeat sc_count 4 sh_count 6",
        ] {
            crate::pantau::urai(b, &mut f);
        }
        assert!(f.job.is_some() && f.putus && f.keluar_sendiri);
    }
}
