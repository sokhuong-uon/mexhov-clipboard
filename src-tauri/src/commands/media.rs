use scraper::{Html, Selector};

#[derive(serde::Serialize, specta::Type)]
pub struct LinkPreviewData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub favicon: Option<String>,
    pub site_name: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_link_preview(url: String) -> Result<LinkPreviewData, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (compatible; LinkPreview/1.0)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html_text = response.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html_text);

    let og_title = select_meta_content(&document, "og:title");
    let og_description = select_meta_content(&document, "og:description");
    let og_image = select_meta_content(&document, "og:image");
    let og_site_name = select_meta_content(&document, "og:site_name");

    let title = og_title.or_else(|| {
        Selector::parse("title")
            .ok()
            .and_then(|sel| document.select(&sel).next())
            .map(|el| el.text().collect::<String>())
    });

    let description =
        og_description.or_else(|| select_meta_content_by_name(&document, "description"));

    let favicon = select_link_href(&document, "icon")
        .or_else(|| select_link_href(&document, "shortcut icon"))
        .map(|href| resolve_url(&url, &href))
        .or_else(|| {
            url::Url::parse(&url).ok().map(|u| {
                format!(
                    "{}://{}/favicon.ico",
                    u.scheme(),
                    u.host_str().unwrap_or("")
                )
            })
        });

    let image = og_image.map(|img| resolve_url(&url, &img));

    Ok(LinkPreviewData {
        title,
        description,
        image,
        favicon,
        site_name: og_site_name,
    })
}

/// Downloads a media URL to a temporary file and returns the file path
/// along with a small PNG icon for the drag preview.
#[tauri::command]
#[specta::specta]
pub async fn download_media_to_temp(url: String) -> Result<(String, String), String> {
    let extension = url::Url::parse(&url)
        .ok()
        .and_then(|u| u.path().rsplit('.').next().map(|ext| ext.to_lowercase()))
        .unwrap_or_else(|| "gif".to_string());

    let temp_dir = std::env::temp_dir().join("mexc-drag");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    use sha2::{Digest, Sha256};
    let hash = format!("{:x}", Sha256::digest(url.as_bytes()));
    let file_path = temp_dir.join(format!("{}.{}", &hash[..16], extension));
    let icon_path = temp_dir.join(format!("{}_icon.png", &hash[..16]));

    if !file_path.exists() {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| e.to_string())?;

        let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;

        std::fs::write(&file_path, &bytes).map_err(|e| e.to_string())?;
    }

    if !icon_path.exists() {
        let icon_created: Result<(), String> = (|| {
            let file = std::fs::File::open(&file_path).map_err(|e| e.to_string())?;
            let reader = std::io::BufReader::new(file);
            let decoder = image::codecs::gif::GifDecoder::new(reader).map_err(|e| e.to_string())?;
            use image::AnimationDecoder;
            let first_frame = decoder
                .into_frames()
                .next()
                .ok_or("No frames in GIF")?
                .map_err(|e| e.to_string())?;
            let img = image::DynamicImage::from(first_frame.into_buffer());
            let thumb = img.thumbnail(64, 64);
            thumb.save(&icon_path).map_err(|e| e.to_string())?;
            Ok(())
        })();

        if icon_created.is_err() {
            let fallback = image::RgbaImage::new(1, 1);
            fallback.save(&icon_path).map_err(|e| e.to_string())?;
        }
    }

    let file_str = file_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid file path".to_string())?;
    let icon_str = icon_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid icon path".to_string())?;

    Ok((file_str, icon_str))
}

#[tauri::command]
#[specta::specta]
pub fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

fn select_meta_content(document: &Html, property: &str) -> Option<String> {
    let selector = Selector::parse(&format!("meta[property=\"{}\"]", property)).ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content").map(|s| s.to_string()))
}

fn select_meta_content_by_name(document: &Html, name: &str) -> Option<String> {
    let selector = Selector::parse(&format!("meta[name=\"{}\"]", name)).ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content").map(|s| s.to_string()))
}

fn select_link_href(document: &Html, rel: &str) -> Option<String> {
    let selector = Selector::parse(&format!("link[rel=\"{}\"]", rel)).ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("href").map(|s| s.to_string()))
}

fn resolve_url(base: &str, href: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        return href.to_string();
    }
    if let Ok(base_url) = url::Url::parse(base) {
        if let Ok(resolved) = base_url.join(href) {
            return resolved.to_string();
        }
    }
    href.to_string()
}
