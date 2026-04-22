use std::mem;
use windows_sys::Win32::Foundation::POINT;
use windows_sys::Win32::Graphics::Gdi::ClientToScreen;
use windows_sys::Win32::UI::WindowsAndMessaging::{GetGUIThreadInfo, GUITHREADINFO};

pub fn get_caret_position() -> Option<(f64, f64, f64)> {
    get_caret_via_gui_thread()
        .or_else(get_caret_via_uia)
        .or_else(get_caret_via_focused_element_bounds)
}

fn get_caret_via_gui_thread() -> Option<(f64, f64, f64)> {
    unsafe {
        let mut thread_info: GUITHREADINFO = mem::zeroed();
        thread_info.cbSize = mem::size_of::<GUITHREADINFO>() as u32;
        if GetGUIThreadInfo(0, &mut thread_info) == 0 {
            return None;
        }
        let caret_window = thread_info.hwndCaret;
        if caret_window.is_null() {
            return None;
        }
        let mut top_point = POINT {
            x: thread_info.rcCaret.left,
            y: thread_info.rcCaret.top,
        };
        let mut bottom_point = POINT {
            x: thread_info.rcCaret.left,
            y: thread_info.rcCaret.bottom,
        };
        if ClientToScreen(caret_window, &mut top_point) == 0 {
            return None;
        }
        if ClientToScreen(caret_window, &mut bottom_point) == 0 {
            return None;
        }
        Some((top_point.x as f64, top_point.y as f64, bottom_point.y as f64))
    }
}

fn get_caret_via_uia() -> Option<(f64, f64, f64)> {
    use windows::core::Interface;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::System::Ole::{
        SafeArrayAccessData, SafeArrayDestroy, SafeArrayGetLBound, SafeArrayGetUBound,
        SafeArrayUnaccessData,
    };
    use windows::Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId,
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;

        let focused_element = automation.GetFocusedElement().ok()?;

        let text_pattern_unknown = focused_element.GetCurrentPattern(UIA_TextPatternId).ok()?;
        let text_pattern: IUIAutomationTextPattern = text_pattern_unknown.cast().ok()?;

        let selected_ranges = text_pattern.GetSelection().ok()?;
        if selected_ranges.Length().ok()? == 0 {
            return None;
        }
        let first_range = selected_ranges.GetElement(0).ok()?;

        let bounding_rects = first_range.GetBoundingRectangles().ok()?;
        if bounding_rects.is_null() {
            return None;
        }

        let lower_bound = SafeArrayGetLBound(bounding_rects, 1).ok()? as usize;
        let upper_bound = SafeArrayGetUBound(bounding_rects, 1).ok()? as usize;
        if upper_bound < lower_bound + 3 {
            SafeArrayDestroy(bounding_rects).ok();
            return None;
        }

        let mut raw_data: *mut std::ffi::c_void = std::ptr::null_mut();
        SafeArrayAccessData(bounding_rects, &mut raw_data).ok()?;

        let rect_values = raw_data as *const f64;
        let left = *rect_values.add(lower_bound);
        let top = *rect_values.add(lower_bound + 1);
        let _width = *rect_values.add(lower_bound + 2);
        let height = *rect_values.add(lower_bound + 3);

        SafeArrayUnaccessData(bounding_rects).ok();
        SafeArrayDestroy(bounding_rects).ok();

        Some((left, top, top + height))
    }
}

// Last-resort fallback for GPU-rendered apps (Zed, Warp, etc.) that don't expose
// IUIAutomationTextPattern. Gets the bounding rect of the focused UI element — not
// the exact caret, but at least anchors the popup to the right app and control.
fn get_caret_via_focused_element_bounds() -> Option<(f64, f64, f64)> {
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation};

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;

        let focused_element = automation.GetFocusedElement().ok()?;
        let bounds = focused_element.CurrentBoundingRectangle().ok()?;

        if bounds.left == 0 && bounds.top == 0 && bounds.right == 0 && bounds.bottom == 0 {
            return None;
        }

        let x = bounds.left as f64;
        // Treat the bottom of the focused control as the caret bottom.
        // For terminals (Warp) the input line lives there; for editors it's a
        // reasonable anchor even if the real cursor is somewhere in the middle.
        let control_bottom = bounds.bottom as f64;
        let line_height_estimate = 20.0;
        Some((x, control_bottom - line_height_estimate, control_bottom))
    }
}
