mod extractors;
mod scraper;
mod fsrs;
mod log;
mod ingest;

use dotenvy::dotenv;
use clap::{Parser, Subcommand};
use extractors::extract_file;
use fsrs::{process_batch, process_review, BatchInput, ReviewInput};
use ingest::{process_ingest};
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
    Extract {
        #[arg(required = true)]
        file: PathBuf,
    },
    Scrape {
        #[arg(required = true)]
        url: String,
    },
    Fsrs {
        #[arg(short, long)]
        file: Option<PathBuf>,
    },
    Ingest {
        #[arg(required = true)]
        url: String,
        #[arg(required = true)]
        resource_id: String,
        #[arg(long, default_value = "1000")]
        chunk_size: usize,
        #[arg(long, default_value = "200")]
        token_overlap: usize,
    }
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let args = Args::parse();

    match args.command {
        Command::Extract { file } => {
            match extract_file(&file) {
                Ok(result) => {
                    println!("{}", serde_json::to_string(&result).unwrap());
                }
                Err(e) => {
                    let mut context = std::collections::HashMap::new();
                    context.insert("file".into(), file.to_string_lossy().to_string().into());
                    context.insert("error_code".into(), e.code.into());

                    log_and_exit(
                        LogEntry::error(&e.error)
                            .with_command("extract")
                            .with_context(context)
                            .with_code(e.code),
                        e.code,
                    );
                }
            }
        }

        Command::Scrape { url } => {
            match scraper::scrape_url(&url) {
                Ok(result) => {
                    println!("{}", serde_json::to_string(&result).unwrap());
                }
                Err(e) => {
                    let mut context = std::collections::HashMap::new();
                    context.insert("url".into(), url.into());
                    context.insert("error_code".into(), e.code.into());

                    log_and_exit(
                        LogEntry::error(&e.error)
                            .with_command("scrape")
                            .with_context(context)
                            .with_code(e.code),
                        e.code,
                    );
                }
            }
        }

        Command::Fsrs { file } => {
            let json_input = match file {
                Some(path) => std::fs::read_to_string(&path).unwrap_or_else(|e| {
                    let mut context = std::collections::HashMap::new();
                    context.insert("file".into(), path.to_string_lossy().to_string().into());
                    context.insert("io_error".into(), e.to_string().into());

                    log_and_exit(
                        LogEntry::error(format!("Failed to read file: {}", e))
                            .with_command("fsrs")
                            .with_context(context)
                            .with_code(43),
                        43,
                    );
                }),
                None => {
                    let mut buffer = String::new();
                    io::stdin().read_to_string(&mut buffer).unwrap_or_else(|e| {
                        let mut context = std::collections::HashMap::new();
                        context.insert("io_error".into(), e.to_string().into());
                        context.insert("input_source".into(), "stdin".into());

                        log_and_exit(
                            LogEntry::error(format!("Failed to read stdin: {}", e))
                                .with_command("fsrs")
                                .with_context(context)
                                .with_code(44),
                            44,
                        );
                    });
                    buffer
                }
            };

            if let Ok(batch) = serde_json::from_str::<BatchInput>(&json_input) {
                match process_batch(batch) {
                    Ok(output) => println!("{}", serde_json::to_string(&output).unwrap()),
                    Err(e) => {
                        let mut context = std::collections::HashMap::new();
                        context.insert("error_code".into(), e.code.into());
                        context.insert("input_type".into(), "batch".into());

                        log_and_exit(
                            LogEntry::error(&e.error)
                                .with_command("fsrs")
                                .with_context(context)
                                .with_code(e.code),
                            e.code,
                        );
                    }
                }
            } else if let Ok(review) = serde_json::from_str::<ReviewInput>(&json_input) {
                match process_review(review) {
                    Ok(output) => println!("{}", serde_json::to_string(&output).unwrap()),
                    Err(e) => {
                        let mut context = std::collections::HashMap::new();
                        context.insert("error_code".into(), e.code.into());
                        context.insert("input_type".into(), "review".into());

                        log_and_exit(
                            LogEntry::error(&e.error)
                                .with_command("fsrs")
                                .with_context(context)
                                .with_code(e.code),
                            e.code,
                        );
                    }
                }
            } else {
                let mut context = std::collections::HashMap::new();
                context.insert("input_length".into(), json_input.len().into());

                log_and_exit(
                    LogEntry::error("Invalid JSON: expected ReviewInput or BatchInput")
                        .with_command("fsrs")
                        .with_context(context)
                        .with_code(45),
                    45,
                );
            }
        }

        Command::Ingest { url, resource_id, chunk_size, token_overlap } => {
            match process_ingest(url, resource_id.clone(), chunk_size, token_overlap).await {
                Ok(result) => {
                    println!("{}", serde_json::to_string(&result).unwrap());
                }
                Err(e) => {
                    let mut context = std::collections::HashMap::new();
                    context.insert("resource_id".into(), resource_id.into());

                    log_and_exit(
                        LogEntry::error(format!("Ingestion failed: {}", e))
                            .with_command("ingest")
                            .with_context(context)
                            .with_code(50),
                        50,
                    );
                }
            }
        }
    }
}
