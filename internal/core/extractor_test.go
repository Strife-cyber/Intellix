package core

import (
	"fmt"
	"strings"
	"testing"
)

func TestSamplePrositExtraction(t *testing.T) {
	extractor := NewExtractor()

	prosit, err := extractor.Extract("../../files/PROSIT ALLER 4.pdf")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	fmt.Println(prosit)

	// ---- REQUIRED STRING FIELDS ----
	if strings.TrimSpace(prosit.Context) == "" {
		t.Fatal("context is empty")
	}

	if strings.TrimSpace(prosit.Generalisation) == "" {
		t.Fatal("generalisation is empty")
	}

	// ---- REQUIRED SLICE FIELDS ----
	requireNonEmptySlice(t, "keywords", prosit.Keywords)
	requireNonEmptySlice(t, "needs", prosit.Needs)
	requireNonEmptySlice(t, "constraints", prosit.Constraints)
	requireNonEmptySlice(t, "problems", prosit.Problems)
	requireNonEmptySlice(t, "pistes", prosit.Pistes)
	requireNonEmptySlice(t, "plan", prosit.Plan)

	// Optional debug output (only if needed)
	t.Logf("OK: prosit extracted successfully")
}

func requireNonEmptySlice(t *testing.T, name string, v []string) {
	t.Helper()

	if v == nil {
		t.Fatalf("%s is nil", name)
	}

	if len(v) == 0 {
		t.Fatalf("%s is empty", name)
	}

	for i, s := range v {
		if strings.TrimSpace(s) == "" {
			t.Fatalf("%s contains empty string at index %d", name, i)
		}
	}
}
