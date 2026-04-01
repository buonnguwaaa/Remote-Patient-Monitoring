package service

import (
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
)

var (
	patientPhonePattern     = regexp.MustCompile(`^\+?\d{9,15}$`)
	patientCCCDPattern      = regexp.MustCompile(`^\d{12}$`)
	patientInsurancePattern = regexp.MustCompile(`^[A-Z0-9]{10,15}$`)
)

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

type ConflictError struct {
	Field   string
	Message string
}

func (e *ConflictError) Error() string {
	return e.Message
}

func normalizePhone(value string) string {
	replacer := strings.NewReplacer(
		" ", "",
		"-", "",
		".", "",
		"(", "",
		")", "",
	)
	return replacer.Replace(strings.TrimSpace(value))
}

func sanitizePatientProfileFields(input *usecase.PatientProfileFieldsInput) {
	input.InsuranceNumber = strings.ToUpper(strings.TrimSpace(input.InsuranceNumber))
	input.CCCD = strings.TrimSpace(input.CCCD)
	input.EmergencyContactName = strings.TrimSpace(input.EmergencyContactName)
	input.EmergencyContactPhone = normalizePhone(input.EmergencyContactPhone)
	input.MedicalHistory = strings.TrimSpace(input.MedicalHistory)
}

func sanitizePatientProfileInput(input *usecase.UpdatePatientProfileInput) {
	input.Name = strings.TrimSpace(input.Name)
	input.Phone = normalizePhone(input.Phone)
	sanitizePatientProfileFields(&input.PatientProfileFieldsInput)
}

func validatePatientProfileUpdate(input *usecase.UpdatePatientProfileInput) error {
	sanitizePatientProfileInput(input)

	nameLength := utf8.RuneCountInString(input.Name)
	if input.Name == "" {
		return &ValidationError{Field: "name", Message: "Họ tên bệnh nhân là bắt buộc."}
	}
	if nameLength < 2 || nameLength > 120 {
		return &ValidationError{Field: "name", Message: "Họ tên phải từ 2 đến 120 ký tự."}
	}

	if input.Phone != "" && !patientPhonePattern.MatchString(input.Phone) {
		return &ValidationError{Field: "phone", Message: "Số điện thoại phải gồm 9 đến 15 chữ số."}
	}

	if input.InsuranceNumber != "" && !patientInsurancePattern.MatchString(input.InsuranceNumber) {
		return &ValidationError{Field: "insuranceNumber", Message: "Số BHYT chỉ gồm chữ in hoa và số, dài 10 đến 15 ký tự."}
	}

	if input.CCCD != "" && !patientCCCDPattern.MatchString(input.CCCD) {
		return &ValidationError{Field: "cccd", Message: "CCCD phải gồm đúng 12 chữ số."}
	}

	hasEmergencyName := input.EmergencyContactName != ""
	hasEmergencyPhone := input.EmergencyContactPhone != ""
	if hasEmergencyName != hasEmergencyPhone {
		if !hasEmergencyName {
			return &ValidationError{Field: "emergencyContactName", Message: "Vui lòng nhập tên người liên hệ khẩn cấp."}
		}
		return &ValidationError{Field: "emergencyContactPhone", Message: "Vui lòng nhập số điện thoại người liên hệ khẩn cấp."}
	}

	if hasEmergencyName {
		contactNameLength := utf8.RuneCountInString(input.EmergencyContactName)
		if contactNameLength < 2 || contactNameLength > 120 {
			return &ValidationError{Field: "emergencyContactName", Message: "Tên người liên hệ khẩn cấp phải từ 2 đến 120 ký tự."}
		}
	}

	if hasEmergencyPhone && !patientPhonePattern.MatchString(input.EmergencyContactPhone) {
		return &ValidationError{Field: "emergencyContactPhone", Message: "Số điện thoại khẩn cấp phải gồm 9 đến 15 chữ số."}
	}

	if utf8.RuneCountInString(input.MedicalHistory) > 2000 {
		return &ValidationError{Field: "medicalHistory", Message: "Tiền sử bệnh án không được vượt quá 2000 ký tự."}
	}

	return nil
}
