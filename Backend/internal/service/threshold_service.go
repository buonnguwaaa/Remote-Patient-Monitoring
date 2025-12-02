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

type thresholdService struct {
	userRepo      repository.UserRepository
	thresholdRepo repository.ThresholdRepository
}

type ThresholdService interface {
	CreateThreshold(context.Context, *usecase.CreateThresholdInput) (*dto.ThresholdResponse, error)
	UpdateThreshold(context.Context, *usecase.UpdateThresholdInput) (*dto.ThresholdResponse, error)
	GetThresholds(context.Context, *usecase.GetThresholdsInput) ([]dto.ThresholdResponse, error)
}

func NewThresholdService(userRepo repository.UserRepository, thresholdRepo repository.ThresholdRepository) ThresholdService {
	return &thresholdService{
		userRepo:      userRepo,
		thresholdRepo: thresholdRepo,
	}
}

func (s *thresholdService) CreateThreshold(ctx context.Context, input *usecase.CreateThresholdInput) (*dto.ThresholdResponse, error) {
	patientID := util.MustHexToObjectID(input.PatientID)
	existedPatient, err := s.userRepo.ExistsByIDAndRole(ctx, patientID, domain.RolePatient)
	if err != nil || !existedPatient {
		return nil, fmt.Errorf("user not found or not patient")
	}

	doctorID := util.MustHexToObjectID(input.DoctorID)
	existedDoctor, err := s.userRepo.ExistsByIDAndRole(ctx, doctorID, domain.RoleDoctor)
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
		ID:            inserted.ID.Hex(),
		PatientID:     inserted.PatientID.Hex(),
		DoctorID:      inserted.DoctorID.Hex(),
		SysMax:        inserted.SysMax,
		DiaMax:        inserted.DiaMax,
		HeartRateMax:  inserted.HeartRateMax,
		GlucoseMax:    inserted.GlucoseMax,
		EffectiveFrom: inserted.EffectiveFrom,
		EffectiveTo:   inserted.EffectiveTo,
	}, nil
}

func (s *thresholdService) GetThresholds(ctx context.Context, input *usecase.GetThresholdsInput) ([]dto.ThresholdResponse, error) {
	filter := repository.ThresholdFilter{
		PatientID: input.PatientID,
		DoctorID:  input.DoctorID,
		IsLatest:  input.IsLatest,
	}

	thresholds, err := s.thresholdRepo.Find(ctx, filter)
	if err != nil {
		return nil, err
	}

	var resp []dto.ThresholdResponse
	for _, t := range thresholds {
		resp = append(resp, dto.ThresholdResponse{
			ID:            t.ID.Hex(),
			PatientID:     t.PatientID.Hex(),
			DoctorID:      t.DoctorID.Hex(),
			SysMax:        t.SysMax,
			DiaMax:        t.DiaMax,
			HeartRateMax:  t.HeartRateMax,
			GlucoseMax:    t.GlucoseMax,
			EffectiveFrom: t.EffectiveFrom,
			EffectiveTo:   t.EffectiveTo,
			CreatedAt:     t.CreatedAt,
			UpdatedAt:     t.UpdatedAt,
		})
	}

	return resp, nil
}

func (s *thresholdService) UpdateThreshold(ctx context.Context, input *usecase.UpdateThresholdInput) (*dto.ThresholdResponse, error) {
	id := util.MustHexToObjectID(input.ID)

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
		ID:            updated.ID.Hex(),
		PatientID:     updated.PatientID.Hex(),
		DoctorID:      updated.DoctorID.Hex(),
		SysMax:        updated.SysMax,
		DiaMax:        updated.DiaMax,
		HeartRateMax:  updated.HeartRateMax,
		GlucoseMax:    updated.GlucoseMax,
		EffectiveFrom: updated.EffectiveFrom,
		EffectiveTo:   updated.EffectiveTo,
		CreatedAt:     updated.CreatedAt,
		UpdatedAt:     updated.UpdatedAt,
	}, nil
}
