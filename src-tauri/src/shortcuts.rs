use crate::handle_command;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};

#[cfg(target_os = "macos")]
pub const DEFAULT_TOGGLE_ACCELERATOR: &str = "Shift+Meta+V";

#[cfg(target_os = "windows")]
pub const DEFAULT_TOGGLE_ACCELERATOR: &str = "Alt+Meta+V";

#[cfg(target_os = "linux")]
pub const DEFAULT_TOGGLE_ACCELERATOR: &str = "Meta+V";

const HOTKEYS_SETTING_KEY: &str = "hotkeys";
const TOGGLE_FIELD: &str = "toggleWindowVisibility";

#[derive(Default)]
pub struct ToggleShortcut(Mutex<Option<Shortcut>>);

pub fn on_event(app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state() != ShortcutState::Pressed {
        return;
    }
    let matches = app
        .try_state::<ToggleShortcut>()
        .and_then(|s| s.0.lock().ok().map(|g| g.as_ref() == Some(shortcut)))
        .unwrap_or(false);
    if matches {
        handle_command(app, "toggle");
    }
}

pub fn register(app: &AppHandle) {
    let accelerator = load_accelerator(app);
    match apply(app, &accelerator) {
        Ok(()) => eprintln!("[shortcuts] registered {accelerator}"),
        Err(e) => {
            eprintln!("[shortcuts] failed to register {accelerator}: {e}");
            print_hint();
        }
    }
}

pub fn apply(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let shortcut: Shortcut = accelerator
        .parse()
        .map_err(|e| format!("invalid accelerator: {e}"))?;

    let gs = app.global_shortcut();
    let state = app.state::<ToggleShortcut>();

    let previous = {
        let guard = state.0.lock().map_err(|_| "poisoned mutex".to_string())?;
        guard.clone()
    };
    if previous.as_ref() == Some(&shortcut) {
        return Ok(());
    }

    gs.register(shortcut.clone()).map_err(|e| e.to_string())?;

    if let Some(prev) = previous {
        let _ = gs.unregister(prev);
    }

    let mut guard = state.0.lock().map_err(|_| "poisoned mutex".to_string())?;
    *guard = Some(shortcut);
    Ok(())
}

fn load_accelerator(app: &AppHandle) -> String {
    let Some(db) = app.try_state::<crate::db::Database>() else {
        return DEFAULT_TOGGLE_ACCELERATOR.to_string();
    };
    let raw = match db.get_setting(HOTKEYS_SETTING_KEY) {
        Ok(Some(s)) => s,
        _ => return DEFAULT_TOGGLE_ACCELERATOR.to_string(),
    };
    let parsed: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(_) => return DEFAULT_TOGGLE_ACCELERATOR.to_string(),
    };
    parsed
        .get(TOGGLE_FIELD)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| DEFAULT_TOGGLE_ACCELERATOR.to_string())
}

fn print_hint() {
    #[cfg(target_os = "linux")]
    eprintln!(
        "  Another app or your desktop environment likely owns this combo. \
         Pick a different one in Preferences or free it in system settings."
    );
    #[cfg(target_os = "windows")]
    eprintln!(
        "  Another app has already registered this combo. Pick a different one \
         in Preferences, or use PowerToys Keyboard Manager to remap a combo to \
         `mexboard.exe toggle`."
    );
    #[cfg(target_os = "macos")]
    eprintln!(
        "  Another app may own this combo. Check System Settings > Keyboard > \
         Keyboard Shortcuts, or pick a different one in Preferences."
    );
}
