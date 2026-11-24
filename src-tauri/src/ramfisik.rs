use std::ffi::c_void;
use std::time::Instant;

const PROCESS_QUERY_INFORMATION: u32 = 0x0400;
const MEM_COMMIT: u32 = 0x1000;
const MEM_IMAGE: u32 = 0x100_0000;
const MEM_MAPPED: u32 = 0x4_0000;
const HALAMAN: u64 = 4096;
const BATCH: usize = 65_536;

#[repr(C)]
#[derive(Default)]
struct InfoMemori {
    base: usize,
    alloc_base: usize,
    alloc_protect: u32,
    partition: u16,
    _pad: u16,
    region_size: usize,
    state: u32,
    protect: u32,
    typ: u32,
    _pad2: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct InfoHalaman {
    alamat: usize,
    atribut: usize,
}

#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut c_void;
    fn CloseHandle(h: *mut c_void) -> i32;
    fn GetLastError() -> u32;
    fn VirtualQueryEx(h: *mut c_void, alamat: usize, info: *mut InfoMemori, len: usize) -> usize;
    fn K32QueryWorkingSetEx(h: *mut c_void, info: *mut InfoHalaman, cb: u32) -> i32;
    fn K32GetMappedFileNameW(h: *mut c_void, alamat: usize, nama: *mut u16, len: u32) -> u32;
}

#[derive(Debug, Clone, Default)]
pub struct RamFisik {
    pub privat: u64,
    pub img_roblox: u64,
    pub img_lain: u64,
    pub mapped: u64,
    pub lain: u64,
    pub di_ram: u64,
    pub lama_ms: u64,
}

fn bit(a: usize) -> (bool, bool) {
    (a & 1 == 1, (a >> 15) & 1 == 1)
}

pub fn ukur(pid: u32, folder_versi: &str) -> Result<RamFisik, String> {
    let mulai = Instant::now();
    let h = unsafe { OpenProcess(PROCESS_QUERY_INFORMATION, 0, pid) };
    if h.is_null() {
        return Err(format!("open (error {})", unsafe { GetLastError() }));
    }
    let hasil = ukur_handle(h, &folder_versi.to_lowercase());
    unsafe {
        CloseHandle(h);
    }
    hasil.map(|mut r| {
        r.lama_ms = mulai.elapsed().as_millis() as u64;
        r
    })
}

fn ukur_handle(h: *mut c_void, folder_versi: &str) -> Result<RamFisik, String> {
    let mut r = RamFisik::default();
    let mut buf: Vec<InfoHalaman> = Vec::with_capacity(BATCH);
    let mut kel: Vec<u8> = Vec::with_capacity(BATCH);
    let tanya = |buf: &mut Vec<InfoHalaman>, kel: &mut Vec<u8>, r: &mut RamFisik| -> Result<(), String> {
        if buf.is_empty() {
            return Ok(());
        }
        let cb = (buf.len() * std::mem::size_of::<InfoHalaman>()) as u32;
        if unsafe { K32QueryWorkingSetEx(h, buf.as_mut_ptr(), cb) } == 0 {
            return Err(format!("query working set (error {})", unsafe { GetLastError() }));
        }
        for (i, k) in buf.iter().zip(kel.iter()) {
            let (valid, bersama) = bit(i.atribut);
            if !valid {
                continue;
            }
            r.di_ram += HALAMAN;
            if !bersama {
                r.privat += HALAMAN;
            } else {
                match k {
                    0 => r.img_roblox += HALAMAN,
                    1 => r.img_lain += HALAMAN,
                    2 => r.mapped += HALAMAN,
                    _ => r.lain += HALAMAN,
                }
            }
        }
        buf.clear();
        kel.clear();
        Ok(())
    };
    let mut alamat = 0usize;
    let mut cache: Option<(usize, u8)> = None;
    loop {
        let mut mbi = InfoMemori::default();
        if unsafe { VirtualQueryEx(h, alamat, &mut mbi, std::mem::size_of::<InfoMemori>()) } == 0 {
            break;
        }
        if mbi.state == MEM_COMMIT {
            let k = match mbi.typ {
                MEM_IMAGE => match cache {
                    Some((b, k)) if b == mbi.alloc_base => k,
                    _ => {
                        let mut nama = vec![0u16; 1024];
                        let n = unsafe { K32GetMappedFileNameW(h, mbi.alloc_base, nama.as_mut_ptr(), nama.len() as u32) } as usize;
                        let jalur = String::from_utf16_lossy(&nama[..n.min(nama.len())]).to_lowercase();
                        let k = if !folder_versi.is_empty() && jalur.contains(folder_versi) { 0 } else { 1 };
                        cache = Some((mbi.alloc_base, k));
                        k
                    }
                },
                MEM_MAPPED => 2,
                _ => 3,
            };
            let mut p = mbi.base;
            let akhir = mbi.base.saturating_add(mbi.region_size);
            while p < akhir {
                buf.push(InfoHalaman { alamat: p, atribut: 0 });
                kel.push(k);
                if buf.len() == BATCH {
                    tanya(&mut buf, &mut kel, &mut r)?;
                }
                p += HALAMAN as usize;
            }
        }
        let berikut = mbi.base.saturating_add(mbi.region_size);
        if berikut <= alamat {
            break;
        }
        alamat = berikut;
    }
    tanya(&mut buf, &mut kel, &mut r)?;
    Ok(r)
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn proses_sendiri() {
        let exe = std::env::current_exe().unwrap();
        let folder = exe.parent().unwrap().file_name().unwrap().to_string_lossy().to_string();
        let r = ukur(std::process::id(), &folder).expect("ukur proses sendiri");
        assert!(r.di_ram > 0);
        assert_eq!(r.di_ram, r.privat + r.img_roblox + r.img_lain + r.mapped + r.lain);
        assert!(r.img_roblox > 0, "halaman exe uji terhitung sebagai image folder versi");
    }
}
