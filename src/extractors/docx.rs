//! DOCX extractor: text from word/document.xml (Office Open XML).

use crate::extractors::types::{clean_text, ExtractError, ExtractSuccess, PageContent};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::io::Cursor;
use std::path::Path;
use zip::ZipArchive;

const DOCUMENT_XML: &str = "word/document.xml";

pub fn extract(path: &Path) -> Result<ExtractSuccess, ExtractError> {
    let file = std::fs::File::open(path).map_err(|e| ExtractError::new(e.to_string(), 3))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| ExtractError::new(format!("Invalid DOCX: {}", e), 4))?;

    let mut doc_xml = Vec::new();
    let mut zip_file = archive
        .by_name(DOCUMENT_XML)
        .map_err(|_| ExtractError::new("DOCX missing word/document.xml", 5))?;
    std::io::copy(&mut zip_file, &mut doc_xml)
        .map_err(|e| ExtractError::new(e.to_string(), 6))?;

    let text = extract_text_from_docx_xml(&doc_xml)
        .map_err(|e| ExtractError::new(e.to_string(), 7))?;

    let pages = vec![PageContent {
        page: 1,
        text: clean_text(&text),
    }];

    Ok(ExtractSuccess::new("docx", pages))
}

fn extract_text_from_docx_xml(xml: &[u8]) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
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
