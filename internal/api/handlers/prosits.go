package handlers

import (
	"encoding/json"
	"net/http"

	"micro-cer/internal/api/cerctx"
	"micro-cer/internal/storage"

	"github.com/go-chi/chi/v5"
)

func userKeyFromRequest(r *http.Request) string {
	return cerctx.UserKeyFromContext(r.Context())
}

func ListPrositsHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := userKeyFromRequest(r)
	list, err := deps.Prosits.List(userKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"prosits": list})
}

func UploadPrositHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := userKeyFromRequest(r)
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

	displayName := r.FormValue("filename")
	stored, err := deps.Prosits.SaveUpload(userKey, header.Filename, displayName, file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	writeJSON(w, http.StatusCreated, stored)
}

func GetPrositHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := userKeyFromRequest(r)
	id := chi.URLParam(r, "prositID")
	stored, err := deps.Prosits.Get(userKey, id)
	if err != nil {
		if err == storage.ErrPrositNotFound {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, stored)
}

func PatchPrositHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := userKeyFromRequest(r)
	id := chi.URLParam(r, "prositID")
	var body struct {
		Filename string `json:"filename"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Filename == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}
	stored, err := deps.Prosits.UpdateFilename(userKey, id, body.Filename)
	if err != nil {
		if err == storage.ErrPrositNotFound {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	writeJSON(w, http.StatusOK, stored)
}

func DeletePrositHandler(w http.ResponseWriter, r *http.Request) {
	deps, ok := requireDeps()
	if !ok {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		return
	}
	userKey := userKeyFromRequest(r)
	id := chi.URLParam(r, "prositID")
	if err := deps.Prosits.Delete(userKey, id); err != nil {
		if err == storage.ErrPrositNotFound {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
