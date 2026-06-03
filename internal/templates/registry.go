package templates

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

const DefaultTemplateID = "default"

var ErrTemplateNotFound = errors.New("template not found")

type Info struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Builtin   bool      `json:"builtin"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}

type Registry struct {
	defaultDir string
	customDir  string
}

func NewRegistry(defaultDir, customDir string) (*Registry, error) {
	absDefault, err := filepath.Abs(defaultDir)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(customDir, 0755); err != nil {
		return nil, err
	}
	return &Registry{defaultDir: absDefault, customDir: customDir}, nil
}

func (r *Registry) Resolve(templateID string) (string, error) {
	if templateID == "" || templateID == DefaultTemplateID {
		return r.defaultDir, nil
	}
	dir := filepath.Join(r.customDir, templateID)
	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		return "", ErrTemplateNotFound
	}
	return dir, nil
}

func (r *Registry) List() ([]Info, error) {
	out := []Info{{
		ID:      DefaultTemplateID,
		Name:    "Default CER template",
		Builtin: true,
	}}

	entries, err := os.ReadDir(r.customDir)
	if err != nil {
		return out, err
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		metaPath := filepath.Join(r.customDir, e.Name(), "meta.json")
		info := Info{ID: e.Name(), Name: e.Name(), Builtin: false}
		if data, err := os.ReadFile(metaPath); err == nil {
			var meta struct {
				Name      string    `json:"name"`
				CreatedAt time.Time `json:"created_at"`
			}
			if json.Unmarshal(data, &meta) == nil {
				if meta.Name != "" {
					info.Name = meta.Name
				}
				info.CreatedAt = meta.CreatedAt
			}
		}
		out = append(out, info)
	}
	return out, nil
}

func (r *Registry) Get(templateID string) (Info, string, error) {
	dir, err := r.Resolve(templateID)
	if err != nil {
		return Info{}, "", err
	}
	info := Info{ID: templateID, Name: templateID, Builtin: templateID == DefaultTemplateID}
	if templateID != DefaultTemplateID {
		metaPath := filepath.Join(dir, "meta.json")
		if data, err := os.ReadFile(metaPath); err == nil {
			var meta struct {
				Name      string    `json:"name"`
				CreatedAt time.Time `json:"created_at"`
			}
			if json.Unmarshal(data, &meta) == nil {
				if meta.Name != "" {
					info.Name = meta.Name
				}
				info.CreatedAt = meta.CreatedAt
			}
		}
	}
	return info, dir, nil
}

func (r *Registry) Validate(templateID string) (core.TemplateValidationResult, error) {
	dir, err := r.Resolve(templateID)
	if err != nil {
		return core.TemplateValidationResult{}, err
	}
	return core.ValidateTemplateDirDetailed(dir), nil
}

type SaveOptions struct {
	Name string
}

func (r *Registry) SaveFromDir(srcDir, name string) (Info, error) {
	result := core.ValidateTemplateDirDetailed(srcDir)
	if !result.Valid {
		return Info{}, fmt.Errorf("template validation failed: %s", strings.Join(result.Errors, "; "))
	}

	id := uuid.NewString()
	dst := filepath.Join(r.customDir, id)
	if err := copyTree(srcDir, dst); err != nil {
		return Info{}, err
	}

	now := time.Now()
	meta := map[string]any{"name": name, "created_at": now}
	if name == "" {
		meta["name"] = id
		name = id
	}
	metaBytes, _ := json.Marshal(meta)
	_ = os.WriteFile(filepath.Join(dst, "meta.json"), metaBytes, 0644)

	return Info{ID: id, Name: name, Builtin: false, CreatedAt: now}, nil
}

func (r *Registry) Delete(templateID string) error {
	if templateID == DefaultTemplateID {
		return errors.New("cannot delete built-in default template")
	}
	dir := filepath.Join(r.customDir, templateID)
	if _, err := os.Stat(dir); err != nil {
		return ErrTemplateNotFound
	}
	return os.RemoveAll(dir)
}

func (r *Registry) DefaultDir() string {
	return r.defaultDir
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if rel == "meta.json" {
			return nil
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}
