//! Scraper CLI: fetch URL, strip unsafe/irrelevant tags, convert to Markdown, output JSON.

use chrono::Utc;
use html2md_rs::to_md::safe_from_html_to_md;
use scraper::{Html, Selector};
use serde::Serialize;

/// Tags to remove (and their contents) before converting to Markdown.
const STRIP_TAGS: &[&str] = &["script", "style", "nav", "footer", "noscript", "iframe"];

/// Result of a successful scrape: metadata + markdown content.
#[derive(Debug, Serialize)]
pub struct ScrapeResult {
    pub ok: bool,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub fetched_at: String,
    pub content: String,
}

/// Error from scraping (for stderr / non-zero exit).
#[derive(Debug, Serialize)]
pub struct ScrapeError {
    pub ok: bool,
    pub error: String,
    pub code: i32,
}

impl ScrapeResult {
    pub fn new(url: String, title: Option<String>, content: String) -> Self {
        Self {
            ok: true,
            url,
            title,
            fetched_at: Utc::now().to_rfc3339(),
            content,
        }
    }
}

/// Strip blocks for script, style, nav, footer, etc. (case-insensitive).
/// Does not add the opening/closing tag or content to output when stripping.
fn strip_unwanted_tags(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut i = 0;
    
    while i < html.len() {
        // Check if we're at a '<' character (ASCII, safe to check bytes)
        if html.as_bytes()[i] != b'<' {
            // Not a tag start, copy the character and advance by its UTF-8 width
            if let Some(ch) = html[i..].chars().next() {
                out.push(ch);
                i += ch.len_utf8();
            } else {
                break;
            }
            continue;
        }
        
        // Found '<', parse the tag
        let tag_start = i;
        i += 1; // Skip '<'
        
        if i >= html.len() {
            out.push('<');
            break;
        }
        
        // Check for closing tag '/'
        let is_closing = html.as_bytes()[i] == b'/';
        if is_closing {
            i += 1;
        }
        
        // Extract tag name
        let tag_name_start = i;
        while i < html.len() {
            let byte = html.as_bytes()[i];
            if byte == b'>' || byte.is_ascii_whitespace() {
                break;
            }
            // Skip doctype/processing instructions
            if byte == b'!' || byte == b'?' {
                // Skip to end of tag
                while i < html.len() && html.as_bytes()[i] != b'>' {
                    i += 1;
                }
                if i < html.len() {
                    i += 1; // Skip '>'
                }
                out.push_str(&html[tag_start..i]);
                continue;
            }
            i += 1;
        }
        
        let tag_name = html[tag_name_start..i]
            .split(|c: char| c == '/' || c == '!')
            .next()
            .unwrap_or("")
            .trim_end_matches('/')
            .to_lowercase();
        
        // Skip to end of tag
        while i < html.len() && html.as_bytes()[i] != b'>' {
            i += 1;
        }
        if i < html.len() {
            i += 1; // Skip '>'
        }
        
        // If this is a tag we should strip, skip its content
        if STRIP_TAGS.iter().any(|&t| t == tag_name.as_str()) {
            let close_tag = format!("</{}>", tag_name);
            let open_tag = format!("<{}", tag_name);
            let mut depth = 1;
            
            // Skip content until matching closing tag
            while i < html.len() {
                if html.as_bytes()[i] == b'<' {
                    // Check if this is our closing tag
                    if let Some(peek) = html.get(i..i + close_tag.len()) {
                        if peek.eq_ignore_ascii_case(&close_tag) {
                            depth -= 1;
                            if depth == 0 {
                                i += close_tag.len();
                                break;
                            }
                        }
                    }
                    // Check if this is another opening tag of same type
                    if let Some(peek) = html.get(i..i + open_tag.len()) {
                        if peek.eq_ignore_ascii_case(&open_tag) {
                            depth += 1;
                        }
                    }
                }
                // Advance by one byte (safe because we're skipping content)
                i += 1;
            }
            continue;
        }
        
        // Keep this tag
        out.push_str(&html[tag_start..i]);
    }
    
    out
}

/// Remove <!DOCTYPE ...> so strict HTML-to-MD parsers don't choke.
fn strip_doctype(html: &str) -> String {
    let s = html.trim_start();
    if s.starts_with("<![CDATA[") {
        return html.to_string();
    }
    if s.len() >= 9 && s[..9].eq_ignore_ascii_case("<!DOCTYPE") {
        if let Some(end) = s[9..].find('>') {
            return s[9 + end + 1..].trim_start().to_string();
        }
    }
    if s.len() >= 2 && s.starts_with("<!") && !s.starts_with("<!--") {
        if let Some(end) = s.find('>') {
            return s[end + 1..].trim_start().to_string();
        }
    }
    html.to_string()
}

/// Extract title from parsed HTML.
fn extract_title(html: &str) -> Option<String> {
    let fragment = Html::parse_document(html);
    let sel = Selector::parse("title").ok()?;
    fragment
        .select(&sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Fetch URL, strip unwanted tags, convert to Markdown, return structured result.
pub fn scrape_url(url: &str) -> Result<ScrapeResult, ScrapeError> {
    let url = url.trim();
    if url.is_empty() {
        return Err(ScrapeError {
            ok: false,
            error: "URL is empty".to_string(),
            code: 30,
        });
    }
    let client = reqwest::blocking::Client::builder()
        .user_agent("Intellix-Scraper/1.0")
        .build()
        .map_err(|e| ScrapeError {
            ok: false,
            error: e.to_string(),
            code: 31,
        })?;
    let resp = client.get(url).send().map_err(|e| ScrapeError {
        ok: false,
        error: format!("Request failed: {}", e),
        code: 32,
    })?;
    if !resp.status().is_success() {
        return Err(ScrapeError {
            ok: false,
            error: format!(
                "HTTP {}: {}",
                resp.status(),
                resp.status().canonical_reason().unwrap_or("")
            ),
            code: 33,
        });
    }
    let html = resp.text().map_err(|e| ScrapeError {
        ok: false,
        error: e.to_string(),
        code: 34,
    })?;
    let title = extract_title(&html);
    let cleaned = strip_unwanted_tags(&html);
    let cleaned = strip_doctype(&cleaned);
    let content = safe_from_html_to_md(cleaned)
        .map_err(|e| ScrapeError {
            ok: false,
            error: format!("HTML to Markdown: {}", e),
            code: 35,
        })?
        .trim()
        .to_string();
    Ok(ScrapeResult::new(url.to_string(), title, content))
}
