package seed_test

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
)

func TestPatientMedicalHistorySamples(t *testing.T) {
	cases := []struct {
		i, bp, glu int
	}{{0, 1, 0}, {1, 0, 1}, {2, 1, 1}, {3, 0, 0}, {5, 1, 0}}
	for _, c := range cases {
		h := seed.PatientMedicalHistory(c.i, c.bp == 1, c.glu == 1)
		n := utf8.RuneCountInString(h)
		if n < 80 || n > 2000 {
			t.Fatalf("bad length %d: %s", n, h)
		}
		if seed.IsSparseMedicalHistory(h) {
			t.Fatalf("generated marked sparse: %s", h)
		}
		fmt.Printf("[%d bp=%d glu=%d len=%d]\n%s\n\n", c.i, c.bp, c.glu, n, h)
	}
	if !seed.IsSparseMedicalHistory("Tăng huyết áp") {
		t.Fatal("short label should be sparse")
	}
}

func TestPatientMedicalHistoryUniquePerProfile(t *testing.T) {
	profiles := []struct {
		name string
		bp   bool
		glu  bool
	}{
		{"THA", true, false},
		{"ĐTĐ", false, true},
		{"THA+ĐTĐ", true, true},
		{"none", false, false},
	}
	const n = 500
	for _, p := range profiles {
		seen := make(map[string]int, n)
		for i := 0; i < n; i++ {
			h := seed.PatientMedicalHistory(i, p.bp, p.glu)
			if prev, ok := seen[h]; ok {
				t.Fatalf("%s duplicate at index %d and %d:\n%s", p.name, prev, i, h)
			}
			seen[h] = i
			if utf8.RuneCountInString(h) > 2000 {
				t.Fatalf("%s index %d exceeds 2000 runes", p.name, i)
			}
		}
	}
}

func TestPatientMedicalHistoryOmitsTreatmentModality(t *testing.T) {
	forbidden := []string{
		"điều trị bằng",
		"metformin",
		"insulin",
		"thuốc hạ",
		"ức chế men chuyển",
		"chẹn kênh canxi",
		"sulfonylurea",
		"sglt2",
		"phác đồ",
	}
	for i := 0; i < 80; i++ {
		for _, pair := range [][2]bool{{true, false}, {false, true}, {true, true}, {false, false}} {
			h := strings.ToLower(seed.PatientMedicalHistory(i, pair[0], pair[1]))
			for _, word := range forbidden {
				if strings.Contains(h, strings.ToLower(word)) {
					t.Fatalf("index %d contains treatment modality %q:\n%s", i, word, h)
				}
			}
		}
	}
}

func TestPatientMedicalHistoryForKeyStableAndDistinct(t *testing.T) {
	a := seed.PatientMedicalHistoryForKey("aaaaaaaaaaaaaaaaaaaaaaaa", true, false)
	b := seed.PatientMedicalHistoryForKey("bbbbbbbbbbbbbbbbbbbbbbbb", true, false)
	a2 := seed.PatientMedicalHistoryForKey("aaaaaaaaaaaaaaaaaaaaaaaa", true, false)
	if a != a2 {
		t.Fatal("same key should be stable")
	}
	if a == b {
		t.Fatal("different keys should differ")
	}
}

func TestPatientMedicalHistoryFollowMonthsConsistent(t *testing.T) {
	reFollow := regexp.MustCompile(`khoảng (\d+) tháng`)
	reYears := regexp.MustCompile(`phát hiện (\d+) năm|tăng huyết áp \((\d+) năm\)|type 2 \((\d+) năm\)|kèm tăng huyết áp (\d+) năm|type 2 (\d+) năm`)

	for i := 0; i < 200; i++ {
		for _, pair := range [][2]bool{{true, false}, {false, true}, {true, true}} {
			h := seed.PatientMedicalHistory(i, pair[0], pair[1])
			fm := reFollow.FindStringSubmatch(h)
			if fm == nil {
				t.Fatalf("missing follow months: %s", h)
			}
			follow, _ := strconv.Atoi(fm[1])
			if follow < 3 || follow > 60 {
				t.Fatalf("follow months out of range %d:\n%s", follow, h)
			}

			maxYears := 0
			for _, m := range reYears.FindAllStringSubmatch(h, -1) {
				for _, g := range m[1:] {
					if g == "" {
						continue
					}
					y, _ := strconv.Atoi(g)
					if y > maxYears {
						maxYears = y
					}
				}
			}
			if maxYears == 0 {
				t.Fatalf("could not parse disease years:\n%s", h)
			}
			if follow > maxYears*12 {
				t.Fatalf("follow %d months > disease %d years:\n%s", follow, maxYears, h)
			}
		}

		// Hash-derived keys must also stay bounded (regression for billion-months bug).
		h := seed.PatientMedicalHistoryForKey(fmt.Sprintf("oid-%d-deadbeefcafe", i*9973), true, false)
		fm := reFollow.FindStringSubmatch(h)
		follow, _ := strconv.Atoi(fm[1])
		if follow < 3 || follow > 60 {
			t.Fatalf("ForKey follow months out of range %d:\n%s", follow, h)
		}
	}
}
