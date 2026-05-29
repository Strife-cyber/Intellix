package generator_test

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"micro-cer/internal/ai"
	"micro-cer/internal/core"
	"micro-cer/internal/generator"
)

// mockProvider returns realistic JSON for each prompt type without calling a real LLM.
type mockProvider struct {
	model string
}

func (m *mockProvider) Generate(_ context.Context, prompt string) (string, error) {
	upper := strings.ToUpper(prompt)
	switch {
	case strings.Contains(upper, "MOTS CLÉS") || strings.Contains(upper, "MOTS CLES") || (strings.Contains(upper, "KEYWORD") && strings.Contains(upper, "DEFINITION")):
		return `{"Méthode MDA": "Une approche de modélisation dirigée par les modèles permettant de séparer les préoccupations.", "Go": "Langage compilé et concurrent développé par Google."}`, nil
	case strings.Contains(upper, "CONCEPT") && strings.Contains(upper, "EXAMPLES"):
		return `{"points": [{"concept": "Concept clé", "definition": "Explication technique détaillée du concept.", "examples": ["Application concrète numero 1", "Cas d'utilisation numero 2"]}]}`, nil
	case strings.Contains(upper, "STATUS") && strings.Contains(upper, "CONFIRMÉE"):
		return `{"status": "CONFIRMÉE", "explanation": "L'hypothèse est validée par les résultats obtenus lors de l'étude.", "proofs": ["Preuve extraite du travail effectué"]}`, nil
	case strings.Contains(upper, "SUMMARY") && strings.Contains(upper, "KEY_LEARNINGS"):
		return `{"summary": "Ce travail a permis d'explorer les concepts fondamentaux.", "key_learnings": [{"title": "Apprentissage principal", "explanation": "Compréhension approfondie du sujet."}], "closing": "Ces concepts seront applicables dans de futurs projets."}`, nil
	case strings.Contains(upper, "OBJECTIVES_STATUS") || strings.Contains(upper, "OBJECTIF"):
		return `{"objectives_status": [{"objective_text": "Comprendre le modèle MDA", "status": "Atteint", "proof": "Le concept a été étudié en détail."}], "conclusion_sentence": "Tous les objectifs ont été atteints avec succès."}`, nil
	case strings.Contains(upper, "STRENGTHS") || strings.Contains(upper, "POINTS FORTS"):
		return `{"strengths": [{"title": "Rigueur méthodologique", "explanation": "Approche structurée tout au long du travail."}], "difficulties": [{"title": "Complexité technique", "explanation": "Certains concepts étaient avancés."}], "learnings": [{"title": "Nouvelles compétences", "explanation": "Maîtrise des outils de modélisation."}], "perspectives": [{"title": "Approfondissement", "explanation": "Continuer l'étude des aspects avancés."}]}`, nil
	case strings.Contains(upper, "CATEGORIES") && strings.Contains(upper, "RESOURCES"):
		return `{"categories": [{"name": "Vidéos YouTube", "resources": [{"title": "Tutoriel complet", "link": "https://youtube.com/watch?v=example", "description": "Vidéo explicative détaillée du concept."}]}]}`, nil
	case strings.Contains(upper, "COMPRESS"):
		return `Étudiant a travaillé sur le modèle MDA et ses applications en génie logiciel. Les concepts clés incluent la séparation des préoccupations et l'abstraction.`, nil
	default:
		return `{"status": "ok"}`, nil
	}
}

func (m *mockProvider) SwitchModel(model string)                       { m.model = model }
func (m *mockProvider) ListModels(_ context.Context) ([]string, error) { return []string{m.model}, nil }
func (m *mockProvider) Name() string                                   { return "MockProvider" }

func TestFullCERGeneration(t *testing.T) {
	prositPath := filepath.Join("..", "files", "PROSIT ALLER N°05.docx")
	extractor := core.NewExtractor()
	prosit, err := extractor.Extract(prositPath)
	if err != nil {
		t.Fatalf("Failed to extract prosit from %s: %v", prositPath, err)
	}
	t.Logf("Prosit extracted: %d keywords, %d pistes, %d plan items",
		len(prosit.Keywords), len(prosit.Pistes), len(prosit.Plan))

	// Try Ollama first, fall back to mock if unavailable
	prov := tryOllamaProvider(t)
	if prov == nil {
		t.Log("Ollama unavailable — using mock provider (unit-test mode)")
		prov = &mockProvider{model: "test-model"}
	}

	assistant := ai.NewAssistantInstance(prov, 15)
	assistant.SetTimeout(5 * time.Minute)

	mgr := generator.NewManager(assistant, prosit)
	ctx := context.Background()

	cer := mgr.GenerateCER(ctx, "test-integration",
		[]string{"Comprendre les stratégies algorithmiques", "Appliquer les concepts d'optimisation"},
		1.0, "CER - Stratégies Algorithmiques", "Étude des stratégies algorithmiques pour l'optimisation",
		[]string{"Complexité des algorithmes", "Choix de la stratégie adaptée"},
		[]string{"Approfondir la programmation dynamique", "Étudier les cas limites"},
	)

	// Assert all required fields are populated
	if cer.Analyse == nil {
		t.Fatal("Analyse is nil")
	}
	assertNotBlank(t, "Analyse.Context", cer.Analyse.Context)
	assertNonEmpty(t, "Analyse.Problems", cer.Analyse.Problems)
	assertNonEmpty(t, "Plan", cer.Plan)
	assertNotEmpty(t, "Realisation", cer.Realisation)
	assertNotEmpty(t, "Validation", cer.Validation)
	assertNotEmpty(t, "Conclusion", cer.Conclusion)
	assertNotEmpty(t, "Bilan", cer.Bilan)
	if cer.Reference == nil {
		t.Error("Reference is nil")
	}

	// Render to LaTeX
	templateDir := filepath.Join("..", "template")
	renderer, err := core.NewLatexRenderer(templateDir)
	if err != nil {
		t.Fatalf("Failed to create renderer: %v", err)
	}

	outputDir, err := renderer.Render(cer, t.TempDir(), "icam")
	if err != nil {
		t.Fatalf("Failed to render LaTeX: %v", err)
	}

	// Verify output
	info, err := os.Stat(outputDir)
	if err != nil {
		t.Fatalf("Output directory not accessible: %v", err)
	}
	if !info.IsDir() {
		t.Fatal("Output path is not a directory")
	}

	expectedFiles := []string{
		"main.tex", "analyse.tex", "realisation.tex",
		"validation.tex", "conclusion.tex", "bilan.tex",
		"references.tex", "cover.tex", "plan.tex",
	}
	for _, f := range expectedFiles {
		fp := filepath.Join(outputDir, f)
		if _, err := os.Stat(fp); os.IsNotExist(err) {
			t.Errorf("Expected file %s was not rendered", fp)
		}
	}

	mainTex, err := os.ReadFile(filepath.Join(outputDir, "main.tex"))
	if err != nil {
		t.Fatalf("Failed to read main.tex: %v", err)
	}
	mainContent := string(mainTex)
	for _, section := range []string{"analyse", "realisation", "validation", "conclusion", "bilan", "references"} {
		if !strings.Contains(mainContent, `\input{`+section+`}`) {
			t.Errorf("main.tex missing \\input{%s}", section)
		}
	}

	// Verify generated content has meaningful length
	for _, phase := range []struct{ name, content string }{
		{"realisation.tex", cer.Realisation},
		{"validation.tex", cer.Validation},
		{"conclusion.tex", cer.Conclusion},
		{"bilan.tex", cer.Bilan},
	} {
		if len(phase.content) < 100 {
			t.Errorf("%s suspiciously short (%d chars)", phase.name, len(phase.content))
		}
	}

	// Try to compile PDF — non-fatal
	pdfPath := tryCompilePDF(t, outputDir)
	if pdfPath != "" {
		t.Logf("PDF generated: %s (%d bytes)", pdfPath, fileSize(t, pdfPath))
	} else {
		t.Log("PDF compilation skipped or failed (non-critical)")
	}

	// Create zip of the full output — non-fatal
	zipDir := t.TempDir()
	zipPath := filepath.Join(zipDir, "cer_output.zip")
	if err := createZip(zipPath, outputDir); err != nil {
		t.Logf("Zip creation failed (non-critical): %v", err)
	} else {
		t.Logf("Output zip: %s (%d bytes)", zipPath, fileSize(t, zipPath))
	}

	t.Logf("Full CER output in: %s", outputDir)
}

// tryOllamaProvider checks if Ollama is running with llama3.1 and returns a provider if so.
func tryOllamaProvider(t *testing.T) ai.Provider {
	t.Helper()

	baseURL := os.Getenv("OLLAMA_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}

	// Quick health check
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/api/tags", nil)
	if err != nil {
		t.Logf("Ollama check failed: %v", err)
		return nil
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Logf("Ollama not reachable at %s: %v", baseURL, err)
		return nil
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			return
		}
	}(resp.Body)

	t.Logf("Ollama reachable at %s", baseURL)

	// Use the provider's ListModels to find a suitable model
	prov := ai.NewOllamaProvider(baseURL+"/v1", "", 0.1)
	models, err := prov.ListModels(ctx)
	if err != nil {
		t.Logf("Ollama ListModels failed: %v — will try default model", err)
		return ai.NewOllamaProvider(baseURL+"/v1", "llama3.1", 0.1)
	}

	// Prefer llama3.1, fall back to any available model
	preferred := []string{"llama3.1", "llama3", "llama", "mistral", "qwen2.5"}
	for _, name := range preferred {
		for _, m := range models {
			if strings.Contains(strings.ToLower(m), name) {
				t.Logf("Using Ollama model: %s", m)
				return ai.NewOllamaProvider(baseURL+"/v1", m, 0.1)
			}
		}
	}

	// Last resort: just use whatever is available
	if len(models) > 0 {
		t.Logf("Using Ollama model: %s (no preferred model found)", models[0])
		return ai.NewOllamaProvider(baseURL+"/v1", models[0], 0.1)
	}

	t.Log("Ollama has no models installed")
	return nil
}

// tryCompilePDF attempts to compile main.tex with pdflatex.
func tryCompilePDF(t *testing.T, outputDir string) string {
	t.Helper()

	pdflatex, err := exec.LookPath("pdflatex")
	if err != nil {
		t.Log("pdflatex not found on PATH — skipping PDF compilation")
		return ""
	}

	mainFile := filepath.Join(outputDir, "main.tex")
	if _, err := os.Stat(mainFile); err != nil {
		return ""
	}

	// Run pdflatex twice for cross-references
	for pass := 1; pass <= 2; pass++ {
		cmd := exec.Command(pdflatex,
			"-interaction=nonstopmode",
			"-output-directory", outputDir,
			mainFile,
		)
		cmd.Dir = outputDir
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Logf("pdflatex pass %d: %v", pass, err)
			// Log truncated output for debugging
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Error") || strings.Contains(line, "! ") {
					t.Logf("  LaTeX: %s", strings.TrimSpace(line))
				}
			}
			return ""
		}
	}

	pdfPath := filepath.Join(outputDir, "main.pdf")
	if _, err := os.Stat(pdfPath); err != nil {
		return ""
	}
	return pdfPath
}

func createZip(zipPath, dir string) error {
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return fmt.Errorf("create zip file: %w", err)
	}
	defer func(zipFile *os.File) {
		err := zipFile.Close()
		if err != nil {
			return
		}
	}(zipFile)

	w := zip.NewWriter(zipFile)
	defer func(w *zip.Writer) {
		err := w.Close()
		if err != nil {
			return
		}
	}(w)

	return filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		relPath, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		f, err := w.Create(filepath.ToSlash(relPath))
		if err != nil {
			return err
		}
		src, err := os.Open(path)
		if err != nil {
			return err
		}
		defer func(src *os.File) {
			err := src.Close()
			if err != nil {
				return
			}
		}(src)
		_, err = io.Copy(f, src)
		return err
	})
}

func fileSize(t *testing.T, path string) int64 {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		return -1
	}
	return info.Size()
}

// assertion helpers
func assertNotBlank(t *testing.T, name, value string) {
	t.Helper()
	if strings.TrimSpace(value) == "" {
		t.Errorf("%s is empty", name)
	}
}

func assertNonEmpty(t *testing.T, name string, value []string) {
	t.Helper()
	if len(value) == 0 {
		t.Errorf("%s is empty", name)
	}
}

func assertNotEmpty(t *testing.T, name, value string) {
	t.Helper()
	if value == "" {
		t.Errorf("%s is empty", name)
	}
}
