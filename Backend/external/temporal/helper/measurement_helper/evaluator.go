package measurement_helper

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

// This function checks the measurement against the threshold and returns an alert if any rule is violated.
func EvaluateMeasurementAgainstThreshold(m *domain.Measurement, t *domain.Threshold) []domain.ThresholdViolation {
	violations := []domain.ThresholdViolation{}

	// Temperature
	if t.TemperatureMax != 0 && m.Temperature > t.TemperatureMax {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "temperature",
			Rule:      "temperature_max",
			Observed:  m.Temperature,
			Threshold: t.TemperatureMax,
			Severity:  calculateSeverity(m.Temperature, t.TemperatureMax),
		})
	}
	if t.TemperatureMin != 0 && m.Temperature < t.TemperatureMin {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "temperature",
			Rule:      "temperature_min",
			Observed:  m.Temperature,
			Threshold: t.TemperatureMin,
			Severity:  calculateSeverity(m.Temperature, t.TemperatureMin),
		})
	}

	// Heart Rate
	if t.HeartRateMax != 0 && m.HeartRate > t.HeartRateMax {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "heart_rate",
			Rule:      "heart_rate_max",
			Observed:  m.HeartRate,
			Threshold: t.HeartRateMax,
			Severity:  calculateSeverity(m.HeartRate, t.HeartRateMax),
		})
	}
	if t.HeartRateMin != 0 && m.HeartRate < t.HeartRateMin {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "heart_rate",
			Rule:      "heart_rate_min",
			Observed:  m.HeartRate,
			Threshold: t.HeartRateMin,
			Severity:  calculateSeverity(m.HeartRate, t.HeartRateMin),
		})
	}

	// Respiratory Rate
	if t.RespiratoryRateMax != 0 && m.RespiratoryRate > t.RespiratoryRateMax {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "respiratory_rate",
			Rule:      "respiratory_rate_max",
			Observed:  m.RespiratoryRate,
			Threshold: t.RespiratoryRateMax,
			Severity:  calculateSeverity(m.RespiratoryRate, t.RespiratoryRateMax),
		})
	}
	if t.RespiratoryRateMin != 0 && m.RespiratoryRate < t.RespiratoryRateMin {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "respiratory_rate",
			Rule:      "respiratory_rate_min",
			Observed:  m.RespiratoryRate,
			Threshold: t.RespiratoryRateMin,
			Severity:  calculateSeverity(m.RespiratoryRate, t.RespiratoryRateMin),
		})
	}

	// SpO2
	if t.SpO2Min != 0 && m.SpO2 < t.SpO2Min {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "spo2",
			Rule:      "spo2_min",
			Observed:  m.SpO2,
			Threshold: t.SpO2Min,
			Severity:  calculateSeverity(m.SpO2, t.SpO2Min),
		})
	}

	// Blood Pressure - Systolic
	if t.SysMax != 0 && m.BloodPressure.Systolic > t.SysMax {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "blood_pressure_systolic",
			Rule:      "bp_systolic_max",
			Observed:  m.BloodPressure.Systolic,
			Threshold: t.SysMax,
			Severity:  calculateSeverity(m.BloodPressure.Systolic, t.SysMax),
		})
	}
	if t.SysMin != 0 && m.BloodPressure.Systolic < t.SysMin {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "blood_pressure_systolic",
			Rule:      "bp_systolic_min",
			Observed:  m.BloodPressure.Systolic,
			Threshold: t.SysMin,
			Severity:  calculateSeverity(m.BloodPressure.Systolic, t.SysMin),
		})
	}

	// Blood Pressure - Diastolic
	if t.DiaMax != 0 && m.BloodPressure.Diastolic > t.DiaMax {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "blood_pressure_diastolic",
			Rule:      "bp_diastolic_max",
			Observed:  m.BloodPressure.Diastolic,
			Threshold: t.DiaMax,
			Severity:  calculateSeverity(m.BloodPressure.Diastolic, t.DiaMax),
		})
	}
	if t.DiaMin != 0 && m.BloodPressure.Diastolic < t.DiaMin {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "blood_pressure_diastolic",
			Rule:      "bp_diastolic_min",
			Observed:  m.BloodPressure.Diastolic,
			Threshold: t.DiaMin,
			Severity:  calculateSeverity(m.BloodPressure.Diastolic, t.DiaMin),
		})
	}

	// Glucose
	if t.GlucoseMax != nil && m.Glucose.BloodGlucose != nil && *m.Glucose.BloodGlucose > *t.GlucoseMax {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "glucose",
			Rule:      "glucose_max",
			Observed:  *m.Glucose.BloodGlucose,
			Threshold: *t.GlucoseMax,
			Severity:  calculateSeverity(*m.Glucose.BloodGlucose, *t.GlucoseMax),
		})
	}
	if t.GlucoseMin != nil && m.Glucose.BloodGlucose != nil && *m.Glucose.BloodGlucose < *t.GlucoseMin {
		violations = append(violations, domain.ThresholdViolation{
			Type:      "glucose",
			Rule:      "glucose_min",
			Observed:  *m.Glucose.BloodGlucose,
			Threshold: *t.GlucoseMin,
			Severity:  calculateSeverity(*m.Glucose.BloodGlucose, *t.GlucoseMin),
		})
	}

	return violations
}

// This is only a simple severity calculation based on how much the observed value deviates from the threshold.
// [TODO] Enhance the logic for each type of sign
func calculateSeverity(observed, threshold float64) domain.Severity {
	if threshold == 0 {
		return domain.SeverityHigh
	}

	diffRatio := (observed - threshold) / threshold
	if diffRatio < 0 {
		diffRatio = -diffRatio
	}

	if diffRatio < 0.05 { // <5%
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
