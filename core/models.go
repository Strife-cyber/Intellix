package core

type Prosit struct {
	Keywords       []string
	Context        string
	Needs          []string
	Constraints    []string
	Problems       []string
	Generalisation string
	Pistes         []string
	Plan           []string
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
	Version     float32
	Title       string
	Description string
	Analyse     *Analyse
	Plan        []string
	Realisation string
	Validation  string
	Conclusion  string
	Bilan       string
	Reference   *Reference
}
