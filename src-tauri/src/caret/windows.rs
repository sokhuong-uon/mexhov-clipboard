use std::mem;
use windows_sys::Win32::Foundation::POINT;
use windows_sys::Win32::Graphics::Gdi::ClientToScreen;
use windows_sys::Win32::UI::WindowsAndMessaging::{GetGUIThreadInfo, GUITHREADINFO};

pub fn get_caret_position() -> Option<(f64, f64)> {
    unsafe {
        let mut gui_info: GUITHREADINFO = mem::zeroed();
        gui_info.cbSize = mem::size_of::<GUITHREADINFO>() as u32;

        // Thread ID 0 = foreground thread
        if GetGUIThreadInfo(0, &mut gui_info) == 0 {
            return None;
        }

        let hwnd = gui_info.hwndCaret;
        if hwnd.is_null() {
            return None;
        }

        // Convert caret rect from client coords to screen coords
        // Use bottom of caret so popup appears below it
        let mut pt = POINT {
            x: gui_info.rcCaret.left,
            y: gui_info.rcCaret.bottom,
        };
        if ClientToScreen(hwnd, &mut pt) == 0 {
            return None;
        }

        Some((pt.x as f64, pt.y as f64))
    }
}
