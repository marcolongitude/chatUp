package app

import "testing"

func TestParseInt(t *testing.T) {
	if got := ParseInt("12", 3); got != 12 {
		t.Fatalf("expected 12, got %d", got)
	}
	if got := ParseInt("x", 3); got != 3 {
		t.Fatalf("expected fallback 3, got %d", got)
	}
}

func TestParseFloat(t *testing.T) {
	if got := ParseFloat("2.5", 1); got != 2.5 {
		t.Fatalf("expected 2.5, got %f", got)
	}
	if got := ParseFloat("x", 1.5); got != 1.5 {
		t.Fatalf("expected fallback 1.5, got %f", got)
	}
}

func TestHaversine(t *testing.T) {
	if got := Haversine(0, 0, 0, 0); got != 0 {
		t.Fatalf("expected 0 distance, got %f", got)
	}
	// Sao Paulo -> Rio de Janeiro is roughly 357 km.
	got := Haversine(-23.5505, -46.6333, -22.9068, -43.1729)
	if got < 300 || got > 450 {
		t.Fatalf("unexpected distance %f", got)
	}
}
