//! Common types for document extraction: unified JSON output and errors.

use serde::{Deserialize, Serialize};

/// One page or section of extracted text (1-based index).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageContent {
    pub page: u32,
    pub text: String,
}

/// Successful extraction output (printed to stdout, exit code 0).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractSuccess {
    pub ok: bool,
    pub format: String,
    pub pages: Vec<PageContent>,
}

/// Failure output (printed to stderr, non-zero exit code).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractError {
    pub ok: bool,
    pub error: String,
    pub code: i32,
}

impl ExtractSuccess {
    pub fn new(format: &str, pages: Vec<PageContent>) -> Self {
        Self {
            ok: true,
            format: format.to_string(),
            pages,
        }
    }
}

impl ExtractError {
    pub fn new(error: impl Into<String>, code: i32) -> Self {
        Self {
            ok: false,
            error: error.into(),
            code,
        }
    }
}

/// Clean text: normalize whitespace (collapse runs, trim).
pub fn clean_text(s: &str) -> String {
    s.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}
