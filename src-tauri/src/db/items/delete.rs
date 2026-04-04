use drizzle::core::expr::*;
use drizzle::sqlite::prelude::*;

use crate::schema::*;

use super::super::schema::*;
use super::super::utils::*;
use super::super::Database;

impl Database {
    pub fn delete_item(&self, id: i64) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner
            .db
            .delete(*ci)
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(error_to_string)?;

        Ok(())
    }

    pub fn clear_all(&self) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner.db.delete(*ci).execute().map_err(error_to_string)?;

        Ok(())
    }
}
