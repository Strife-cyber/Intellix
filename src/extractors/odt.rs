//! ODT extractor: text from content.xml (OpenDocument).

use crate::extractors::types::{clean_text, ExtractError, ExtractSuccess, PageContent};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::io::Cursor;
use std::path::Path;
use zip::ZipArchive;

const CONTENT_XML: &str = "content.xml";

pub fn extract(path: &Path) -> Result<ExtractSuccess, ExtractError> {
    let file = std::fs::File::open(path).map_err(|e| ExtractError::new(e.to_string(), 8))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| ExtractError::new(format!("Invalid ODT: {}", e), 9))?;

    let mut content_xml = Vec::new();
    let mut zip_file = archive
        .by_name(CONTENT_XML)
        .map_err(|_| ExtractError::new("ODT missing content.xml", 10))?;
    std::io::copy(&mut zip_file, &mut content_xml)
        .map_err(|e| ExtractError::new(e.to_string(), 11))?;

    let text = extract_text_from_odt_xml(&content_xml)
        .map_err(|e| ExtractError::new(e.to_string(), 12))?;

    let pages = vec![PageContent {
        page: 1,
        text: clean_text(&text),
    }];

    Ok(ExtractSuccess::new("odt", pages))
}

fn extract_text_from_odt_xml(xml: &[u8]) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let mut reader = Reader::from_reader(Cursor::new(xml));
    reader.config_mut().trim_text(true);

    let mut out = String::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(e)) => {
                out.push_str(e.decode()?.as_ref());
                out.push(' ');
            }
            Ok(Event::End(_)) => {}
            Ok(Event::Eof) => break,
            Err(e) => return Err(e.into()),
            _ => {}
        }
        buf.clear();
    }

    Ok(out)
}
