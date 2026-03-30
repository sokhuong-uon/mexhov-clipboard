use core_foundation::base::{CFRelease, TCFType};
use core_foundation::string::CFString;
use std::ffi::c_void;
use std::ptr;

type AXUIElementRef = *mut c_void;
type AXError = i32;

const K_AX_ERROR_SUCCESS: AXError = 0;
const K_AX_VALUE_CG_RECT_TYPE: u32 = 4;

#[repr(C)]
#[derive(Debug, Copy, Clone)]
struct CGPoint {
    x: f64,
    y: f64,
}

#[repr(C)]
#[derive(Debug, Copy, Clone)]
struct CGSize {
    width: f64,
    height: f64,
}

#[repr(C)]
#[derive(Debug, Copy, Clone)]
struct CGRect {
    origin: CGPoint,
    size: CGSize,
}

extern "C" {
    fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: core_foundation::string::CFStringRef,
        value: *mut *mut c_void,
    ) -> AXError;
    fn AXUIElementCopyParameterizedAttributeValue(
        element: AXUIElementRef,
        attribute: core_foundation::string::CFStringRef,
        parameter: *mut c_void,
        result: *mut *mut c_void,
    ) -> AXError;
    fn AXValueGetValue(value: *mut c_void, value_type: u32, value_ptr: *mut c_void) -> bool;
}

pub fn get_caret_position() -> Option<(f64, f64)> {
    unsafe {
        let system = AXUIElementCreateSystemWide();
        let result = get_caret_position_inner(system);
        CFRelease(system as _);
        result
    }
}

unsafe fn get_caret_position_inner(system: AXUIElementRef) -> Option<(f64, f64)> {
    // Get focused application
    let mut focused_app: *mut c_void = ptr::null_mut();
    let attr = CFString::new("AXFocusedApplication");
    if AXUIElementCopyAttributeValue(system, attr.as_concrete_TypeRef(), &mut focused_app)
        != K_AX_ERROR_SUCCESS
    {
        return None;
    }

    // Get focused UI element from the application
    let mut focused_element: *mut c_void = ptr::null_mut();
    let attr = CFString::new("AXFocusedUIElement");
    let err = AXUIElementCopyAttributeValue(
        focused_app as AXUIElementRef,
        attr.as_concrete_TypeRef(),
        &mut focused_element,
    );
    CFRelease(focused_app);
    if err != K_AX_ERROR_SUCCESS {
        return None;
    }

    // Get selected text range (caret = zero-length selection)
    let mut range_value: *mut c_void = ptr::null_mut();
    let attr = CFString::new("AXSelectedTextRange");
    let err = AXUIElementCopyAttributeValue(
        focused_element as AXUIElementRef,
        attr.as_concrete_TypeRef(),
        &mut range_value,
    );
    if err != K_AX_ERROR_SUCCESS {
        CFRelease(focused_element);
        return None;
    }

    // Get bounds for the range
    let mut bounds_value: *mut c_void = ptr::null_mut();
    let attr = CFString::new("AXBoundsForRange");
    let err = AXUIElementCopyParameterizedAttributeValue(
        focused_element as AXUIElementRef,
        attr.as_concrete_TypeRef(),
        range_value,
        &mut bounds_value,
    );
    CFRelease(range_value);
    CFRelease(focused_element);
    if err != K_AX_ERROR_SUCCESS {
        return None;
    }

    let mut rect = CGRect {
        origin: CGPoint { x: 0.0, y: 0.0 },
        size: CGSize {
            width: 0.0,
            height: 0.0,
        },
    };
    AXValueGetValue(
        bounds_value,
        K_AX_VALUE_CG_RECT_TYPE,
        &mut rect as *mut _ as *mut c_void,
    );
    CFRelease(bounds_value);

    // Reject invalid coordinates
    if rect.origin.x == 0.0
        && rect.origin.y == 0.0
        && rect.size.width == 0.0
        && rect.size.height == 0.0
    {
        return None;
    }

    // Position below the caret
    Some((rect.origin.x, rect.origin.y + rect.size.height))
}
