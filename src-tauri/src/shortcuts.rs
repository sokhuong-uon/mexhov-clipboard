use crate::handle_command;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};

#[cfg(target_os = "macos")]
const TOGGLE_ACCELERATOR: &str = "Cmd+Shift+V";

#[cfg(not(target_os = "macos"))]
const TOGGLE_ACCELERATOR: &str = "Super+V";

pub fn on_event(app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state() != ShortcutState::Pressed {
        return;
    }
    let Ok(toggle) = TOGGLE_ACCELERATOR.parse::<Shortcut>() else {
        return;
    };
    if shortcut == &toggle {
        handle_command(app, "toggle");
    }
}

pub fn register(app: &AppHandle) {
    let shortcut: Shortcut = match TOGGLE_ACCELERATOR.parse() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[shortcuts] invalid accelerator {TOGGLE_ACCELERATOR}: {e}");
            return;
        }
    };

    match app.global_shortcut().register(shortcut) {
        Ok(()) => eprintln!("[shortcuts] registered {TOGGLE_ACCELERATOR}"),
        Err(e) => {
            eprintln!("[shortcuts] failed to register {TOGGLE_ACCELERATOR}: {e}");
            print_hint();
        }
    }
}

fn print_hint() {
    #[cfg(target_os = "linux")]
    eprintln!(
        "  Another app or your desktop environment likely owns Super+V. \
         Free it in keyboard settings, or bind your DE to run `mexboard toggle`."
    );
    #[cfg(target_os = "windows")]
    eprintln!(
        "  Win+V is reserved by Windows Clipboard History. Disable it in \
         Settings > System > Clipboard, or use PowerToys Keyboard Manager to \
         remap Win+V -> `mexboard.exe toggle`."
    );
    #[cfg(target_os = "macos")]
    eprintln!(
        "  Another app may own Cmd+Shift+V. Check System Settings > Keyboard > \
         Keyboard Shortcuts."
    );
}
