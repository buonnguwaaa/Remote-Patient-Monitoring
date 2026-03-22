package service

import (
	"context"
	"errors"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type alertService struct {
	alertRepo repository.AlertRepository
}

type AlertService interface {
	GetAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error)
	UpdateAlertAcknowledgementByID(ctx context.Context, input *usecase.UpdateAlertAcknowledgementByIDInput) (*dto.AlertResponse, error)
}

func NewAlertService(alertRepo repository.AlertRepository) AlertService {
	return &alertService{
		alertRepo: alertRepo,
	}
}

func (s *alertService) GetAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error) {
	filter := repository.AlertFilter{
		PatientID: input.PatientID,
		Status:    domain.Status(input.Status),
		Severity:  domain.Severity(input.Severity),
		IsLatest:  input.IsLatest,
	}

	alerts, err := s.alertRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, err
	}

	var responses []dto.AlertResponse
	for _, alert := range alerts {
		var acknowledgedBy *string
		if alert.AcknowledgedBy != nil {
			hex := alert.AcknowledgedBy.Hex()
			acknowledgedBy = &hex
		}

		responses = append(responses, dto.AlertResponse{
			ID:             alert.ID.Hex(),
			PatientID:      alert.PatientID.Hex(),
			MeasurementID:  alert.MeasurementID.Hex(),
			Violations:     alert.Violations,
			Status:         alert.Status,
			Severity:       alert.Severity,
			AcknowledgedBy: acknowledgedBy,
			AcknowledgedAt: alert.AcknowledgedAt,
			CreatedAt:      alert.CreatedAt,
			UpdatedAt:      alert.UpdatedAt,
		})
	}

	return responses, nil
}

func (s *alertService) UpdateAlertAcknowledgementByID(ctx context.Context, input *usecase.UpdateAlertAcknowledgementByIDInput) (*dto.AlertResponse, error) {
	alertId, err := util.MustHexToObjectID(input.AlertID)
	if err != nil {
		return nil, err
	}
	doctorId, err := util.MustHexToObjectID(input.AcknowledgedBy)
	if err != nil {
		return nil, err
	}

	updatedAlert, err := s.alertRepo.UpdateAcknowledgementByID(ctx, alertId, doctorId)
	if err != nil {
		return nil, err
	}
	if updatedAlert == nil {
		return nil, errors.New("alert not found")
	}

	var acknowledgedBy *string
	if updatedAlert.AcknowledgedBy != nil {
		str := updatedAlert.AcknowledgedBy.Hex()
		acknowledgedBy = &str
	}

	return &dto.AlertResponse{
		ID:             updatedAlert.ID.Hex(),
		PatientID:      updatedAlert.PatientID.Hex(),
		MeasurementID:  updatedAlert.MeasurementID.Hex(),
		Violations:     updatedAlert.Violations,
		Status:         updatedAlert.Status,
		Severity:       updatedAlert.Severity,
		AcknowledgedBy: acknowledgedBy,
		AcknowledgedAt: updatedAlert.AcknowledgedAt,
		CreatedAt:      updatedAlert.CreatedAt,
		UpdatedAt:      updatedAlert.UpdatedAt,
	}, nil
}
