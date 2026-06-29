package domain

import (
	"errors"
	"testing"
	"time"
)

func TestAppointmentsOverlap(t *testing.T) {
	base := time.Date(2026, 6, 30, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name      string
		aStart    time.Time
		aDuration int
		bStart    time.Time
		bDuration int
		want      bool
	}{
		{name: "same start and duration", aStart: base, aDuration: 30, bStart: base, bDuration: 30, want: true},
		{name: "overlapping durations", aStart: base, aDuration: 60, bStart: base.Add(30 * time.Minute), bDuration: 30, want: true},
		{name: "adjacent slots", aStart: base, aDuration: 30, bStart: base.Add(30 * time.Minute), bDuration: 30, want: false},
		{name: "shorter fits before longer", aStart: base.Add(15 * time.Minute), aDuration: 15, bStart: base, bDuration: 60, want: true},
		{name: "far apart", aStart: base, aDuration: 30, bStart: base.Add(2 * time.Hour), bDuration: 30, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := AppointmentsOverlap(tt.aStart, tt.aDuration, tt.bStart, tt.bDuration); got != tt.want {
				t.Fatalf("AppointmentsOverlap() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidateAppointmentDuration(t *testing.T) {
	if err := ValidateAppointmentDuration(30); err != nil {
		t.Fatalf("expected valid duration, got %v", err)
	}
	if err := ValidateAppointmentDuration(20); err != nil {
		t.Fatalf("expected valid duration, got %v", err)
	}
	if err := ValidateAppointmentDuration(0); !errors.Is(err, ErrInvalidAppointmentDuration) {
		t.Fatalf("expected invalid duration error, got %v", err)
	}
	if err := ValidateAppointmentDuration(200); err == nil {
		t.Fatal("expected duration above max to fail")
	}
}

func TestNormalizeAppointmentDuration(t *testing.T) {
	if got := NormalizeAppointmentDuration(0); got != DefaultAppointmentDurationMinutes {
		t.Fatalf("NormalizeAppointmentDuration(0) = %d, want %d", got, DefaultAppointmentDurationMinutes)
	}
}
