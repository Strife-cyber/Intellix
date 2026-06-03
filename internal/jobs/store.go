package jobs

import (
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

var ErrJobNotFound = errors.New("job not found")

var ErrJobForbidden = errors.New("job forbidden")

type Store struct {
	mu      sync.RWMutex
	jobs    map[string]*Job
	workDir string
}

func NewStore() *Store {
	return &Store{jobs: make(map[string]*Job)}
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

	s.mu.Lock()
	s.jobs[job.ID] = job
	s.mu.Unlock()
	return job, nil
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

func (s *Store) GetForUser(id, userKey string) (*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.jobs[id]
	if !ok {
		return nil, ErrJobNotFound
	}
	if job.UserKey != userKey {
		return nil, ErrJobForbidden
	}
	return cloneJob(job), nil
}

func (s *Store) Get(id string) (*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.jobs[id]
	if !ok {
		return nil, ErrJobNotFound
	}
	return cloneJob(job), nil
}

// WorkDir is set by the queue for upload paths (optional).
func (s *Store) WorkDir() string {
	if s == nil {
		return "./data"
	}
	return s.workDir
}

func (s *Store) SetWorkDir(dir string) {
	s.workDir = dir
}

func (s *Store) Update(id string, fn func(*Job)) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[id]
	if !ok {
		return ErrJobNotFound
	}
	fn(job)
	job.UpdatedAt = time.Now()
	return nil
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
