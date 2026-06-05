# micro-cer

> A microservice for generating structured CER (*Compte Rendu d'Étude et de Recherche*) reports from engineering prosit documents.

## Overview

**micro-cer** is a Go-based asynchronous job processor that takes uploaded prosit documents (PDF, DOCX, ODT), extracts their structured content using text-based rules, feeds the extracted data to an AI provider for CER generation, renders the result as LaTeX, and compiles it into a downloadable PDF. It is designed as a backend companion to **Intellix**, a Laravel-based platform for engineering students.

### What it does

1. **Document ingestion** — Accept prosit uploads via REST API (multipart form), store them, and list/retrieve/update/delete them per user.
2. **Content extraction** — Parse PDF, DOCX, and ODT files to extract sections: keywords, context, needs, constraints, problems, generalisation, solution paths, and action plans.
3. **AI‑powered CER generation** — Send extracted content to a configurable AI provider (OpenAI, Gemini, Ollama, LM Studio, OpenRouter) to generate a complete CER document including analysis, plan, realisation, validation, conclusion, bilan, and references.
4. **LaTeX rendering** — Render the generated CER into LaTeX using a customizable template system, then compile it to PDF via `pdflatex`.
5. **Async job queue** — All processing runs in the background with per‑job progress tracking, status polling, and downloadable output (ZIP, LaTeX, PDF).

## Architecture

```
HTTP Request →  chi.Router  →  Auth Middleware (HMAC)
                      │
                      ├── /api/prosits/*  →  Prosit CRUD (storage)
                      │
                      ├── /api/upload     →  Split & parse prosit
                      │
                      ├── /api/jobs/*     →  Job submission & status
                      │      ├── POST /prosit   →  Extract job
                      │      └── POST /cer      →  Generate CER job
                      │
                      ├── /api/templates/*  →  LaTeX template management
                      │
                      └── Job Queue ─→ Worker Pool (2 workers)
                                          ├── Prosit Extractor
                                          ├── AI Provider (any backend)
                                          ├── CER Generator
                                          ├── LaTeX Renderer
                                          └── PDF Compiler (pdflatex)
```

### Internal packages

| Package | Responsibility |
|---|---|
| `cmd/api` | Application entrypoint, HTTP server on `:8080` |
| `internal/api/routes` | Chi router, CORS, static file serving |
| `internal/api/handlers` | HTTP handler functions for all endpoints |
| `internal/api/middleware` | HMAC-based request authentication |
| `internal/api/cerctx` | Context helpers for user key propagation |
| `internal/core` | Domain models (`Prosit`, `Cer`), extractor logic |
| `internal/core/reader` | File format readers (PDF, DOCX, ODT) |
| `internal/ai` | AI provider abstraction & implementations |
| `internal/generator` | CER generation orchestration (sections, references, etc.) |
| `internal/latex` | LaTeX combining, sanitization, and PDF compilation |
| `internal/config` | Environment variable loading |
| `internal/jobs` | Async job queue, store, and processor |
| `internal/storage` | Prosit file and metadata storage |
| `internal/templates` | LaTeX template registry (built-in + custom) |

## API Endpoints

All `/api/*` routes require HMAC authentication headers (`X-CER-USER-KEY`, `X-CER-TIMESTAMP`, `X-CER-SIGNATURE`).

### Prosits

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/prosits` | List all prosits for the authenticated user |
| `POST` | `/api/prosits` | Upload a prosit document (multipart) |
| `GET` | `/api/prosits/{prositID}` | Get prosit metadata |
| `PATCH` | `/api/prosits/{prositID}` | Update prosit filename |
| `DELETE` | `/api/prosits/{prositID}` | Delete a prosit |

### Jobs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | List all jobs for the user |
| `POST` | `/api/jobs/prosit` | Start a new content-extraction job |
| `POST` | `/api/jobs/cer` | Start a new CER generation job |
| `GET` | `/api/jobs/{jobID}` | Get job status and progress |
| `GET` | `/api/jobs/{jobID}/download` | Download job output (ZIP) |
| `GET` | `/api/jobs/{jobID}/pdf` | Download compiled PDF |
| `GET` | `/api/jobs/{jobID}/latex` | Download combined LaTeX source |

### Templates

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List available LaTeX templates |
| `POST` | `/api/templates` | Upload a custom template |
| `GET` | `/api/templates/{templateID}` | Get template details |
| `POST` | `/api/templates/{templateID}/validate` | Validate template structure |
| `DELETE` | `/api/templates/{templateID}` | Delete a custom template |
| `GET` | `/api/themes` | List available colour themes |
| `GET` | `/api/templates/schema` | Get template placeholder schema |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CER_SHARED_SECRET` | **Yes** | — | HMAC shared secret (must match the frontend proxy's secret) |
| `AI_PROVIDER` | No | — | Fallback AI provider name (`openai`, `gemini`, `ollama`, `lmstudio`, `openrouter`) |
| `OPENAI_API_KEY` | No | — | API key for OpenAI provider |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model name |
| `GEMINI_API_KEY` | No | — | API key for Google Gemini |
| `GEMINI_MODEL` | No | — | Gemini model name |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `llama3.1` | Ollama model name |
| `LM_STUDIO_BASE_URL` | No | — | LM Studio server URL |
| `OPENROUTER_API_KEY` | No | — | OpenRouter API key |
| `OPENROUTER_MODEL` | No | — | OpenRouter model name |

## AI Providers

The service supports multiple AI backends, selected per job via the job payload:

- **OpenAI** — Uses the official Go OpenAI SDK. Set `OPENAI_API_KEY`.
- **Gemini** — Uses the Google Generative AI SDK. Set `GEMINI_API_KEY`.
- **Ollama** — Local LLM inference. Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.
- **LM Studio** — Local OpenAI-compatible server. Set `LM_STUDIO_BASE_URL`.
- **OpenRouter** — Unified API for many models. Set `OPENROUTER_API_KEY`.

Each provider implements the `Provider` interface (`Generate`, `SwitchModel`, `ListModels`, `Name`) and can be swapped at runtime.

## Authentication

Every `/api/*` request is authenticated via **HMAC‑SHA256**:

1. The client sends `X-CER-USER-KEY`, `X-CER-TIMESTAMP`, and `X-CER-SIGNATURE` headers.
2. The signature is computed over: `userKey|timestamp|HTTP_METHOD|path|body_hash` using the shared secret.
3. The timestamp must be within 5 minutes of the server clock.
4. Multipart uploads are signed with an empty body hash (the boundary is unpredictable).

## LaTeX Templates

Built-in templates live in `internal/template/`. Custom templates can be uploaded via the API and are stored in `data/templates/`. Each template directory must contain at minimum a `main.tex` file. Template validation checks that all required placeholders are present.

Available colour themes (defined in `internal/core/themes.go`) can be listed at `/api/themes`.

## Development

### Prerequisites

- Go 1.26+
- LaTeX distribution with `pdflatex` (TeX Live, MiKTeX)
- (Optional) A local AI provider for testing

### Getting started

```bash
# Clone the repository
git clone <repo-url>
cd micro-cer

# Copy and configure environment
cp .env.example .env
# Edit .env with your CER_SHARED_SECRET and AI provider settings

# Run the service
go run ./cmd/api
```

The API server starts on `http://localhost:8080`.

### Testing

```bash
go test ./...
```

## Deployment

### Docker

A [Dockerfile](./Dockerfile) is provided for containerized deployment. The image:

1. Uses a multi‑stage build: Go compilation in the `builder` stage, then a slim runtime image.
2. Installs TeX Live (`pdflatex` with basic packages) in the runtime stage.
3. Exposes port `8080`.
4. Expects `CER_SHARED_SECRET` and other environment variables at runtime.

```bash
docker build -t micro-cer .
docker run -d \
  --name micro-cer \
  -p 8080:8080 \
  -e CER_SHARED_SECRET=your-secret \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_KEY=sk-... \
  -v cer-data:/app/data \
  micro-cer
```

### Persistent data

The service stores data at `./data/`:
- `data/users/` — Per-user job outputs and uploaded prosits
- `data/templates/` — Uploaded custom LaTeX templates

Mount a volume at `/app/data` to preserve data across container restarts.

## Docker Compose Integration

See [service.txt](./service.txt) for the configuration snippet to add this service to the main project's `docker-compose.yml`.

## Security

- All API endpoints (except the root health‑check) require HMAC authentication.
- The shared secret is never logged or exposed in error messages.
- Temporary uploaded files are removed after extraction.
- AI provider API keys are read from environment variables only.
- Request body replay is prevented via the 5‑minute timestamp window.

## License

Proprietary — internal use.
