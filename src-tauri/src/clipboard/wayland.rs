use tokio::process::Command;

pub async fn read() -> Result<String, String> {
    match Command::new("wl-paste").arg("--no-newline").output().await {
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
    let list_output = Command::new("wl-paste").arg("--list-types").output().await;

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
        .await
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
    Command::new("wl-copy")
        .arg("--")
        .arg(&text)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to execute wl-copy (is wl-clipboard installed?): {}",
                e
            )
        })?;

    // Give wl-copy a moment to set the selection
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    Ok(())
}

pub async fn write_image(png_bytes: Vec<u8>) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;

    let mut child: tokio::process::Child = Command::new("wl-copy")
        .arg("--type")
        .arg("image/png")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to execute wl-copy (is wl-clipboard installed?): {}",
                e
            )
        })?;

    if let Some(mut stdin) = child.stdin.take() {
        AsyncWriteExt::write_all(&mut stdin, &png_bytes)
            .await
            .map_err(|e| format!("Failed to write to wl-copy stdin: {}", e))?;
        // stdin is dropped here, sending EOF to wl-copy
    }

    // Give wl-copy a moment to set the selection
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    Ok(())
}
