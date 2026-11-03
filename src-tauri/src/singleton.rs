use std::ffi::c_void;

const SYSTEM_EXTENDED_HANDLE_INFORMATION: u32 = 64;
const OBJECT_NAME_INFORMATION: u32 = 1;
const STATUS_INFO_LENGTH_MISMATCH: i32 = -1073741820;

const PROCESS_DUP_HANDLE: u32 = 0x0040;
const DUPLICATE_CLOSE_SOURCE: u32 = 0x0001;
const DUPLICATE_SAME_ACCESS: u32 = 0x0002;

#[repr(C)]
struct HandleEntry {
    object: usize,
    pid: usize,
    handle: usize,
    granted_access: u32,
    creator_back_trace_index: u16,
    object_type_index: u16,
    handle_attributes: u32,
    reserved: u32,
}

#[repr(C)]
struct HandleInfoHeader {
    jumlah: usize,
    reserved: usize,
}

#[repr(C)]
struct UnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

#[link(name = "ntdll")]
extern "system" {
    fn NtQuerySystemInformation(
        class: u32,
        buf: *mut c_void,
        len: u32,
        ret_len: *mut u32,
    ) -> i32;
    fn NtQueryObject(
        handle: *mut c_void,
        class: u32,
        buf: *mut c_void,
        len: u32,
        ret_len: *mut u32,
    ) -> i32;
}

#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut c_void;
    fn GetCurrentProcess() -> *mut c_void;
    fn CloseHandle(h: *mut c_void) -> i32;
    fn DuplicateHandle(
        src_proc: *mut c_void,
        src_handle: *mut c_void,
        dst_proc: *mut c_void,
        dst_handle: *mut *mut c_void,
        access: u32,
        inherit: i32,
        options: u32,
    ) -> i32;
}

fn tabel_handle() -> Option<Vec<u8>> {
    let mut ukuran = 1 << 20;
    for _ in 0..8 {
        let mut buf = vec![0u8; ukuran];
        let mut perlu = 0u32;
        let st = unsafe {
            NtQuerySystemInformation(
                SYSTEM_EXTENDED_HANDLE_INFORMATION,
                buf.as_mut_ptr() as *mut c_void,
                ukuran as u32,
                &mut perlu,
            )
        };
        if st == 0 {
            return Some(buf);
        }
        if st != STATUS_INFO_LENGTH_MISMATCH {
            return None;
        }
        ukuran = (ukuran * 2).max(perlu as usize + (1 << 16));
    }
    None
}

fn nama_objek(h: *mut c_void) -> Option<String> {
    let mut buf = vec![0u8; 2048];
    let mut perlu = 0u32;
    let st = unsafe {
        NtQueryObject(
            h,
            OBJECT_NAME_INFORMATION,
            buf.as_mut_ptr() as *mut c_void,
            buf.len() as u32,
            &mut perlu,
        )
    };
    if st != 0 {
        return None;
    }
    unsafe {
        let us = &*(buf.as_ptr() as *const UnicodeString);
        if us.buffer.is_null() || us.length == 0 {
            return None;
        }
        let slice = std::slice::from_raw_parts(us.buffer, (us.length / 2) as usize);
        Some(String::from_utf16_lossy(slice))
    }
}

fn indeks_tipe(tabel: &[u8], pid_kita: usize, h_event: usize, h_mutex: usize) -> (u16, u16) {
    let header = unsafe { &*(tabel.as_ptr() as *const HandleInfoHeader) };
    let entri = unsafe {
        std::slice::from_raw_parts(
            tabel.as_ptr().add(std::mem::size_of::<HandleInfoHeader>()) as *const HandleEntry,
            header.jumlah,
        )
    };
    let (mut ev, mut mu) = (0u16, 0u16);
    for e in entri {
        if e.pid == pid_kita {
            if e.handle == h_event {
                ev = e.object_type_index;
            } else if e.handle == h_mutex {
                mu = e.object_type_index;
            }
        }
    }
    (ev, mu)
}

fn gerbang_single_instance(nama: &str) -> bool {
    nama.contains("ROBLOX_singleton")
}

pub fn daftar_nama_objek() -> Vec<String> {
    let pids = crate::launcher::pid_klien();
    let mut hasil = Vec::new();
    if pids.is_empty() {
        return hasil;
    }

    let (h_ev, h_mu) = unsafe {
        (
            CreateEventW(std::ptr::null_mut(), 0, 0, std::ptr::null()),
            CreateMutexW(std::ptr::null_mut(), 0, std::ptr::null()),
        )
    };
    let Some(tabel) = tabel_handle() else { return hasil };
    let pid_kita = std::process::id() as usize;
    let (tipe_ev, tipe_mu) = indeks_tipe(&tabel, pid_kita, h_ev as usize, h_mu as usize);
    unsafe {
        CloseHandle(h_ev);
        CloseHandle(h_mu);
    }

    let header = unsafe { &*(tabel.as_ptr() as *const HandleInfoHeader) };
    let entri = unsafe {
        std::slice::from_raw_parts(
            tabel.as_ptr().add(std::mem::size_of::<HandleInfoHeader>()) as *const HandleEntry,
            header.jumlah,
        )
    };
    let kita = unsafe { GetCurrentProcess() };

    for &pid in &pids {
        let proc = unsafe { OpenProcess(PROCESS_DUP_HANDLE, 0, pid) };
        if proc.is_null() {
            continue;
        }
        for e in entri {
            if e.pid != pid as usize {
                continue;
            }
            let tipe = if e.object_type_index == tipe_ev {
                "Event"
            } else if e.object_type_index == tipe_mu {
                "Mutant"
            } else {
                continue;
            };
            let mut salinan: *mut c_void = std::ptr::null_mut();
            let ok = unsafe {
                DuplicateHandle(proc, e.handle as *mut c_void, kita, &mut salinan, 0, 0,
                                DUPLICATE_SAME_ACCESS)
            };
            if ok == 0 || salinan.is_null() {
                continue;
            }
            if let Some(n) = nama_objek(salinan) {
                if !n.is_empty() {
                    hasil.push(format!("[{tipe}] {n}"));
                }
            }
            unsafe { CloseHandle(salinan) };
        }
        unsafe { CloseHandle(proc) };
    }
    hasil.sort();
    hasil.dedup();
    hasil
}

pub fn tutup_handle_roblox() -> usize {
    let pids = crate::launcher::pid_klien();
    if pids.is_empty() {
        return 0;
    }

    let (h_ev, h_mu) = unsafe {
        (
            CreateEventW(std::ptr::null_mut(), 0, 0, std::ptr::null()),
            CreateMutexW(std::ptr::null_mut(), 0, std::ptr::null()),
        )
    };

    let Some(tabel) = tabel_handle() else {
        unsafe {
            CloseHandle(h_ev);
            CloseHandle(h_mu);
        }
        return 0;
    };

    let pid_kita = std::process::id() as usize;
    let (tipe_ev, tipe_mu) = indeks_tipe(&tabel, pid_kita, h_ev as usize, h_mu as usize);
    unsafe {
        CloseHandle(h_ev);
        CloseHandle(h_mu);
    }
    if tipe_ev == 0 && tipe_mu == 0 {
        return 0;
    }

    let header = unsafe { &*(tabel.as_ptr() as *const HandleInfoHeader) };
    let entri = unsafe {
        std::slice::from_raw_parts(
            tabel.as_ptr().add(std::mem::size_of::<HandleInfoHeader>()) as *const HandleEntry,
            header.jumlah,
        )
    };

    let mut ditutup = 0usize;
    let kita = unsafe { GetCurrentProcess() };

    for &pid in &pids {
        let proc = unsafe { OpenProcess(PROCESS_DUP_HANDLE, 0, pid) };
        if proc.is_null() {
            continue;
        }
        for e in entri {
            if e.pid != pid as usize {
                continue;
            }
            if e.object_type_index != tipe_ev && e.object_type_index != tipe_mu {
                continue;
            }

            let mut salinan: *mut c_void = std::ptr::null_mut();
            let ok = unsafe {
                DuplicateHandle(
                    proc,
                    e.handle as *mut c_void,
                    kita,
                    &mut salinan,
                    0,
                    0,
                    DUPLICATE_SAME_ACCESS,
                )
            };
            if ok == 0 || salinan.is_null() {
                continue;
            }
            let nama = nama_objek(salinan);
            unsafe { CloseHandle(salinan) };

            let Some(nama) = nama else { continue };
            if !gerbang_single_instance(&nama) {
                continue;
            }

            let mut buang: *mut c_void = std::ptr::null_mut();
            let ok = unsafe {
                DuplicateHandle(
                    proc,
                    e.handle as *mut c_void,
                    kita,
                    &mut buang,
                    0,
                    0,
                    DUPLICATE_CLOSE_SOURCE | DUPLICATE_SAME_ACCESS,
                )
            };
            if ok != 0 {
                if !buang.is_null() {
                    unsafe { CloseHandle(buang) };
                }
                ditutup += 1;
            }
        }
        unsafe { CloseHandle(proc) };
    }

    ditutup
}

#[link(name = "kernel32")]
extern "system" {
    fn CreateEventW(
        attrs: *mut c_void,
        manual: i32,
        initial: i32,
        name: *const u16,
    ) -> *mut c_void;
    fn CreateMutexW(attrs: *mut c_void, owner: i32, name: *const u16) -> *mut c_void;
}
