use drizzle::core::expr::*;

use crate::schema::*;

use super::super::schema::*;
use super::super::utils::*;
use super::super::Database;

impl Database {
    pub fn bump_item(&self, id: i64, sort_order: &str) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;
        let now = timestamp_now();

        inner
            .db
            .update(*ci)
            .set(
                UpdateClipboardItems::default()
                    .with_sort_order(sort_order)
                    .with_updated_at(&now),
            )
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(error_to_string)?;

        inner
            .db
            .conn()
            .execute(
                "UPDATE clipboard_items SET copy_count = copy_count + 1 WHERE id = ?1",
                rusqlite::params![id],
            )
            .map_err(error_to_string)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

        Ok(ClipboardItemRow::from(row))
    }

    pub fn update_sort_order(&self, id: i64, sort_order: &str) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner
            .db
            .update(*ci)
            .set(UpdateClipboardItems::default().with_sort_order(sort_order))
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(error_to_string)?;

        Ok(())
    }

    pub fn update_sort_orders(&self, items: Vec<UpdateSortOrderParams>) -> DbResult<()> {
        for item in items {
            self.update_sort_order(item.id, &item.sort_order)?;
        }
        Ok(())
    }

    pub fn toggle_favorite(&self, id: i64) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let current: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

        let new_fav = if current.is_favorite != 0 { 0i64 } else { 1i64 };

        inner
            .db
            .update(*ci)
            .set(UpdateClipboardItems::default().with_is_favorite(new_fav))
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(error_to_string)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

        Ok(ClipboardItemRow::from(row))
    }

    pub fn update_note(&self, id: i64, note: Option<&str>) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner
            .db
            .conn()
            .execute(
                "UPDATE clipboard_items SET note = ?1 WHERE id = ?2",
                rusqlite::params![note, id],
            )
            .map_err(error_to_string)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

        Ok(ClipboardItemRow::from(row))
    }
}
