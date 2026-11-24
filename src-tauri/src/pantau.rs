use std::collections::{HashMap, VecDeque};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

const BERGABUNG: &str = "! Joining game '";
const TELEPORT: &str = "UgcExperienceController: doTeleport";
const PUTUS: [&str; 6] = [
    "Disconnection Notification",
    "Lost connection with reason",
    "Time to disconnect replication data",
    "Sending disconnect with reason",
    "Disconnected from server for reason",
    "Connection closed by server",
];

#[derive(Default, Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(default)]
pub struct Fakta {
    pub btid: Option<u64>,
    pub job: Option<String>,
    pub place: Option<u64>,
    pub user_id: Option<u64>,
    pub di_game: bool,
    pub teleport: bool,
    pub putus: bool,
    pub keluar_sendiri: bool,
    pub alasan: Option<String>,
    pub diganti: bool,
    pub verifikasi: bool,
    pub tolak_masuk: bool,
    sinyal: bool,
}

const TOLAK_MASUK: [&str; 2] = ["encountered during authentication", "Error Code: 403"];

fn tag_pertama(baris: &str) -> Option<&str> {
    let a = baris.find('[')?;
    Some(&baris[a + 1..a + baris[a..].find(']')?])
}

fn angka_setelah(baris: &str, penanda: &str) -> Option<u64> {
    let sisa = &baris[baris.find(penanda)? + penanda.len()..];
    let akhir = sisa.find(|c: char| !c.is_ascii_digit()).unwrap_or(sisa.len());
    sisa[..akhir].parse().ok()
}

fn guid(s: &str) -> bool {
    s.len() == 36 && s.bytes().all(|b| b.is_ascii_hexdigit() || b == b'-')
}

fn keluar_sendiri(baris: &str) -> bool {
    let pesan = baris.find(" [").map_or(baris, |i| &baris[i..]);
    ["DisconnectClientInitiated", "Same account launched", "DuplicateLogin"].iter().any(|m| pesan.contains(m))
        || pesan.split(|c: char| !c.is_ascii_digit()).any(|n| n == "285" || n == "273")
}

fn alasan_dari(baris: &str, penanda: &str) -> Option<String> {
    let sisa = &baris[baris.find(penanda)?..];
    let akhir = sisa.find(|c: char| !(c.is_ascii_alphanumeric() || " .,:;()_-".contains(c))).unwrap_or(sisa.len());
    let t: String = sisa[..akhir].trim_end().chars().take(160).collect();
    (!t.is_empty()).then_some(t)
}

pub fn urai(baris: &str, f: &mut Fakta) {
    let tag = tag_pertama(baris);
    if !f.di_game && TOLAK_MASUK.iter().any(|m| baris.contains(m)) {
        f.tolak_masuk = true;
        return;
    }
    let join = baris.find(BERGABUNG).filter(|_| matches!(tag, None | Some("FLog::Output")));
    if matches!(tag, Some("FLog::Output" | "FLog::Warning" | "FLog::Error")) && join.is_none() {
        return;
    }
    if join.is_some() && f.di_game && !f.teleport && !f.putus {
        return;
    }
    if let Some(b) = angka_setelah(baris, "websiteBTId is ").or_else(|| angka_setelah(baris, "BTID is overriden to ")) {
        f.btid = Some(b);
    } else if let Some(i) = join {
        if let Some((job, sisa)) = baris[i + BERGABUNG.len()..].split_once('\'') {
            if guid(job) {
                f.job = Some(job.to_owned());
                f.place = angka_setelah(sisa, " place ");
                f.di_game = false;
                f.teleport = false;
                f.putus = false;
                f.keluar_sendiri = false;
                f.tolak_masuk = false;
                f.alasan = None;
            }
        }
    } else if baris.contains("[FLog::Network] Replicator created") || baris.contains("[FLog::Network] serverId:") {
        f.di_game = true;
    } else if f.di_game && baris.contains(TELEPORT) {
        f.teleport = true;
    } else if let Some(m) = PUTUS.iter().find(|m| baris.contains(*m)) {
        f.putus = true;
        f.keluar_sendiri |= keluar_sendiri(baris);
        if !f.alasan.as_deref().is_some_and(|a| a.to_ascii_lowercase().contains("reason")) {
            f.alasan = alasan_dari(baris, m).or(f.alasan.take());
        }
    } else if baris.contains("challengedByGcs") {
        f.verifikasi = true;
    } else if baris.contains("[FLog::GameJoinLoadTime] Report game_join_loadtime:") {
        if let Some(u) = angka_setelah(baris, "userid:") {
            f.user_id = Some(u);
        }
    } else if baris.contains("EventWaitResultUpdate") {
        f.sinyal = true;
    } else if baris.contains("Received close main window request") && f.sinyal {
        f.diganti = true;
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Masalah {
    Putus(String),
    Crash,
    Macet,
    Login(&'static str),
}

impl Masalah {
    pub fn teks(&self) -> String {
        match self {
            Masalah::Putus(a) if !a.is_empty() => format!("disconnected ({a})"),
            Masalah::Putus(_) => "disconnected".into(),
            Masalah::Crash => "closed unexpectedly".into(),
            Masalah::Macet => "stopped responding".into(),
            Masalah::Login(a) => format!("can't sign in: {a}"),
        }
    }

    pub fn teks_untuk(&self, indonesia: bool) -> String {
        if !indonesia {
            return self.teks();
        }
        match self {
            Masalah::Putus(a) if !a.is_empty() => format!("terputus ({a})"),
            Masalah::Putus(_) => "terputus".into(),
            Masalah::Crash => "tertutup tiba-tiba".into(),
            Masalah::Macet => "berhenti merespons".into(),
            Masalah::Login(a) => format!(
                "tidak bisa masuk: {}",
                match *a {
                    LOGIN_CAPTCHA => "Roblox meminta cek manusia (captcha) untuk akun ini",
                    LOGIN_403 => "Roblox menolak sign-in (galat 403)",
                    LOGIN_AKUN_LAIN => "klien masuk sebagai akun lain",
                    lain => lain,
                }
            ),
        }
    }
}

pub const LOGIN_CAPTCHA: &str = "Roblox wants a human check (captcha) for this account";
pub const LOGIN_403: &str = "Roblox refused the sign-in (error 403)";
pub const LOGIN_AKUN_LAIN: &str = "the client signed in as another account";

pub const PUTARAN_DTK: i64 = 2;
pub const BATAS_HANG: u32 = 30;
pub const BATAS_HILANG_DTK: i64 = 12;
pub const BATAS_REBIND_DTK: i64 = 120;
pub const TUNDA_PUTUS_DTK: i64 = 10;
pub const BATAS_TELEPORT_DTK: i64 = 90;

pub fn masalah(f: &Fakta, uid: u64, hilang_dtk: i64, putus_dtk: i64, teleport_dtk: i64, hang: u32) -> Option<Masalah> {
    if f.keluar_sendiri || f.diganti {
        return None;
    }
    let m = masalah_klien(f, hilang_dtk, putus_dtk, teleport_dtk, hang)?;
    let login = if f.verifikasi {
        Some(LOGIN_CAPTCHA)
    } else if f.tolak_masuk {
        Some(LOGIN_403)
    } else if uid > 0 && f.user_id.is_some_and(|u| u != uid) {
        Some(LOGIN_AKUN_LAIN)
    } else {
        None
    };
    Some(login.map_or(m, Masalah::Login))
}

fn masalah_klien(f: &Fakta, hilang_dtk: i64, putus_dtk: i64, teleport_dtk: i64, hang: u32) -> Option<Masalah> {
    let teleport = f.teleport && teleport_dtk < BATAS_TELEPORT_DTK;
    let batas_hilang = if f.job.is_none() { BATAS_REBIND_DTK } else { BATAS_HILANG_DTK };
    if hilang_dtk >= batas_hilang {
        return Some(if f.putus { Masalah::Putus(f.alasan.clone().unwrap_or_default()) } else { Masalah::Crash });
    }
    if hilang_dtk > 0 {
        return None;
    }
    if f.putus && !teleport && putus_dtk >= TUNDA_PUTUS_DTK {
        return Some(Masalah::Putus(f.alasan.clone().unwrap_or_default()));
    }
    if hang >= BATAS_HANG {
        return Some(Masalah::Macet);
    }
    None
}

pub const MAKS_REJOIN: usize = 5;
pub const JENDELA_DTK: i64 = 15 * 60;

pub fn baru_baru_ini(waktu: &mut VecDeque<i64>, kini: i64) -> usize {
    while waktu.front().is_some_and(|&t| kini - t > JENDELA_DTK) {
        waktu.pop_front();
    }
    waktu.len()
}

pub fn galat_sementara(e: &str) -> bool {
    let e = e.to_ascii_lowercase();
    let tetap = ["cookie", "401", "403", "not found", "already has a roblox client", "no game selected", "banned", "human check"];
    if tetap.iter().any(|m| e.contains(m)) {
        return false;
    }
    ["network", "timed out", "timeout", "connect", "dns", "error sending request", "502", "503", "504", "429", "too many", "temporarily", "busy", "unavailable", "has an update"]
        .iter()
        .any(|m| e.contains(m))
}

pub fn jeda_rejoin(baru: usize) -> u64 {
    (10u64 << baru.min(4)).min(120)
}

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
#[serde(default)]
pub struct Tujuan {
    pub place_id: u64,
    pub job_id: Option<String>,
    pub link_code: Option<String>,
    pub access_code: Option<String>,
    pub share_code: Option<String>,
    pub follow_user_id: Option<u64>,
    pub game_name: Option<String>,
    pub icon_url: Option<String>,
    pub fps_sekali: Option<u32>,
}

impl Tujuan {
    pub fn pribadi(&self) -> bool {
        [&self.link_code, &self.access_code, &self.share_code].iter().any(|x| x.as_deref().is_some_and(|s| !s.trim().is_empty()))
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ServerKlien {
    pub akun_id: String,
    pub alias: String,
    pub uid: u64,
    pub place_id: u64,
    pub job_id: String,
    pub pribadi: bool,
    pub game_name: String,
}

pub fn fakta_log(p: &Path) -> Fakta {
    let mut f = Fakta::default();
    baca_baru(p, 0, &mut f);
    f
}

pub fn adalah_uuid(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 36
        && b.iter().enumerate().all(|(i, c)| if [8, 13, 18, 23].contains(&i) { *c == b'-' } else { c.is_ascii_hexdigit() })
}

struct Klien {
    akun_id: String,
    alias: String,
    uid: u64,
    btid: u64,
    tujuan: Tujuan,
    sejak: i64,
    pid: Option<u32>,
    log: Option<PathBuf>,
    offset: u64,
    fakta: Fakta,
    hilang_at: Option<i64>,
    putus_at: Option<i64>,
    teleport_at: Option<i64>,
    hang: u32,
    selesai: bool,
    masuk_at: Option<i64>,
    afk_at: Option<i64>,
}

#[derive(Clone, Debug)]
pub struct Rejoin {
    pub akun_id: String,
    pub alias: String,
    pub pid_lama: Option<u32>,
    pub pid_terakhir: Option<u32>,
    pub tujuan: Tujuan,
    pub masalah: Masalah,
    pub uid: u64,
    pub btid: u64,
    pub sejak: i64,
    pub log: Option<PathBuf>,
    pub offset: u64,
    pub fakta: Fakta,
    pub terdeteksi: i64,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Simpanan {
    akun_id: String,
    alias: String,
    #[serde(default)]
    uid: u64,
    btid: u64,
    #[serde(default)]
    tujuan: Tujuan,
    sejak: i64,
    #[serde(default)]
    log: Option<PathBuf>,
    #[serde(default)]
    offset: u64,
    #[serde(default)]
    fakta: Fakta,
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct StatusMonitor {
    pub akun_id: String,
    pub pid: Option<u32>,
    pub status: &'static str,
    pub alasan: String,
    pub sejak: i64,
    pub masuk_at: Option<i64>,
    pub place_id: Option<u64>,
    pub game_name: String,
    pub rejoin: u32,
}

pub fn status_dari(f: &Fakta, ada_pid: bool, hang: u32) -> &'static str {
    if f.verifikasi {
        "verifikasi"
    } else if f.tolak_masuk {
        "ditolak"
    } else if hang > 0 {
        "macet"
    } else if f.putus {
        "putus"
    } else if f.teleport {
        "teleport"
    } else if f.di_game {
        "di_game"
    } else if ada_pid {
        "menyambung"
    } else {
        "memulai"
    }
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct Catatan {
    pub teks: String,
    pub jenis: &'static str,
}

#[derive(Default)]
pub struct Pelacak {
    klien: Mutex<Vec<Klien>>,
    catatan: Mutex<Vec<Catatan>>,
    riwayat: Mutex<HashMap<String, VecDeque<i64>>>,
    rejoin_total: Mutex<HashMap<String, u32>>,
    pub antrean_ui: AtomicBool,
    pub batal_rejoin: AtomicBool,
    ditahan: Mutex<std::collections::HashSet<String>>,
}

fn kunci<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

pub fn kini() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

impl Pelacak {
    pub fn tahan(&self, ids: &[String]) {
        kunci(&self.ditahan).extend(ids.iter().cloned());
    }

    pub fn lepas_tahan(&self, ids: &[String]) {
        let mut d = kunci(&self.ditahan);
        for id in ids {
            d.remove(id);
        }
    }

    pub fn ditahan(&self, akun_id: &str) -> bool {
        kunci(&self.ditahan).contains(akun_id)
    }

    pub fn pid_akun(&self, ids: &[String]) -> Vec<u32> {
        kunci(&self.klien).iter().filter(|x| ids.contains(&x.akun_id)).filter_map(|x| x.pid).collect()
    }

    pub fn lupakan(&self, akun_id: &str) {
        debug_assert!(!akun_id.is_empty());
        kunci(&self.klien).retain(|x| x.akun_id != akun_id);
        kunci(&self.riwayat).remove(akun_id);
        kunci(&self.rejoin_total).remove(akun_id);
    }

    pub fn daftar(&self, akun_id: &str, alias: &str, uid: u64, btid: u64, tujuan: Tujuan, sejak: i64) {
        let mut k = kunci(&self.klien);
        k.retain(|x| x.akun_id != akun_id);
        k.push(Klien {
            akun_id: akun_id.into(),
            alias: alias.into(),
            uid,
            btid,
            tujuan,
            sejak,
            pid: None,
            log: None,
            offset: 0,
            fakta: Fakta::default(),
            hilang_at: None,
            putus_at: None,
            teleport_at: None,
            hang: 0,
            selesai: false,
            masuk_at: None,
            afk_at: None,
        });
    }

    pub fn catat(&self, teks: String, jenis: &'static str) {
        let mut c = kunci(&self.catatan);
        c.push(Catatan { teks, jenis });
        let n = c.len();
        if n > 100 {
            c.drain(..n - 100);
        }
    }

    pub fn ambil_catatan(&self) -> Vec<Catatan> {
        std::mem::take(&mut *kunci(&self.catatan))
    }

    pub fn server_terkini(&self) -> Vec<ServerKlien> {
        kunci(&self.klien)
            .iter()
            .filter(|x| !x.selesai && x.fakta.di_game && !x.fakta.putus)
            .filter_map(|x| {
                let job = x.fakta.job.clone().filter(|j| adalah_uuid(j))?;
                let place = x.fakta.place.filter(|&p| p > 0)?;
                let game_name = if place == x.tujuan.place_id { x.tujuan.game_name.clone().unwrap_or_default() } else { String::new() };
                Some(ServerKlien {
                    akun_id: x.akun_id.clone(),
                    alias: x.alias.clone(),
                    uid: x.uid,
                    place_id: place,
                    job_id: job,
                    pribadi: x.tujuan.pribadi(),
                    game_name,
                })
            })
            .collect()
    }

    pub fn lepas_semua(&self) -> usize {
        let mut k = kunci(&self.klien);
        let n = k.len();
        k.clear();
        n
    }

    pub fn lepas_pid(&self, pid: u32) {
        kunci(&self.klien).retain(|x| x.pid != Some(pid));
    }

    pub fn jumlah_diikuti(&self) -> usize {
        kunci(&self.klien).iter().filter(|x| !x.selesai).count()
    }

    pub fn boleh_rejoin(&self, akun_id: &str) -> (bool, usize) {
        let mut r = kunci(&self.riwayat);
        let n = baru_baru_ini(r.entry(akun_id.to_string()).or_default(), kini());
        (n < MAKS_REJOIN, n)
    }

    pub fn ekspor(&self) -> String {
        let k = kunci(&self.klien);
        let v: Vec<Simpanan> = k
            .iter()
            .filter(|x| !x.selesai)
            .map(|x| Simpanan {
                akun_id: x.akun_id.clone(),
                alias: x.alias.clone(),
                uid: x.uid,
                btid: x.btid,
                tujuan: x.tujuan.clone(),
                sejak: x.sejak,
                log: x.log.clone(),
                offset: x.offset,
                fakta: x.fakta.clone(),
            })
            .collect();
        serde_json::to_string(&v).unwrap_or_else(|_| "[]".into())
    }

    pub fn impor(&self, json: &str, proses: &[(u32, u64)]) -> usize {
        let Ok(v) = serde_json::from_str::<Vec<Simpanan>>(json) else { return 0 };
        let mut k = kunci(&self.klien);
        let mut n = 0;
        for s in v {
            let Some(&(pid, _)) = proses.iter().find(|(_, b)| *b == s.btid) else { continue };
            if k.iter().any(|x| x.akun_id == s.akun_id) {
                continue;
            }
            k.push(Klien {
                akun_id: s.akun_id,
                alias: s.alias,
                uid: s.uid,
                btid: s.btid,
                tujuan: s.tujuan,
                sejak: s.sejak,
                pid: Some(pid),
                log: s.log,
                offset: s.offset,
                fakta: s.fakta,
                hilang_at: None,
                putus_at: None,
                teleport_at: None,
                hang: 0,
                selesai: false,
                masuk_at: None,
                afk_at: None,
            });
            n += 1;
        }
        n
    }

    pub fn klien_afk(&self) -> Vec<crate::afk::KlienAfk> {
        kunci(&self.klien)
            .iter()
            .filter(|x| !x.selesai && x.hilang_at.is_none() && x.fakta.di_game && !x.fakta.putus && !x.fakta.teleport)
            .filter_map(|x| Some((x.akun_id.clone(), x.alias.clone(), x.pid?, x.afk_at.or(x.masuk_at)?)))
            .collect()
    }

    pub fn tandai_afk(&self, akun_id: &str, t: i64) -> bool {
        let mut k = kunci(&self.klien);
        match k.iter_mut().find(|x| x.akun_id == akun_id && !x.selesai) {
            Some(x) => x.afk_at.replace(t).is_none(),
            None => false,
        }
    }

    pub fn catat_rejoin(&self, akun_id: &str) {
        kunci(&self.riwayat).entry(akun_id.to_string()).or_default().push_back(kini());
        *kunci(&self.rejoin_total).entry(akun_id.to_string()).or_default() += 1;
    }

    pub fn status_monitor(&self) -> Vec<StatusMonitor> {
        let total = kunci(&self.rejoin_total).clone();
        kunci(&self.klien)
            .iter()
            .filter(|x| !x.selesai)
            .map(|x| StatusMonitor {
                akun_id: x.akun_id.clone(),
                pid: x.pid,
                status: status_dari(&x.fakta, x.pid.is_some(), x.hang),
                alasan: x.fakta.alasan.clone().unwrap_or_default(),
                sejak: x.sejak,
                masuk_at: x.masuk_at,
                place_id: x.fakta.place.or((x.tujuan.place_id > 0).then_some(x.tujuan.place_id)),
                game_name: x.tujuan.game_name.clone().unwrap_or_default(),
                rejoin: total.get(&x.akun_id).copied().unwrap_or(0),
            })
            .collect()
    }

    pub fn cek_ulang(&self, r: &mut Rejoin, proses: &[(u32, u64)], macet: &[u32]) -> Option<&'static str> {
        if kunci(&self.klien).iter().any(|x| x.akun_id == r.akun_id && x.sejak >= r.terdeteksi) {
            return Some("it was launched again meanwhile");
        }
        let mut f = r.fakta.clone();
        let offset = match &r.log {
            Some(p) => baca_baru(p, r.offset, &mut f),
            None => r.offset,
        };
        if f.keluar_sendiri {
            return Some("the player left the game");
        }
        let pid_hidup = r.pid_lama.filter(|p| proses.iter().any(|(q, _)| q == p))
            .or_else(|| proses.iter().find(|(_, b)| *b == r.btid).map(|(p, _)| *p));
        let pulih = match &r.masalah {
            Masalah::Putus(_) => pid_hidup.is_some() && f.di_game && !f.putus,
            Masalah::Macet => pid_hidup.is_some_and(|p| !macet.contains(&p)),
            Masalah::Crash => pid_hidup.is_some(),
            Masalah::Login(_) => false,
        };
        if !pulih {
            r.fakta = f;
            r.offset = offset;
            return None;
        }
        kunci(&self.klien).push(Klien {
            akun_id: r.akun_id.clone(),
            alias: r.alias.clone(),
            uid: r.uid,
            btid: r.btid,
            tujuan: r.tujuan.clone(),
            sejak: r.sejak,
            pid: pid_hidup,
            log: r.log.clone(),
            offset,
            fakta: f,
            hilang_at: None,
            putus_at: None,
            teleport_at: None,
            hang: 0,
            selesai: false,
            masuk_at: None,
            afk_at: None,
        });
        Some(match r.masalah {
            Masalah::Putus(_) => "it reconnected by itself",
            Masalah::Macet => "it is responding again",
            _ => "it is running again",
        })
    }

    pub fn periksa(&self, proses: &[(u32, u64)], macet: &[u32], dir_log: Option<&Path>) -> Vec<Rejoin> {
        let t = kini();
        let mut hasil = Vec::new();
        let mut k = kunci(&self.klien);
        for x in k.iter_mut().filter(|x| !x.selesai) {
            let hidup_pid = x.pid.filter(|p| proses.iter().any(|(q, _)| q == p));
            let pid = hidup_pid.or_else(|| proses.iter().find(|(_, b)| *b == x.btid).map(|(p, _)| *p));
            match pid {
                Some(p) => {
                    x.pid = Some(p);
                    x.hilang_at = None;
                }
                None => {
                    x.hilang_at.get_or_insert(t);
                }
            }
            if x.log.is_none() {
                x.log = dir_log.and_then(|d| cari_log(d, x.btid, x.sejak));
            }
            if let Some(path) = x.log.clone() {
                x.offset = baca_baru(&path, x.offset, &mut x.fakta);
            }
            if x.fakta.putus {
                x.putus_at.get_or_insert(t);
            } else {
                x.putus_at = None;
            }
            if x.fakta.di_game && !x.fakta.putus {
                x.masuk_at.get_or_insert(t);
            }
            if x.fakta.teleport {
                x.teleport_at.get_or_insert(t);
            } else {
                x.teleport_at = None;
            }
            x.hang = match x.pid {
                Some(p) if x.hilang_at.is_none() && macet.contains(&p) => x.hang.saturating_add(1),
                _ => 0,
            };
            let hilang = x.hilang_at.map_or(0, |h| (t - h).max(1));
            let m = masalah(
                &x.fakta,
                x.uid,
                hilang,
                x.putus_at.map_or(0, |p| t - p),
                x.teleport_at.map_or(0, |p| t - p),
                x.hang,
            );
            let pasti = x.fakta.keluar_sendiri || x.fakta.diganti;
            let batas = if x.fakta.job.is_none() && !pasti { BATAS_REBIND_DTK } else { BATAS_HILANG_DTK };
            if m.is_none() && hilang >= batas {
                x.selesai = true;
                continue;
            }
            let Some(m) = m else { continue };
            x.selesai = true;
            hasil.push(Rejoin {
                akun_id: x.akun_id.clone(),
                alias: x.alias.clone(),
                pid_lama: x.pid.filter(|_| x.hilang_at.is_none()),
                pid_terakhir: x.pid,
                tujuan: x.tujuan.clone(),
                masalah: m,
                uid: x.uid,
                btid: x.btid,
                sejak: x.sejak,
                log: x.log.clone(),
                offset: x.offset,
                fakta: x.fakta.clone(),
                terdeteksi: t,
            });
        }
        k.retain(|x| !x.selesai);
        hasil
    }
}

pub fn dir_log() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("Roblox").join("logs"))
}

fn detik_unix(t: std::io::Result<std::time::SystemTime>) -> i64 {
    t.ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

pub(crate) fn cari_log(dir: &Path, btid: u64, sejak: i64) -> Option<PathBuf> {
    let a = format!("BTID is overriden to {btid}");
    let b = format!("websiteBTId is {btid}");
    let mut calon: Vec<(i64, PathBuf)> = std::fs::read_dir(dir)
        .ok()?
        .flatten()
        .filter_map(|e| {
            let nama = e.file_name().to_string_lossy().to_string();
            if !nama.contains("_Player_") || nama.contains("CrashHandler") || !nama.ends_with(".log") {
                return None;
            }
            let lahir = detik_unix(e.metadata().ok()?.created());
            (lahir >= sejak - 5).then_some((lahir, e.path()))
        })
        .collect();
    calon.sort_by(|x, y| y.0.cmp(&x.0));
    calon.into_iter().map(|(_, p)| p).find(|p| {
        let mut kepala = vec![0u8; 256 * 1024];
        let n = buka_bersama(p).and_then(|mut f| f.read(&mut kepala)).unwrap_or(0);
        let s = String::from_utf8_lossy(&kepala[..n]);
        s.contains(&a) || s.contains(&b)
    })
}

fn buka_bersama(p: &Path) -> std::io::Result<File> {
    use std::os::windows::fs::OpenOptionsExt;
    std::fs::OpenOptions::new().read(true).share_mode(0x1 | 0x2 | 0x4).open(p)
}

fn baca_baru(p: &Path, offset: u64, f: &mut Fakta) -> u64 {
    let Ok(mut berkas) = buka_bersama(p) else { return offset };
    let panjang = berkas.metadata().map(|m| m.len()).unwrap_or(0);
    let awal = if offset > panjang { 0 } else { offset };
    if awal == panjang || berkas.seek(SeekFrom::Start(awal)).is_err() {
        return awal;
    }
    let mut isi = Vec::new();
    if berkas.take((panjang - awal).min(8 * 1024 * 1024)).read_to_end(&mut isi).is_err() {
        return awal;
    }
    let Some(akhir) = isi.iter().rposition(|&c| c == b'\n') else { return awal };
    for b in isi[..akhir].split(|&c| c == b'\n') {
        urai(&String::from_utf8_lossy(b), f);
    }
    awal + akhir as u64 + 1
}
