package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"micro-cer/internal/core"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

var ErrPrositNotFound = errors.New("prosit not found")

type StoredProsit struct {
	ID         string      `json:"id"`
	Filename   string      `json:"filename"`
	UploadedAt time.Time   `json:"uploaded_at"`
	Prosit     core.Prosit `json:"prosit"`
}

type PrositStore struct {
	baseDir string
}

func NewPrositStore(baseDir string) (*PrositStore, error) {
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, err
	}
	return &PrositStore{baseDir: baseDir}, nil
}

func (s *PrositStore) userDir(userKey string) (string, error) {
	userKey = strings.TrimSpace(userKey)
	if userKey == "" {
		return "", errors.New("user key is required")
	}
	dir := filepath.Join(s.baseDir, "users", userKey, "prosits")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

func ensureFilenameExt(name, original string) string {
	original = filepath.Base(strings.TrimSpace(original))
	name = filepath.Base(strings.TrimSpace(name))
	if name == "" {
		return original
	}
	ext := strings.ToLower(filepath.Ext(original))
	if ext != "" && filepath.Ext(name) == "" {
		return name + ext
	}
	if filepath.Ext(name) == "" && ext == "" {
		return name
	}
	return name
}

func (s *PrositStore) SaveUpload(userKey, filename, displayName string, src io.Reader) (*StoredProsit, error) {
	dir, err := s.userDir(userKey)
	if err != nil {
		return nil, err
	}

	id := uuid.NewString()
	itemDir := filepath.Join(dir, id)
	if err := os.MkdirAll(itemDir, 0755); err != nil {
		return nil, err
	}

	safeName := ensureFilenameExt(displayName, filename)
	if safeName == "" || safeName == "." {
		safeName = filepath.Base(filename)
	}
	dstPath := filepath.Join(itemDir, safeName)
	dst, err := os.Create(dstPath)
	if err != nil {
		return nil, err
	}
	if _, err = io.Copy(dst, src); err != nil {
		_ = dst.Close()
		return nil, err
	}
	_ = dst.Close()

	extractor := core.NewExtractor()
	prosit, err := extractor.Extract(dstPath)
	if err != nil {
		_ = os.RemoveAll(itemDir)
		return nil, fmt.Errorf("extraction failed: %w", err)
	}

	stored := &StoredProsit{
		ID:         id,
		Filename:   safeName,
		UploadedAt: time.Now(),
		Prosit:     *prosit,
	}
	metaPath := filepath.Join(itemDir, "meta.json")
	data, _ := json.MarshalIndent(stored, "", "  ")
	if err := os.WriteFile(metaPath, data, 0644); err != nil {
		return nil, err
	}
	return stored, nil
}

func (s *PrositStore) List(userKey string) ([]StoredProsit, error) {
	dir, err := s.userDir(userKey)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var out []StoredProsit
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		item, err := s.Get(userKey, e.Name())
		if err != nil {
			continue
		}
		out = append(out, *item)
	}
	return out, nil
}

func (s *PrositStore) Get(userKey, id string) (*StoredProsit, error) {
	dir, err := s.userDir(userKey)
	if err != nil {
		return nil, err
	}
	metaPath := filepath.Join(dir, id, "meta.json")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, ErrPrositNotFound
	}
	var stored StoredProsit
	if err := json.Unmarshal(data, &stored); err != nil {
		return nil, err
	}
	return &stored, nil
}

func (s *PrositStore) Delete(userKey, id string) error {
	dir, err := s.userDir(userKey)
	if err != nil {
		return err
	}
	itemDir := filepath.Join(dir, id)
	if _, err := os.Stat(itemDir); err != nil {
		return ErrPrositNotFound
	}
	return os.RemoveAll(itemDir)
}

func (s *PrositStore) dataFilePath(itemDir string) (string, error) {
	entries, err := os.ReadDir(itemDir)
	if err != nil {
		return "", err
	}
	for _, e := range entries {
		if e.IsDir() || e.Name() == "meta.json" {
			continue
		}
		return filepath.Join(itemDir, e.Name()), nil
	}
	return "", fmt.Errorf("no data file in prosit folder")
}

func (s *PrositStore) UpdateFilename(userKey, id, newName string) (*StoredProsit, error) {
	stored, err := s.Get(userKey, id)
	if err != nil {
		return nil, err
	}
	dir, err := s.userDir(userKey)
	if err != nil {
		return nil, err
	}
	itemDir := filepath.Join(dir, id)
	oldPath, err := s.dataFilePath(itemDir)
	if err != nil {
		return nil, err
	}
	safeName := ensureFilenameExt(newName, stored.Filename)
	if safeName == "" || safeName == "." {
		return nil, fmt.Errorf("invalid filename")
	}
	newPath := filepath.Join(itemDir, safeName)
	if oldPath != newPath {
		if err := os.Rename(oldPath, newPath); err != nil {
			return nil, err
		}
	}
	stored.Filename = safeName
	data, _ := json.MarshalIndent(stored, "", "  ")
	if err := os.WriteFile(filepath.Join(itemDir, "meta.json"), data, 0644); err != nil {
		return nil, err
	}
	return stored, nil
}
