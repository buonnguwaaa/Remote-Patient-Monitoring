package activity

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

// This function checks the measurement against the threshold and returns an alert if any rule is violated.
func evaluateMeasurementAgainstThreshold(m *domain.Measurement, t *domain.Threshold) *domain.Alert {
	now := time.Now().UTC()

	// Temperature
	if t.TemperatureMax != 0 && m.Temperature > t.TemperatureMax {
		return &domain.Alert{
			Type:            "temperature",
			Rule:            "temperature_max",
			Observed:        m.Temperature,
			ThresholdAtTime: t.TemperatureMax,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.TemperatureMin != 0 && m.Temperature < t.TemperatureMin {
		return &domain.Alert{
			Type:            "temperature",
			Rule:            "temperature_min",
			Observed:        m.Temperature,
			ThresholdAtTime: t.TemperatureMin,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	// Heart rate
	if t.HeartRateMax != 0 && m.HeartRate > t.HeartRateMax {
		return &domain.Alert{
			Type:            "heartRate",
			Rule:            "heartRate_max",
			Observed:        m.HeartRate,
			ThresholdAtTime: t.HeartRateMax,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.HeartRateMin != 0 && m.HeartRate < t.HeartRateMin {
		return &domain.Alert{
			Type:            "heartRate",
			Rule:            "heartRate_min",
			Observed:        m.HeartRate,
			ThresholdAtTime: t.HeartRateMin,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	// Respiratory rate
	if t.RespiratoryRateMax != 0 && m.RespiratoryRate > t.RespiratoryRateMax {
		return &domain.Alert{
			Type:            "respiratoryRate",
			Rule:            "respiratoryRate_max",
			Observed:        m.RespiratoryRate,
			ThresholdAtTime: t.RespiratoryRateMax,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.RespiratoryRateMin != 0 && m.RespiratoryRate < t.RespiratoryRateMin {
		return &domain.Alert{
			Type:            "respiratoryRate",
			Rule:            "respiratoryRate_min",
			Observed:        m.RespiratoryRate,
			ThresholdAtTime: t.RespiratoryRateMin,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	// SpO2 (lower is bad)
	if t.SpO2Min != 0 && m.SpO2 < t.SpO2Min {
		return &domain.Alert{
			Type:            "spo2",
			Rule:            "spo2_min",
			Observed:        m.SpO2,
			ThresholdAtTime: t.SpO2Min,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	// Blood pressure (systolic / diastolic)
	if t.SysMax != 0 && m.BloodPressure.Systolic > t.SysMax {
		return &domain.Alert{
			Type:            "bloodPressure",
			Rule:            "systolic_max",
			Observed:        m.BloodPressure.Systolic,
			ThresholdAtTime: t.SysMax,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.DiaMax != 0 && m.BloodPressure.Diastolic > t.DiaMax {
		return &domain.Alert{
			Type:            "bloodPressure",
			Rule:            "diastolic_max",
			Observed:        m.BloodPressure.Diastolic,
			ThresholdAtTime: t.DiaMax,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.SysMin != 0 && m.BloodPressure.Systolic < t.SysMin {
		return &domain.Alert{
			Type:            "bloodPressure",
			Rule:            "systolic_min",
			Observed:        m.BloodPressure.Systolic,
			ThresholdAtTime: t.SysMin,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.DiaMin != 0 && m.BloodPressure.Diastolic < t.DiaMin {
		return &domain.Alert{
			Type:            "bloodPressure",
			Rule:            "diastolic_min",
			Observed:        m.BloodPressure.Diastolic,
			ThresholdAtTime: t.DiaMin,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	// Glucose (optional pointers)
	if t.GlucoseMax != nil && m.Glucose != nil && *m.Glucose > *t.GlucoseMax {
		return &domain.Alert{
			Type:            "glucose",
			Rule:            "glucose_max",
			Observed:        *m.Glucose,
			ThresholdAtTime: *t.GlucoseMax,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}
	if t.GlucoseMin != nil && m.Glucose != nil && *m.Glucose < *t.GlucoseMin {
		return &domain.Alert{
			Type:            "glucose",
			Rule:            "glucose_min",
			Observed:        *m.Glucose,
			ThresholdAtTime: *t.GlucoseMin,
			Severity:        domain.SeverityHigh,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
	}

	return nil // Return nil as there is no violation
}
