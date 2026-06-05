package jobs

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// CERJobSummary is a lightweight view for listing completed CER outputs.
type CERJobSummary struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Version     float32    `json:"version,omitempty"`
	Theme       string     `json:"theme,omitempty"`
	Status      Status     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
	PDFReady    bool       `json:"pdf_ready"`
	HasZip      bool       `json:"has_zip"`
	HasLatex    bool       `json:"has_latex"`
}

type persistedJobMeta struct {
	ID          string     `json:"id"`
	UserKey     string     `json:"user_key"`
	Kind        Kind       `json:"kind"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Version     float32    `json:"version,omitempty"`
	Theme       string     `json:"theme,omitempty"`
	Status      Status     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
	PDFReady    bool       `json:"pdf_ready"`
	HasZip      bool       `json:"has_zip"`
	HasLatex    bool       `json:"has_latex"`
}

// WritePersistedMeta saves job metadata beside outputs for listing after restart.
func WritePersistedMeta(jobDir string, job *Job) error {
	if job == nil || job.CERGenerate == nil {
		return nil
	}
	sum := summaryFromJob(job)
	meta := persistedJobMeta{
		ID:          sum.ID,
		UserKey:     job.UserKey,
		Kind:        job.Kind,
		Title:       sum.Title,
		Description: sum.Description,
		Version:     sum.Version,
		Theme:       sum.Theme,
		Status:      sum.Status,
		CreatedAt:   sum.CreatedAt,
		FinishedAt:  sum.FinishedAt,
		PDFReady:    sum.PDFReady,
		HasZip:      sum.HasZip,
		HasLatex:    sum.HasLatex,
	}
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(jobDir, "meta.json"), data, 0644)
}

func summaryFromJob(job *Job) CERJobSummary {
	sum := CERJobSummary{
		ID:        job.ID,
		Status:    job.Status,
		CreatedAt: job.CreatedAt,
		FinishedAt: job.FinishedAt,
	}
	if job.CERGenerate != nil {
		sum.Title = job.CERGenerate.Title
		sum.Description = job.CERGenerate.Description
		sum.Version = job.CERGenerate.Version
		sum.Theme = job.CERGenerate.Theme
	}
	if sum.Title == "" {
		sum.Title = "CER — " + job.ID[:8]
	}
	if job.Result != nil {
		sum.PDFReady = job.Result.PDFReady
		sum.HasZip = job.Result.ZipPath != "" && fileExists(job.Result.ZipPath)
		sum.HasLatex = job.Result.CombinedLatexPath != "" && fileExists(job.Result.CombinedLatexPath)
	}
	return sum
}

// ListCERJobsForUser returns completed CER jobs from the store and on-disk outputs.
func ListCERJobsForUser(store *Store, workDir, userKey string) ([]CERJobSummary, error) {
	userKey = strings.TrimSpace(userKey)
	if userKey == "" {
		return nil, nil
	}

	byID := make(map[string]CERJobSummary)

	if store != nil {
		jobs, err := store.ListByUserKind(userKey, KindCERGenerate)
		if err != nil {
			return nil, err
		}
		for _, job := range jobs {
			if job.Status != StatusCompleted {
				continue
			}
			byID[job.ID] = summaryFromJob(job)
		}
	}

	jobsDir := filepath.Join(workDir, "users", userKey, "jobs")
	entries, err := os.ReadDir(jobsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return sortSummaries(byID), nil
		}
		return nil, err
	}

	for _, ent := range entries {
		if !ent.IsDir() {
			continue
		}
		id := ent.Name()
		jobDir := filepath.Join(jobsDir, id)

		if existing, ok := byID[id]; ok {
			// Refresh file flags from disk.
			flags := scanOutputFlags(jobDir)
			existing.PDFReady = existing.PDFReady || flags.pdfReady
			existing.HasZip = existing.HasZip || flags.hasZip
			existing.HasLatex = existing.HasLatex || flags.hasLatex
			byID[id] = existing
			continue
		}

		if sum, ok := loadPersistedMeta(filepath.Join(jobDir, "meta.json")); ok {
			byID[id] = sum
			continue
		}

		if sum, ok := summarizeJobDir(jobDir, id); ok {
			byID[id] = sum
		}
	}

	return sortSummaries(byID), nil
}

func sortSummaries(byID map[string]CERJobSummary) []CERJobSummary {
	out := make([]CERJobSummary, 0, len(byID))
	for _, s := range byID {
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool {
		ti := out[i].CreatedAt
		tj := out[j].CreatedAt
		if out[i].FinishedAt != nil {
			ti = *out[i].FinishedAt
		}
		if out[j].FinishedAt != nil {
			tj = *out[j].FinishedAt
		}
		return ti.After(tj)
	})
	return out
}

func loadPersistedMeta(path string) (CERJobSummary, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return CERJobSummary{}, false
	}
	var meta persistedJobMeta
	if err := json.Unmarshal(data, &meta); err != nil || meta.Kind != KindCERGenerate {
		return CERJobSummary{}, false
	}
	return CERJobSummary{
		ID:          meta.ID,
		Title:       meta.Title,
		Description: meta.Description,
		Version:     meta.Version,
		Theme:       meta.Theme,
		Status:      meta.Status,
		CreatedAt:   meta.CreatedAt,
		FinishedAt:  meta.FinishedAt,
		PDFReady:    meta.PDFReady,
		HasZip:      meta.HasZip,
		HasLatex:    meta.HasLatex,
	}, true
}

func summarizeJobDir(jobDir, id string) (CERJobSummary, bool) {
	flags := scanOutputFlags(jobDir)
	if !flags.hasZip && !flags.hasLatex && !flags.pdfReady {
		return CERJobSummary{}, false
	}
	info, err := os.Stat(jobDir)
	created := time.Now()
	if err == nil {
		created = info.ModTime()
	}
	title := "CER généré"
	if flags.outputName != "" {
		title = flags.outputName
	}
	return CERJobSummary{
		ID:        id,
		Title:     title,
		Status:    StatusCompleted,
		CreatedAt: created,
		PDFReady:  flags.pdfReady,
		HasZip:    flags.hasZip,
		HasLatex:  flags.hasLatex,
	}, true
}

type outputFlags struct {
	hasZip     bool
	hasLatex   bool
	pdfReady   bool
	outputName string
}

func scanOutputFlags(jobDir string) outputFlags {
	var f outputFlags
	if fileExists(filepath.Join(jobDir, "cer_output.zip")) {
		f.hasZip = true
	}
	_ = filepath.WalkDir(jobDir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		base := filepath.Base(path)
		switch base {
		case "cer_combined.tex":
			f.hasLatex = true
		case "cer_combined.pdf":
			f.pdfReady = true
		}
		if d.IsDir() && f.outputName == "" && strings.HasPrefix(d.Name(), "CER_") {
			f.outputName = d.Name()
		}
		return nil
	})
	return f
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}
