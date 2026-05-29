package routes

import (
	"micro-cer/internal/api/handlers"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func GetAppRouter() *chi.Mux {
	router := chi.NewRouter()
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)

	_ = os.MkdirAll("./uploads", os.ModePerm)

	router.Post("/upload", handlers.SplitPrositHandler)

	return router
}
