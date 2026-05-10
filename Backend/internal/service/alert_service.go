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
	alertRepo      repository.AlertRepository
	// assignmentRepo repository.AssignmentRepository
	// baseUserRepo   userRepository.BaseUserRepository
}

var ErrAlertNotFound = errors.New("alert not found")

// Tôi cần thêm các api cho alert như sau 1 api để doctor lấy danh sách các alert của patients mình quản lý, 1 api để patient lấy danh sách các alert của mình, 1 api để get alert by id
type AlertService interface {
	GetDoctorAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error)
	GetNurseAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error)
	GetPatientAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error)
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

func (s *alertService) GetDoctorAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error) {
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
		return nil, err
	}

	responses := make([]dto.AlertResponse, 0, len(alerts))
	for _, alert := range alerts {
		userData := userDataMap[alert.ID]
		if userData == nil {
			userData = &repository.AlertUserData{}
		}

		var acknowledgedByStr *string
		if alert.AcknowledgedBy != nil {
			str := alert.AcknowledgedBy.Hex()
			acknowledgedByStr = &str
		}

		responses = append(responses, dto.AlertResponse{
			ID:                 alert.ID.Hex(),
			PatientID:          alert.PatientID.Hex(),
			PatientName:        userData.PatientName,
			PatientAvatarURL:   userData.PatientAvatarURL,
			MeasurementID:      alert.MeasurementID.Hex(),
			Violations:         alert.Violations,
			Status:             alert.Status,
			Severity:           alert.Severity,
			AcknowledgedBy:     acknowledgedByStr,
			AcknowledgedByName: userData.AcknowledgedByName,
			AcknowledgedAt:     alert.AcknowledgedAt,
			CreatedAt:          alert.CreatedAt,
			UpdatedAt:          alert.UpdatedAt,
		})
	}

	return responses, nil
}

func (s *alertService) GetNurseAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error) {
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
		return nil, err
	}

	responses := make([]dto.AlertResponse, 0, len(alerts))
	for _, alert := range alerts {
		userData := userDataMap[alert.ID]
		if userData == nil {
			userData = &repository.AlertUserData{}
		}

		var acknowledgedByStr *string
		if alert.AcknowledgedBy != nil {
			str := alert.AcknowledgedBy.Hex()
			acknowledgedByStr = &str
		}

		responses = append(responses, dto.AlertResponse{
			ID:                 alert.ID.Hex(),
			PatientID:          alert.PatientID.Hex(),
			PatientName:        userData.PatientName,
			PatientAvatarURL:   userData.PatientAvatarURL,
			MeasurementID:      alert.MeasurementID.Hex(),
			Violations:         alert.Violations,
			Status:             alert.Status,
			Severity:           alert.Severity,
			AcknowledgedBy:     acknowledgedByStr,
			AcknowledgedByName: userData.AcknowledgedByName,
			AcknowledgedAt:     alert.AcknowledgedAt,
			CreatedAt:          alert.CreatedAt,
			UpdatedAt:          alert.UpdatedAt,
		})
	}

	return responses, nil
}

func (s *alertService) GetPatientAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error) {
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
		return nil, err
	}

	responses := make([]dto.AlertResponse, 0, len(alerts))
	for _, alert := range alerts {
		userData := userDataMap[alert.ID]
		if userData == nil {
			userData = &repository.AlertUserData{}
		}

		var acknowledgedByStr *string
		if alert.AcknowledgedBy != nil {
			str := alert.AcknowledgedBy.Hex()
			acknowledgedByStr = &str
		}

		responses = append(responses, dto.AlertResponse{
			ID:                 alert.ID.Hex(),
			PatientID:          alert.PatientID.Hex(),
			PatientName:        userData.PatientName,
			PatientAvatarURL:   userData.PatientAvatarURL,
			MeasurementID:      alert.MeasurementID.Hex(),
			Violations:         alert.Violations,
			Status:             alert.Status,
			Severity:           alert.Severity,
			AcknowledgedBy:     acknowledgedByStr,
			AcknowledgedByName: userData.AcknowledgedByName,
			AcknowledgedAt:     alert.AcknowledgedAt,
			CreatedAt:          alert.CreatedAt,
			UpdatedAt:          alert.UpdatedAt,
		})
	}

	return responses, nil
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

	var acknowledgedByStr *string
	if alert.AcknowledgedBy != nil {
		str := alert.AcknowledgedBy.Hex()
		acknowledgedByStr = &str
	}

	return &dto.AlertResponse{
		ID:                 alert.ID.Hex(),
		PatientID:          alert.PatientID.Hex(),
		PatientName:        userData.PatientName,
		PatientAvatarURL:   userData.PatientAvatarURL,
		MeasurementID:      alert.MeasurementID.Hex(),
		Violations:         alert.Violations,
		Status:             alert.Status,
		Severity:           alert.Severity,
		AcknowledgedBy:     acknowledgedByStr,
		AcknowledgedByName: userData.AcknowledgedByName,
		AcknowledgedAt:     alert.AcknowledgedAt,
		CreatedAt:          alert.CreatedAt,
		UpdatedAt:          alert.UpdatedAt,
	}, nil
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

	if userData == nil {
		userData = &repository.AlertUserData{}
	}

	var acknowledgedByStr *string
	if updatedAlert.AcknowledgedBy != nil {
		str := updatedAlert.AcknowledgedBy.Hex()
		acknowledgedByStr = &str
	}

	return &dto.AlertResponse{
		ID:                 updatedAlert.ID.Hex(),
		PatientID:          updatedAlert.PatientID.Hex(),
		PatientName:        userData.PatientName,
		PatientAvatarURL:   userData.PatientAvatarURL,
		MeasurementID:      updatedAlert.MeasurementID.Hex(),
		Violations:         updatedAlert.Violations,
		Status:             updatedAlert.Status,
		Severity:           updatedAlert.Severity,
		AcknowledgedBy:     acknowledgedByStr,
		AcknowledgedByName: userData.AcknowledgedByName,
		AcknowledgedAt:     updatedAlert.AcknowledgedAt,
		CreatedAt:          updatedAlert.CreatedAt,
		UpdatedAt:          updatedAlert.UpdatedAt,
	}, nil
}
