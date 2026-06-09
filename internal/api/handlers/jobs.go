package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"micro-cer/internal/api/cerctx"
	"micro-cer/internal/jobs"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
)

// StartPrositExtractJob accepts a multipart file and enqueues async prosit extraction.
func StartPrositExtractJob(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}

	userKey := cerctx.UserKeyFromContext(r.Context())
	if userKey == "" {
		http.Error(w, "missing user key", http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "invalid multipart form", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file field is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	workDir := filepath.Join(deps.Queue.Store().WorkDir(), "users", userKey, "uploads")
	_ = os.MkdirAll(workDir, 0755)
	dstPath := filepath.Join(workDir, header.Filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "unable to save file", http.StatusInternalServerError)
		return
	}
	if _, err = io.Copy(dst, file); err != nil {
		_ = dst.Close()
		http.Error(w, "failed to write file", http.StatusInternalServerError)
		return
	}
	_ = dst.Close()

	job, err := deps.Queue.Store().Create(userKey, jobs.KindPrositExtract, &jobs.PrositExtractPayload{FilePath: dstPath})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	deps.Queue.Enqueue(job.ID)
	writeJSON(w, http.StatusAccepted, job)
}

type cerGenerateRequest struct {
	Prosit       json.RawMessage       `json:"prosit"`
	Title        string                `json:"title"`
	Description  string                `json:"description"`
	Version      float32               `json:"version"`
	Theme        string                `json:"theme"`
	TemplateID   string                `json:"template_id"`
	Objectifs    []string              `json:"objectifs"`
	Difficulties []string              `json:"difficulties"`
	Perspectives []string              `json:"perspectives"`
	Provider     *jobs.ProviderConfig  `json:"provider"`

	// DocumentInfo customizations — optional
	Author         string `json:"author,omitempty"`
	Pilot          string `json:"pilot,omitempty"`
	Promotion      string `json:"promotion,omitempty"`
	BrandLabel     string `json:"brand_label,omitempty"`
	CopyrightOwner string `json:"copyright_owner,omitempty"`
	DocStatus      string `json:"doc_status,omitempty"`
	DocTitle       string `json:"doc_title,omitempty"`
	LogoBase64     string `json:"logo_base64,omitempty"`
}

// StartCERGenerateJob enqueues async CER generation from a JSON prosit payload.
func StartCERGenerateJob(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}

	userKey := cerctx.UserKeyFromContext(r.Context())
	if userKey == "" {
		http.Error(w, "missing user key", http.StatusUnauthorized)
		return
	}

	var req cerGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	var prosit jobs.CERGeneratePayload
	if err := json.Unmarshal(req.Prosit, &prosit.Prosit); err != nil {
		http.Error(w, "invalid prosit field", http.StatusBadRequest)
		return
	}
	prosit.Title = req.Title
	prosit.Description = req.Description
	prosit.Version = req.Version
	prosit.Theme = req.Theme
	prosit.TemplateID = req.TemplateID
	prosit.Objectifs = req.Objectifs
	prosit.Difficulties = req.Difficulties
	prosit.Perspectives = req.Perspectives
	prosit.Provider = req.Provider
	prosit.Author = req.Author
	prosit.Pilot = req.Pilot
	prosit.Promotion = req.Promotion
	prosit.BrandLabel = req.BrandLabel
	prosit.CopyrightOwner = req.CopyrightOwner
	prosit.DocStatus = req.DocStatus
	prosit.DocTitle = req.DocTitle
	prosit.LogoBase64 = req.LogoBase64

	if prosit.TemplateID != "" && prosit.TemplateID != "default" {
		if result, err := deps.Templates.Validate(prosit.TemplateID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		} else if !result.Valid {
			http.Error(w, "template validation failed", http.StatusUnprocessableEntity)
			return
		}
	}

	job, err := deps.Queue.Store().Create(userKey, jobs.KindCERGenerate, &prosit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	deps.Queue.Enqueue(job.ID)
	writeJSON(w, http.StatusAccepted, job)
}

func ListJobsHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := cerctx.UserKeyFromContext(r.Context())
	workDir := deps.Queue.Store().WorkDir()
	list, err := jobs.ListCERJobsForUser(deps.Queue.Store(), workDir, userKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []jobs.CERJobSummary{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"jobs": list})
}

func GetJobHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := cerctx.UserKeyFromContext(r.Context())
	id := chi.URLParam(r, "jobID")
	job, err := deps.Queue.Store().GetForUser(id, userKey)
	if err != nil {
		if err == jobs.ErrJobNotFound {
			http.Error(w, "job not found", http.StatusNotFound)
			return
		}
		if err == jobs.ErrJobForbidden {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func DownloadJobOutputHandler(w http.ResponseWriter, r *http.Request) {
	serveJobFile(w, r, func(job *jobs.Job) (string, bool) {
		if job.Result == nil || job.Result.ZipPath == "" {
			return "", false
		}
		return job.Result.ZipPath, true
	}, `attachment; filename="cer_%s.zip"`)
}

func DownloadJobPDFHandler(w http.ResponseWriter, r *http.Request) {
	serveJobFile(w, r, func(job *jobs.Job) (string, bool) {
		if job.Result == nil || !job.Result.PDFReady || job.Result.PDFPath == "" {
			return "", false
		}
		return job.Result.PDFPath, true
	}, `attachment; filename="cer_%s.pdf"`)
}

func DownloadJobLatexHandler(w http.ResponseWriter, r *http.Request) {
	serveJobFile(w, r, func(job *jobs.Job) (string, bool) {
		if job.Result == nil || job.Result.CombinedLatexPath == "" {
			return "", false
		}
		return job.Result.CombinedLatexPath, true
	}, `attachment; filename="cer_%s_combined.tex"`)
}

func serveJobFile(w http.ResponseWriter, r *http.Request, pick func(*jobs.Job) (string, bool), dispositionFmt string) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := cerctx.UserKeyFromContext(r.Context())
	id := chi.URLParam(r, "jobID")
	job, err := deps.Queue.Store().GetForUser(id, userKey)
	if err != nil {
		if err == jobs.ErrJobNotFound {
			http.Error(w, "job not found", http.StatusNotFound)
			return
		}
		if err == jobs.ErrJobForbidden {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if job.Status != jobs.StatusCompleted {
		http.Error(w, "job output not ready", http.StatusConflict)
		return
	}
	path, ok := pick(job)
	if !ok {
		http.Error(w, "no downloadable output for this job", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(dispositionFmt, id))
	http.ServeFile(w, r, path)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	WriteJSON(w, status, v)
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
