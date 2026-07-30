package seed_test

import (
	"testing"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
)

func TestAllowedClinicLocations_ByDisease(t *testing.T) {
	both := seed.AllowedClinicLocations(true, true)
	if len(both) != 4 {
		t.Fatalf("both: want 4 clinics, got %d", len(both))
	}
	for _, loc := range both {
		if loc == seed.ClinicLocations[4] || loc == seed.ClinicLocations[5] {
			t.Fatalf("both must not include specialty-only clinics: %q", loc)
		}
	}

	bpOnly := seed.AllowedClinicLocations(true, false)
	if len(bpOnly) != 5 {
		t.Fatalf("bp-only: want 5 clinics, got %d", len(bpOnly))
	}
	if !seed.IsClinicLocationAllowed(seed.ClinicLocations[4], true, false) {
		t.Fatal("bp-only should allow Hồng Tâm")
	}
	if seed.IsClinicLocationAllowed(seed.ClinicLocations[5], true, false) {
		t.Fatal("bp-only must not allow Bích Đào")
	}

	gluOnly := seed.AllowedClinicLocations(false, true)
	if len(gluOnly) != 5 {
		t.Fatalf("glucose-only: want 5 clinics, got %d", len(gluOnly))
	}
	if !seed.IsClinicLocationAllowed(seed.ClinicLocations[5], false, true) {
		t.Fatal("glucose-only should allow Bích Đào")
	}
	if seed.IsClinicLocationAllowed(seed.ClinicLocations[4], false, true) {
		t.Fatal("glucose-only must not allow Hồng Tâm")
	}

	neither := seed.AllowedClinicLocations(false, false)
	if len(neither) != 4 {
		t.Fatalf("neither: want 4 clinics, got %d", len(neither))
	}
}

func TestClinicLocationForDisease_IsAlwaysAllowed(t *testing.T) {
	cases := []struct {
		bp, glu bool
	}{
		{true, true},
		{true, false},
		{false, true},
		{false, false},
	}
	for _, c := range cases {
		for salt := 0; salt < 20; salt++ {
			loc := seed.ClinicLocationForDisease(c.bp, c.glu, salt)
			if !seed.IsClinicLocationAllowed(loc, c.bp, c.glu) {
				t.Fatalf("salt=%d bp=%v glu=%v got disallowed %q", salt, c.bp, c.glu, loc)
			}
		}
	}
}
