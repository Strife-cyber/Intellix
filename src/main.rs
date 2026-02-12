//! Intellix: document extraction + web scraper + FSRS engine.
//! - extract: file path → JSON (pages + text)
//! - scrape: URL → JSON (metadata + markdown content)
//! - fsrs: review data → JSON (updated scheduling values)

mod extractors;
mod scraper;
mod fsrs;
mod log;

use clap::{Parser, Subcommand};
use extractors::extract_file;
use fsrs::{process_batch, process_review, BatchInput, ReviewInput};
use log::{log_and_exit, LogEntry};
use std::io::{self, Read};
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "intellix")]
#[command(about = "Document extraction and web scraping")]
struct Args {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Extract text from a document file (PDF, DOCX, ODT, TXT, MD, HTML)
    Extract {
        /// Path to the document file
        #[arg(required = true)]
        file: PathBuf,
    },
    /// Fetch a URL, strip script/style/nav/footer, convert to Markdown, output JSON
    Scrape {
        /// URL to fetch
        #[arg(required = true)]
        url: String,
    },
    /// Process FSRS review data (reads JSON from stdin or file)
    Fsrs {
        /// Optional JSON file path (if not provided, reads from stdin)
        #[arg(short, long)]
        file: Option<PathBuf>,
    },
}

fn main() {
    let args = Args::parse();

    match &args.command {
        Command::Extract { file } => {
            match extract_file(file) {
                Ok(result) => {
                    if let Ok(out) = serde_json::to_string(&result) {
                        println!("{}", out);
                    }
                }
                Err(e) => {
                    let mut context = std::collections::HashMap::new();
                    context.insert("file".to_string(), serde_json::Value::String(
                        file.to_string_lossy().to_string()
                    ));
                    context.insert("error_code".to_string(), serde_json::Value::Number(
                        serde_json::Number::from(e.code)
                    ));
                    
                    log_and_exit(
                        LogEntry::error(&e.error)
                            .with_command("extract")
                            .with_context(context)
                            .with_code(e.code),
                        e.code
                    );
                }
            }
        }
        Command::Scrape { url } => {
            match scraper::scrape_url(url) {
                Ok(result) => {
                    if let Ok(out) = serde_json::to_string(&result) {
                        println!("{}", out);
                    }
                }
                Err(e) => {
                    let mut context = std::collections::HashMap::new();
                    context.insert("url".to_string(), serde_json::Value::String(url.clone()));
                    context.insert("error_code".to_string(), serde_json::Value::Number(
                        serde_json::Number::from(e.code)
                    ));
                    
                    log_and_exit(
                        LogEntry::error(&e.error)
                            .with_command("scrape")
                            .with_context(context)
                            .with_code(e.code),
                        e.code
                    );
                }
            }
        }
        Command::Fsrs { file } => {
            let json_input = match file {
                Some(path) => {
                    match std::fs::read_to_string(path) {
                        Ok(content) => content,
                        Err(e) => {
                            let mut context = std::collections::HashMap::new();
                            context.insert("file".to_string(), serde_json::Value::String(
                                path.to_string_lossy().to_string()
                            ));
                            context.insert("io_error".to_string(), serde_json::Value::String(
                                e.to_string()
                            ));
                            
                            log_and_exit(
                                LogEntry::error(format!("Failed to read file: {}", e))
                                    .with_command("fsrs")
                                    .with_context(context)
                                    .with_code(43),
                                43
                            );
                        }
                    }
                }
                None => {
                    let mut buffer = String::new();
                    match io::stdin().read_to_string(&mut buffer) {
                        Ok(_) => buffer,
                        Err(e) => {
                            let mut context = std::collections::HashMap::new();
                            context.insert("io_error".to_string(), serde_json::Value::String(
                                e.to_string()
                            ));
                            context.insert("input_source".to_string(), serde_json::Value::String(
                                "stdin".to_string()
                            ));
                            
                            log_and_exit(
                                LogEntry::error(format!("Failed to read stdin: {}", e))
                                    .with_command("fsrs")
                                    .with_context(context)
                                    .with_code(44),
                                44
                            );
                        }
                    }
                }
            };

            // Try to parse as batch first, then single review
            if let Ok(batch) = serde_json::from_str::<BatchInput>(&json_input) {
                match process_batch(batch) {
                    Ok(output) => {
                        if let Ok(out) = serde_json::to_string(&output) {
                            println!("{}", out);
                        }
                    }
                    Err(e) => {
                        let mut context = std::collections::HashMap::new();
                        context.insert("error_code".to_string(), serde_json::Value::Number(
                            serde_json::Number::from(e.code)
                        ));
                        context.insert("input_type".to_string(), serde_json::Value::String(
                            "batch".to_string()
                        ));
                        
                        log_and_exit(
                            LogEntry::error(&e.error)
                                .with_command("fsrs")
                                .with_context(context)
                                .with_code(e.code),
                            e.code
                        );
                    }
                }
            } else if let Ok(review) = serde_json::from_str::<ReviewInput>(&json_input) {
                match process_review(review) {
                    Ok(output) => {
                        if let Ok(out) = serde_json::to_string(&output) {
                            println!("{}", out);
                        }
                    }
                    Err(e) => {
                        let mut context = std::collections::HashMap::new();
                        context.insert("error_code".to_string(), serde_json::Value::Number(
                            serde_json::Number::from(e.code)
                        ));
                        context.insert("input_type".to_string(), serde_json::Value::String(
                            "review".to_string()
                        ));
                        
                        log_and_exit(
                            LogEntry::error(&e.error)
                                .with_command("fsrs")
                                .with_context(context)
                                .with_code(e.code),
                            e.code
                        );
                    }
                }
            } else {
                let mut context = std::collections::HashMap::new();
                context.insert("input_length".to_string(), serde_json::Value::Number(
                    serde_json::Number::from(json_input.len())
                ));
                
                log_and_exit(
                    LogEntry::error("Invalid JSON: expected ReviewInput or BatchInput")
                        .with_command("fsrs")
                        .with_context(context)
                        .with_code(45),
                    45
                );
            }
        }
    }
}
