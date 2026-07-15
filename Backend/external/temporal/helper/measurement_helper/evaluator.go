package measurement_helper

import (
	"math"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

// EvaluateMeasurementAgainstThreshold compares a measurement to a personalized
// Threshold. A value becomes a violation only when it crosses the personal
// limit. Severity is max(deviationSeverity, clinicalSeverity): high if the
// overshoot past personal is larger than the clinical-derived bar, or if the
// absolute reading hits a guideline safety cutoff; otherwise info.
//
// Glucose hyperglycemia cutoffs follow QĐ 5481/QĐ-BYT (30/12/2020) by meal:
//
//	pre_meal / nil (mặc định chưa ăn): ≥126 mg/dL
//	post_meal:                         ≥200 mg/dL
func EvaluateMeasurementAgainstThreshold(m *domain.Measurement, t *domain.Threshold) []domain.ThresholdViolation {
	violations := []domain.ThresholdViolation{}

	appendViolation := func(vitalType, rule string, observed, threshold float64) {
		violations = append(violations, domain.ThresholdViolation{
			Type:      vitalType,
			Rule:      rule,
			Observed:  observed,
			Threshold: threshold,
			Severity:  calculateViolationSeverity(vitalType, observed, threshold, m.MealTiming),
		})
	}

	// Temperature
	if m.Temperature != nil {
		v := *m.Temperature
		if t.TemperatureMax != 0 && v > t.TemperatureMax {
			appendViolation("temperature", "temperature_max", v, t.TemperatureMax)
		}
		if t.TemperatureMin != 0 && v < t.TemperatureMin {
			appendViolation("temperature", "temperature_min", v, t.TemperatureMin)
		}
	}

	// Heart Rate
	if m.HeartRate != nil {
		v := *m.HeartRate
		if t.HeartRateMax != 0 && v > t.HeartRateMax {
			appendViolation("heart_rate", "heart_rate_max", v, t.HeartRateMax)
		}
		if t.HeartRateMin != 0 && v < t.HeartRateMin {
			appendViolation("heart_rate", "heart_rate_min", v, t.HeartRateMin)
		}
	}

	// Respiratory Rate
	if m.RespiratoryRate != nil {
		v := *m.RespiratoryRate
		if t.RespiratoryRateMax != 0 && v > t.RespiratoryRateMax {
			appendViolation("respiratory_rate", "respiratory_rate_max", v, t.RespiratoryRateMax)
		}
		if t.RespiratoryRateMin != 0 && v < t.RespiratoryRateMin {
			appendViolation("respiratory_rate", "respiratory_rate_min", v, t.RespiratoryRateMin)
		}
	}

	// SpO2
	if m.SpO2 != nil {
		v := *m.SpO2
		if t.SpO2Min != 0 && v < t.SpO2Min {
			appendViolation("spo2", "spo2_min", v, t.SpO2Min)
		}
	}

	// Blood Pressure - Systolic
	if m.BloodPressure.Systolic != nil {
		v := *m.BloodPressure.Systolic
		if t.SysMax != 0 && v > t.SysMax {
			appendViolation("blood_pressure_systolic", "bp_systolic_max", v, t.SysMax)
		}
		if t.SysMin != 0 && v < t.SysMin {
			appendViolation("blood_pressure_systolic", "bp_systolic_min", v, t.SysMin)
		}
	}

	// Blood Pressure - Diastolic
	if m.BloodPressure.Diastolic != nil {
		v := *m.BloodPressure.Diastolic
		if t.DiaMax != 0 && v > t.DiaMax {
			appendViolation("blood_pressure_diastolic", "bp_diastolic_max", v, t.DiaMax)
		}
		if t.DiaMin != 0 && v < t.DiaMin {
			appendViolation("blood_pressure_diastolic", "bp_diastolic_min", v, t.DiaMin)
		}
	}

	// Glucose
	if m.Glucose.BloodGlucose != nil {
		v := *m.Glucose.BloodGlucose
		if t.GlucoseMax != nil && v > *t.GlucoseMax {
			appendViolation("glucose", "glucose_max", v, *t.GlucoseMax)
		}
		if t.GlucoseMin != nil && v < *t.GlucoseMin {
			appendViolation("glucose", "glucose_min", v, *t.GlucoseMin)
		}
	}

	return violations
}

// clinicalBounds holds the guideline cutoff on each side plus the normal→cutoff
// span used when the personal threshold sits beyond that cutoff.
//
// Cutoffs / spans (same sources as absoluteClinicalSeverity):
//
//	temperature:              NEWS2 ≤35.0 / ≥39.1; spans from score 0 edges 36.1 / 38.0
//	heart_rate:               NEWS2 ≤40 / ≥131; spans from 51 / 90
//	respiratory_rate:         NEWS2 ≤8 / ≥25; spans from 12 / 20
//	spo2:                     NEWS2 Scale 1 ≤91; span from 96
//	blood_pressure_systolic:  ≤90 / THA độ 2 ≥160; spans 111→90, 140→160
//	blood_pressure_diastolic: THA độ 2 ≥100; span 90→100
//	glucose:                  see glucoseClinicalBounds (QĐ 5481 by meal + ADA hypo)
type clinicalBounds struct {
	maxCutoff float64
	minCutoff float64
	maxSpan   float64
	minSpan   float64
}

var vitalClinicalBounds = map[string]clinicalBounds{
	"temperature":              {maxCutoff: 39.1, minCutoff: 35, maxSpan: 1.1, minSpan: 1.1},
	"heart_rate":               {maxCutoff: 131, minCutoff: 40, maxSpan: 41, minSpan: 11},
	"respiratory_rate":         {maxCutoff: 25, minCutoff: 8, maxSpan: 5, minSpan: 4},
	"spo2":                     {minCutoff: 91, minSpan: 5},
	"blood_pressure_systolic":  {maxCutoff: 160, minCutoff: 90, maxSpan: 20, minSpan: 21},
	"blood_pressure_diastolic": {maxCutoff: 100, maxSpan: 10},
}

// effectiveMealTiming defaults nil / empty to pre_meal (chưa ăn), matching
// QĐ 5481 fasting plasma glucose criterion when meal context is unknown.
func effectiveMealTiming(mealTiming *domain.MealTiming) domain.MealTiming {
	if mealTiming == nil || *mealTiming == "" {
		return domain.MealTimingPreMeal
	}
	return *mealTiming
}

// glucoseClinicalBounds — QĐ 5481/QĐ-BYT 30/12/2020:
//
//	a) lúc đói (pre_meal) ≥126 mg/dL
//	b) sau 2 giờ OGTT / post_meal ≥200 mg/dL
//
// Hypo floor remains ADA/BYT level 2 <54; spans use BYT treatment targets
// (đói 80–130 → ~100→126; sau ăn <180 → 180→200).
func glucoseClinicalBounds(mealTiming *domain.MealTiming) clinicalBounds {
	if effectiveMealTiming(mealTiming) == domain.MealTimingPostMeal {
		return clinicalBounds{maxCutoff: 200, minCutoff: 54, maxSpan: 20, minSpan: 16}
	}
	return clinicalBounds{maxCutoff: 126, minCutoff: 54, maxSpan: 26, minSpan: 16}
}

func clinicalBoundsFor(vitalType string, mealTiming *domain.MealTiming) (clinicalBounds, bool) {
	if vitalType == "glucose" {
		return glucoseClinicalBounds(mealTiming), true
	}
	b, ok := vitalClinicalBounds[vitalType]
	return b, ok
}

// requiredDeviationHigh is how far past the personal threshold a reading must
// go before deviation alone is high.
//
// When personal is stricter than the clinical cutoff (e.g. SysMax 130 < 160),
// the bar is max(normal→clinical span, |clinicalCutoff − personal|) so a modest
// overshoot stays info until the patient-specific clinical distance is covered.
// Absolute clinical severity is still applied separately via maxSeverity.
func requiredDeviationHigh(vitalType string, observed, personal float64, mealTiming *domain.MealTiming) (float64, bool) {
	b, ok := clinicalBoundsFor(vitalType, mealTiming)
	if !ok {
		return 0, false
	}

	if observed > personal {
		req := b.maxSpan
		if b.maxCutoff != 0 && b.maxCutoff > personal {
			req = math.Max(req, b.maxCutoff-personal)
		}
		return req, req > 0
	}

	req := b.minSpan
	if b.minCutoff != 0 && b.minCutoff < personal {
		req = math.Max(req, personal-b.minCutoff)
	}
	return req, req > 0
}

func deviationSeverity(vitalType string, observed, personal float64, mealTiming *domain.MealTiming) domain.Severity {
	req, ok := requiredDeviationHigh(vitalType, observed, personal, mealTiming)
	if ok && math.Abs(observed-personal) > req {
		return domain.SeverityHigh
	}
	return domain.SeverityInfo
}

func maxSeverity(a, b domain.Severity) domain.Severity {
	if a == domain.SeverityHigh || b == domain.SeverityHigh {
		return domain.SeverityHigh
	}
	return domain.SeverityInfo
}

// calculateViolationSeverity is max(deviation from personal, absolute clinical).
func calculateViolationSeverity(vitalType string, observed, threshold float64, mealTiming *domain.MealTiming) domain.Severity {
	return maxSeverity(
		deviationSeverity(vitalType, observed, threshold, mealTiming),
		absoluteClinicalSeverity(vitalType, observed, mealTiming),
	)
}

func absoluteClinicalSeverity(vitalType string, observed float64, mealTiming *domain.MealTiming) domain.Severity {
	switch vitalType {
	case "temperature":
		// NEWS2: ≤35.0 score 3 (hypothermia); ≥39.1 is the top fever band
		// (score 2 — NEWS2 has no fever score 3).
		if observed <= 35 || observed >= 39.1 {
			return domain.SeverityHigh
		}
	case "heart_rate":
		if observed <= 40 || observed >= 131 {
			return domain.SeverityHigh // NEWS2 score 3
		}
	case "respiratory_rate":
		if observed <= 8 || observed >= 25 {
			return domain.SeverityHigh // NEWS2 score 3
		}
	case "spo2":
		if observed <= 91 {
			return domain.SeverityHigh // NEWS2 Scale 1 score 3
		}
	case "glucose":
		// ADA/BYT: level 2 hypoglycemia <54 mg/dL.
		// Hyperglycemia — QĐ 5481/QĐ-BYT 30/12/2020:
		//   pre_meal / nil (chưa ăn): ≥126 mg/dL (glucose huyết tương lúc đói)
		//   post_meal:                ≥200 mg/dL (sau 2 giờ OGTT 75g)
		if observed < 54 {
			return domain.SeverityHigh
		}
		if effectiveMealTiming(mealTiming) == domain.MealTimingPostMeal {
			if observed >= 200 {
				return domain.SeverityHigh
			}
			break
		}
		if observed >= 126 {
			return domain.SeverityHigh
		}
	case "blood_pressure_systolic":
		if observed <= 90 || observed >= 160 {
			return domain.SeverityHigh // hypotension or THA độ 2 (QĐ 3192/QĐ-BYT)
		}
	case "blood_pressure_diastolic":
		if observed >= 100 {
			return domain.SeverityHigh // THA độ 2 (QĐ 3192/QĐ-BYT)
		}
	}

	return domain.SeverityInfo
}

func AggregateSeverity(vs []domain.ThresholdViolation) domain.Severity {
	for _, v := range vs {
		if v.Severity == domain.SeverityHigh {
			return domain.SeverityHigh
		}
	}
	return domain.SeverityInfo
}
