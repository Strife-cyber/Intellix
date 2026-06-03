package jobs

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestSummarizeJobDir(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "cer_output.zip"), []byte("zip"), 0644)
	outDir := filepath.Join(dir, "CER_v1_20260101_120000")
	_ = os.MkdirAll(outDir, 0755)
	_ = os.WriteFile(filepath.Join(outDir, "cer_combined.tex"), []byte(`\documentclass{article}`), 0644)

	sum, ok := summarizeJobDir(dir, "job-abc")
	if !ok {
		t.Fatal("expected summarize to succeed")
	}
	if sum.ID != "job-abc" {
		t.Fatalf("id=%s", sum.ID)
	}
	if !sum.HasZip || !sum.HasLatex {
		t.Fatalf("flags zip=%v latex=%v", sum.HasZip, sum.HasLatex)
	}
	if sum.Title != "CER_v1_20260101_120000" {
		t.Fatalf("title=%s", sum.Title)
	}
}

func TestListCERJobsForUserFromDisk(t *testing.T) {
	workDir := t.TempDir()
	userKey := "7"
	jobDir := filepath.Join(workDir, "users", userKey, "jobs", "uuid-1")
	_ = os.MkdirAll(jobDir, 0755)
	meta := persistedJobMeta{
		ID:        "uuid-1",
		UserKey:   userKey,
		Kind:      KindCERGenerate,
		Title:     "Mon CER",
		Status:    StatusCompleted,
		CreatedAt: time.Now().UTC(),
		PDFReady:  true,
		HasZip:    true,
		HasLatex:  true,
	}
	data, err := json.Marshal(meta)
	if err != nil {
		t.Fatal(err)
	}
	_ = os.WriteFile(filepath.Join(jobDir, "meta.json"), data, 0644)

	list, err := ListCERJobsForUser(nil, workDir, userKey)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].Title != "Mon CER" {
		t.Fatalf("list=%+v", list)
	}
}
