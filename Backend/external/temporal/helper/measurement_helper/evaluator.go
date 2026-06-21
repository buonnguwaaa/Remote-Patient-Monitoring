package measurement_helper

import (
	"math"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

func EvaluateMeasurementAgainstThreshold(m *domain.Measurement, t *domain.Threshold) []domain.ThresholdViolation {
	violations := []domain.ThresholdViolation{}

	// Temperature
	if m.Temperature != nil {
		v := *m.Temperature
		if t.TemperatureMax != 0 && v > t.TemperatureMax {
			violations = append(violations, domain.ThresholdViolation{
				Type: "temperature", Rule: "temperature_max",
				Observed: v, Threshold: t.TemperatureMax,
				Severity: calculateSeverity(v, t.TemperatureMax),
			})
		}
		if t.TemperatureMin != 0 && v < t.TemperatureMin {
			violations = append(violations, domain.ThresholdViolation{
				Type: "temperature", Rule: "temperature_min",
				Observed: v, Threshold: t.TemperatureMin,
				Severity: calculateSeverity(v, t.TemperatureMin),
			})
		}
	}

	// Heart Rate
	if m.HeartRate != nil {
		v := *m.HeartRate
		if t.HeartRateMax != 0 && v > t.HeartRateMax {
			violations = append(violations, domain.ThresholdViolation{
				Type: "heart_rate", Rule: "heart_rate_max",
				Observed: v, Threshold: t.HeartRateMax,
				Severity: calculateSeverity(v, t.HeartRateMax),
			})
		}
		if t.HeartRateMin != 0 && v < t.HeartRateMin {
			violations = append(violations, domain.ThresholdViolation{
				Type: "heart_rate", Rule: "heart_rate_min",
				Observed: v, Threshold: t.HeartRateMin,
				Severity: calculateSeverity(v, t.HeartRateMin),
			})
		}
	}

	// Respiratory Rate
	if m.RespiratoryRate != nil {
		v := *m.RespiratoryRate
		if t.RespiratoryRateMax != 0 && v > t.RespiratoryRateMax {
			violations = append(violations, domain.ThresholdViolation{
				Type: "respiratory_rate", Rule: "respiratory_rate_max",
				Observed: v, Threshold: t.RespiratoryRateMax,
				Severity: calculateSeverity(v, t.RespiratoryRateMax),
			})
		}
		if t.RespiratoryRateMin != 0 && v < t.RespiratoryRateMin {
			violations = append(violations, domain.ThresholdViolation{
				Type: "respiratory_rate", Rule: "respiratory_rate_min",
				Observed: v, Threshold: t.RespiratoryRateMin,
				Severity: calculateSeverity(v, t.RespiratoryRateMin),
			})
		}
	}

	// SpO2
	if m.SpO2 != nil {
		v := *m.SpO2
		if t.SpO2Min != 0 && v < t.SpO2Min {
			violations = append(violations, domain.ThresholdViolation{
				Type: "spo2", Rule: "spo2_min",
				Observed: v, Threshold: t.SpO2Min,
				Severity: calculateSeverity(v, t.SpO2Min),
			})
		}
	}

	// Blood Pressure - Systolic
	if m.BloodPressure.Systolic != nil {
		v := *m.BloodPressure.Systolic
		if t.SysMax != 0 && v > t.SysMax {
			violations = append(violations, domain.ThresholdViolation{
				Type: "blood_pressure_systolic", Rule: "bp_systolic_max",
				Observed: v, Threshold: t.SysMax,
				Severity: calculateSeverity(v, t.SysMax),
			})
		}
		if t.SysMin != 0 && v < t.SysMin {
			violations = append(violations, domain.ThresholdViolation{
				Type: "blood_pressure_systolic", Rule: "bp_systolic_min",
				Observed: v, Threshold: t.SysMin,
				Severity: calculateSeverity(v, t.SysMin),
			})
		}
	}

	// Blood Pressure - Diastolic
	if m.BloodPressure.Diastolic != nil {
		v := *m.BloodPressure.Diastolic
		if t.DiaMax != 0 && v > t.DiaMax {
			violations = append(violations, domain.ThresholdViolation{
				Type: "blood_pressure_diastolic", Rule: "bp_diastolic_max",
				Observed: v, Threshold: t.DiaMax,
				Severity: calculateSeverity(v, t.DiaMax),
			})
		}
		if t.DiaMin != 0 && v < t.DiaMin {
			violations = append(violations, domain.ThresholdViolation{
				Type: "blood_pressure_diastolic", Rule: "bp_diastolic_min",
				Observed: v, Threshold: t.DiaMin,
				Severity: calculateSeverity(v, t.DiaMin),
			})
		}
	}

	// Glucose
	if t.GlucoseMax != nil && m.Glucose != nil && *m.Glucose > *t.GlucoseMax {
		violations = append(violations, domain.ThresholdViolation{
			Type: "glucose", Rule: "glucose_max",
			Observed: *m.Glucose, Threshold: *t.GlucoseMax,
			Severity: calculateSeverity(*m.Glucose, *t.GlucoseMax),
		})
	}
	if t.GlucoseMin != nil && m.Glucose != nil && *m.Glucose < *t.GlucoseMin {
		violations = append(violations, domain.ThresholdViolation{
			Type: "glucose", Rule: "glucose_min",
			Observed: *m.Glucose, Threshold: *t.GlucoseMin,
			Severity: calculateSeverity(*m.Glucose, *t.GlucoseMin),
		})
	}

	return violations
}

// severityBands defines absolute deviation from the personalized threshold that maps to
// low / medium / high. Values are clinical step sizes, not percentages.
type severityBands struct {
	lowMax    float64
	mediumMax float64
}

var vitalSeverityBands = map[string]severityBands{
	// Fever/hypothermia: WHO-style steps beyond personal target.
	"temperature": {lowMax: 0.5, mediumMax: 1.5},
	// Resting heart rate: AHA monitoring increments.
	"heart_rate": {lowMax: 10, mediumMax: 25},
	// Adult respiratory rate (Resuscitation Council UK ranges).
	"respiratory_rate": {lowMax: 2, mediumMax: 6},
	// SpO2 deficit (% points below personalized minimum).
	"spo2": {lowMax: 2, mediumMax: 5},
	// Hypertension/hypotension systolic (mmHg beyond target).
	"blood_pressure_systolic": {lowMax: 10, mediumMax: 20},
	// Diastolic BP typically moves less than systolic.
	"blood_pressure_diastolic": {lowMax: 5, mediumMax: 15},
	// Capillary blood glucose (mg/dL beyond personalized target).
	"glucose": {lowMax: 20, mediumMax: 50},
}

func calculateViolationSeverity(vitalType string, observed, threshold float64) domain.Severity {
	bands, ok := vitalSeverityBands[vitalType]
	if !ok {
		return domain.SeverityMedium
	}

	severity := classifyDeviation(thresholdDeviation(observed, threshold), bands)
	return maxSeverity(severity, absoluteClinicalSeverity(vitalType, observed, threshold))
}

func thresholdDeviation(observed, threshold float64) float64 {
	return math.Abs(observed - threshold)
}

func classifyDeviation(deviation float64, bands severityBands) domain.Severity {
	switch {
	case deviation <= bands.lowMax:
		return domain.SeverityLow
	case deviation <= bands.mediumMax:
		return domain.SeverityMedium
	default:
		return domain.SeverityHigh
	}
}

// absoluteClinicalSeverity applies fixed cutoffs from standard guidelines regardless of ratio.
func absoluteClinicalSeverity(vitalType string, observed, threshold float64) domain.Severity {
	switch vitalType {
	case "spo2":
		switch {
		case observed < 88:
			return domain.SeverityHigh // severe hypoxemia
		case observed < 90:
			return domain.SeverityMedium
		}
	case "glucose":
		if observed < threshold {
			switch {
			case observed < 54:
				return domain.SeverityHigh // ADA level 3 hypoglycemia
			case observed < 70:
				return domain.SeverityMedium
			}
		} else if observed > threshold {
			switch {
			case observed >= 250:
				return domain.SeverityHigh
			case observed >= 180:
				return domain.SeverityMedium
			}
		}
	case "blood_pressure_systolic":
		switch {
		case observed >= 180:
			return domain.SeverityHigh // hypertensive crisis
		case observed >= 160:
			return domain.SeverityMedium // stage 2 hypertension
		case observed < 90:
			return domain.SeverityHigh // hypotensive shock risk
		case observed < 100:
			return domain.SeverityMedium
		}
	case "temperature":
		switch {
		case observed >= 40:
			return domain.SeverityHigh
		case observed >= 38.5:
			return domain.SeverityMedium
		case observed <= 35:
			return domain.SeverityHigh // hypothermia
		case observed <= 36:
			return domain.SeverityMedium
		}
	}

	return domain.SeverityLow
}

func maxSeverity(a, b domain.Severity) domain.Severity {
	if severityRank(a) >= severityRank(b) {
		return a
	}
	return b
}

func severityRank(severity domain.Severity) int {
	switch severity {
	case domain.SeverityHigh:
		return 3
	case domain.SeverityMedium:
		return 2
	case domain.SeverityLow:
		return 1
	default:
		return 0
	}
}

func AggregateSeverity(vs []domain.ThresholdViolation) domain.Severity {
	if len(vs) == 0 {
		return domain.SeverityLow
	}

	max := domain.SeverityLow
	for _, v := range vs {
		if severityRank(v.Severity) > severityRank(max) {
			max = v.Severity
		}
	}
	return max
}
