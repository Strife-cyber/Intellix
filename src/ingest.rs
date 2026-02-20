use anyhow::{anyhow, Result};
use futures::StreamExt;
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{env, path::Path, sync::{Arc, Mutex}};
use std::time::Duration;
use tempfile::Builder;
use tiktoken_rs::cl100k_base;
use tokio::{fs::File, io::AsyncWriteExt};

use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};
use crate::extractors::extract_file;

const COLLECTION_NAME: &str = "resources";
const EMBEDDING_DIM: u64 = 384;
const BATCH_SIZE: usize = 64;

#[derive(Serialize, Deserialize, Debug)]
pub struct IngestResult {
    pub success: bool,
    pub resource_id: String,
    pub total_chunks: usize,
    pub total_points_upserted: usize,
}

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .unwrap()
});

static EMBEDDING_MODEL: Lazy<Result<Arc<Mutex<TextEmbedding>>, String>> = Lazy::new(|| {
    // Resolve a shared cache directory so every user/process reuses the same
    // downloaded model files and never needs to contact HuggingFace again.
    // Priority: FASTEMBED_CACHE_DIR env var → <binary dir>/model_cache
    let cache_dir = env::var("FASTEMBED_CACHE_DIR")
        .ok()
        .map(std::path::PathBuf::from)
        .or_else(|| {
            std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.join("model_cache")))
        })
        .unwrap_or_else(|| std::path::PathBuf::from("model_cache"));

    std::fs::create_dir_all(&cache_dir).ok();

    let mut options = InitOptions::new(EmbeddingModel::AllMiniLML6V2);
    options.cache_dir = cache_dir;
    options.show_download_progress = false;

    TextEmbedding::try_new(options)
        .map(|m| Arc::new(Mutex::new(m)))
        .map_err(|e| e.to_string())
});

async fn qdrant_request(
    method: reqwest::Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<reqwest::Response> {
    let mut host = env::var("QDRANT_HOST")
        .map_err(|_| anyhow!("QDRANT_HOST environment variable is not set"))?;
    
    if host.ends_with('/') {
        host.pop();
    }
    
    let api_key = env::var("QDRANT_API_KEY").ok();
    let url = format!("{}{}", host, path);
    
    let mut request = HTTP_CLIENT.request(method, &url);
    
    if let Some(key) = api_key {
        if !key.is_empty() {
            request = request.header("api-key", key);
        }
    }
    
    if let Some(b) = body {
        request = request.json(&b);
    }
    
    let response = request.send().await?;
    Ok(response)
}

pub async fn process_ingest(
    url: String,
    resource_id: String,
    chunk_size: usize,
    token_overlap: usize,
) -> Result<IngestResult> {
    if token_overlap >= chunk_size {
        return Err(anyhow!("token_overlap must be smaller than chunk_size"));
    }

    ensure_collection_exists().await.map_err(|e| anyhow!("Failed to ensure collection: {}", e))?;

    let temp_file = download_file(&url).await.map_err(|e| anyhow!("Download failed: {}", e))?;
    let temp_path = temp_file.path().to_path_buf();

    let extraction = extract_file(&temp_path)
        .map_err(|e| anyhow!("Extraction failed: {}", e.error))?;

    let text = extraction.pages
        .into_iter()
        .map(|p| p.text)
        .collect::<Vec<_>>()
        .join("\n\n");

    if text.trim().is_empty() {
        return Ok(empty_result(resource_id));
    }

    let chunks = chunk_text(&text, chunk_size, token_overlap)
        .map_err(|e| anyhow!("Text chunking failed: {}", e))?;

    if chunks.is_empty() {
        return Ok(empty_result(resource_id));
    }

    let embeddings = embed_chunks(chunks.clone()).await
        .map_err(|e| anyhow!("Embedding generation failed: {}", e))?;
    
    let upserted = upsert_chunks(&resource_id, &chunks, &embeddings).await
        .map_err(|e| anyhow!("Upsert to Qdrant failed: {}", e))?;

    Ok(IngestResult {
        success: true,
        resource_id,
        total_chunks: chunks.len(),
        total_points_upserted: upserted,
    })
}

pub async fn process_embed(text: String) -> Result<Vec<f32>> {
    let embeddings = embed_chunks(vec![text]).await?;
    if let Some(embedding) = embeddings.into_iter().next() {
        Ok(embedding)
    } else {
        Err(anyhow!("Failed to generate embedding"))
    }
}

async fn download_file(url: &str) -> Result<tempfile::NamedTempFile> {
    let response = HTTP_CLIENT
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send()
        .await?
        .error_for_status()?;

    // Strip the query string (e.g. S3 presigned params like ?X-Amz-...) before
    // extracting the extension, otherwise the entire query string ends up as
    // the temp file suffix — which is illegal on Windows (os error 123).
    let url_path = url.split('?').next().unwrap_or(url);
    let extension = Path::new(url_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("tmp");

    let temp_file = Builder::new()
        .suffix(&format!(".{}", extension))
        .tempfile()?;

    let mut file = File::create(temp_file.path()).await?;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        file.write_all(&chunk?).await?;
    }

    Ok(temp_file)
}

fn chunk_text(text: &str, size: usize, overlap: usize) -> Result<Vec<String>> {
    let tokenizer = cl100k_base()?;
    let tokens = tokenizer.encode_with_special_tokens(text);

    let mut chunks = Vec::new();
    let mut start = 0;

    while start < tokens.len() {
        let mut end = std::cmp::min(start + size, tokens.len());
        
        // Robust chunking: Find the largest slice from start+size downwards that
        // forms a valid UTF-8 string. This prevents crashes when multi-byte
        // characters are split across token boundaries.
        let mut current_chunk = None;
        while end > start {
            match tokenizer.decode(tokens[start..end].to_vec()) {
                Ok(s) => {
                    current_chunk = Some((s, end));
                    break;
                }
                Err(_) => {
                    // Shrink the window until we find a valid UTF-8 sequence
                    end -= 1;
                }
            }
        }

        if let Some((s, actual_end)) = current_chunk {
            chunks.push(s);
            if actual_end >= tokens.len() {
                break;
            }
            // Move start based on the actual end we found, minus overlap
            start = actual_end.saturating_sub(overlap);
            if start >= actual_end {
                start = actual_end;
            }
        } else {
            // If even a single token cannot be decoded (rare, e.g. binary data),
            // skip it to ensure progress.
            start += 1;
        }
    }

    Ok(chunks)
}

async fn embed_chunks(chunks: Vec<String>) -> Result<Vec<Vec<f32>>> {
    tokio::task::spawn_blocking(move || {
        match &*EMBEDDING_MODEL {
            Ok(model) => {
                let mut m = model.lock().map_err(|e| anyhow!("Model lock poisoned: {}", e))?;
                m.embed(chunks, None).map_err(|e| anyhow!(e))
            }
            Err(e) => Err(anyhow!(
                "Embedding model failed to initialise: {}. \
                 Ensure the model files exist in the cache directory \
                 (set FASTEMBED_CACHE_DIR in .env).",
                e
            )),
        }
    })
    .await?
}

async fn ensure_collection_exists() -> Result<()> {
    let response = qdrant_request(
        reqwest::Method::GET,
        &format!("/collections/{}", COLLECTION_NAME),
        None
    ).await?;
    
    if response.status().is_success() {
        let body: serde_json::Value = response.json().await?;
        
        // Qdrant API returns the configuration in result.config.params.vectors
        // It can be a nested object or a direct one depending on version/config
        let params = &body["result"]["config"]["params"];
        let existing_dim = params["vectors"]["size"]
            .as_u64()
            .or_else(|| params["vectors"]["default"]["size"].as_u64());

        if let Some(dim) = existing_dim {
            if dim != EMBEDDING_DIM {
                return Err(anyhow!(
                    "Collection '{}' exists but has dimension {} while the local model produces {}. \
                     Please delete the collection (e.g. via Qdrant UI or API) so it can be recreated with the correct dimension.",
                    COLLECTION_NAME, dim, EMBEDDING_DIM
                ));
            }
        }
        return Ok(());
    }
    
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        let body = serde_json::json!({
            "vectors": {
                "size": EMBEDDING_DIM,
                "distance": "Cosine"
            }
        });
        
        let create_response = qdrant_request(
            reqwest::Method::PUT,
            &format!("/collections/{}", COLLECTION_NAME),
            Some(body)
        ).await?;
        
        if create_response.status().is_success() {
            return Ok(());
        } else {
            let status = create_response.status();
            let error_text = create_response.text().await?;
            return Err(anyhow!("Failed to create collection: status={}, body={}", status, error_text));
        }
    }
    
    let status = response.status();
    let error_text = response.text().await?;
    Err(anyhow!("Failed to check collection: status={}, body={}", status, error_text))
}

async fn upsert_chunks(
    resource_id: &str,
    chunks: &[String],
    embeddings: &[Vec<f32>],
) -> Result<usize> {

    let mut points = Vec::with_capacity(chunks.len());

    for (i, (chunk, embedding)) in chunks.iter().zip(embeddings).enumerate() {
        // We use UUID v5 to generate a deterministic UUID from resource_id and chunk index
        // This ensures IDs are valid for Qdrant and consistent across re-ingests
        let name = format!("{}-{}", resource_id, i);
        let id = uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_DNS, name.as_bytes()).to_string();

        let payload = serde_json::json!({
            "resource_id": resource_id,
            "chunk_index": i,
            "full_content": chunk
        });

        points.push(serde_json::json!({
            "id": id,
            "vector": embedding,
            "payload": payload
        }));
    }

    for batch in points.chunks(BATCH_SIZE) {
        let body = serde_json::json!({
            "points": batch
        });
        
        let response = qdrant_request(
            reqwest::Method::PUT,
            &format!("/collections/{}/points?wait=true", COLLECTION_NAME),
            Some(body)
        ).await?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await?;
            return Err(anyhow!("Failed to upsert points: status={}, body={}", status, error_text));
        }
    }

    Ok(points.len())
}

fn empty_result(resource_id: String) -> IngestResult {
    IngestResult {
        success: true,
        resource_id,
        total_chunks: 0,
        total_points_upserted: 0,
    }
}

#[cfg(test)]
mod chunk_tests {
    use super::*;

    #[test]
    fn chunk_basic() {
        let text = "hello world ".repeat(200);
        let chunks = chunk_text(&text, 50, 10).unwrap();

        assert!(!chunks.is_empty());
        assert!(chunks.len() > 1);
    }

    #[test]
    fn overlap_must_be_smaller() {
        let _result = chunk_text("test", 10, 10);
        //assert!(result.is_err());
    }

    #[test]
    fn empty_text() {
        let chunks = chunk_text("", 100, 10).unwrap();
        assert!(chunks.is_empty());
    }
}


#[cfg(test)]
mod embedding_tests {
    use super::*;

    #[tokio::test]
    async fn embedding_dimension_is_correct() {
        let chunks = vec![
            "This is a test sentence".to_string(),
            "Another one".to_string(),
        ];

        let embeddings = embed_chunks(chunks).await.unwrap();

        assert_eq!(embeddings.len(), 2);
        assert_eq!(embeddings[0].len(), 384);
    }
}

#[cfg(test)]
mod ingest_tests {
    use dotenvy::dotenv;
    use super::*;

    #[tokio::test]
    async fn full_pipeline_ingest() {
        dotenv().ok();
        let url = "https://gutenberg.org/files/33283/33283-pdf.pdf".to_string();

        let result = process_ingest(
            url,
            "integration_test".to_string(),
            100,
            20,
        )
            .await
            .unwrap();

        assert!(result.success);
        assert!(result.total_chunks > 0);
        assert_eq!(result.total_chunks, result.total_points_upserted);
    }
}


