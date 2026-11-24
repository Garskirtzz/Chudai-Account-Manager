use windows::core::{factory, HSTRING};
use windows::Security::Credentials::UI::{
    UserConsentVerificationResult as Hasil, UserConsentVerifier, UserConsentVerifierAvailability as Ada,
};
use windows::Win32::Foundation::HWND;
use windows::Win32::System::WinRT::IUserConsentVerifierInterop;
use windows_future::IAsyncOperation;

pub const BATAL: &str = "__BATAL__";

pub fn tersedia() -> Result<(), String> {
    let ada = UserConsentVerifier::CheckAvailabilityAsync()
        .and_then(|op| op.get())
        .map_err(|e| format!("Windows Hello couldn't be checked ({}).", e.message()))?;
    match ada {
        Ada::Available => Ok(()),
        Ada::DeviceNotPresent => Err("This PC has no Windows Hello device (face, fingerprint or PIN).".into()),
        Ada::NotConfiguredForUser => {
            Err("Windows Hello isn't set up for your Windows account. Set it up in Windows Settings → Accounts → Sign-in options.".into())
        }
        Ada::DisabledByPolicy => Err("Windows Hello is turned off by a policy on this PC.".into()),
        Ada::DeviceBusy => Err("The Windows Hello device is busy. Try again in a moment.".into()),
        _ => Err("Windows Hello isn't available on this PC.".into()),
    }
}

pub fn verifikasi(hwnd: isize, pesan: &str) -> Result<(), String> {
    tersedia()?;
    let interop = factory::<UserConsentVerifier, IUserConsentVerifierInterop>()
        .map_err(|e| format!("Windows Hello couldn't start ({}).", e.message()))?;
    let op: IAsyncOperation<Hasil> = unsafe {
        interop.RequestVerificationForWindowAsync(HWND(hwnd as *mut _), &HSTRING::from(pesan))
    }
    .map_err(|e| format!("Windows Hello couldn't start ({}).", e.message()))?;
    let hasil = op.get().map_err(|e| format!("Windows Hello failed ({}).", e.message()))?;
    match hasil {
        Hasil::Verified => Ok(()),
        Hasil::Canceled => Err(BATAL.into()),
        Hasil::DeviceBusy => Err("The Windows Hello device is busy. Try again in a moment.".into()),
        Hasil::RetriesExhausted => Err("Too many failed attempts. Windows Hello is locked for now.".into()),
        Hasil::DeviceNotPresent => Err("This PC has no Windows Hello device.".into()),
        Hasil::NotConfiguredForUser => Err("Windows Hello isn't set up for your Windows account.".into()),
        Hasil::DisabledByPolicy => Err("Windows Hello is turned off by a policy on this PC.".into()),
        _ => Err("Windows Hello didn't confirm it's you.".into()),
    }
}
