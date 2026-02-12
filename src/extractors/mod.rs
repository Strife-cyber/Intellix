//! Document extractors: PDF, DOCX, ODT, text, markdown, HTML.
//! Accepts a file path (e.g. from Laravel via CLI), outputs structured JSON.

mod docx;
mod html;
mod markdown;
mod odt;
mod pdf;
mod text;
mod types;

pub use types::{ExtractError, ExtractSuccess};

use std::path::Path;

/// Supported format (by file extension).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Pdf,
    Docx,
    Odt,
    Text,
    Markdown,
    Html,
}

impl Format {
    pub fn from_path(path: &Path) -> Option<Self> {
        path.extension().and_then(|e| {
            e.to_str().and_then(|ext| match ext.to_lowercase().as_str() {
                "pdf" => Some(Format::Pdf),
                "docx" => Some(Format::Docx),
                "odt" => Some(Format::Odt),
                "txt" | "text" => Some(Format::Text),
                "md" | "markdown" => Some(Format::Markdown),
                "html" | "htm" => Some(Format::Html),
                _ => None,
            })
        })
    }

    #[allow(dead_code)]
    pub fn as_str(self) -> &'static str {
        match self {
            Format::Pdf => "pdf",
            Format::Docx => "docx",
            Format::Odt => "odt",
            Format::Text => "text",
            Format::Markdown => "markdown",
            Format::Html => "html",
        }
    }
}

/// Extract text from a document file. Format is inferred from extension.
pub fn extract_file(path: &Path) -> Result<ExtractSuccess, ExtractError> {
    let format = Format::from_path(path).ok_or_else(|| {
        ExtractError::new(
            "Unsupported or unknown format. Use .pdf, .docx, .odt, .txt, .md, .html",
            20,
        )
    })?;

    match format {
        Format::Pdf => pdf::extract(path),
        Format::Docx => docx::extract(path),
        Format::Odt => odt::extract(path),
        Format::Text => text::extract(path),
        Format::Markdown => markdown::extract(path),
        Format::Html => html::extract(path),
    }
}
