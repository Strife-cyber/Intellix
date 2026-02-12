//! Intellix: document extraction + web scraper + FSRS engine.
//! - extract: file path → JSON (pages + text)
//! - scrape: URL → JSON (metadata + markdown content)
//! - fsrs: review data → JSON (updated scheduling values)

mod extractors;
mod scraper;
mod fsrs;

use clap::{Parser, Subcommand};
use extractors::extract_file;
use fsrs::{process_batch, process_review, BatchInput, FSRSError, ReviewInput};
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
                    let err_json = serde_json::to_string(&e).unwrap_or_else(|_| {
                        format!(
                            r#"{{"ok":false,"error":"{}","code":{}}}"#,
                            e.error.replace('"', "\\\""),
                            e.code
                        )
                    });
                    eprintln!("{}", err_json);
                    std::process::exit(e.code);
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
                    let err_json = serde_json::to_string(&e).unwrap_or_else(|_| {
                        format!(
                            r#"{{"ok":false,"error":"{}","code":{}}}"#,
                            e.error.replace('"', "\\\""),
                            e.code
                        )
                    });
                    eprintln!("{}", err_json);
                    std::process::exit(e.code);
                }
            }
        }
        Command::Fsrs { file } => {
            let json_input = match file {
                Some(path) => {
                    match std::fs::read_to_string(path) {
                        Ok(content) => content,
                        Err(e) => {
                            let err = FSRSError {
                                ok: false,
                                error: format!("Failed to read file: {}", e),
                                code: 43,
                            };
                            let err_json = serde_json::to_string(&err).unwrap_or_else(|_| {
                                format!(
                                    r#"{{"ok":false,"error":"{}","code":{}}}"#,
                                    err.error.replace('"', "\\\""),
                                    err.code
                                )
                            });
                            eprintln!("{}", err_json);
                            std::process::exit(err.code);
                        }
                    }
                }
                None => {
                    let mut buffer = String::new();
                    match io::stdin().read_to_string(&mut buffer) {
                        Ok(_) => buffer,
                        Err(e) => {
                            let err = FSRSError {
                                ok: false,
                                error: format!("Failed to read stdin: {}", e),
                                code: 44,
                            };
                            let err_json = serde_json::to_string(&err).unwrap_or_else(|_| {
                                format!(
                                    r#"{{"ok":false,"error":"{}","code":{}}}"#,
                                    err.error.replace('"', "\\\""),
                                    err.code
                                )
                            });
                            eprintln!("{}", err_json);
                            std::process::exit(err.code);
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
                        let err_json = serde_json::to_string(&e).unwrap_or_else(|_| {
                            format!(
                                r#"{{"ok":false,"error":"{}","code":{}}}"#,
                                e.error.replace('"', "\\\""),
                                e.code
                            )
                        });
                        eprintln!("{}", err_json);
                        std::process::exit(e.code);
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
                        let err_json = serde_json::to_string(&e).unwrap_or_else(|_| {
                            format!(
                                r#"{{"ok":false,"error":"{}","code":{}}}"#,
                                e.error.replace('"', "\\\""),
                                e.code
                            )
                        });
                        eprintln!("{}", err_json);
                        std::process::exit(e.code);
                    }
                }
            } else {
                let e = FSRSError {
                    ok: false,
                    error: "Invalid JSON: expected ReviewInput or BatchInput".to_string(),
                    code: 45,
                };
                let err_json = serde_json::to_string(&e).unwrap_or_else(|_| {
                    format!(
                        r#"{{"ok":false,"error":"{}","code":{}}}"#,
                        e.error.replace('"', "\\\""),
                        e.code
                    )
                });
                eprintln!("{}", err_json);
                std::process::exit(e.code);
            }
        }
    }
}
