package routes

import (
	"micro-cer/internal/api/handlers"
	cerMiddleware "micro-cer/internal/api/middleware"
	"micro-cer/internal/core"
	"micro-cer/internal/jobs"
	"micro-cer/internal/storage"
	"micro-cer/internal/templates"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func GetAppRouter() *chi.Mux {
	router := chi.NewRouter()
	router.Use(chimiddleware.Logger)
	router.Use(chimiddleware.Recoverer)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4321", "http://127.0.0.1:4321", "http://localhost:8080", "http://localhost:8000", "http://127.0.0.1:8000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "X-CER-USER-KEY", "X-CER-TIMESTAMP", "X-CER-SIGNATURE"},
		AllowCredentials: true,
	}))

	_ = os.MkdirAll("./uploads", os.ModePerm)
	_ = os.MkdirAll("./data/users", os.ModePerm)
	_ = os.MkdirAll("./data/templates", os.ModePerm)

	defaultTpl := resolveDefaultTemplateDir()

	registry, err := templates.NewRegistry(defaultTpl, "./data/templates")
	if err != nil {
		panic(err)
	}

	prositStore, err := storage.NewPrositStore("./data")
	if err != nil {
		panic(err)
	}

	store := jobs.NewStore()
	processor := jobs.DefaultProcessor{Store: store}
	queueCfg := jobs.QueueConfig{
		Workers:       2,
		WorkDir:       "./data",
		OutputDir:     "./data/users",
		DefaultTplDir: defaultTpl,
		CustomTplDir:  "./data/templates",
	}
	queue := jobs.NewQueue(store, queueCfg, registry, processor)
	queue.Start()

	handlers.SetDeps(&handlers.Deps{
		Queue:     queue,
		Templates: registry,
		Prosits:   prositStore,
	})

	router.Route("/api", func(r chi.Router) {
		r.Use(cerMiddleware.CerAuth)

		r.Post("/upload", handlers.SplitPrositHandler)

		r.Route("/prosits", func(pr chi.Router) {
			pr.Get("/", handlers.ListPrositsHandler)
			pr.Post("/", handlers.UploadPrositHandler)
			pr.Get("/{prositID}", handlers.GetPrositHandler)
			pr.Patch("/{prositID}", handlers.PatchPrositHandler)
			pr.Delete("/{prositID}", handlers.DeletePrositHandler)
		})

		r.Get("/themes", func(w http.ResponseWriter, _ *http.Request) {
			names := make([]string, 0, len(core.PALETTES))
			for k := range core.PALETTES {
				names = append(names, k)
			}
			handlers.WriteJSON(w, http.StatusOK, map[string]any{"themes": names})
		})

		r.Route("/jobs", func(jr chi.Router) {
			jr.Get("/", handlers.ListJobsHandler)
			jr.Post("/prosit", handlers.StartPrositExtractJob)
			jr.Post("/cer", handlers.StartCERGenerateJob)
			jr.Get("/{jobID}", handlers.GetJobHandler)
			jr.Get("/{jobID}/download", handlers.DownloadJobOutputHandler)
			jr.Get("/{jobID}/pdf", handlers.DownloadJobPDFHandler)
			jr.Get("/{jobID}/latex", handlers.DownloadJobLatexHandler)
		})

		r.Route("/templates", func(tr chi.Router) {
			tr.Get("/", handlers.ListTemplatesHandler)
			tr.Post("/", handlers.UploadTemplateHandler)
			tr.Get("/schema", func(w http.ResponseWriter, _ *http.Request) {
				handlers.WritePlaceholderSchema(w)
			})
			tr.Get("/{templateID}", handlers.GetTemplateHandler)
			tr.Post("/{templateID}/validate", handlers.ValidateTemplateHandler)
			tr.Delete("/{templateID}", handlers.DeleteTemplateHandler)
		})
	})

	if dist := resolveWebDist(); dist != "" {
		router.Handle("/*", spaFileServer(dist))
	} else {
		router.Get("/", func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write([]byte(`<!DOCTYPE html><html><body><h1>micro-cer API</h1><p>Build the web UI: <code>cd web && npm install && npm run build</code></p></body></html>`))
		})
	}

	return router
}

func resolveDefaultTemplateDir() string {
	candidates := []string{
		filepath.Join("internal", "template"),
		filepath.Join("..", "internal", "template"),
		filepath.Join("..", "..", "internal", "template"),
	}
	for _, c := range candidates {
		mainTex := filepath.Join(c, "main.tex")
		if st, err := os.Stat(mainTex); err == nil && !st.IsDir() {
			abs, err := filepath.Abs(c)
			if err == nil {
				return abs
			}
			return c
		}
	}
	panic("default LaTeX template not found (expected internal/template/main.tex)")
}
