#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

/// Initialize the caret position tracker (call once at app startup).
/// On Linux this starts a background thread to monitor AT-SPI focus events.
pub fn init() {
    #[cfg(target_os = "linux")]
    linux::init();
}

/// Returns the screen-space (x, y) position of the text caret in the
/// currently focused application, or None if it cannot be determined.
pub fn get_caret_position() -> Option<(f64, f64, f64)> {
    #[cfg(target_os = "linux")]
    {
        linux::get_caret_position()
    }
    #[cfg(target_os = "windows")]
    {
        windows::get_caret_position()
    }
    #[cfg(target_os = "macos")]
    {
        macos::get_caret_position()
    }
}
