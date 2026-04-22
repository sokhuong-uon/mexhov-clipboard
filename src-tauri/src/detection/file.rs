use std::path::Path;

/// If `text` is a path to a regular file or directory that currently exists,
/// returns a MIME-type string. Otherwise returns `None`.
///
/// Directories return `"inode/directory"`. Symlinks are followed. Files are
/// classified by their extension via a conservative allow-list (unknown
/// extensions return `"application/octet-stream"`).
pub fn detect_file_mime(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed.contains('\n') {
        return None;
    }

    // Accept either a plain absolute path or a `file://` URI.
    let path_str = strip_file_uri(trimmed).unwrap_or(trimmed);
    let path = Path::new(path_str);
    if !path.is_absolute() {
        return None;
    }

    let metadata = std::fs::metadata(path).ok()?;

    if metadata.is_dir() {
        return Some("inode/directory".to_string());
    }

    if !metadata.is_file() {
        return None;
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase());

    Some(mime_from_extension(ext.as_deref()).to_string())
}

fn strip_file_uri(s: &str) -> Option<&str> {
    // `file:///home/foo` → `/home/foo` (absolute, accepted).
    // `file://host/...` → `host/...` (rejected later by is_absolute).
    s.strip_prefix("file://")
}

fn mime_from_extension(ext: Option<&str>) -> &'static str {
    match ext {
        // Documents
        Some("pdf") => "application/pdf",
        Some("doc") => "application/msword",
        Some("docx") => {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
        Some("xls") => "application/vnd.ms-excel",
        Some("xlsx") => {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        Some("ppt") => "application/vnd.ms-powerpoint",
        Some("pptx") => {
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        }
        Some("odt") => "application/vnd.oasis.opendocument.text",
        Some("ods") => "application/vnd.oasis.opendocument.spreadsheet",
        Some("odp") => "application/vnd.oasis.opendocument.presentation",
        Some("rtf") => "application/rtf",
        Some("epub") => "application/epub+zip",

        // Archives
        Some("zip") => "application/zip",
        Some("tar") => "application/x-tar",
        Some("gz") | Some("tgz") => "application/gzip",
        Some("bz2") => "application/x-bzip2",
        Some("xz") => "application/x-xz",
        Some("7z") => "application/x-7z-compressed",
        Some("rar") => "application/vnd.rar",

        // Text / code
        Some("txt") | Some("log") => "text/plain",
        Some("md") | Some("markdown") => "text/markdown",
        Some("csv") => "text/csv",
        Some("tsv") => "text/tab-separated-values",
        Some("json") => "application/json",
        Some("yaml") | Some("yml") => "application/yaml",
        Some("toml") => "application/toml",
        Some("xml") => "application/xml",
        Some("html") | Some("htm") => "text/html",
        Some("css") => "text/css",
        Some("js") | Some("mjs") | Some("cjs") => "application/javascript",
        Some("ts") | Some("tsx") => "application/typescript",
        Some("rs") => "text/x-rust",
        Some("py") => "text/x-python",
        Some("go") => "text/x-go",
        Some("java") => "text/x-java",
        Some("c") | Some("h") => "text/x-c",
        Some("cpp") | Some("cc") | Some("hpp") => "text/x-c++",
        Some("sh") | Some("bash") | Some("zsh") | Some("fish") => "application/x-shellscript",
        Some("sql") => "application/sql",

        // Images
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("avif") => "image/avif",
        Some("heic") | Some("heif") => "image/heic",
        Some("tiff") | Some("tif") => "image/tiff",

        // Audio
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("flac") => "audio/flac",
        Some("ogg") | Some("oga") => "audio/ogg",
        Some("m4a") => "audio/mp4",
        Some("aac") => "audio/aac",
        Some("opus") => "audio/opus",

        // Video
        Some("mp4") | Some("m4v") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mov") => "video/quicktime",
        Some("mkv") => "video/x-matroska",
        Some("avi") => "video/x-msvideo",

        // Fonts / binaries
        Some("ttf") => "font/ttf",
        Some("otf") => "font/otf",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("exe") => "application/vnd.microsoft.portable-executable",
        Some("dmg") => "application/x-apple-diskimage",
        Some("deb") => "application/vnd.debian.binary-package",
        Some("rpm") => "application/x-rpm",
        Some("appimage") => "application/x-executable",
        Some("iso") => "application/x-iso9660-image",

        _ => "application/octet-stream",
    }
}
