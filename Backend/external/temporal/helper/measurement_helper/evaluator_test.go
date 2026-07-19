package measurement_helper

import (
	"testing"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

func mealPtr(m domain.MealTiming) *domain.MealTiming { return &m }

func TestCalculateViolationSeverity(t *testing.T) {
	tests := []struct {
		name       string
		vitalType  string
		observed   float64
		threshold  float64
		mealTiming *domain.MealTiming
		want       domain.Severity
	}{
		{"fever below NEWS2 top band remains info", "temperature", 39.0, 38.0, nil, domain.SeverityInfo},
		{"NEWS2 fever clinical cutoff", "temperature", 39.1, 38.5, nil, domain.SeverityHigh},
		{"NEWS2 hypothermia cutoff", "temperature", 35, 36, nil, domain.SeverityHigh},
		{"NEWS2 bradycardia cutoff", "heart_rate", 40, 50, nil, domain.SeverityHigh},
		{"NEWS2 tachycardia cutoff", "heart_rate", 131, 120, nil, domain.SeverityHigh},
		{"heart rate overshoot before clinical remains info", "heart_rate", 125, 100, nil, domain.SeverityInfo},
		{"heart rate past clinical via max", "heart_rate", 132, 100, nil, domain.SeverityHigh},
		{"NEWS2 low respiratory rate cutoff", "respiratory_rate", 8, 12, nil, domain.SeverityHigh},
		{"NEWS2 high respiratory rate cutoff", "respiratory_rate", 25, 22, nil, domain.SeverityHigh},
		{"NEWS2 SpO2 cutoff", "spo2", 91, 94, nil, domain.SeverityHigh},
		{"SpO2 above high cutoff small deviation", "spo2", 92, 94, nil, domain.SeverityInfo},
		{"ADA level 2 hypoglycemia", "glucose", 53, 70, nil, domain.SeverityHigh},
		{"ADA level 1 boundary remains info", "glucose", 54, 70, nil, domain.SeverityInfo},
		// QĐ 5481: fasting / nil → ≥126
		{"fasting hyperglycemia at 126 when mealTiming nil", "glucose", 126, 120, nil, domain.SeverityHigh},
		{"fasting hyperglycemia at 126 for pre_meal", "glucose", 126, 120, mealPtr(domain.MealTimingPreMeal), domain.SeverityHigh},
		{"fasting below 126 remains info", "glucose", 125, 110, mealPtr(domain.MealTimingPreMeal), domain.SeverityInfo},
		// QĐ 5481: post_meal → ≥200
		{"post_meal hyperglycemia at 200", "glucose", 200, 180, mealPtr(domain.MealTimingPostMeal), domain.SeverityHigh},
		{"post_meal below 200 remains info", "glucose", 199, 180, mealPtr(domain.MealTimingPostMeal), domain.SeverityInfo},
		{"post_meal 150 not clinical high", "glucose", 150, 140, mealPtr(domain.MealTimingPostMeal), domain.SeverityInfo},
		// personal 130 < clinical 160: bar = max(20, 30) = 30 → 155 stays info
		{"tight personal below clinical stays info mid-range", "blood_pressure_systolic", 155, 130, nil, domain.SeverityInfo},
		{"tight personal hits clinical via max", "blood_pressure_systolic", 160, 130, nil, domain.SeverityHigh},
		{"personal below clinical elevated by clinical floor", "blood_pressure_systolic", 165, 150, nil, domain.SeverityHigh},
		{"low systolic blood pressure", "blood_pressure_systolic", 90, 100, nil, domain.SeverityHigh},
		{"THA stage 1 diastolic hypertension", "blood_pressure_diastolic", 95, 90, nil, domain.SeverityInfo},
		{"THA stage 2 diastolic hypertension", "blood_pressure_diastolic", 100, 85, nil, domain.SeverityHigh},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := calculateViolationSeverity(tt.vitalType, tt.observed, tt.threshold, tt.mealTiming); got != tt.want {
				t.Fatalf("got %q want %q", got, tt.want)
			}
		})
	}
}

func TestEvaluateMeasurementGlucoseMealTiming(t *testing.T) {
	glucoseMax := 100.0
	glucose := 130.0
	postMeal := domain.MealTimingPostMeal
	preMeal := domain.MealTimingPreMeal

	t.Run("nil mealTiming defaults to fasting clinical 126", func(t *testing.T) {
		violations := EvaluateMeasurementAgainstThreshold(
			&domain.Measurement{Glucose: domain.Glucose{BloodGlucose: &glucose}},
			&domain.Threshold{GlucoseMax: &glucoseMax},
		)
		if len(violations) != 1 {
			t.Fatalf("got %d violations want 1", len(violations))
		}
		if violations[0].Severity != domain.SeverityHigh {
			t.Fatalf("got %q want high", violations[0].Severity)
		}
	})

	t.Run("pre_meal uses fasting clinical 126", func(t *testing.T) {
		violations := EvaluateMeasurementAgainstThreshold(
			&domain.Measurement{
				Glucose:    domain.Glucose{BloodGlucose: &glucose},
				MealTiming: &preMeal,
			},
			&domain.Threshold{GlucoseMax: &glucoseMax},
		)
		if violations[0].Severity != domain.SeverityHigh {
			t.Fatalf("got %q want high", violations[0].Severity)
		}
	})

	t.Run("post_meal 130 stays info below 200", func(t *testing.T) {
		violations := EvaluateMeasurementAgainstThreshold(
			&domain.Measurement{
				Glucose:    domain.Glucose{BloodGlucose: &glucose},
				MealTiming: &postMeal,
			},
			&domain.Threshold{GlucoseMax: &glucoseMax},
		)
		if len(violations) != 1 {
			t.Fatalf("got %d violations want 1", len(violations))
		}
		if violations[0].Severity != domain.SeverityInfo {
			t.Fatalf("got %q want info", violations[0].Severity)
		}
	})

	t.Run("post_meal 200 is high", func(t *testing.T) {
		g := 200.0
		violations := EvaluateMeasurementAgainstThreshold(
			&domain.Measurement{
				Glucose:    domain.Glucose{BloodGlucose: &g},
				MealTiming: &postMeal,
			},
			&domain.Threshold{GlucoseMax: &glucoseMax},
		)
		if violations[0].Severity != domain.SeverityHigh {
			t.Fatalf("got %q want high", violations[0].Severity)
		}
	})
}

func TestEvaluateMeasurementRequiresPersonalThresholdBreach(t *testing.T) {
	systolic := 150.0
	violations := EvaluateMeasurementAgainstThreshold(
		&domain.Measurement{BloodPressure: domain.BloodPressure{Systolic: &systolic}},
		&domain.Threshold{SysMax: 170},
	)

	if len(violations) != 0 {
		t.Fatalf("got %d violations want 0 when personal threshold is not breached", len(violations))
	}
}

func TestEvaluateMeasurementPersonalBreachInfoWhenBelowClinicalDistance(t *testing.T) {
	systolic := 150.0
	violations := EvaluateMeasurementAgainstThreshold(
		&domain.Measurement{BloodPressure: domain.BloodPressure{Systolic: &systolic}},
		&domain.Threshold{SysMax: 130},
	)

	if len(violations) != 1 {
		t.Fatalf("got %d violations want 1", len(violations))
	}
	if violations[0].Severity != domain.SeverityInfo {
		t.Fatalf("got %q want info", violations[0].Severity)
	}
	if violations[0].Source != domain.ViolationSourceThreshold {
		t.Fatalf("got source %q want threshold", violations[0].Source)
	}
}

func TestEvaluateMeasurementMaxOfDeviationAndClinical(t *testing.T) {
	systolic := 165.0
	violations := EvaluateMeasurementAgainstThreshold(
		&domain.Measurement{BloodPressure: domain.BloodPressure{Systolic: &systolic}},
		&domain.Threshold{SysMax: 150},
	)

	if len(violations) != 1 {
		t.Fatalf("got %d violations want 1", len(violations))
	}
	if violations[0].Severity != domain.SeverityHigh {
		t.Fatalf("got %q want high", violations[0].Severity)
	}
}

func TestEvaluateMeasurementPersonalBreachHighWhenClinicalCutoffHit(t *testing.T) {
	glucose := 52.0
	systolic := 185.0
	glucoseMin := 70.0
	glucoseMax := 180.0
	measurement := &domain.Measurement{
		BloodPressure: domain.BloodPressure{Systolic: &systolic},
		Glucose:       domain.Glucose{BloodGlucose: &glucose},
	}
	threshold := &domain.Threshold{
		SysMax:     140,
		GlucoseMin: &glucoseMin,
		GlucoseMax: &glucoseMax,
	}

	violations := EvaluateMeasurementAgainstThreshold(measurement, threshold)
	if len(violations) != 2 {
		t.Fatalf("got %d violations want 2", len(violations))
	}
	for _, violation := range violations {
		if violation.Severity != domain.SeverityHigh {
			t.Fatalf("%s: got %q want high", violation.Type, violation.Severity)
		}
		if violation.Source != domain.ViolationSourceThreshold {
			t.Fatalf("%s: got source %q want threshold", violation.Type, violation.Source)
		}
	}
}

func TestEvaluateMeasurementWidePersonalThresholdDoesNotAlertOnClinicalAlone(t *testing.T) {
	spo2 := 89.0
	violations := EvaluateMeasurementAgainstThreshold(
		&domain.Measurement{SpO2: &spo2},
		&domain.Threshold{SpO2Min: 85},
	)

	if len(violations) != 0 {
		t.Fatalf("got %d violations want 0 when personal floor is below clinical cutoff", len(violations))
	}
}

func TestEvaluateMeasurementPersonalBreachPromotedByClinicalCutoff(t *testing.T) {
	spo2 := 89.0
	violations := EvaluateMeasurementAgainstThreshold(
		&domain.Measurement{SpO2: &spo2},
		&domain.Threshold{SpO2Min: 94},
	)

	if len(violations) != 1 {
		t.Fatalf("got %d violations want 1", len(violations))
	}
	if violations[0].Severity != domain.SeverityHigh {
		t.Fatalf("got %q want high", violations[0].Severity)
	}
}

func TestAggregateSeverity(t *testing.T) {
	got := AggregateSeverity([]domain.ThresholdViolation{
		{Severity: domain.SeverityInfo},
		{Severity: domain.SeverityHigh},
	})
	if got != domain.SeverityHigh {
		t.Fatalf("got %q want high", got)
	}

	got = AggregateSeverity([]domain.ThresholdViolation{
		{Severity: domain.SeverityInfo},
	})
	if got != domain.SeverityInfo {
		t.Fatalf("got %q want info", got)
	}
}
