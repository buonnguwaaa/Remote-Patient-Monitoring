package measurement_helper

import (
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

func calculateSeverity(observed, threshold float64) domain.Severity {
	if threshold == 0 {
		return domain.SeverityHigh
	}
	diffRatio := (observed - threshold) / threshold
	if diffRatio < 0 {
		diffRatio = -diffRatio
	}
	if diffRatio < 0.05 {
		return domain.SeverityInfo
	}
	return domain.SeverityHigh
}

func AggregateSeverity(vs []domain.ThresholdViolation) domain.Severity {
	for _, v := range vs {
		if v.Severity == domain.SeverityHigh {
			return domain.SeverityHigh
		}
	}
	return domain.SeverityInfo
}
