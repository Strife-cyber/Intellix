package jobs

import (
	"micro-cer/internal/core"
	"time"
)

type Kind string

const (
	KindPrositExtract Kind = "prosit_extract"
	KindCERGenerate   Kind = "cer_generate"
)

type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
)

type Job struct {
	ID        string    `json:"id"`
	UserKey   string    `json:"user_key,omitempty"`
	Kind      Kind      `json:"kind"`
	Status    Status    `json:"status"`
	Progress  string    `json:"progress,omitempty"`
	Error     string    `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	StartedAt *time.Time `json:"started_at,omitempty"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`

	// Kind-specific payloads and results (only one set is meaningful per job).
	PrositExtract *PrositExtractPayload `json:"prosit_extract,omitempty"`
	CERGenerate   *CERGeneratePayload   `json:"cer_generate,omitempty"`

	Result *JobResult `json:"result,omitempty"`
}

type PrositExtractPayload struct {
	FilePath string `json:"file_path"`
}

type CERGeneratePayload struct {
	Prosit       core.Prosit   `json:"prosit"`
	Title        string        `json:"title"`
	Description  string        `json:"description"`
	Version      float32       `json:"version"`
	Theme        string        `json:"theme"`
	TemplateID   string        `json:"template_id"`
	Objectifs    []string      `json:"objectifs,omitempty"`
	Difficulties []string      `json:"difficulties,omitempty"`
	Perspectives []string      `json:"perspectives,omitempty"`
	Provider     *ProviderConfig `json:"provider,omitempty"`

	// DocumentInfo customizations — optional, defaults from core.DefaultDocumentInfo.
	Author         string `json:"author,omitempty"`
	Pilot          string `json:"pilot,omitempty"`
	Promotion      string `json:"promotion,omitempty"`
	BrandLabel     string `json:"brand_label,omitempty"`
	CopyrightOwner string `json:"copyright_owner,omitempty"`
	DocStatus      string `json:"doc_status,omitempty"`
	DocTitle       string `json:"doc_title,omitempty"`
	LogoBase64     string `json:"logo_base64,omitempty"`
}

type ProviderConfig struct {
	Type        string  `json:"type"`
	Endpoint    string  `json:"endpoint"`
	APIKey      string  `json:"apiKey"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
}

type JobResult struct {
	Prosit            *core.Prosit `json:"prosit,omitempty"`
	OutputDir         string       `json:"output_dir,omitempty"`
	ZipPath           string       `json:"zip_path,omitempty"`
	CombinedLatexPath string       `json:"combined_latex_path,omitempty"`
	PDFPath           string       `json:"pdf_path,omitempty"`
	PDFReady          bool         `json:"pdf_ready,omitempty"`
	CompileLog        string       `json:"compile_log,omitempty"`
}
