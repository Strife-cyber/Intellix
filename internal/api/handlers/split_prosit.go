package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"micro-cer/internal/core"
	"mime/multipart"
	"net/http"
	"os"
)

func SplitPrositHandler(writer http.ResponseWriter, request *http.Request) {
	err := request.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(writer, fmt.Sprintf("Invalid multipart form: %d", err), http.StatusBadRequest)
		return
	}

	file, header, err := request.FormFile("file")
	if err != nil {
		http.Error(writer, "File not found in request", http.StatusBadRequest)
		return
	}
	defer func(file multipart.File) {
		err := file.Close()
		if err != nil {
			return
		}
	}(file)

	dstPath := "./uploads/" + header.Filename

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(writer, "Unable to save file", http.StatusInternalServerError)
		return
	}

	_, err = io.Copy(dst, file)
	if err != nil {
		err := dst.Close()
		if err != nil {
			return
		}
		http.Error(writer, "Failed to write file", http.StatusInternalServerError)
		return
	}

	// close BEFORE using in external systems (flush safety)
	err = dst.Close()
	if err != nil {
		http.Error(writer, "Failed to finalize file", http.StatusInternalServerError)
		return
	}

	// run extraction using path (correct)
	extractor := core.NewExtractor()
	prosit, err := extractor.Extract(dstPath)
	if err != nil {
		http.Error(writer, "Extraction failed", http.StatusInternalServerError)

		// cleanup even on failure
		_ = os.Remove(dstPath)
		return
	}

	// cleanup after success
	_ = os.Remove(dstPath)

	writer.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(writer).Encode(prosit)
	if err != nil {
		return
	}
}
