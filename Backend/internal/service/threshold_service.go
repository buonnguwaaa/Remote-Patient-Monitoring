package service

import (
	"context"
	"fmt"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type thresholdService struct {
	patientRepo   userRepository.PatientRepository
	doctorRepo    userRepository.StaffRepository[userDomain.Doctor]
	thresholdRepo repository.ThresholdRepository
}

type ThresholdService interface {
	CreateThreshold(context.Context, *usecase.CreateThresholdInput) (*dto.ThresholdResponse, error)
	UpdateThreshold(context.Context, *usecase.UpdateThresholdInput) (*dto.ThresholdResponse, error)
	GetThresholds(context.Context, *usecase.GetThresholdsInput) ([]dto.ThresholdResponse, error)
}

func NewThresholdService(patientRepo userRepository.PatientRepository, doctorRepo userRepository.StaffRepository[userDomain.Doctor], thresholdRepo repository.ThresholdRepository) ThresholdService {
	return &thresholdService{
		patientRepo:   patientRepo,
		doctorRepo:    doctorRepo,
		thresholdRepo: thresholdRepo,
	}
}

func (s *thresholdService) CreateThreshold(ctx context.Context, input *usecase.CreateThresholdInput) (*dto.ThresholdResponse, error) {
	patientID, err := util.MustHexToObjectID(input.PatientID)
	if err != nil {
		return nil, err
	}
	existedPatient, err := s.patientRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient)
	if err != nil || !existedPatient {
		return nil, fmt.Errorf("user not found or not patient")
	}

	doctorID, err := util.MustHexToObjectID(input.DoctorID)
	if err != nil {
		return nil, err
	}
	existedDoctor, err := s.doctorRepo.ExistsByIDAndRole(ctx, doctorID, userDomain.RoleDoctor)
	if err != nil || !existedDoctor {
		return nil, fmt.Errorf("user not found or not doctor")
	}

	threshold := &domain.Threshold{
		PatientID:          patientID,
		DoctorID:           doctorID,
		TemperatureMin:     input.TemperatureMin,
		TemperatureMax:     input.TemperatureMax,
		HeartRateMin:       input.HeartRateMin,
		HeartRateMax:       input.HeartRateMax,
		RespiratoryRateMin: input.RespiratoryRateMin,
		RespiratoryRateMax: input.RespiratoryRateMax,
		SpO2Min:            input.SpO2Min,
		SysMin:             input.SysMin,
		SysMax:             input.SysMax,
		DiaMin:             input.DiaMin,
		DiaMax:             input.DiaMax,
		GlucoseMin:         input.GlucoseMin,
		GlucoseMax:         input.GlucoseMax,
		EffectiveFrom:      input.EffectiveFrom,
		EffectiveTo:        input.EffectiveTo,
	}

	inserted, err := s.thresholdRepo.Create(ctx, threshold)
	if err != nil {
		return nil, err
	}

	return &dto.ThresholdResponse{
		ID:                 inserted.ID.Hex(),
		PatientID:          inserted.PatientID.Hex(),
		DoctorID:           inserted.DoctorID.Hex(),
		TemperatureMin:     inserted.TemperatureMin,
		TemperatureMax:     inserted.TemperatureMax,
		HeartRateMin:       inserted.HeartRateMin,
		HeartRateMax:       inserted.HeartRateMax,
		RespiratoryRateMin: inserted.RespiratoryRateMin,
		RespiratoryRateMax: inserted.RespiratoryRateMax,
		SpO2Min:            inserted.SpO2Min,
		SysMin:             inserted.SysMin,
		SysMax:             inserted.SysMax,
		DiaMin:             inserted.DiaMin,
		DiaMax:             inserted.DiaMax,
		GlucoseMin:         inserted.GlucoseMin,
		GlucoseMax:         inserted.GlucoseMax,
		EffectiveFrom:      inserted.EffectiveFrom,
		EffectiveTo:        inserted.EffectiveTo,
		CreatedAt:          inserted.CreatedAt,
		UpdatedAt:          inserted.UpdatedAt,
	}, nil
}

func (s *thresholdService) GetThresholds(ctx context.Context, input *usecase.GetThresholdsInput) ([]dto.ThresholdResponse, error) {
	filter := repository.ThresholdFilter{
		PatientID: input.PatientID,
		DoctorID:  input.DoctorID,
		IsLatest:  input.IsLatest,
	}

	thresholds, err := s.thresholdRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, err
	}

	var resp []dto.ThresholdResponse
	for _, t := range thresholds {
		resp = append(resp, dto.ThresholdResponse{
			ID:                 t.ID.Hex(),
			PatientID:          t.PatientID.Hex(),
			DoctorID:           t.DoctorID.Hex(),
			TemperatureMin:     t.TemperatureMin,
			TemperatureMax:     t.TemperatureMax,
			HeartRateMin:       t.HeartRateMin,
			HeartRateMax:       t.HeartRateMax,
			RespiratoryRateMin: t.RespiratoryRateMin,
			RespiratoryRateMax: t.RespiratoryRateMax,
			SpO2Min:            t.SpO2Min,
			SysMin:             t.SysMin,
			SysMax:             t.SysMax,
			DiaMin:             t.DiaMin,
			DiaMax:             t.DiaMax,
			GlucoseMin:         t.GlucoseMin,
			GlucoseMax:         t.GlucoseMax,
			EffectiveFrom:      t.EffectiveFrom,
			EffectiveTo:        t.EffectiveTo,
			CreatedAt:          t.CreatedAt,
			UpdatedAt:          t.UpdatedAt,
		})
	}

	return resp, nil
}

func (s *thresholdService) UpdateThreshold(ctx context.Context, input *usecase.UpdateThresholdInput) (*dto.ThresholdResponse, error) {
	id, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	newThreshold := &domain.Threshold{
		ID:                 id,
		TemperatureMin:     input.TemperatureMin,
		TemperatureMax:     input.TemperatureMax,
		HeartRateMin:       input.HeartRateMin,
		HeartRateMax:       input.HeartRateMax,
		RespiratoryRateMin: input.RespiratoryRateMin,
		RespiratoryRateMax: input.RespiratoryRateMax,
		SpO2Min:            input.SpO2Min,
		SysMin:             input.SysMin,
		SysMax:             input.SysMax,
		DiaMin:             input.DiaMin,
		DiaMax:             input.DiaMax,
		GlucoseMin:         input.GlucoseMin,
		GlucoseMax:         input.GlucoseMax,
		EffectiveFrom:      input.EffectiveFrom,
		EffectiveTo:        input.EffectiveTo,
	}

	updated, err := s.thresholdRepo.Update(ctx, newThreshold)
	if err != nil {
		return nil, err
	}

	return &dto.ThresholdResponse{
		ID:                 updated.ID.Hex(),
		PatientID:          updated.PatientID.Hex(),
		DoctorID:           updated.DoctorID.Hex(),
		TemperatureMin:     updated.TemperatureMin,
		TemperatureMax:     updated.TemperatureMax,
		HeartRateMin:       updated.HeartRateMin,
		HeartRateMax:       updated.HeartRateMax,
		RespiratoryRateMin: updated.RespiratoryRateMin,
		RespiratoryRateMax: updated.RespiratoryRateMax,
		SpO2Min:            updated.SpO2Min,
		SysMin:             updated.SysMin,
		SysMax:             updated.SysMax,
		DiaMin:             updated.DiaMin,
		DiaMax:             updated.DiaMax,
		GlucoseMin:         updated.GlucoseMin,
		GlucoseMax:         updated.GlucoseMax,
		EffectiveFrom:      updated.EffectiveFrom,
		EffectiveTo:        updated.EffectiveTo,
		CreatedAt:          updated.CreatedAt,
		UpdatedAt:          updated.UpdatedAt,
	}, nil
}
