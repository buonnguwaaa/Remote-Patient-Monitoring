package measurement_helper

import (
	"testing"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

func TestClassifyDeviation_GlucoseBands(t *testing.T) {
	bands := vitalSeverityBands["glucose"]

	tests := []struct {
		deviation float64
		want      domain.Severity
	}{
		{10, domain.SeverityLow},
		{16, domain.SeverityLow},
		{17, domain.SeverityMedium},
		{50, domain.SeverityMedium},
		{51, domain.SeverityHigh},
	}

	for _, tt := range tests {
		if got := classifyDeviation(tt.deviation, bands); got != tt.want {
			t.Fatalf("deviation %.0f: got %q want %q", tt.deviation, got, tt.want)
		}
	}
}

func TestCalculateViolationSeverity_Glucose(t *testing.T) {
	// Personal hypo threshold 100: small overshoot stays low until absolute floors.
	if got := calculateViolationSeverity("glucose", 97, 100); got != domain.SeverityLow {
		t.Fatalf("97 mg/dL vs personal 100: got %q want low", got)
	}
	// BYT 5481 mức độ 1: <70 ≥54 → medium floor
	if got := calculateViolationSeverity("glucose", 65, 100); got != domain.SeverityMedium {
		t.Fatalf("65 mg/dL: got %q want medium", got)
	}
	// BYT 5481 mức độ 2: <54 → high floor
	if got := calculateViolationSeverity("glucose", 45, 100); got != domain.SeverityHigh {
		t.Fatalf("45 mg/dL: got %q want high", got)
	}
	// Postprandial target ≥180 → medium
	if got := calculateViolationSeverity("glucose", 190, 140); got != domain.SeverityMedium {
		t.Fatalf("190 mg/dL: got %q want medium", got)
	}
	// Very high ≥300 → high
	if got := calculateViolationSeverity("glucose", 310, 140); got != domain.SeverityHigh {
		t.Fatalf("310 mg/dL: got %q want high", got)
	}
}

func TestCalculateViolationSeverity_SpO2(t *testing.T) {
	// <94 ≥92 → low
	if got := calculateViolationSeverity("spo2", 93, 96); got != domain.SeverityLow {
		t.Fatalf("93%%: got %q want low", got)
	}
	// <92 ≥90 → medium
	if got := calculateViolationSeverity("spo2", 91, 96); got != domain.SeverityMedium {
		t.Fatalf("91%%: got %q want medium", got)
	}
	// <90 → high
	if got := calculateViolationSeverity("spo2", 88, 96); got != domain.SeverityHigh {
		t.Fatalf("88%%: got %q want high", got)
	}
}

func TestCalculateViolationSeverity_BloodPressure(t *testing.T) {
	// THA độ 2 systolic ≥160 → medium
	if got := calculateViolationSeverity("blood_pressure_systolic", 165, 140); got != domain.SeverityMedium {
		t.Fatalf("SBP 165: got %q want medium", got)
	}
	// Cơn THA / độ 3 ≥180 → high
	if got := calculateViolationSeverity("blood_pressure_systolic", 185, 140); got != domain.SeverityHigh {
		t.Fatalf("SBP 185: got %q want high", got)
	}
	// Hạ HA <90 → high
	if got := calculateViolationSeverity("blood_pressure_systolic", 85, 100); got != domain.SeverityHigh {
		t.Fatalf("SBP 85: got %q want high", got)
	}
	// Diastolic độ 2 ≥100 → medium
	if got := calculateViolationSeverity("blood_pressure_diastolic", 105, 90); got != domain.SeverityMedium {
		t.Fatalf("DBP 105: got %q want medium", got)
	}
	// Diastolic cơn THA ≥110 → high
	if got := calculateViolationSeverity("blood_pressure_diastolic", 115, 90); got != domain.SeverityHigh {
		t.Fatalf("DBP 115: got %q want high", got)
	}
	// Hạ HA tâm trương <60 → high
	if got := calculateViolationSeverity("blood_pressure_diastolic", 55, 70); got != domain.SeverityHigh {
		t.Fatalf("DBP 55: got %q want high", got)
	}
}

func TestCalculateViolationSeverity_Temperature(t *testing.T) {
	// Lão khoa sốt nhẹ 37–38 → low (personal max 37, observed 37.5)
	if got := calculateViolationSeverity("temperature", 37.5, 37.0); got != domain.SeverityLow {
		t.Fatalf("37.5°C: got %q want low", got)
	}
	// Sốt vừa 38–39 → medium
	if got := calculateViolationSeverity("temperature", 38.5, 37.0); got != domain.SeverityMedium {
		t.Fatalf("38.5°C: got %q want medium", got)
	}
	// Sốt cao ≥39 → high
	if got := calculateViolationSeverity("temperature", 39.2, 37.0); got != domain.SeverityHigh {
		t.Fatalf("39.2°C: got %q want high", got)
	}
	if got := calculateViolationSeverity("temperature", 40.1, 37.0); got != domain.SeverityHigh {
		t.Fatalf("40.1°C: got %q want high", got)
	}
	// Lão khoa hạ thân nhiệt <36 → medium
	if got := calculateViolationSeverity("temperature", 35.5, 36.5); got != domain.SeverityMedium {
		t.Fatalf("35.5°C: got %q want medium", got)
	}
	// Tâm Anh hypothermia ≤35 → high
	if got := calculateViolationSeverity("temperature", 34.8, 36.5); got != domain.SeverityHigh {
		t.Fatalf("34.8°C: got %q want high", got)
	}
}

func TestCalculateViolationSeverity_HeartAndRespiratory(t *testing.T) {
	// Lão khoa abnormal pulse → medium floor (no high grade in source)
	if got := calculateViolationSeverity("heart_rate", 110, 90); got != domain.SeverityMedium {
		t.Fatalf("HR 110: got %q want medium", got)
	}
	if got := calculateViolationSeverity("heart_rate", 50, 70); got != domain.SeverityMedium {
		t.Fatalf("HR 50: got %q want medium", got)
	}
	// Large deviation past personal target can still reach high via bands
	if got := calculateViolationSeverity("heart_rate", 130, 100); got != domain.SeverityHigh {
		t.Fatalf("HR 130 vs personal 100: got %q want high (deviation band)", got)
	}
	// RR outside 16–20 → medium floor
	if got := calculateViolationSeverity("respiratory_rate", 24, 20); got != domain.SeverityMedium {
		t.Fatalf("RR 24: got %q want medium", got)
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
