use crate::fps::Flags;
use serde_json::json;

pub const FPS_HEMAT: u32 = 10;

pub const FPS_HEMAT_MIN: u32 = 3;

pub fn fps_hemat_sah(fps: u32) -> u32 {
    if fps == 0 { 0 } else { fps.clamp(FPS_HEMAT_MIN, 240) }
}

pub fn fps_akun_sah(fps: u32) -> u32 {
    if fps == 0 { 0 } else { fps.clamp(10, 1000) }
}

pub fn fps_sekali_sah(fps: Option<u32>) -> Option<u32> {
    fps.filter(|&f| f > 0).map(|f| f.clamp(5, 1000))
}

pub fn target_cap(fps_cap: u32, hemat: bool, hemat_fps: u32) -> Option<i32> {
    if hemat {
        Some(if hemat_fps > 0 { hemat_fps } else { FPS_HEMAT } as i32)
    } else if fps_cap > 0 {
        Some(fps_cap as i32)
    } else {
        None
    }
}

pub fn flag_hemat() -> Flags {
    json!({
        "DFIntDebugFRMQualityLevelOverride": 1,
        "FIntDebugForceMSAASamples": 0,
        "DFFlagTextureQualityOverrideEnabled": "True",
        "DFIntTextureQualityOverride": 0,
        "FIntFRMMinGrassDistance": 0,
        "FIntFRMMaxGrassDistance": 0
    })
    .as_object()
    .cloned()
    .unwrap_or_default()
}

pub fn berkas_pengaturan() -> Option<std::path::PathBuf> {
    let dir = dirs::data_local_dir()?.join("Roblox");
    std::fs::read_dir(&dir)
        .ok()?
        .flatten()
        .filter(|e| {
            let n = e.file_name().to_string_lossy().to_string();
            n.starts_with("GlobalBasicSettings_") && n.ends_with(".xml")
        })
        .max_by_key(|e| e.metadata().and_then(|m| m.modified()).ok())
        .map(|e| e.path())
}

const TAG: &str = r#"<int name="FramerateCap">"#;

pub fn baca_cap(xml: &str) -> Option<i32> {
    let isi = xml.find(TAG)? + TAG.len();
    let akhir = isi + xml[isi..].find("</int>")?;
    xml[isi..akhir].trim().parse().ok()
}

pub fn ganti_cap(xml: &str, cap: i32) -> Option<String> {
    let isi = xml.find(TAG)? + TAG.len();
    let akhir = isi + xml[isi..].find("</int>")?;
    Some(format!("{}{}{}", &xml[..isi], cap, &xml[akhir..]))
}

pub fn cap_terbaca() -> Option<i32> {
    baca_cap(&std::fs::read_to_string(berkas_pengaturan()?).ok()?)
}
