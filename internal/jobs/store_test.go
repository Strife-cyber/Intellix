package jobs

import (
	"testing"
)

func TestStoreCreateCERJob(t *testing.T) {
	s := NewStore()
	job, err := s.Create("user-1", KindCERGenerate, &CERGeneratePayload{
		Title:       "Test",
		Description: "Desc",
		Version:     1,
	})
	if err != nil {
		t.Fatal(err)
	}
	if job.Status != StatusQueued {
		t.Fatalf("expected queued, got %s", job.Status)
	}
}

func TestStoreRejectsInvalidCER(t *testing.T) {
	s := NewStore()
	_, err := s.Create("user-1", KindCERGenerate, &CERGeneratePayload{})
	if err == nil {
		t.Fatal("expected validation error")
	}
}
