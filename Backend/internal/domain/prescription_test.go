package domain

import (
	"testing"
	"time"
)

func TestIsPrescriptionOpen(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	tests := []struct {
		name   string
		status PrescriptionStatus
		now    time.Time
		end    *time.Time
		want   bool
	}{
		{name: "active within range", status: PrescriptionStatusActive, now: start.Add(24 * time.Hour), end: &end, want: true},
		{name: "active past end", status: PrescriptionStatusActive, now: end, end: &end, want: false},
		{name: "completed within range", status: PrescriptionStatusCompleted, now: start.Add(24 * time.Hour), end: &end, want: false},
		{name: "discontinued within range", status: PrescriptionStatusDiscontinued, now: start.Add(24 * time.Hour), end: &end, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &Prescription{
				Status:    tt.status,
				StartDate: start,
				EndDate:   tt.end,
			}
			if got := IsPrescriptionOpen(p, tt.now); got != tt.want {
				t.Fatalf("IsPrescriptionOpen() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidatePrescriptionStatusRejectsExpired(t *testing.T) {
	if err := ValidatePrescriptionStatus("expired"); err == nil {
		t.Fatal("expected expired status to be rejected")
	}
}
