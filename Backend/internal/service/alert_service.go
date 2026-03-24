package service

import (
	"context"
	"errors"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type alertService struct {
	alertRepo      repository.AlertRepository
	assignmentRepo repository.AssignmentRepository
	baseUserRepo   userRepository.BaseUserRepository
}

var ErrAlertNotFound = errors.New("alert not found")

type AlertService interface {
	GetAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error)
	UpdateAlertAcknowledgementByID(ctx context.Context, input *usecase.UpdateAlertAcknowledgementByIDInput) (*dto.AlertResponse, error)
}

func NewAlertService(
	alertRepo repository.AlertRepository,
	assignmentRepo repository.AssignmentRepository,
	baseUserRepo userRepository.BaseUserRepository,
) AlertService {
	return &alertService{
		alertRepo:      alertRepo,
		assignmentRepo: assignmentRepo,
		baseUserRepo:   baseUserRepo,
	}
}

func (s *alertService) GetAlerts(ctx context.Context, input *usecase.GetAlertsInput) ([]dto.AlertResponse, error) {
	filter := repository.AlertFilter{
		PatientID: input.PatientID,
		Status:    domain.Status(input.Status),
		Severity:  domain.Severity(input.Severity),
		IsLatest:  input.IsLatest,
	}

	if input.DoctorID != "" {
		doctorID, err := util.MustHexToObjectID(input.DoctorID)
		if err != nil {
			return nil, err
		}

		assignments, err := s.assignmentRepo.FindByDoctorID(ctx, doctorID)
		if err != nil {
			return nil, err
		}

		if len(assignments) == 0 {
			return []dto.AlertResponse{}, nil
		}

		allowedPatientIDs := make(map[string]struct{}, len(assignments))
		filter.PatientIDs = make([]string, 0, len(assignments))

		for _, assignment := range assignments {
			patientIDHex := assignment.PatientID.Hex()
			if _, exists := allowedPatientIDs[patientIDHex]; exists {
				continue
			}
			allowedPatientIDs[patientIDHex] = struct{}{}
			filter.PatientIDs = append(filter.PatientIDs, patientIDHex)
		}

		if input.PatientID != "" {
			if _, exists := allowedPatientIDs[input.PatientID]; !exists {
				return []dto.AlertResponse{}, nil
			}
			filter.PatientID = input.PatientID
			filter.PatientIDs = nil
		}
	}

	alerts, err := s.alertRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, err
	}

	userCache := map[string]*dto.BaseUserInfoResponse{}

	resolveUser := func(idHex string) *dto.BaseUserInfoResponse {
		if idHex == "" {
			return nil
		}

		if cached, ok := userCache[idHex]; ok {
			return cached
		}

		objID, convErr := primitive.ObjectIDFromHex(idHex)
		if convErr != nil {
			userCache[idHex] = nil
			return nil
		}

		user, findErr := s.baseUserRepo.FindByID(ctx, objID)
		if findErr != nil || user == nil {
			userCache[idHex] = nil
			return nil
		}

		mapped := mapBaseUser(*user)
		userCache[idHex] = &mapped
		return &mapped
	}

	var responses []dto.AlertResponse
	for _, alert := range alerts {
		patientIDHex := alert.PatientID.Hex()
		measurementIDHex := alert.MeasurementID.Hex()

		var acknowledgedBy *string
		var acknowledgedByName *string
		if alert.AcknowledgedBy != nil {
			hex := alert.AcknowledgedBy.Hex()
			acknowledgedBy = &hex

			if doctor := resolveUser(hex); doctor != nil {
				doctorName := doctor.Name
				acknowledgedByName = &doctorName
			}
		}

		var patientName string
		var patientAvatarURL string
		if patient := resolveUser(patientIDHex); patient != nil {
			patientName = patient.Name
			patientAvatarURL = patient.AvatarUrl
		}

		responses = append(responses, dto.AlertResponse{
			ID:                 alert.ID.Hex(),
			PatientID:          patientIDHex,
			PatientName:        patientName,
			PatientAvatarURL:   patientAvatarURL,
			MeasurementID:      measurementIDHex,
			Violations:         alert.Violations,
			Status:             alert.Status,
			Severity:           alert.Severity,
			AcknowledgedBy:     acknowledgedBy,
			AcknowledgedByName: acknowledgedByName,
			AcknowledgedAt:     alert.AcknowledgedAt,
			CreatedAt:          alert.CreatedAt,
			UpdatedAt:          alert.UpdatedAt,
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
		return nil, ErrAlertNotFound
	}

	patientIDHex := updatedAlert.PatientID.Hex()
	measurementIDHex := updatedAlert.MeasurementID.Hex()
	doctorIDHex := doctorId.Hex()

	var patientName string
	var patientAvatarURL string
	if patient, findErr := s.baseUserRepo.FindByID(ctx, updatedAlert.PatientID); findErr == nil && patient != nil {
		patientName = patient.Name
		patientAvatarURL = patient.AvatarUrl
	}

	var acknowledgedByName *string
	if doctor, findErr := s.baseUserRepo.FindByID(ctx, doctorId); findErr == nil && doctor != nil {
		name := doctor.Name
		acknowledgedByName = &name
	}

	return &dto.AlertResponse{
		ID:                 updatedAlert.ID.Hex(),
		PatientID:          patientIDHex,
		PatientName:        patientName,
		PatientAvatarURL:   patientAvatarURL,
		MeasurementID:      measurementIDHex,
		Violations:         updatedAlert.Violations,
		Status:             updatedAlert.Status,
		Severity:           updatedAlert.Severity,
		AcknowledgedBy:     &doctorIDHex,
		AcknowledgedByName: acknowledgedByName,
		AcknowledgedAt:     updatedAlert.AcknowledgedAt,
		CreatedAt:          updatedAlert.CreatedAt,
		UpdatedAt:          updatedAlert.UpdatedAt,
	}, nil
}
