use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};

pub fn detect_date(text: &str) -> Option<String> {
    let text = text.trim();

    if let Ok(dt) = text.parse::<DateTime<Utc>>() {
        return Some(dt.to_rfc3339());
    }

    if let Ok(dt) = DateTime::parse_from_rfc3339(text) {
        return Some(dt.with_timezone(&Utc).to_rfc3339());
    }

    if let Ok(dt) = DateTime::parse_from_rfc2822(text) {
        return Some(dt.with_timezone(&Utc).to_rfc3339());
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %I:%M:%S %p") {
        return Some(ndt.and_utc().to_rfc3339());
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %H:%M:%S") {
        return Some(ndt.and_utc().to_rfc3339());
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %I:%M %p") {
        return Some(ndt.and_utc().to_rfc3339());
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %H:%M") {
        return Some(ndt.and_utc().to_rfc3339());
    }

    if let Ok(nd) = NaiveDate::parse_from_str(text, "%Y-%m-%d") {
        if let Some(ndt) = nd.and_hms_opt(0, 0, 0) {
            return Some(ndt.and_utc().to_rfc3339());
        }
    }

    None
}
