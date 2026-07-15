package measurement_helper

import (
	"testing"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func bpHistory(start time.Time, systolic []float64, spacing time.Duration) []domain.Measurement {
	out := make([]domain.Measurement, 0, len(systolic))
	for i, s := range systolic {
		sys := s
		out = append(out, domain.Measurement{
			ID:            primitive.NewObjectID(),
			PatientID:     primitive.NewObjectID(),
			BloodPressure: domain.BloodPressure{Systolic: &sys},
			CreatedAt:     start.Add(time.Duration(i) * spacing),
		})
	}
	return out
}

func TestTrendWatchLimit(t *testing.T) {
	tests := []struct {
		name               string
		personal, clinical float64
		want               float64
	}{
		{"unset personal → clinical", 0, 160, 160},
		{"personal tighter → personal", 130, 160, 130},
		{"personal equal → clinical", 160, 160, 160},
		{"personal looser → clinical", 170, 160, 160},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := trendWatchLimit(tt.personal, tt.clinical); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}

func TestTrendWatchFloor(t *testing.T) {
	tests := []struct {
		name               string
		personal, clinical float64
		want               float64
	}{
		{"unset personal → clinical hypo", 0, 54, 54},
		{"personal stricter (higher) → personal", 70, 54, 70},
		{"personal looser (lower) → clinical", 40, 54, 54},
		{"personal equal → clinical", 54, 54, 54},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := trendWatchFloor(tt.personal, tt.clinical); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}

func TestLinearRegressionRisingSignificant(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	points := []trendPoint{
		{At: start, Value: 120},
		{At: start.Add(24 * time.Hour), Value: 125},
		{At: start.Add(48 * time.Hour), Value: 130},
		{At: start.Add(72 * time.Hour), Value: 135},
		{At: start.Add(96 * time.Hour), Value: 140},
	}
	slope, r2, p, ok := linearRegression(points)
	if !ok {
		t.Fatal("expected regression ok")
	}
	if slope <= 0 {
		t.Fatalf("expected positive slope, got %v", slope)
	}
	if r2 < 0.99 {
		t.Fatalf("expected strong R², got %v", r2)
	}
	if p >= 0.05 {
		t.Fatalf("expected significant p-value, got %v", p)
	}
}

func TestDecideTrendLevelWatchOnRisingSeries(t *testing.T) {
	// 14 days stable baseline ~120, then last week steadily rising to ~132.
	// ProximityWatch 132/160 < 0.85 so watch must come from z-score; prior week flat
	// so level stays Watch (not High).
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 21)
	for i := 0; i < 14; i++ {
		vals = append(vals, 120)
	}
	rising := []float64{122, 124, 126, 128, 130, 131, 132}
	vals = append(vals, rising...)

	ms := bpHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.BloodPressure.Systolic, true
	})
	asOf := ms[len(ms)-1].CreatedAt
	level, metrics := decideTrendLevel(points, asOf, absSysMax, absSysMax, trendRising)
	if level != trendLevelWatch {
		t.Fatalf("got level %d want watch; metrics=%+v", level, metrics)
	}
	if !meetsWatchTrend(metrics, trendRising) {
		t.Fatalf("expected watch metrics to pass, got %+v", metrics)
	}
}

func TestDecideTrendLevelWatchEarlierWithTightPersonal(t *testing.T) {
	// Same series ends at 115. With clinical 160, proximity 115/160 < 0.85 and
	// z may not fire; with personal 130, watchLimit=130 → 115/130 ≈ 0.88 → watch.
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 10)
	for i := 0; i < 3; i++ {
		vals = append(vals, 100)
	}
	vals = append(vals, 105, 108, 111, 115)

	ms := bpHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.BloodPressure.Systolic, true
	})
	asOf := ms[len(ms)-1].CreatedAt

	watchLim := trendWatchLimit(130, absSysMax) // 130
	level, metrics := decideTrendLevel(points, asOf, watchLim, absSysMax, trendRising)
	if level != trendLevelWatch {
		t.Fatalf("tight personal should pull watch earlier; level=%d metrics=%+v", level, metrics)
	}
	if metrics.ProximityWatch < proximityWatchRatio {
		t.Fatalf("expected ProximityWatch >= 0.85 vs watchLimit 130, got %v", metrics.ProximityWatch)
	}
	if metrics.ProximityHigh >= proximityHighRatio {
		t.Fatalf("must not use personal for high; ProximityHigh=%v", metrics.ProximityHigh)
	}
}

func TestDecideTrendLevelHighRequiresClinicalProximity(t *testing.T) {
	// Strong two-cycle rise ending at 142. With personal 130 → Watch
	// (ProximityWatch 142/130 > 0.85). ProximityHigh 142/160 = 0.8875 < 0.90
	// → must stay Watch, never High (High anchors to clinical only).
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 21)
	for i := 0; i < 7; i++ {
		vals = append(vals, 118)
	}
	vals = append(vals, 120, 123, 126, 129, 132, 135, 138)
	vals = append(vals, 136, 137, 138, 139, 140, 141, 142)

	ms := bpHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.BloodPressure.Systolic, true
	})
	asOf := ms[len(ms)-1].CreatedAt
	watchLim := trendWatchLimit(130, absSysMax)
	level, metrics := decideTrendLevel(points, asOf, watchLim, absSysMax, trendRising)
	if level != trendLevelWatch {
		t.Fatalf("expected Watch (not High): high must use clinical; got %d metrics=%+v", level, metrics)
	}
	if metrics.ProximityHigh >= proximityHighRatio {
		t.Fatalf("fixture should keep ProximityHigh < 0.90, got %v", metrics.ProximityHigh)
	}
	if metrics.ProximityWatch < proximityWatchRatio {
		t.Fatalf("expected ProximityWatch >= 0.85 vs personal watchLimit, got %v", metrics.ProximityWatch)
	}
}

func TestDecideTrendLevelHighOnTwoCycles(t *testing.T) {
	// Two rising 7-day cycles ending near clinical line (ProximityHigh >= 0.90).
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 21)
	cycle1 := []float64{120, 123, 126, 129, 132, 135, 138}
	cycle2 := []float64{140, 142, 144, 146, 148, 149, 150}
	for i := 0; i < 7; i++ {
		vals = append(vals, 118)
	}
	vals = append(vals, cycle1...)
	vals = append(vals, cycle2...)

	ms := bpHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.BloodPressure.Systolic, true
	})
	asOf := ms[len(ms)-1].CreatedAt
	level, metrics := decideTrendLevel(points, asOf, absSysMax, absSysMax, trendRising)
	if level != trendLevelHigh {
		t.Fatalf("got level %d want high; metrics=%+v", level, metrics)
	}
	if metrics.ProximityHigh < proximityHighRatio {
		t.Fatalf("expected ProximityHigh >= 0.90, got %v", metrics.ProximityHigh)
	}
}

func TestEvaluateRisingTrendsEdgeTrigger(t *testing.T) {
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 21)
	for i := 0; i < 14; i++ {
		vals = append(vals, 120)
	}
	vals = append(vals, 122, 124, 126, 128, 130, 131, 132)

	ms := bpHistory(start, vals, 24*time.Hour)

	entryIdx := -1
	for i := range ms {
		points := extractTrendPoints(ms[:i+1], func(m domain.Measurement) (float64, bool) {
			return *m.BloodPressure.Systolic, true
		})
		level, _ := decideTrendLevel(points, ms[i].CreatedAt, absSysMax, absSysMax, trendRising)
		if level >= trendLevelWatch {
			entryIdx = i
			break
		}
	}
	if entryIdx < 0 {
		t.Fatal("expected series to eventually enter watch")
	}

	vs := EvaluateRisingTrends(ms[:entryIdx+1], &ms[entryIdx], nil, nil, true)
	if len(vs) == 0 {
		t.Fatal("expected watch violation on first entry into trend")
	}
	if vs[0].Rule != "trend_rising_watch" {
		t.Fatalf("rule=%s", vs[0].Rule)
	}
	if vs[0].Threshold != absSysMax {
		t.Fatalf("no personal → threshold should be clinical %v, got %v", absSysMax, vs[0].Threshold)
	}

	last := ms[len(ms)-1]
	vsAgain := EvaluateRisingTrends(ms, &last, nil, nil, true)
	if len(vsAgain) != 0 {
		t.Fatalf("expected no duplicate watch alert while trend continues, got %v", vsAgain)
	}

	vsMerged := EvaluateRisingTrends(ms, &last, nil, nil, false)
	if len(vsMerged) == 0 {
		t.Fatal("expected active trend included when edgeOnly=false (merge)")
	}

	personal := &domain.Threshold{SysMax: 130, DiaMax: 85}
	vsPersonal := EvaluateRisingTrends(ms, &last, personal, nil, false)
	if len(vsPersonal) == 0 {
		t.Fatal("expected trend with personal threshold")
	}
	for _, v := range vsPersonal {
		if v.Type == "blood_pressure_systolic" && v.Rule == "trend_rising_watch" && v.Threshold != 130 {
			t.Fatalf("watch violation should store watchLimit 130, got %v", v.Threshold)
		}
	}
}

func TestShouldResetOnZScoreRecovery(t *testing.T) {
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 18)
	for i := 0; i < 14; i++ {
		vals = append(vals, 120)
	}
	vals = append(vals, 140, 122, 121)

	ms := bpHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.BloodPressure.Systolic, true
	})
	asOf := ms[len(ms)-1].CreatedAt
	level, metrics := decideTrendLevel(points, asOf, absSysMax, absSysMax, trendRising)
	if level != trendLevelNone {
		t.Fatalf("expected reset to none after recovery, got %d metrics=%+v", level, metrics)
	}
}

func TestRemoveIQROutliers(t *testing.T) {
	vals := []float64{120, 121, 119, 120, 122, 118, 121, 200}
	cleaned := removeIQROutliers(vals)
	for _, v := range cleaned {
		if v == 200 {
			t.Fatal("expected outlier 200 removed")
		}
	}
}

func TestTrendHistorySince(t *testing.T) {
	asOf := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	got := TrendHistorySince(asOf)
	want := asOf.Add(-21 * 24 * time.Hour)
	if !got.Equal(want) {
		t.Fatalf("got %v want %v", got, want)
	}
}

func glucoseHistory(start time.Time, values []float64, spacing time.Duration) []domain.Measurement {
	out := make([]domain.Measurement, 0, len(values))
	for i, g := range values {
		v := g
		out = append(out, domain.Measurement{
			ID:        primitive.NewObjectID(),
			PatientID: primitive.NewObjectID(),
			Glucose:   domain.Glucose{BloodGlucose: &v},
			CreatedAt: start.Add(time.Duration(i) * spacing),
		})
	}
	return out
}

func TestDecideTrendLevelFallingGlucoseWatch(t *testing.T) {
	// Stable ~110 then fall to ~62. Clinical floor 54 → ProximityWatch 54/62 ≈ 0.87.
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 14)
	for i := 0; i < 7; i++ {
		vals = append(vals, 110)
	}
	vals = append(vals, 100, 90, 82, 75, 68, 64, 62)

	ms := glucoseHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.Glucose.BloodGlucose, true
	})
	asOf := ms[len(ms)-1].CreatedAt
	level, metrics := decideTrendLevel(points, asOf, absGlucoseHypo, absGlucoseHypo, trendFalling)
	if level != trendLevelWatch {
		t.Fatalf("got level %d want watch; metrics=%+v", level, metrics)
	}
	if metrics.ProximityWatch < proximityWatchRatio {
		t.Fatalf("expected ProximityWatch >= 0.85, got %v", metrics.ProximityWatch)
	}
}

func TestEvaluateFallingGlucoseTrendsEdgeAndPersonalFloor(t *testing.T) {
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 14)
	for i := 0; i < 7; i++ {
		vals = append(vals, 110)
	}
	vals = append(vals, 100, 90, 82, 75, 68, 64, 62)

	ms := glucoseHistory(start, vals, 24*time.Hour)

	entryIdx := -1
	for i := range ms {
		points := extractTrendPoints(ms[:i+1], func(m domain.Measurement) (float64, bool) {
			return *m.Glucose.BloodGlucose, true
		})
		level, _ := decideTrendLevel(points, ms[i].CreatedAt, absGlucoseHypo, absGlucoseHypo, trendFalling)
		if level >= trendLevelWatch {
			entryIdx = i
			break
		}
	}
	if entryIdx < 0 {
		t.Fatal("expected falling series to enter watch")
	}

	vs := EvaluateFallingGlucoseTrends(ms[:entryIdx+1], &ms[entryIdx], nil, true)
	if len(vs) != 1 || vs[0].Rule != "trend_falling_watch" {
		t.Fatalf("expected falling watch edge, got %+v", vs)
	}
	if vs[0].Threshold != absGlucoseHypo {
		t.Fatalf("threshold=%v want clinical hypo %v", vs[0].Threshold, absGlucoseHypo)
	}

	last := ms[len(ms)-1]
	if again := EvaluateFallingGlucoseTrends(ms, &last, nil, true); len(again) != 0 {
		t.Fatalf("edge-only should not re-fire, got %+v", again)
	}

	personalMin := 70.0
	personal := &domain.Threshold{GlucoseMin: &personalMin}
	vsPers := EvaluateFallingGlucoseTrends(ms, &last, personal, false)
	if len(vsPers) == 0 {
		t.Fatal("expected falling watch with personal floor")
	}
	if vsPers[0].Threshold != 70 {
		t.Fatalf("watch threshold should be personal floor 70, got %v", vsPers[0].Threshold)
	}

	combined := EvaluateTrends(ms, &last, personal, nil, false)
	foundFalling := false
	for _, v := range combined {
		if v.Rule == "trend_falling_watch" {
			foundFalling = true
		}
	}
	if !foundFalling {
		t.Fatalf("EvaluateTrends should include falling glucose, got %+v", combined)
	}
}

func TestDecideTrendLevelFallingHighUsesClinicalFloor(t *testing.T) {
	// Long high baseline then two falling 7-day cycles ending at 58
	// (ProximityHigh 54/58 ≈ 0.93). Keep Z << -1 so reset does not clear.
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	vals := make([]float64, 0, 26)
	for i := 0; i < 12; i++ {
		vals = append(vals, 150)
	}
	vals = append(vals, 130, 115, 100, 90, 80, 72, 66)
	vals = append(vals, 75, 70, 66, 63, 61, 59, 58)

	ms := glucoseHistory(start, vals, 24*time.Hour)
	points := extractTrendPoints(ms, func(m domain.Measurement) (float64, bool) {
		return *m.Glucose.BloodGlucose, true
	})
	asOf := ms[len(ms)-1].CreatedAt
	watchFloor := trendWatchFloor(70, absGlucoseHypo) // 70
	level, metrics := decideTrendLevel(points, asOf, watchFloor, absGlucoseHypo, trendFalling)
	if level != trendLevelHigh {
		t.Fatalf("got level %d want high; metrics=%+v", level, metrics)
	}
	if metrics.ProximityHigh < proximityHighRatio {
		t.Fatalf("ProximityHigh=%v want >= 0.90 vs clinical 54", metrics.ProximityHigh)
	}
}
