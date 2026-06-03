package handlers

import (
	"archive/zip"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"micro-cer/internal/core"
	"micro-cer/internal/templates"

	"github.com/go-chi/chi/v5"
)

func WritePlaceholderSchema(w http.ResponseWriter) {
	writeJSON(w, http.StatusOK, core.TemplatePlaceholderDocs())
}

func ListTemplatesHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	list, err := deps.Templates.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"templates": list,
		"placeholders": core.TemplatePlaceholderDocs(),
	})
}

func GetTemplateHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	id := chi.URLParam(r, "templateID")
	info, _, err := deps.Templates.Get(id)
	if err != nil {
		if err == templates.ErrTemplateNotFound {
			http.Error(w, "template not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"template":     info,
		"placeholders": core.TemplatePlaceholderDocs(),
	})
}

func ValidateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	id := chi.URLParam(r, "templateID")
	result, err := deps.Templates.Validate(id)
	if err != nil {
		if err == templates.ErrTemplateNotFound {
			http.Error(w, "template not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	status := http.StatusOK
	if !result.Valid {
		status = http.StatusUnprocessableEntity
	}
	writeJSON(w, status, result)
}

func UploadTemplateHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		http.Error(w, "invalid multipart form", http.StatusBadRequest)
		return
	}

	name := r.FormValue("name")
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "zip file field is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	tmpDir, err := os.MkdirTemp("", "template-upload-*")
	if err != nil {
		http.Error(w, "failed to create temp dir", http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(tmpDir)

	zipPath := filepath.Join(tmpDir, header.Filename)
	dst, err := os.Create(zipPath)
	if err != nil {
		http.Error(w, "failed to save upload", http.StatusInternalServerError)
		return
	}
	if _, err = io.Copy(dst, file); err != nil {
		_ = dst.Close()
		http.Error(w, "failed to write upload", http.StatusInternalServerError)
		return
	}
	_ = dst.Close()

	extractDir := filepath.Join(tmpDir, "bundle")
	if err := unzipToDir(zipPath, extractDir); err != nil {
		http.Error(w, "invalid zip archive: "+err.Error(), http.StatusBadRequest)
		return
	}

	// If zip contains a single top-level folder, use it as template root.
	bundleRoot := extractDir
	entries, _ := os.ReadDir(extractDir)
	if len(entries) == 1 && entries[0].IsDir() {
		bundleRoot = filepath.Join(extractDir, entries[0].Name())
	}

	info, err := deps.Templates.SaveFromDir(bundleRoot, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	writeJSON(w, http.StatusCreated, info)
}

func DeleteTemplateHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	id := chi.URLParam(r, "templateID")
	if err := deps.Templates.Delete(id); err != nil {
		if err == templates.ErrTemplateNotFound {
			http.Error(w, "template not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func unzipToDir(zipPath, dest string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	for _, f := range r.File {
		if strings.Contains(f.Name, "..") {
			continue
		}
		target := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(target)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		_ = out.Close()
		_ = rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}
