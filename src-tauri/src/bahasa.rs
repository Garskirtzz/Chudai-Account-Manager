use std::sync::atomic::{AtomicBool, Ordering};

static INDONESIA: AtomicBool = AtomicBool::new(false);

pub fn atur(kode: &str) -> bool {
    let id = kode == "id";
    INDONESIA.swap(id, Ordering::Relaxed) != id
}

pub fn indonesia() -> bool {
    INDONESIA.load(Ordering::Relaxed)
}

pub fn pilih<'a>(en: &'a str, id: &'a str) -> &'a str {
    pilih_untuk(indonesia(), en, id)
}

pub fn pilih_untuk<'a>(indonesia: bool, en: &'a str, id: &'a str) -> &'a str {
    if indonesia {
        id
    } else {
        en
    }
}

#[cfg(test)]
mod uji {
    use super::*;

    #[test]
    fn pilih_untuk_mengikuti_bahasa() {
        assert_eq!(pilih_untuk(false, "Quit", "Keluar"), "Quit");
        assert_eq!(pilih_untuk(true, "Quit", "Keluar"), "Keluar");
    }
}
