package service

import domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"

func validateDoctorCredentials(degree domain.AcademicDegree, title domain.AcademicTitle) error {
	if err := domain.ValidateCredentials(degree, title); err != nil {
		return &ValidationError{
			Field:   "academicTitle",
			Message: "Giáo sư/Phó Giáo sư yêu cầu học vị Tiến sĩ.",
		}
	}
	return nil
}
