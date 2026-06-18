package measurement_helper

import (
	"testing"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

func TestClassifyDeviation(t *testing.T) {
	bands := vitalSeverityBands["glucose"]

	tests := []struct {
		deviation float64
		want      domain.Severity
	}{
		{10, domain.SeverityLow},
		{20, domain.SeverityLow},
		{21, domain.SeverityMedium},
		{50, domain.SeverityMedium},
		{51, domain.SeverityHigh},
	}

	for _, tt := range tests {
		if got := classifyDeviation(tt.deviation, bands); got != tt.want {
			t.Fatalf("deviation %.0f: got %q want %q", tt.deviation, got, tt.want)
		}
	}
}

func TestCalculateViolationSeverity_GlucoseHypoglycemia(t *testing.T) {
	threshold := 100.0

	if got := calculateViolationSeverity("glucose", 97, threshold); got != domain.SeverityLow {
		t.Fatalf("97 mg/dL: got %q want low", got)
	}
	if got := calculateViolationSeverity("glucose", 79, threshold); got != domain.SeverityMedium {
		t.Fatalf("79 mg/dL: got %q want medium", got)
	}
	if got := calculateViolationSeverity("glucose", 45, threshold); got != domain.SeverityHigh {
		t.Fatalf("45 mg/dL: got %q want high", got)
	}
}

func TestCalculateViolationSeverity_SpO2(t *testing.T) {
	threshold := 94.0

	if got := calculateViolationSeverity("spo2", 93, threshold); got != domain.SeverityLow {
		t.Fatalf("93%%: got %q want low", got)
	}
	if got := calculateViolationSeverity("spo2", 89, threshold); got != domain.SeverityMedium {
		t.Fatalf("89%%: got %q want medium", got)
	}
	if got := calculateViolationSeverity("spo2", 87, threshold); got != domain.SeverityHigh {
		t.Fatalf("87%%: got %q want high", got)
	}
}

func TestAggregateSeverity(t *testing.T) {
	got := AggregateSeverity([]domain.ThresholdViolation{
		{Severity: domain.SeverityLow},
		{Severity: domain.SeverityMedium},
	})
	if got != domain.SeverityMedium {
		t.Fatalf("got %q want medium", got)
	}
}
