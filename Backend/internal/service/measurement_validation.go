package service

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

func validateMeasurementForPatient(
	patient *userDomain.Patient,
	measurementType domain.MeasurementType,
	bloodPressure domain.BloodPressure,
	glucose domain.Glucose,
	mealTiming *domain.MealTiming,
) error {
	if len(patient.MonitoringTypes) == 0 {
		return &ValidationError{
			Field:   "monitoringTypes",
			Message: "Bệnh nhân chưa được đăng ký loại theo dõi nào.",
		}
	}

	if !patient.AllowsMeasurementType(string(measurementType)) {
		return &ValidationError{
			Field:   "type",
			Message: "Bệnh nhân không được phép ghi nhận loại đo này.",
		}
	}

	switch measurementType {
	case domain.TypeBloodPressure:
		if glucose.HasData() {
			return &ValidationError{
				Field:   "glucose",
				Message: "Không được nhập glucose cho bệnh nhân theo dõi huyết áp.",
			}
		}
		if mealTiming != nil {
			return &ValidationError{
				Field:   "mealTiming",
				Message: "mealTiming chỉ áp dụng cho đo glucose.",
			}
		}
	case domain.TypeGlucose:
		if bloodPressure.Systolic != 0 || bloodPressure.Diastolic != 0 || bloodPressure.Salt != nil {
			return &ValidationError{
				Field:   "bloodPressure",
				Message: "Không được nhập huyết áp cho bệnh nhân theo dõi glucose.",
			}
		}
	}

	return nil
}
