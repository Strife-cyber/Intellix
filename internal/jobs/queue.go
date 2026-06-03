package jobs

import (
	"context"
	"log"
)

type QueueConfig struct {
	Workers       int
	WorkDir       string
	OutputDir     string
	DefaultTplDir string
	CustomTplDir  string
}

type Queue struct {
	store    *Store
	cfg      QueueConfig
	tasks    chan string
	registry TemplateResolver
	runner   Processor
}

func (q *Queue) workerProcess(ctx context.Context, jobID string) error {
	return q.runner.Process(ctx, jobID, q.cfg, q.registry)
}

type TemplateResolver interface {
	Resolve(templateID string) (string, error)
}

type Processor interface {
	Process(ctx context.Context, jobID string, cfg QueueConfig, registry TemplateResolver) error
}

func NewQueue(store *Store, cfg QueueConfig, registry TemplateResolver, runner Processor) *Queue {
	if cfg.Workers <= 0 {
		cfg.Workers = 2
	}
	if cfg.WorkDir == "" {
		cfg.WorkDir = "./data"
	}
	store.SetWorkDir(cfg.WorkDir)
	q := &Queue{
		store:    store,
		cfg:      cfg,
		tasks:    make(chan string, 256),
		registry: registry,
		runner:   runner,
	}
	return q
}

func (q *Queue) Start() {
	for i := 0; i < q.cfg.Workers; i++ {
		go q.worker(i)
	}
	log.Printf("job queue started with %d workers", q.cfg.Workers)
}

func (q *Queue) Enqueue(jobID string) {
	select {
	case q.tasks <- jobID:
	default:
		go func() { q.tasks <- jobID }()
	}
}

func (q *Queue) Store() *Store {
	return q.store
}

func (q *Queue) worker(id int) {
	for jobID := range q.tasks {
		_ = q.store.Update(jobID, func(j *Job) {
			j.Status = StatusRunning
			j.Progress = "running"
			now := j.UpdatedAt
			j.StartedAt = &now
		})

		ctx := context.Background()
		err := q.workerProcess(ctx, jobID)
		if err != nil {
			log.Printf("worker %d: job %s failed: %v", id, jobID, err)
			_ = q.store.Update(jobID, func(j *Job) {
				j.Status = StatusFailed
				j.Progress = "failed"
				j.Error = err.Error()
				now := j.UpdatedAt
				j.FinishedAt = &now
			})
			continue
		}

		_ = q.store.Update(jobID, func(j *Job) {
			j.Status = StatusCompleted
			j.Progress = "completed"
			now := j.UpdatedAt
			j.FinishedAt = &now
		})
	}
}
