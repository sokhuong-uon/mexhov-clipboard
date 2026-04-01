use drizzle::core::expr::*;

use crate::schema::*;

use super::schema::*;
use super::utils::*;
use super::Database;

impl Database {
    pub fn get_setting(&self, key: &str) -> DbResult<Option<String>> {
        let inner = self.lock()?;
        let s = &inner.schema.settings;

        let rows: Vec<SelectSettings> = inner
            .db
            .select(())
            .from(*s)
            .r#where(eq(s.key, key))
            .limit(1)
            .all()
            .map_err(error_to_string)?;

        Ok(rows.into_iter().next().map(|r| r.value))
    }

    pub fn set_setting(&self, key: &str, value: &str) -> DbResult<()> {
        let inner = self.lock()?;

        inner
            .db
            .conn()
            .execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
                rusqlite::params![key, value],
            )
            .map_err(error_to_string)?;

        Ok(())
    }
}
