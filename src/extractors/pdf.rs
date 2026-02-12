//! PDF extractor: raw text per page via pdf-extract.

use crate::extractors::types::{clean_text, ExtractError, ExtractSuccess, PageContent};
use pdf_extract::extract_text_by_pages;
use std::path::Path;

pub fn extract(path: &Path) -> Result<ExtractSuccess, ExtractError> {
    let path_str = path
        .to_str()
        .ok_or_else(|| ExtractError::new("Invalid path encoding", 1))?;

    let page_strings =
        extract_text_by_pages(path_str).map_err(|e| ExtractError::new(e.to_string(), 2))?;

    let pages = page_strings
        .into_iter()
        .enumerate()
        .map(|(i, text)| PageContent {
            page: (i + 1) as u32,
            text: clean_text(&text),
        })
        .collect();

    Ok(ExtractSuccess::new("pdf", pages))
}
