package core

type Prosit struct {
	Keywords       []string `json:"keywords,omitempty"`
	Context        string   `json:"context,omitempty"`
	Needs          []string `json:"needs,omitempty"`
	Constraints    []string `json:"constraints,omitempty"`
	Problems       []string `json:"problems,omitempty"`
	Generalisation string   `json:"generalisation,omitempty"`
	Pistes         []string `json:"pistes,omitempty"`
	Plan           []string `json:"plan,omitempty"`
}

type Analyse struct {
	Context     string
	Problems    []string
	Constraints []string
}

type Reference struct {
	Principale []string
	Secondaire []string
	Ligne      []string
}

type Cer struct {
	Version      float32
	Title        string
	Description  string
	Analyse      *Analyse
	Plan         []string
	Realisation  string
	Validation   string
	Conclusion   string
	Bilan        string
	Reference    *Reference
	ReferencesMD string
}
