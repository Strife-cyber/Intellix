package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// LoadEnv reads a `.env` file from the current directory or project root.
// Missing files are ignored so production can rely on real environment variables.
func LoadEnv() {
	candidates := []string{".env"}
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(wd, ".env"))
	}

	loaded := false
	for _, path := range candidates {
		if err := godotenv.Load(path); err == nil {
			log.Printf("loaded environment from %s", path)
			loaded = true
			break
		}
	}

	if !loaded {
		log.Print("no .env file found; using process environment variables")
	}
}
