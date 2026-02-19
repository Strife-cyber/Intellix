use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tempfile::Builder;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use futures::StreamExt;
use crate::extractors::extract_file;
use tiktoken_rs::cl100k_base;
use qdrant_client::prelude::*;
use qdrant_client::qdrant::{PointStruct, CreateCollectionBuilder, Distance, VectorParamsBuilder, UpsertPointsBuilder};
use std::env;
use std::path::Path;
use fastembed::{TextEmbedding, InitOptions, EmbeddingModel};

#[derive(Serialize, Deserialize, Debug)]
pub struct IngestResult {
    pub success: bool,
    pub resource_id: String,
    pub total_chunks: usize,
    pub total_points_upserted: usize,
    pub errors: Vec<String>,
}

pub async fn process_ingest(
    url: String,
    resource_id: String,
    chunk_size: usize,
    token_overlap: usize,
) -> Result<IngestResult> {
    let mut errors = Vec::new();

    // 1. Download file to temp
    // Try to get extension from URL
    let extension = Path::new(&url)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("tmp");
    
    let temp_file = download_file(&url, extension).await.context("Failed to download file")?;
    let temp_path = temp_file.path().to_path_buf();

    // 2. Extract text (Synchronous call)
    let extraction_result = extract_file(&temp_path)
        .map_err(|e| anyhow::anyhow!("Extraction failed: {}", e.error))?;

    let full_text = extraction_result.pages.iter()
        .map(|p| p.text.as_str())
        .collect::<Vec<_>>()
        .join("\n\n");

    if full_text.trim().is_empty() {
        return Ok(IngestResult {
            success: true,
            resource_id,
            total_chunks: 0,
            total_points_upserted: 0,
            errors,
        });
    }

    // 3. Chunk text (token-based)
    let chunks = chunk_text(&full_text, chunk_size, token_overlap)?;

    if chunks.is_empty() {
        return Ok(IngestResult {
            success: true,
            resource_id,
            total_chunks: 0,
            total_points_upserted: 0,
            errors,
        });
    }

    // 4. Generate embeddings (Local using fastembed)
    // fastembed is synchronous but fast, can run in spawn_blocking to avoid blocking async runtime
    let chunks_clone = chunks.clone();
    let embeddings = tokio::task::spawn_blocking(move || {
        generate_local_embeddings(&chunks_clone)
    }).await??;

    // 5. Upsert to Qdrant
    let total_upserted = upsert_to_qdrant(&resource_id, &chunks, &embeddings).await?;

    Ok(IngestResult {
        success: true,
        resource_id,
        total_chunks: chunks.len(),
        total_points_upserted: total_upserted,
        errors,
    })
}

async fn download_file(url: &str, extension: &str) -> Result<tempfile::NamedTempFile> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;
        
    let mut response = client.get(url).send().await?.error_for_status()?;
    
    let temp_file = Builder::new()
        .suffix(&format!(".{}", extension))
        .tempfile()?;
        
    let mut tokio_file = File::create(temp_file.path()).await?;
    
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        tokio_file.write_all(&chunk).await?;
    }
    
    Ok(temp_file)
}

fn chunk_text(text: &str, size: usize, overlap: usize) -> Result<Vec<String>> {
    let bpe = cl100k_base()?;
    let tokens = bpe.encode_with_special_tokens(text);
    
    let mut chunks = Vec::new();
    let mut start = 0;
    
    while start < tokens.len() {
        let end = std::cmp::min(start + size, tokens.len());
        let chunk_tokens = &tokens[start..end];
        let chunk_text = bpe.decode(chunk_tokens.to_vec())?;
        chunks.push(chunk_text);
        
        if end == tokens.len() {
            break;
        }
        
        start += size - overlap;
    }
    
    Ok(chunks)
}

use qdrant_client::Payload;

fn generate_local_embeddings(chunks: &[String]) -> Result<Vec<Vec<f32>>> {
    let mut options = InitOptions::new(EmbeddingModel::AllMiniLML6V2);
    options.show_download_progress = true;

    let mut model = TextEmbedding::try_new(options)?;

    // embed takes generic iter of strings
    let embeddings = model.embed(chunks.to_vec(), None)?;
    
    Ok(embeddings)
}

async fn upsert_to_qdrant(
    resource_id: &str,
    chunks: &[String],
    embeddings: &[Vec<f32>]
) -> Result<usize> {
    let host = env::var("QDRANT_HOST").unwrap_or_else(|_| "http://localhost:6334".to_string());
    let api_key = env::var("QDRANT_API_KEY").ok();
    
    let mut config = qdrant_client::config::QdrantConfig::from_url(&host);
    if let Some(key) = api_key {
        config.api_key = Some(key);
    }
    
    let client = qdrant_client::Qdrant::new(config)?;
    let collection_name = "resources";

    // AllMiniLmL6V2 produces 384 dimensional vectors
    let vector_size = embeddings.first().map(|v| v.len() as u64).unwrap_or(384);

    // Ensure collection exists
    if !client.collection_exists(collection_name).await? {
        client.create_collection(
            CreateCollectionBuilder::new(collection_name)
                .vectors_config(VectorParamsBuilder::new(vector_size, Distance::Cosine))
                .build()
        ).await?;
    }

    let mut points = Vec::new();
    for (i, (chunk, embedding)) in chunks.iter().zip(embeddings.iter()).enumerate() {
        let payload_json = serde_json::json!({
            "resource_id": resource_id,
            "chunk_index": i,
            "content_preview": &chunk[..std::cmp::min(chunk.len(), 500)],
            "full_content": chunk,
        });

        // Convert serde Value to Payload
        let payload = if let serde_json::Value::Object(map) = payload_json {
            Payload::from(map)
        } else {
            Payload::default()
        };

        points.push(PointStruct::new(
            uuid::Uuid::new_v4().to_string(),
            embedding.clone(),
            payload
        ));
    }

    // Batch upsert
    for batch in points.chunks(50) {
        client.upsert_points(
            UpsertPointsBuilder::new(collection_name, batch.to_vec()).build()
        ).await?;
    }

    Ok(points.len())
}
