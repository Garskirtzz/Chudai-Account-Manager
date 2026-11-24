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
