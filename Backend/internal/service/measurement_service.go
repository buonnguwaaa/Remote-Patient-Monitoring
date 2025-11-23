package service

import (
	"context"
	"fmt"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type measurementService struct {
	userRepo        repository.UserRepository
	measurementRepo repository.MeasurementRepository
}

type MeasurementService interface {
	CreateMeasurement(context.Context, *usecase.CreateMeasurementInput) (*dto.MeasurementResponse, error)
	UpdateMeasurement(context.Context, *usecase.UpdateMeasurementInput) (*dto.MeasurementResponse, error)
	GetMeasurements(context.Context, *usecase.GetMeasurementsInput) ([]dto.MeasurementResponse, error)
}

func NewMeasurementService(userRepo repository.UserRepository, measurementRepo repository.MeasurementRepository) MeasurementService {
	return &measurementService{
		userRepo:        userRepo,
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

func (s *measurementService) UpdateMeasurement(ctx context.Context, input *usecase.UpdateMeasurementInput) (*dto.MeasurementResponse, error) {
	newMeasurement := &domain.Measurement{
		ID:        util.MustHexToObjectID(input.ID),
		Type:      input.Type,
		Systolic:  input.Systolic,
		Diastolic: input.Diastolic,
		Pulse:     input.Pulse,
		Glucose:   input.Glucose,
		Timing:    input.Timing,
		Unit:      input.Unit,
		Device:    input.Device,
		Note:      input.Note,
		UpdatedAt: time.Now().UTC(),
	}

	updated, err := s.measurementRepo.Update(ctx, newMeasurement)
	if err != nil {
		return nil, err
	}

	return &dto.MeasurementResponse{
		ID:        updated.ID.Hex(),
		PatientID: updated.PatientID.Hex(),
		Type:      updated.Type,
		Diastolic: updated.Diastolic,
		Pulse:     updated.Pulse,
		Glucose:   updated.Glucose,
		Timing:    updated.Timing,
		Unit:      updated.Unit,
		Device:    updated.Device,
		Note:      updated.Note,
		CreatedAt: updated.CreatedAt,
		UpdatedAt: updated.UpdatedAt,
	}, nil
}

func (s *measurementService) GetMeasurements(ctx context.Context, input *usecase.GetMeasurementsInput) ([]dto.MeasurementResponse, error) {
	filter := repository.MeasurementFilter{
		PatientID: input.PatientID,
		Type:      input.Type,
		Timing:    input.Timing,
		IsLatest:  input.IsLatest,
	}

	measurements, err := s.measurementRepo.Find(ctx, filter)
	if err != nil {
		return nil, err
	}

	var resp []dto.MeasurementResponse
	for _, m := range measurements {
		resp = append(resp, dto.MeasurementResponse{
			ID:        m.ID.Hex(),
			PatientID: m.PatientID.Hex(),
			Type:      m.Type,
			Diastolic: m.Diastolic,
			Pulse:     m.Pulse,
			Glucose:   m.Glucose,
			Timing:    m.Timing,
			Unit:      m.Unit,
			Device:    m.Device,
			Note:      m.Note,
			CreatedAt: m.CreatedAt,
			UpdatedAt: m.UpdatedAt,
		})
	}

	return resp, nil
}
