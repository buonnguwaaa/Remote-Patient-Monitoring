package service

import (
	"context"
	"errors"
	"sort"
	"strings"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PatientOverviewService aggregates, in a single call, everything the mobile
// dashboard needs for the list of patients assigned to the current staff member:
// profile, latest measurement, active threshold and open-alert summary.
type PatientOverviewService interface {
	GetMyPatientOverview(ctx context.Context, userID string, role userDomain.Role) (*dto.PatientOverviewListResponse, error)
}

type patientOverviewService struct {
	assignmentRepo  repository.AssignmentRepository
	patientRepo     userRepository.PatientRepository
	measurementRepo repository.MeasurementRepository
	thresholdRepo   repository.ThresholdRepository
	alertRepo       repository.AlertRepository
}

func NewPatientOverviewService(
	assignmentRepo repository.AssignmentRepository,
	patientRepo userRepository.PatientRepository,
	measurementRepo repository.MeasurementRepository,
	thresholdRepo repository.ThresholdRepository,
	alertRepo repository.AlertRepository,
) PatientOverviewService {
	return &patientOverviewService{
		assignmentRepo:  assignmentRepo,
		patientRepo:     patientRepo,
		measurementRepo: measurementRepo,
		thresholdRepo:   thresholdRepo,
		alertRepo:       alertRepo,
	}
}

func (s *patientOverviewService) GetMyPatientOverview(ctx context.Context, userID string, role userDomain.Role) (*dto.PatientOverviewListResponse, error) {
	staffID, err := util.MustHexToObjectID(userID)
	if err != nil {
		return nil, err
	}

	// 1. Assignments for this staff member (single query, also yields display names).
	var (
		assignments []*domain.Assignment
		nameMap     map[primitive.ObjectID]repository.UserDisplayInfo
	)

	alertFilter := repository.AlertFilter{Status: domain.StatusOpen}
	switch role {
	case userDomain.RoleNurse:
		assignments, nameMap, err = s.assignmentRepo.FindByNurseIDWithNames(ctx, staffID)
		alertFilter.NurseID = userID
	case userDomain.RoleDoctor:
		assignments, nameMap, err = s.assignmentRepo.FindByDoctorIDWithNames(ctx, staffID)
		alertFilter.DoctorID = userID
	default:
		return nil, errors.New("Vai trò không hợp lệ để xem tổng quan bệnh nhân")
	}
	if err != nil {
		return nil, err
	}

	patientIDs := make([]primitive.ObjectID, 0, len(assignments))
	for _, a := range assignments {
		if !a.PatientID.IsZero() {
			patientIDs = append(patientIDs, a.PatientID)
		}
	}

	// 2. Batch-fetch the per-patient data. Each is a single DB round trip
	//    regardless of the number of assigned patients.
	patients, err := s.patientRepo.FindPatientsByIDs(ctx, patientIDs)
	if err != nil {
		return nil, err
	}
	patientMap := make(map[primitive.ObjectID]userDomain.Patient, len(patients))
	for i := range patients {
		patientMap[patients[i].ID] = patients[i]
	}

	measurementMap, err := s.measurementRepo.FindLatestByPatientIDs(ctx, patientIDs)
	if err != nil {
		return nil, err
	}

	thresholdMap, err := s.thresholdRepo.FindLatestActiveByPatientIDs(ctx, patientIDs)
	if err != nil {
		return nil, err
	}

	alerts, _, err := s.alertRepo.FindWithFilter(ctx, alertFilter)
	if err != nil {
		return nil, err
	}
	alertsSummaryMap := buildAlertsSummaryMap(alerts)

	// 3. Assemble the response.
	overviews := make([]dto.PatientOverviewResponse, 0, len(patientIDs))
	patientsWithAlerts := 0

	for _, a := range assignments {
		pid := a.PatientID
		if pid.IsZero() {
			continue
		}

		info := nameMap[pid]
		row := dto.PatientOverviewResponse{
			PatientID:       pid.Hex(),
			PatientPublicID: info.PublicID,
			Name:            info.Name,
			DiseaseTypes:    info.DiseaseTypes,
			AlertsSummary:   dto.AlertsSummary{},
		}

		if p, ok := patientMap[pid]; ok {
			row.PatientPublicID = p.UserPublicID
			row.Name = p.Name
			row.Email = p.Email
			row.AvatarURL = p.AvatarUrl
			row.Status = string(p.Status)
			row.InsuranceNumber = p.InsuranceNumber
			row.CCCD = p.CCCD
			row.EmergencyContactName = p.EmergencyContactName
			row.EmergencyContactPhone = p.EmergencyContactPhone
			row.DiseaseTypes = p.DiseaseTypes
		}

		if m, ok := measurementMap[pid]; ok && m != nil {
			row.LatestMeasurement = mapMeasurementResponse(m)
		}
		if t, ok := thresholdMap[pid]; ok && t != nil {
			row.LatestThreshold = mapThresholdToResponse(t)
		}
		if summary, ok := alertsSummaryMap[pid]; ok {
			row.AlertsSummary = summary
			if summary.Total > 0 {
				patientsWithAlerts++
			}
		}

		overviews = append(overviews, row)
	}

	sortPatientOverviews(overviews)

	return &dto.PatientOverviewListResponse{
		TotalPatients:      len(overviews),
		PatientsWithAlerts: patientsWithAlerts,
		Patients:           overviews,
	}, nil
}

// buildAlertsSummaryMap groups open alerts by patient and counts them by severity.
func buildAlertsSummaryMap(alerts []*domain.Alert) map[primitive.ObjectID]dto.AlertsSummary {
	summaryMap := make(map[primitive.ObjectID]dto.AlertsSummary)

	for _, alert := range alerts {
		if alert == nil || alert.Status != domain.StatusOpen {
			continue
		}

		summary := summaryMap[alert.PatientID]
		summary.Total++
		switch alert.Severity {
		case domain.SeverityHigh:
			summary.High++
		case domain.SeverityMedium:
			summary.Medium++
		case domain.SeverityLow:
			summary.Low++
		}

		createdAt := alert.CreatedAt
		if summary.LastAlertAt == nil || createdAt.After(*summary.LastAlertAt) {
			summary.LastAlertAt = &createdAt
		}

		summaryMap[alert.PatientID] = summary
	}

	return summaryMap
}

// sortPatientOverviews prioritises patients with the most severe open alerts,
// falling back to name so the ordering is stable.
func sortPatientOverviews(rows []dto.PatientOverviewResponse) {
	sort.SliceStable(rows, func(i, j int) bool {
		a, b := rows[i].AlertsSummary, rows[j].AlertsSummary
		if a.High != b.High {
			return a.High > b.High
		}
		if a.Medium != b.Medium {
			return a.Medium > b.Medium
		}
		if a.Low != b.Low {
			return a.Low > b.Low
		}
		return strings.Compare(strings.ToLower(rows[i].Name), strings.ToLower(rows[j].Name)) < 0
	})
}

func mapThresholdToResponse(t *domain.Threshold) *dto.ThresholdResponse {
	return &dto.ThresholdResponse{
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
	}
}
