use keyring_core::{set_default_store, Entry, Error};

const SERVICE: &str = "com.mexboard";
const ACCOUNT: &str = "session_token";

/// Register the platform's credential store as the default for keyring-core.
/// Call once at app startup, before any Entry operations.
pub fn init() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let store = apple_native_keyring_store::keychain::Store::new()
            .map_err(|e| e.to_string())?;
        set_default_store(store);
    }

    #[cfg(target_os = "windows")]
    {
        let store = windows_native_keyring_store::Store::new()
            .map_err(|e| e.to_string())?;
        set_default_store(store);
    }

    #[cfg(target_os = "linux")]
    {
        let store = zbus_secret_service_keyring_store::Store::new()
            .map_err(|e| e.to_string())?;
        set_default_store(store);
    }

    Ok(())
}

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_session_token() -> Option<String> {
    entry().ok()?.get_password().ok()
}

#[tauri::command]
#[specta::specta]
pub fn save_session_token(token: String) -> Result<(), String> {
    entry()?.set_password(&token).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_session_token() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(_) => Ok(()),
        Err(Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
