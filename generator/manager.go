package generator

import (
	"context"
	"log"
	"micro-cer/ai"
	"micro-cer/core"
	"strings"
)

// Manager orchestrates the full CER generation pipeline.
type Manager struct {
	cer         *core.Cer
	prosit      *core.Prosit
	assistant   *ai.Assistant
	bilan       *Bilan
	validation  *Validation
	conclusion  *Conclusion
	realisation *Realisation
	references  *References
}

func NewManager(assistant *ai.Assistant, prosit *core.Prosit) *Manager {
	bilan := NewBilan(assistant)
	validation := NewValidation(assistant)
	conclusion := NewConclusion(assistant)
	realisation := NewRealisation(assistant)
	references := NewReferences(assistant)

	cer := core.Cer{}

	return &Manager{
		cer:         &cer,
		prosit:      prosit,
		assistant:   assistant,
		bilan:       bilan,
		validation:  validation,
		conclusion:  conclusion,
		realisation: realisation,
		references:  references,
	}
}

// sanitizeInput strips obvious prompt-injection sequences from user-supplied text.
func sanitizeInput(s string) string {
	lower := strings.ToLower(s)
	dangerousTokens := []string{
		"ignore", "ignorez", "oublie", "oubliez",
		"instruction", "instructions",
		"system", "système",
	}
	for _, d := range dangerousTokens {
		if strings.Contains(lower, d) {
			log.Printf("Sanitizing user input containing dangerous token: %q", d)
			return "[contenu validé par l'utilisateur]"
		}
	}
	return s
}

func sanitizeInputs(inputs []string) []string {
	result := make([]string, len(inputs))
	for i, v := range inputs {
		result[i] = sanitizeInput(v)
	}
	return result
}

func (m *Manager) GenerateCER(ctx context.Context, clientID string, objectifs []string, version float32, title string, description string, difficulties []string, perspectives []string) *core.Cer {
	m.cer.Version = version
	m.cer.Title = title
	m.cer.Description = description

	// 1. Fill fast synchronous fields
	m.fillInPrositFields()

	// 2. Sanitize user-provided content to prevent prompt injection
	safeObjectifs := sanitizeInputs(objectifs)
	safeDifficulties := sanitizeInputs(difficulties)
	safePerspectives := sanitizeInputs(perspectives)

	// 3. Realisation runs FIRST — subsequent phases (validation, conclusion, bilan)
	//    rely on the memory context it builds.
	m.cer.Realisation = m.realisation.GenerateFullRealisation(ctx, clientID, m.prosit.Keywords, m.prosit.Plan)

	// 4. Run independent phases in parallel. All share clientID so they see the
	//    realisation context in memory — validation and conclusion need this.
	type phase struct {
		key string
		fn  func() string
	}
	phases := []phase{
		{"validation", func() string { return m.validation.ValidateAll(ctx, clientID, m.prosit.Pistes) }},
		{"conclusion", func() string { return m.conclusion.GenerateFullSection(ctx, clientID, safeObjectifs) }},
		{"bilan", func() string { return m.bilan.GenerateFullSection(ctx, clientID, safeDifficulties, safePerspectives) }},
	}

	results := make(map[string]string, len(phases))
	done := make(chan struct{}, len(phases))

	for _, p := range phases {
		go func(p phase) {
			results[p.key] = p.fn()
			done <- struct{}{}
		}(p)
	}

	for range phases {
		<-done
	}

	m.cer.Validation = results["validation"]
	m.cer.Conclusion = results["conclusion"]
	m.cer.Bilan = results["bilan"]
	m.cer.Reference = &core.Reference{
		Principale: []string{},
		Secondaire: []string{},
		Ligne:      []string{},
	}

	return m.cer
}

func (m *Manager) fillInPrositFields() {
	m.cer.Analyse = &core.Analyse{
		Context:     m.prosit.Context,
		Problems:    m.prosit.Problems,
		Constraints: m.prosit.Constraints,
	}
	m.cer.Plan = m.prosit.Plan
}
