package service

import (
	"context"
	"errors"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"

	// userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type alertService struct {
	alertRepo repository.AlertRepository
	// assignmentRepo repository.AssignmentRepository
	// baseUserRepo   userRepository.BaseUserRepository
}

var ErrAlertNotFound = errors.New("Không tìm thấy cảnh báo")

// Tôi cần thêm các api cho alert như sau 1 api để doctor lấy danh sách các alert của patients mình quản lý, 1 api để patient lấy danh sách các alert của mình, 1 api để get alert by id
type AlertService interface {
	GetDoctorAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, int64, error)
	GetNurseAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, int64, error)
	GetPatientAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, int64, error)
	GetAlertByID(ctx context.Context, input *usecase.GetAlertByIDInput) (*dto.AlertResponse, error)
	UpdateAlertAcknowledgementByID(ctx context.Context, input *usecase.UpdateAlertAcknowledgementByIDInput) (*dto.AlertResponse, error)
}

func NewAlertService(
	alertRepo repository.AlertRepository,
) AlertService {
	return &alertService{
		alertRepo: alertRepo,
	}
}

func normalizeViolationSource(v domain.ThresholdViolation) domain.ThresholdViolation {
	if v.Source == domain.ViolationSourceThreshold || v.Source == domain.ViolationSourceTrend {
		return v
	}
	if isTrendViolationRule(v.Rule) {
		v.Source = domain.ViolationSourceTrend
	} else {
		v.Source = domain.ViolationSourceThreshold
	}
	return v
}

func isTrendViolationRule(rule string) bool {
	switch rule {
	case "trend_rising_watch", "trend_rising_high", "trend_falling_watch", "trend_falling_high":
		return true
	default:
		return false
	}
}

func normalizeViolations(violations []domain.ThresholdViolation) []domain.ThresholdViolation {
	if len(violations) == 0 {
		return violations
	}
	out := make([]domain.ThresholdViolation, len(violations))
	for i, v := range violations {
		out[i] = normalizeViolationSource(v)
	}
	return out
}

func mapAlertResponse(alert *domain.Alert, userData *repository.AlertUserData) dto.AlertResponse {
	if userData == nil {
		userData = &repository.AlertUserData{}
	}

	var acknowledgedByStr *string
	if alert.AcknowledgedBy != nil {
		str := alert.AcknowledgedBy.Hex()
		acknowledgedByStr = &str
	}

	return dto.AlertResponse{
		ID:                 alert.ID.Hex(),
		PatientID:          alert.PatientID.Hex(),
		PatientName:        userData.PatientName,
		PatientAvatarURL:   userData.PatientAvatarURL,
		MeasurementID:      alert.MeasurementID.Hex(),
		Violations:         normalizeViolations(alert.Violations),
		Status:             alert.Status,
		Severity:           alert.Severity,
		AcknowledgedBy:     acknowledgedByStr,
		AcknowledgedByName: userData.AcknowledgedByName,
		AcknowledgedAt:     alert.AcknowledgedAt,
		CreatedAt:          alert.CreatedAt,
		UpdatedAt:          alert.UpdatedAt,
	}
}

func (s *alertService) GetDoctorAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, int64, error) {
	filter := repository.AlertFilter{
		PatientID: input.PatientID,
		DoctorID:  input.DoctorID,
		Status:    domain.Status(input.Status),
		Severity:  domain.Severity(input.Severity),
		IsLatest:  input.IsLatest,
		Page:      input.Page,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	alerts, userDataMap, err := s.alertRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.alertRepo.CountWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dto.AlertResponse, 0, len(alerts))
	for _, alert := range alerts {
		responses = append(responses, mapAlertResponse(alert, userDataMap[alert.ID]))
	}

	return responses, total, nil
}

func (s *alertService) GetNurseAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, int64, error) {
	filter := repository.AlertFilter{
		PatientID: input.PatientID,
		NurseID:   input.NurseID,
		Status:    domain.Status(input.Status),
		Severity:  domain.Severity(input.Severity),
		IsLatest:  input.IsLatest,
		Page:      input.Page,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	alerts, userDataMap, err := s.alertRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.alertRepo.CountWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dto.AlertResponse, 0, len(alerts))
	for _, alert := range alerts {
		responses = append(responses, mapAlertResponse(alert, userDataMap[alert.ID]))
	}

	return responses, total, nil
}

func (s *alertService) GetPatientAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, int64, error) {
	filter := repository.AlertFilter{
		PatientID: input.PatientID,
		Status:    domain.Status(input.Status),
		Severity:  domain.Severity(input.Severity),
		IsLatest:  input.IsLatest,
		Page:      input.Page,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	alerts, userDataMap, err := s.alertRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.alertRepo.CountWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dto.AlertResponse, 0, len(alerts))
	for _, alert := range alerts {
		responses = append(responses, mapAlertResponse(alert, userDataMap[alert.ID]))
	}

	return responses, total, nil
}

func (s *alertService) GetAlertByID(ctx context.Context, input *usecase.GetAlertByIDInput) (*dto.AlertResponse, error) {
	alertID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	alert, userData, err := s.alertRepo.FindAlertByID(ctx, alertID)
	if err != nil {
		return nil, err
	}
	if alert == nil {
		return nil, ErrAlertNotFound
	}

	resp := mapAlertResponse(alert, userData)
	return &resp, nil
}

func (s *alertService) UpdateAlertAcknowledgementByID(ctx context.Context, input *usecase.UpdateAlertAcknowledgementByIDInput) (*dto.AlertResponse, error) {
	alertID, err := util.MustHexToObjectID(input.AlertID)
	if err != nil {
		return nil, err
	}
	doctorID, err := util.MustHexToObjectID(input.AcknowledgedBy)
	if err != nil {
		return nil, err
	}

	updatedAlert, userData, err := s.alertRepo.UpdateAcknowledgementByID(ctx, alertID, doctorID)
	if err != nil {
		return nil, err
	}
	if updatedAlert == nil {
		return nil, ErrAlertNotFound
	}

	resp := mapAlertResponse(updatedAlert, userData)
	return &resp, nil
}
