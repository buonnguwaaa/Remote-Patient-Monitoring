package measurement_helper

import (
	"math"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

// EvaluateMeasurementAgainstThreshold compares a measurement to a personalized
// Threshold. A value becomes a violation only when it crosses the personal
// limit. Severity is then max(deviationFromPersonal, absoluteClinicalFloor)
// so personalized targets still drive alerts while guideline cutoffs raise
// severity when the absolute reading is clinically dangerous.
//
// Clinical sources (see comments on absoluteClinicalSeverity / vitalSeverityBands):
//   - BYT 3192/QĐ-BYT (2010) + VSH/VNHA 2021: blood pressure stages / crisis
//   - Bệnh viện Lão khoa TW: BP hypotension, pulse, RR, fever grades
//   - BVĐK Tâm Anh: hypothermia grades
//   - Vinmec: SpO2 scale
//   - BYT 5481/QĐ-BYT (2020): hypoglycemia levels + hyperglycemia targets
func EvaluateMeasurementAgainstThreshold(m *domain.Measurement, t *domain.Threshold) []domain.ThresholdViolation {
	violations := []domain.ThresholdViolation{}

	appendViolation := func(vitalType, rule string, observed, threshold float64) {
		violations = append(violations, domain.ThresholdViolation{
			Type:      vitalType,
			Rule:      rule,
			Observed:  observed,
			Threshold: threshold,
			Severity:  calculateViolationSeverity(vitalType, observed, threshold),
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
	if t.GlucoseMax != nil && m.Glucose.BloodGlucose != nil && *m.Glucose.BloodGlucose > *t.GlucoseMax {
		appendViolation("glucose", "glucose_max", *m.Glucose.BloodGlucose, *t.GlucoseMax)
	}
	if t.GlucoseMin != nil && m.Glucose.BloodGlucose != nil && *m.Glucose.BloodGlucose < *t.GlucoseMin {
		appendViolation("glucose", "glucose_min", *m.Glucose.BloodGlucose, *t.GlucoseMin)
	}

	return violations
}

// severityBands maps |observed − personalThreshold| → low / medium / high.
// Band widths follow clinical stage step sizes from the cited guidelines so
// personalization still grades "how far past my target", while
// absoluteClinicalSeverity remains the safety floor.
type severityBands struct {
	lowMax    float64
	mediumMax float64
}

// vitalSeverityBands — step sizes derived from guideline stage widths:
//
//   blood_pressure_systolic: BYT 3192 / VSH 2021 độ1 width ≈20 mmHg (140–159),
//     độ2≈20 mmHg (160–179) before crisis ≥180.
//   blood_pressure_diastolic: độ1≈10 (90–99), độ2≈10 (100–109) before ≥110.
//   temperature: Lão khoa fever grades in ~1°C steps (37–38 / 38–39 / 39–40 / >40).
//   heart_rate / respiratory_rate: sources only define normal vs abnormal
//     (no graded severity) — bands are operational half-widths of the normal
//     range so personalization still yields 3 levels (see gaps in package docs).
//   spo2: steps between <94 / <92 / <90 clinical floors (~2 pp each).
//   glucose: spacing between BYT 5481 hypo level-1 and level-2 (~16 mg/dL)
//     and overshoot toward very-high (≥300) vs postprandial target (180).
var vitalSeverityBands = map[string]severityBands{
	"temperature":              {lowMax: 1.0, mediumMax: 2.0},
	"heart_rate":               {lowMax: 10, mediumMax: 20},
	"respiratory_rate":         {lowMax: 2, mediumMax: 4},
	"spo2":                     {lowMax: 4, mediumMax: 6},
	"blood_pressure_systolic":  {lowMax: 20, mediumMax: 40},
	"blood_pressure_diastolic": {lowMax: 10, mediumMax: 20},
	"glucose":                  {lowMax: 16, mediumMax: 50},
}

func calculateViolationSeverity(vitalType string, observed, threshold float64) domain.Severity {
	bands, ok := vitalSeverityBands[vitalType]
	if !ok {
		return domain.SeverityMedium
	}

	severity := classifyDeviation(thresholdDeviation(observed, threshold), bands)
	return maxSeverity(severity, absoluteClinicalSeverity(vitalType, observed))
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

// absoluteClinicalSeverity applies fixed guideline cutoffs independent of the
// personalized threshold (safety floor).
//
// Blood pressure — BYT 3192/QĐ-BYT 2010 Bảng 2 / phân tầng nguy cơ + VSH/VNHA
// 2021 (THA độ 1/2, Cơn THA) + Lão khoa TW (hạ HA <90/<60; cơn tăng HA):
//   high:   SBP ≥180 or DBP ≥110 (độ 3 / cơn THA); SBP <90 or DBP <60 (hạ HA)
//   medium: SBP ≥160 or DBP ≥100 (THA độ 2)
//
// Temperature — Lão khoa TW sốt grades + Tâm Anh (hạ thân nhiệt <35°C):
//   tăng: sốt nhẹ 37–38 → low (via personal overshoot); sốt vừa 38–39 → medium;
//         sốt cao ≥39 (39–40 và >40) → high
//   hạ:   <36 → medium; ≤35 → high
//
// Heart rate — Lão khoa TW: nghỉ 60–100; chậm <60; nhanh >100.
//   Source has no graded severity → absolute floor is medium only when abnormal.
//
// Respiratory rate — Lão khoa TW: người lớn 16–20/phút; no numeric severity grades.
//   Absolute floor is medium only when outside 16–20.
//
// SpO2 — Vinmec scale, graded for RPM:
//   low:    <94 and ≥92
//   medium: <92 and ≥90
//   high:   <90 (medical emergency)
//
// Glucose — BYT 5481/QĐ-BYT 2020 §Phân mức độ hạ đường huyết + mục tiêu ĐTĐ:
//   hypo medium: <70 and ≥54 mg/dL (mức độ 1)
//   hypo high:   <54 mg/dL (mức độ 2; mức độ 3 needs clinical context)
//   hyper medium: ≥180 mg/dL (vượt mục tiêu sau ăn)
//   hyper high:   ≥300 mg/dL (ngưỡng cân nhắc insulin sớm / glucose rất cao)
func absoluteClinicalSeverity(vitalType string, observed float64) domain.Severity {
	switch vitalType {
	case "blood_pressure_systolic":
		switch {
		case observed >= 180, observed < 90:
			return domain.SeverityHigh
		case observed >= 160:
			return domain.SeverityMedium
		}
	case "blood_pressure_diastolic":
		switch {
		case observed >= 110, observed < 60:
			return domain.SeverityHigh
		case observed >= 100:
			return domain.SeverityMedium
		}
	case "temperature":
		switch {
		case observed >= 39, observed <= 35:
			return domain.SeverityHigh
		case observed >= 38, observed < 36:
			return domain.SeverityMedium
		}
	case "heart_rate":
		if observed < 60 || observed > 100 {
			return domain.SeverityMedium
		}
	case "respiratory_rate":
		if observed < 16 || observed > 20 {
			return domain.SeverityMedium
		}
	case "spo2":
		switch {
		case observed < 90:
			return domain.SeverityHigh
		case observed < 92:
			return domain.SeverityMedium
		case observed < 94:
			return domain.SeverityLow
		}
	case "glucose":
		switch {
		case observed < 54:
			return domain.SeverityHigh
		case observed < 70:
			return domain.SeverityMedium
		case observed >= 300:
			return domain.SeverityHigh
		case observed >= 180:
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
