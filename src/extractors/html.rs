//! HTML extractor: strip tags and output body text.

use crate::extractors::types::{clean_text, ExtractError, ExtractSuccess, PageContent};
use scraper::{Html, Selector};
use std::path::Path;

pub fn extract(path: &Path) -> Result<ExtractSuccess, ExtractError> {
    let s = std::fs::read_to_string(path).map_err(|e| ExtractError::new(e.to_string(), 15))?;

    let fragment = Html::parse_document(&s);
    let body_selector = Selector::parse("body").map_err(|e| ExtractError::new(e.to_string(), 16))?;
    let html_selector = Selector::parse("html").map_err(|e| ExtractError::new(e.to_string(), 16))?;

    let text = fragment
        .select(&body_selector)
        .next()
        .or_else(|| fragment.select(&html_selector).next())
        .map(|el| el.text().collect::<Vec<_>>().join(" "))
        .unwrap_or_default();

    let pages = vec![PageContent {
        page: 1,
        text: clean_text(&text),
    }];

    Ok(ExtractSuccess::new("html", pages))
}
