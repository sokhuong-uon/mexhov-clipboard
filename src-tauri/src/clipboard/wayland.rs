use std::process::Command;

pub async fn read() -> Result<String, String> {
    match Command::new("wl-paste").arg("--no-newline").output() {
        Ok(output) => {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .map_err(|e| format!("Invalid UTF-8 in clipboard: {}", e))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);

                if stderr.contains("No selection")
                    || stderr.contains("Nothing is copied")
                    || stderr.is_empty()
                {
                    Ok(String::new())
                } else {
                    Err(format!("wl-paste failed: {}", stderr))
                }
            }
        }
        Err(e) => Err(format!(
            "Failed to execute wl-paste (is wl-clipboard installed?): {}",
            e
        )),
    }
}

pub async fn read_image() -> Result<Option<Vec<u8>>, String> {
    // First check if there's an image in the clipboard by listing MIME types
    let list_output = Command::new("wl-paste").arg("--list-types").output();

    let has_image = match list_output {
        Ok(output) => {
            let types = String::from_utf8_lossy(&output.stdout);
            types.contains("image/png") || types.contains("image/jpeg") || types.contains("image/")
        }
        Err(_) => false,
    };

    if !has_image {
        return Ok(None);
    }

    // Read image as PNG
    match Command::new("wl-paste")
        .arg("--no-newline")
        .arg("--type")
        .arg("image/png")
        .output()
    {
        Ok(output) => {
            if output.status.success() && !output.stdout.is_empty() {
                Ok(Some(output.stdout))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.contains("No selection")
                    || stderr.contains("Nothing is copied")
                    || stderr.is_empty()
                {
                    Ok(None)
                } else {
                    // Try without specifying type as fallback
                    Ok(None)
                }
            }
        }
        Err(e) => Err(format!(
            "Failed to execute wl-paste (is wl-clipboard installed?): {}",
            e
        )),
    }
}

pub async fn write(text: String) -> Result<(), String> {
    match Command::new("wl-copy").arg("--").arg(&text).output() {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("wl-copy failed: {}", stderr))
            }
        }
        Err(e) => Err(format!(
            "Failed to execute wl-copy (is wl-clipboard installed?): {}",
            e
        )),
    }
}

pub async fn write_image(png_bytes: Vec<u8>) -> Result<(), String> {
    use std::io::Write;
    use std::process::Stdio;

    let mut child = Command::new("wl-copy")
        .arg("--type")
        .arg("image/png")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to execute wl-copy (is wl-clipboard installed?): {}",
                e
            )
        })?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(&png_bytes)
            .map_err(|e| format!("Failed to write to wl-copy stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for wl-copy: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("wl-copy failed: {}", stderr));
    }

    // wl-copy forks a daemon to serve clipboard data. Wait until
    // the compositor actually sees image/png before returning.
    for _ in 0..20 {
        std::thread::sleep(std::time::Duration::from_millis(25));
        if let Ok(out) = Command::new("wl-paste").arg("--list-types").output() {
            let types = String::from_utf8_lossy(&out.stdout);
            if types.contains("image/png") {
                return Ok(());
            }
        }
    }

    Ok(())
}
