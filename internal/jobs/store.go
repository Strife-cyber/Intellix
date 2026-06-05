package jobs

import (
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

var ErrJobNotFound = errors.New("job not found")

var ErrJobForbidden = errors.New("job forbidden")

type Store struct {
	mu      sync.Mutex // protects read-modify-write in Update
	db      *sql.DB
	baseDir string
}

func NewStore(baseDir string) *Store {
	s := &Store{baseDir: baseDir}
	s.initDB()
	return s
}

func (s *Store) dbPath() string {
	return filepath.Join(s.baseDir, "jobs.db")
}

func (s *Store) initDB() {
	_ = os.MkdirAll(s.baseDir, 0755)

	db, err := sql.Open("sqlite", s.dbPath())
	if err != nil {
		panic(err)
	}

	// WAL mode for concurrent reads without blocking
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		panic(err)
	}

	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS jobs (
			id       TEXT PRIMARY KEY,
			user_key TEXT NOT NULL,
			kind     TEXT NOT NULL,
			status   TEXT NOT NULL DEFAULT 'queued',
			data     BLOB
		)
	`); err != nil {
		panic(err)
	}

	s.db = db

	// Mark jobs that were interrupted by a restart
	s.failInterruptedJobs()
}

// failInterruptedJobs finds jobs left in queued/running state and marks them failed.
func (s *Store) failInterruptedJobs() {
	rows, err := s.db.Query(`SELECT id, data FROM jobs WHERE status IN ('queued', 'running')`)
	if err != nil {
		return
	}
	defer rows.Close()

	now := time.Now()
	for rows.Next() {
		var id string
		var data []byte
		if err := rows.Scan(&id, &data); err != nil || data == nil {
			continue
		}
		var job Job
		if err := json.Unmarshal(data, &job); err != nil {
			continue
		}
		job.Status = StatusFailed
		job.Error = "service restarted while job was in progress"
		job.Progress = "failed"
		job.FinishedAt = &now
		job.UpdatedAt = now

		updated, _ := json.Marshal(job)
		_, _ = s.db.Exec(`UPDATE jobs SET status = 'failed', data = ? WHERE id = ?`, updated, id)
	}
}

func (s *Store) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

func (s *Store) Create(userKey string, kind Kind, payload any) (*Job, error) {
	if strings.TrimSpace(userKey) == "" {
		return nil, errors.New("user key is required")
	}
	now := time.Now()
	job := &Job{
		ID:        uuid.NewString(),
		UserKey:   userKey,
		Kind:      kind,
		Status:    StatusQueued,
		Progress:  "queued",
		CreatedAt: now,
		UpdatedAt: now,
	}

	switch kind {
	case KindPrositExtract:
		p, ok := payload.(*PrositExtractPayload)
		if !ok || p == nil || p.FilePath == "" {
			return nil, errors.New("invalid prosit extract payload")
		}
		job.PrositExtract = p
	case KindCERGenerate:
		p, ok := payload.(*CERGeneratePayload)
		if !ok || p == nil {
			return nil, errors.New("invalid cer generate payload")
		}
		if err := validateCERPayload(p); err != nil {
			return nil, err
		}
		job.CERGenerate = p
	default:
		return nil, errors.New("unknown job kind")
	}

	data, err := json.Marshal(job)
	if err != nil {
		return nil, err
	}

	if _, err := s.db.Exec(
		`INSERT INTO jobs (id, user_key, kind, status, data) VALUES (?, ?, ?, ?, ?)`,
		job.ID, job.UserKey, string(kind), string(StatusQueued), data,
	); err != nil {
		return nil, err
	}

	return cloneJob(job), nil
}

func validateCERPayload(p *CERGeneratePayload) error {
	if p.Title == "" {
		return errors.New("title is required")
	}
	if p.Description == "" {
		return errors.New("description is required")
	}
	if p.Version <= 0 {
		return errors.New("version must be greater than 0")
	}
	if p.Theme == "" {
		p.Theme = "coffee"
	}
	if p.TemplateID == "" {
		p.TemplateID = "default"
	}
	return nil
}

// getByID reads a single job from the database. Returns ErrJobNotFound if missing.
func (s *Store) getByID(id string) (*Job, error) {
	var data []byte
	err := s.db.QueryRow(`SELECT data FROM jobs WHERE id = ?`, id).Scan(&data)
	if err == sql.ErrNoRows {
		return nil, ErrJobNotFound
	}
	if err != nil {
		return nil, err
	}
	var job Job
	if err := json.Unmarshal(data, &job); err != nil {
		return nil, err
	}
	return &job, nil
}

func (s *Store) GetForUser(id, userKey string) (*Job, error) {
	job, err := s.getByID(id)
	if err != nil {
		return nil, err
	}
	if job.UserKey != userKey {
		return nil, ErrJobForbidden
	}
	return cloneJob(job), nil
}

func (s *Store) Get(id string) (*Job, error) {
	job, err := s.getByID(id)
	if err != nil {
		return nil, err
	}
	return cloneJob(job), nil
}

// ListByUserKind returns all jobs matching the given user and kind.
func (s *Store) ListByUserKind(userKey string, kind Kind) ([]*Job, error) {
	rows, err := s.db.Query(`SELECT data FROM jobs WHERE user_key = ? AND kind = ?`, userKey, string(kind))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Job
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil || data == nil {
			continue
		}
		var job Job
		if err := json.Unmarshal(data, &job); err != nil {
			continue
		}
		out = append(out, &job)
	}
	return out, rows.Err()
}

// WorkDir returns the base directory.
func (s *Store) WorkDir() string {
	if s == nil {
		return "./data"
	}
	return s.baseDir
}

// SetWorkDir sets the base directory and reopens the database at the new location.
func (s *Store) SetWorkDir(dir string) {
	if s.baseDir == dir {
		return
	}
	if s.db != nil {
		_ = s.db.Close()
	}
	s.baseDir = dir
	s.initDB()
}

// Update reads the job, applies fn, and writes the result back atomically.
func (s *Store) Update(id string, fn func(*Job)) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, err := s.getByID(id)
	if err != nil {
		return err
	}

	fn(job)
	job.UpdatedAt = time.Now()

	data, err := json.Marshal(job)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(
		`UPDATE jobs SET status = ?, data = ? WHERE id = ?`,
		string(job.Status), data, id,
	)
	return err
}

func cloneJob(j *Job) *Job {
	cp := *j
	if j.PrositExtract != nil {
		p := *j.PrositExtract
		cp.PrositExtract = &p
	}
	if j.CERGenerate != nil {
		p := *j.CERGenerate
		cp.CERGenerate = &p
	}
	if j.Result != nil {
		r := *j.Result
		cp.Result = &r
		if j.Result.Prosit != nil {
			pr := *j.Result.Prosit
			cp.Result.Prosit = &pr
		}
	}
	return &cp
}
