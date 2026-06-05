package jobs

import (
	"testing"
)

func TestStoreCreateCERJob(t *testing.T) {
	s := NewStore(t.TempDir())
	t.Cleanup(func() { _ = s.Close() })

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
	s := NewStore(t.TempDir())
	t.Cleanup(func() { _ = s.Close() })

	_, err := s.Create("user-1", KindCERGenerate, &CERGeneratePayload{})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestStorePersistsAcrossRestarts(t *testing.T) {
	dir := t.TempDir()

	// First "session" — create a job and complete it
	s1 := NewStore(dir)
	job, err := s1.Create("user-1", KindCERGenerate, &CERGeneratePayload{
		Title:       "Persist Test",
		Description: "Testing",
		Version:     1,
	})
	if err != nil {
		t.Fatal(err)
	}
	_ = s1.Update(job.ID, func(j *Job) {
		j.Status = StatusCompleted
	})
	_ = s1.Close()

	// Second "session" — simulate restart, job should still be there
	s2 := NewStore(dir)
	t.Cleanup(func() { _ = s2.Close() })

	loaded, err := s2.GetForUser(job.ID, "user-1")
	if err != nil {
		t.Fatalf("job lost after restart: %v", err)
	}
	if loaded.Status != StatusCompleted {
		t.Fatalf("expected completed, got %s", loaded.Status)
	}
	if loaded.CERGenerate.Title != "Persist Test" {
		t.Fatalf("title mismatch: %s", loaded.CERGenerate.Title)
	}
}

func TestStoreRunningJobsMarkedFailedOnRestart(t *testing.T) {
	dir := t.TempDir()

	s1 := NewStore(dir)
	job, err := s1.Create("user-1", KindCERGenerate, &CERGeneratePayload{
		Title:       "Interrupted",
		Description: "Testing",
		Version:     1,
	})
	if err != nil {
		t.Fatal(err)
	}
	// Simulate the job was running when the service died
	_ = s1.Update(job.ID, func(j *Job) {
		j.Status = StatusRunning
	})
	_ = s1.Close()

	// Restart
	s2 := NewStore(dir)
	t.Cleanup(func() { _ = s2.Close() })

	loaded, err := s2.GetForUser(job.ID, "user-1")
	if err != nil {
		t.Fatalf("job lost after restart: %v", err)
	}
	if loaded.Status != StatusFailed {
		t.Fatalf("expected failed after restart, got %s", loaded.Status)
	}
	if loaded.Error != "service restarted while job was in progress" {
		t.Fatalf("error message mismatch: %s", loaded.Error)
	}
}
