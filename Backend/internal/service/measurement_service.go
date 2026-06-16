package service

import (
	"context"
	"fmt"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
	edto "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type measurementService struct {
	patientRepo     userRepository.PatientRepository
	measurementRepo repository.MeasurementRepository
}

type MeasurementService interface {
	CreateMeasurement(context.Context, *usecase.CreateMeasurementInput) (*dto.MeasurementResponse, error)
	UpdateMeasurement(context.Context, *usecase.UpdateMeasurementInput) (*dto.MeasurementResponse, error)
	GetMeasurements(context.Context, *usecase.GetMeasurementsInput) ([]dto.MeasurementResponse, error)
}

func NewMeasurementService(patientRepo userRepository.PatientRepository, measurementRepo repository.MeasurementRepository) MeasurementService {
	return &measurementService{
		patientRepo:     patientRepo,
		measurementRepo: measurementRepo,
	}
}

func (s *measurementService) CreateMeasurement(ctx context.Context, input *usecase.CreateMeasurementInput) (*dto.MeasurementResponse, error) {
	patientId, err := util.MustHexToObjectID(input.PatientID)
	if err != nil {
		return nil, err
	}

	existedPatient, err := s.patientRepo.ExistsByIDAndRole(ctx, patientId, userDomain.RolePatient)
	if err != nil || !existedPatient {
		return nil, fmt.Errorf("user not found or not patient")
	}

	// Tính MAP chỉ khi cả systolic và diastolic có giá trị
	bp := input.BloodPressure
	if bp.Systolic != nil && bp.Diastolic != nil {
		mapValue := calculateMAP(*bp.Systolic, *bp.Diastolic)
		bp.MAP = &mapValue
	}

	measurement := &domain.Measurement{
		PatientID:       patientId,
		Type:            input.Type,
		Temperature:     input.Temperature,
		HeartRate:       input.HeartRate,
		RespiratoryRate: input.RespiratoryRate,
		SpO2:            input.SpO2,
		BloodPressure:   bp,
		Glucose:         input.Glucose,
		MealTiming:      input.MealTiming,
		Device:          input.Device,
		Note:            input.Note,
	}

	inserted, err := s.measurementRepo.Create(ctx, measurement)
	if err != nil {
		return nil, err
	}

	err = client.StartAlertWorkflowAsync(edto.MeasurementAlertInput{
		MeasurementID: inserted.ID.Hex(),
		PatientID:     inserted.PatientID.Hex(),
	})
	if err != nil {
		return nil, err
	}

	return toMeasurementResponse(inserted), nil
}

func (s *measurementService) UpdateMeasurement(ctx context.Context, input *usecase.UpdateMeasurementInput) (*dto.MeasurementResponse, error) {
	id, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	bp := input.BloodPressure
	if bp.Systolic != nil && bp.Diastolic != nil {
		mapValue := calculateMAP(*bp.Systolic, *bp.Diastolic)
		bp.MAP = &mapValue
	}

	newMeasurement := &domain.Measurement{
		ID:              id,
		Type:            input.Type,
		Temperature:     input.Temperature,
		HeartRate:       input.HeartRate,
		RespiratoryRate: input.RespiratoryRate,
		SpO2:            input.SpO2,
		BloodPressure:   bp,
		Glucose:         input.Glucose,
		MealTiming:      input.MealTiming,
		Device:          input.Device,
		Note:            input.Note,
		UpdatedAt:       time.Now().UTC(),
	}

	updated, err := s.measurementRepo.Update(ctx, newMeasurement)
	if err != nil {
		return nil, err
	}

	return toMeasurementResponse(updated), nil
}

func (s *measurementService) GetMeasurements(ctx context.Context, input *usecase.GetMeasurementsInput) ([]dto.MeasurementResponse, error) {
	filter := repository.MeasurementFilter{
		PatientID:  input.PatientID,
		Type:       input.Type,
		MealTiming: input.MealTiming,
		IsLatest:   input.IsLatest,
	}

	measurements, err := s.measurementRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, err
	}

	var resp []dto.MeasurementResponse
	for i := range measurements {
		resp = append(resp, *toMeasurementResponse(&measurements[i]))
	}

	return resp, nil
}

func toMeasurementResponse(m *domain.Measurement) *dto.MeasurementResponse {
	return &dto.MeasurementResponse{
		ID:              m.ID.Hex(),
		PatientID:       m.PatientID.Hex(),
		Temperature:     m.Temperature,
		HeartRate:       m.HeartRate,
		RespiratoryRate: m.RespiratoryRate,
		SpO2:            m.SpO2,
		BloodPressure:   m.BloodPressure,
		Type:            m.Type,
		Glucose:         m.Glucose,
		MealTiming:      m.MealTiming,
		Device:          m.Device,
		Note:            m.Note,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
	}
}

func calculateMAP(sys, dias float64) float64 {
	return (sys + 2*dias) / 3
}
