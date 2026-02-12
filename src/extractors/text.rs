//! Plain text extractor: single block of cleaned text.

use crate::extractors::types::{clean_text, ExtractError, ExtractSuccess, PageContent};
use std::path::Path;

pub fn extract(path: &Path) -> Result<ExtractSuccess, ExtractError> {
    let s = std::fs::read_to_string(path).map_err(|e| ExtractError::new(e.to_string(), 13))?;

    let pages = vec![PageContent {
        page: 1,
        text: clean_text(&s),
    }];

    Ok(ExtractSuccess::new("text", pages))
}
