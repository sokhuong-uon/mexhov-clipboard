use arboard::{Clipboard, ImageData};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub struct ArBoardClipboard {
    clipboard: Arc<Mutex<Option<Clipboard>>>,
}

impl ArBoardClipboard {
    pub fn new() -> Self {
        Self {
            clipboard: Arc::new(Mutex::new(None)),
        }
    }

    fn ensure_clipboard_instance_exists(&self) -> Result<(), String> {
        let mut clipboard_guard = self
            .clipboard
            .lock()
            .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

        if clipboard_guard.is_none() {
            *clipboard_guard = Some(
                Clipboard::new()
                    .map_err(|e| format!("Failed to create clipboard instance: {}", e))?,
            );
        }

        Ok(())
    }

    pub async fn read(&self) -> Result<String, String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let delay_ms = INITIAL_DELAY_MS * (1 << (attempt - 1));
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }

            if let Err(e) = self.ensure_clipboard_instance_exists() {
                if attempt < MAX_RETRIES - 1 {
                    continue;
                } else {
                    return Err(format!("Failed to create clipboard: {}", e));
                }
            }

            let result = {
                let mut clipboard_guard = self
                    .clipboard
                    .lock()
                    .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

                match clipboard_guard.as_mut() {
                    Some(clipboard) => clipboard.get_text(),
                    None => {
                        return Err("Clipboard instance is None".to_string());
                    }
                }
            };

            match result {
                Ok(text) => return Ok(text),
                Err(e) => {
                    let error_str = e.to_string();

                    if error_str.contains("empty") || error_str.contains("not available") {
                        return Ok(String::new());
                    }

                    if attempt < MAX_RETRIES - 1 {
                        // Invalidate clipboard on error
                        if let Ok(mut guard) = self.clipboard.lock() {
                            *guard = None;
                        }
                        continue;
                    } else {
                        return Err(format!("Failed to read clipboard: {}", error_str));
                    }
                }
            }
        }

        Err("Unexpected error in read".to_string())
    }

    pub async fn read_image(&self) -> Result<Option<(Vec<u8>, u32, u32)>, String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let delay_ms = INITIAL_DELAY_MS * (1 << (attempt - 1));
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }

            if let Err(e) = self.ensure_clipboard_instance_exists() {
                if attempt < MAX_RETRIES - 1 {
                    continue;
                } else {
                    return Err(format!("Failed to create clipboard: {}", e));
                }
            }

            let result = {
                let mut clipboard_guard = self
                    .clipboard
                    .lock()
                    .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

                match clipboard_guard.as_mut() {
                    Some(clipboard) => clipboard.get_image(),
                    None => {
                        return Err("Clipboard instance is None".to_string());
                    }
                }
            };

            match result {
                Ok(image_data) => {
                    let width = image_data.width as u32;
                    let height = image_data.height as u32;
                    let rgba_bytes = image_data.bytes.into_owned();
                    return Ok(Some((rgba_bytes, width, height)));
                }
                Err(e) => {
                    let error_str = e.to_string();

                    // No image in clipboard is not an error
                    if error_str.contains("empty")
                        || error_str.contains("not available")
                        || error_str.contains("ContentNotAvailable")
                    {
                        return Ok(None);
                    }

                    if attempt < MAX_RETRIES - 1 {
                        if let Ok(mut guard) = self.clipboard.lock() {
                            *guard = None;
                        }
                        continue;
                    } else {
                        return Err(format!("Failed to read image: {}", error_str));
                    }
                }
            }
        }

        Err("Unexpected error in read_image".to_string())
    }

    pub async fn write(&self, text: String) -> Result<(), String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            if let Err(e) = self.ensure_clipboard_instance_exists() {
                if attempt < MAX_RETRIES - 1 {
                    let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    continue;
                } else {
                    return Err(format!("Failed to ensure clipboard: {}", e));
                }
            }

            let result = {
                let mut clipboard_guard = self
                    .clipboard
                    .lock()
                    .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

                match clipboard_guard.as_mut() {
                    Some(clipboard) => clipboard.set_text(text.clone()),
                    None => {
                        return Err("Clipboard instance is None".to_string());
                    }
                }
            };

            match result {
                Ok(_) => return Ok(()),
                Err(e) => {
                    if attempt < MAX_RETRIES - 1 {
                        // Invalidate the clipboard instance
                        if let Ok(mut guard) = self.clipboard.lock() {
                            *guard = None;
                        }
                        let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    } else {
                        return Err(format!("Failed to write clipboard: {}", e));
                    }
                }
            }
        }

        Err("Unexpected error in write".to_string())
    }

    pub async fn write_image(
        &self,
        rgba_bytes: Vec<u8>,
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        const MAX_RETRIES: u32 = 3;
        const INITIAL_DELAY_MS: u64 = 50;

        for attempt in 0..MAX_RETRIES {
            if let Err(e) = self.ensure_clipboard_instance_exists() {
                if attempt < MAX_RETRIES - 1 {
                    let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    continue;
                } else {
                    return Err(format!("Failed to ensure clipboard: {}", e));
                }
            }

            let image_data = ImageData {
                width: width as usize,
                height: height as usize,
                bytes: rgba_bytes.clone().into(),
            };

            let result = {
                let mut clipboard_guard = self
                    .clipboard
                    .lock()
                    .map_err(|e| format!("Failed to acquire clipboard lock: {}", e))?;

                match clipboard_guard.as_mut() {
                    Some(clipboard) => clipboard.set_image(image_data),
                    None => {
                        return Err("Clipboard instance is None".to_string());
                    }
                }
            };

            match result {
                Ok(_) => return Ok(()),
                Err(e) => {
                    if attempt < MAX_RETRIES - 1 {
                        if let Ok(mut guard) = self.clipboard.lock() {
                            *guard = None;
                        }
                        let delay_ms = INITIAL_DELAY_MS * (1 << attempt);
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    } else {
                        return Err(format!("Failed to write image: {}", e));
                    }
                }
            }
        }

        Err("Unexpected error in write_image".to_string())
    }

    pub fn reinitialize(&self) -> Result<(), String> {
        if let Ok(mut guard) = self.clipboard.lock() {
            *guard = None;
        }
        self.ensure_clipboard_instance_exists()
    }
}
