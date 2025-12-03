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
	patientId, err := util.MustHexToObjectID(input.PatientID)
	if err != nil {
		return nil, err
	}

	existedPatient, err := s.userRepo.ExistsByIDAndRole(ctx, patientId, domain.RolePatient)
	if err != nil || !existedPatient {
		return nil, fmt.Errorf("user not found or not patient")
	}

	mapValue := calculateMAP(input.BloodPressure.Systolic, input.BloodPressure.Diastolic)
	input.BloodPressure.MAP = &mapValue

	measurement := &domain.Measurement{
		PatientID:       patientId,
		Type:            input.Type,
		Temperature:     input.Temperature,
		HeartRate:       input.HeartRate,
		RespiratoryRate: input.RespiratoryRate,
		SpO2:            input.SpO2,
		BloodPressure:   input.BloodPressure,
		Glucose:         input.Glucose,
		Timing:          input.Timing,
		Device:          input.Device,
		Note:            input.Note,
	}

	inserted, err := s.measurementRepo.Create(ctx, measurement)
	if err != nil {
		return nil, err
	}

	return &dto.MeasurementResponse{
		ID:              inserted.ID.Hex(),
		PatientID:       inserted.PatientID.Hex(),
		Temperature:     inserted.Temperature,
		HeartRate:       inserted.HeartRate,
		RespiratoryRate: inserted.RespiratoryRate,
		SpO2:            inserted.SpO2,
		BloodPressure:   inserted.BloodPressure,
		Type:            inserted.Type,
		Glucose:         inserted.Glucose,
		Timing:          inserted.Timing,
		Device:          inserted.Device,
		Note:            inserted.Note,
		CreatedAt:       inserted.CreatedAt,
		UpdatedAt:       inserted.UpdatedAt,
	}, nil
}

func (s *measurementService) UpdateMeasurement(ctx context.Context, input *usecase.UpdateMeasurementInput) (*dto.MeasurementResponse, error) {
	id, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	mapValue := calculateMAP(input.BloodPressure.Systolic, input.BloodPressure.Diastolic)
	input.BloodPressure.MAP = &mapValue

	newMeasurement := &domain.Measurement{
		ID:              id,
		Type:            input.Type,
		Temperature:     input.Temperature,
		HeartRate:       input.HeartRate,
		RespiratoryRate: input.RespiratoryRate,
		SpO2:            input.SpO2,
		BloodPressure:   input.BloodPressure,
		Glucose:         input.Glucose,
		Timing:          input.Timing,
		Device:          input.Device,
		Note:            input.Note,
		UpdatedAt:       time.Now().UTC(),
	}

	updated, err := s.measurementRepo.Update(ctx, newMeasurement)
	if err != nil {
		return nil, err
	}

	return &dto.MeasurementResponse{
		ID:              updated.ID.Hex(),
		PatientID:       updated.PatientID.Hex(),
		Temperature:     updated.Temperature,
		HeartRate:       updated.HeartRate,
		RespiratoryRate: updated.RespiratoryRate,
		SpO2:            updated.SpO2,
		BloodPressure:   updated.BloodPressure,
		Type:            updated.Type,
		Glucose:         updated.Glucose,
		Timing:          updated.Timing,
		Device:          updated.Device,
		Note:            updated.Note,
		CreatedAt:       updated.CreatedAt,
		UpdatedAt:       updated.UpdatedAt,
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
			ID:              m.ID.Hex(),
			PatientID:       m.PatientID.Hex(),
			Temperature:     m.Temperature,
			HeartRate:       m.HeartRate,
			RespiratoryRate: m.RespiratoryRate,
			BloodPressure:   m.BloodPressure,
			SpO2:            m.SpO2,
			Type:            m.Type,
			Glucose:         m.Glucose,
			Timing:          m.Timing,
			Device:          m.Device,
			Note:            m.Note,
			CreatedAt:       m.CreatedAt,
			UpdatedAt:       m.UpdatedAt,
		})
	}

	return resp, nil
}

func calculateMAP(sys, dias float64) float64 {
	return (sys + 2*dias) / 3
}
