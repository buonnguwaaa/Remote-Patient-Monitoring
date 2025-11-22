package service

import (
	"context"
	"fmt"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type measurementService struct {
	userRepo repository.UserRepository
	measurementRepo repository.MeasurementRepository
}

type MeasurementService interface {
	CreateMeasurement(context.Context, *usecase.CreateMeasurementInput) (*dto.MeasurementResponse, error)
	// UpdateMeasurement(context.Context, *usecase.UpdateMeasurementInput) (*dto.MeasurementResponse, error)
	// GetMeasurementsByPatientID(context.Context, *usecase.GetMeasurementsByPatientIDInput) ([]dto.MeasurementResponse, error)
	// GetLatestMeasurementByPatientID(context.Context, *usecase.GetMeasurementsByPatientIDInput) (*dto.MeasurementResponse, error)
}

func NewMeasurementService(userRepo repository.UserRepository, measurementRepo repository.MeasurementRepository) MeasurementService {
	return &measurementService{
		userRepo: userRepo,
		measurementRepo: measurementRepo,
	}
}

func (s *measurementService) CreateMeasurement(ctx context.Context, input *usecase.CreateMeasurementInput) (*dto.MeasurementResponse, error) {
	patientId := util.MustHexToObjectID(input.PatientID)

	existedPatient, err := s.userRepo.ExistsByIDAndRole(ctx, patientId, domain.RolePatient)
	if err != nil || !existedPatient {
		return nil, fmt.Errorf("user not found or not patient")
	}

	measurement := &domain.Measurement{
		PatientID: patientId,
		Type:      input.Type,
		Systolic:  input.Systolic,
		Diastolic: input.Diastolic,
		Pulse:     input.Pulse,
		Glucose:   input.Glucose,
		Timing:    input.Timing,
		Unit:      input.Unit,
		Device:    input.Device,
		Note:      input.Note,
	}

	insertedMeasurement, err := s.measurementRepo.Create(ctx, measurement)
	if err != nil {
		return nil, err
	}

	return &dto.MeasurementResponse{
		ID:        insertedMeasurement.ID.Hex(),
		PatientID: insertedMeasurement.PatientID.Hex(),
		Type:      insertedMeasurement.Type,
		Diastolic: insertedMeasurement.Diastolic,
		Pulse:     insertedMeasurement.Pulse,
		Glucose:   insertedMeasurement.Glucose,
		Timing:    insertedMeasurement.Timing,
		Unit:      insertedMeasurement.Unit,
		Device:    insertedMeasurement.Device,
		Note:      insertedMeasurement.Note,
		CreatedAt: insertedMeasurement.CreatedAt,
		UpdatedAt: insertedMeasurement.UpdatedAt,
	}, nil
}

// func (s *measurementService) UpdateMeasurement(ctx context.Context, input *usecase.WriteMeasurementInput) (*dto.MeasurementResponse, error) {
// 	// Implementation of UpdateMeasurement method goes here
// 	return nil, nil
// }

// func (s *measurementService) GetMeasurementsByPatientID(ctx context.Context, input *usecase.GetMeasurementsByPatientIDInput) ([]dto.MeasurementResponse, error) {
// 	// Implementation of GetMeasurementsByPatientID method goes here
// 	return nil, nil
// }

// func (s *measurementService) GetLatestMeasurementByPatientID(ctx context.Context, input *usecase.GetMeasurementsByPatientIDInput) (*dto.MeasurementResponse, error) {
// 	// Implementation of GetLatestMeasurementByPatientID method goes here
// 	return nil, nil
// }
