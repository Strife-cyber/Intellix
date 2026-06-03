package handlers

import (
	"micro-cer/internal/jobs"
	"micro-cer/internal/storage"
	"micro-cer/internal/templates"
)

type Deps struct {
	Queue     *jobs.Queue
	Templates *templates.Registry
	Prosits   *storage.PrositStore
}

var apiDeps *Deps

func SetDeps(d *Deps) {
	apiDeps = d
}

func requireDeps() (*Deps, bool) {
	return apiDeps, apiDeps != nil && apiDeps.Queue != nil && apiDeps.Templates != nil && apiDeps.Prosits != nil
}
