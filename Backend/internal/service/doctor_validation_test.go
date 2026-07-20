package service

import (
	"testing"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

func TestValidateDoctorCredentials(t *testing.T) {
	if err := validateDoctorCredentials(domain.AcademicDegreePhD, domain.AcademicTitleProfessor); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}

	err := validateDoctorCredentials(domain.AcademicDegreeMaster, domain.AcademicTitleAssociateProfessor)
	if err == nil {
		t.Fatal("expected validation error")
	}
	validationErr, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("expected ValidationError, got %T", err)
	}
	if validationErr.Field != "academicTitle" {
		t.Fatalf("field = %q", validationErr.Field)
	}
}
