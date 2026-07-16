package seed

import (
	"context"
	"fmt"
	"log"
	"math"
	"sort"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/measurement_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepo "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type historyProfile int

const (
	profileRisingBP historyProfile = iota
	profileRisingGlucose
	profileFallingGlucose
	profilePointAnomalies
	profileStableMixed
)

// RunEnrichMeasurementHistory adds consecutive past measurements for every
// existing patient and creates alerts using the same threshold + trend merge
// rules as EvaluateAndCreateAlertActivity. Does not drop data or seed chat.
func RunEnrichMeasurementHistory(ctx context.Context, db *mongo.Database) error {
	s := NewSeeder(db)

	patients, err := s.patientRepo.FindPatients(ctx, userRepo.UserFilter{Limit: 10000})
	if err != nil {
		return fmt.Errorf("list patients: %w", err)
	}
	if len(patients) == 0 {
		return fmt.Errorf("no patients found; run full seed first")
	}

	ptrs := make([]*userDomain.Patient, len(patients))
	for i := range patients {
		ptrs[i] = &patients[i]
	}

	createdMs, createdAlerts, err := s.enrichPatientsMeasurementHistory(ctx, ptrs)
	if err != nil {
		return err
	}

	log.Printf(
		"[seed-history] completed: %d patients, %d measurements created, %d alerts created",
		len(patients), createdMs, createdAlerts,
	)
	return nil
}

func (s *Seeder) enrichPatientsMeasurementHistory(
	ctx context.Context,
	patients []*userDomain.Patient,
) (measurementsCreated, alertsCreated int, err error) {
	for i, patient := range patients {
		msCreated, aCreated, err := s.ensurePatientMeasurementHistory(ctx, patient, i)
		if err != nil {
			return measurementsCreated, alertsCreated, fmt.Errorf("patient %s: %w", patient.Email, err)
		}
		measurementsCreated += msCreated
		alertsCreated += aCreated
		log.Printf(
			"[seed-history] patient %s: %d measurements created, %d alerts created",
			patient.Email, msCreated, aCreated,
		)
	}
	return measurementsCreated, alertsCreated, nil
}

func (s *Seeder) ensurePatientMeasurementHistory(
	ctx context.Context,
	patient *userDomain.Patient,
	index int,
) (measurementsCreated, alertsCreated int, err error) {
	threshold, err := s.latestThresholdForPatient(ctx, patient.ID)
	if err != nil {
		return 0, 0, err
	}
	if threshold == nil {
		return 0, 0, fmt.Errorf("no threshold for patient %s", patient.ID.Hex())
	}

	existing, err := s.loadPatientMeasurements(ctx, patient.ID)
	if err != nil {
		return 0, 0, err
	}

	targetCount := historyReadingCount(index)
	profile := pickHistoryProfile(patient, index)

	if len(existing) < targetCount {
		slots := historySchedule(index, targetCount)
		occupied := occupiedHours(existing)
		created := make([]*domain.Measurement, 0, targetCount-len(existing))

		for slot, at := range slots {
			if occupied[at.UTC().Truncate(time.Hour)] {
				continue
			}
			if len(existing)+len(created) >= targetCount {
				break
			}

			m := buildHistoryMeasurement(patient.ID, profile, slot, targetCount, index)
			if _, err := s.measurementRepo.Create(ctx, &m); err != nil {
				return measurementsCreated, 0, err
			}
			if err := s.backdateCreatedAt(ctx, "measurements", m.ID, at); err != nil {
				return measurementsCreated, 0, err
			}
			m.CreatedAt = at
			m.UpdatedAt = at
			created = append(created, &m)
			measurementsCreated++
		}
	}

	all, err := s.loadPatientMeasurements(ctx, patient.ID)
	if err != nil {
		return measurementsCreated, 0, err
	}

	alertsCreated, err = s.evaluateAlertsForPatientHistory(ctx, patient.ID, threshold, all, index)
	if err != nil {
		return measurementsCreated, alertsCreated, err
	}
	return measurementsCreated, alertsCreated, nil
}

func (s *Seeder) latestThresholdForPatient(
	ctx context.Context,
	patientID primitive.ObjectID,
) (*domain.Threshold, error) {
	existing, err := s.thresholdRepo.FindWithFilter(ctx, repository.ThresholdFilter{
		PatientID: patientID.Hex(),
		IsLatest:  true,
	})
	if err != nil {
		return nil, err
	}
	if len(existing) == 0 {
		return nil, nil
	}
	return &existing[0], nil
}

func (s *Seeder) loadPatientMeasurements(
	ctx context.Context,
	patientID primitive.ObjectID,
) ([]*domain.Measurement, error) {
	cursor, err := s.db.Collection("measurements").Find(
		ctx,
		bson.M{"patientId": patientID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make([]*domain.Measurement, 0)
	for cursor.Next(ctx) {
		var m domain.Measurement
		if err := cursor.Decode(&m); err != nil {
			return nil, err
		}
		result = append(result, &m)
	}
	return result, cursor.Err()
}

func occupiedHours(ms []*domain.Measurement) map[time.Time]bool {
	out := make(map[time.Time]bool, len(ms))
	for _, m := range ms {
		out[m.CreatedAt.UTC().Truncate(time.Hour)] = true
	}
	return out
}

func historyReadingCount(index int) int {
	span := historyMaxReadings - historyMinReadings + 1
	return historyMinReadings + (index % span)
}

func historySpanDays(index int) int {
	span := historyMaxSpanDays - historyMinSpanDays + 1
	return historyMinSpanDays + (index % span)
}

// historySchedule returns ascending timestamps ending a few days ago, spaced
// roughly daily across a patient-specific window.
func historySchedule(index, count int) []time.Time {
	spanDays := historySpanDays(index)
	endOffsetDays := 1 + (index % 5)
	end := time.Now().UTC().AddDate(0, 0, -endOffsetDays).
		Add(time.Duration(7+index%5) * time.Hour).
		Add(time.Duration((index*7)%60) * time.Minute)

	if count <= 1 {
		return []time.Time{end}
	}

	slots := make([]time.Time, count)
	step := time.Duration(spanDays) * 24 * time.Hour / time.Duration(count-1)
	start := end.Add(-time.Duration(spanDays) * 24 * time.Hour)
	for i := 0; i < count; i++ {
		jitter := time.Duration((i*11+index*3)%40) * time.Minute
		slots[i] = start.Add(time.Duration(i) * step).Add(jitter)
	}
	sort.Slice(slots, func(i, j int) bool { return slots[i].Before(slots[j]) })
	return slots
}

func pickHistoryProfile(patient *userDomain.Patient, index int) historyProfile {
	switch index % 5 {
	case 0:
		if patient.DiseaseTypes.BloodPressure || !patient.DiseaseTypes.Glucose {
			return profileRisingBP
		}
		return profileRisingGlucose
	case 1:
		if patient.DiseaseTypes.Glucose {
			return profileRisingGlucose
		}
		return profileRisingBP
	case 2:
		if patient.DiseaseTypes.Glucose {
			return profileFallingGlucose
		}
		return profilePointAnomalies
	case 3:
		return profilePointAnomalies
	default:
		return profileStableMixed
	}
}

func buildHistoryMeasurement(
	patientID primitive.ObjectID,
	profile historyProfile,
	slot, total, index int,
) domain.Measurement {
	device := "Máy đo tại nhà"
	note := fmt.Sprintf("Chuỗi đo lịch sử %02d/%02d", slot+1, total)
	progress := 0.0
	if total > 1 {
		progress = float64(slot) / float64(total-1)
	}
	inTrendPhase := progress >= 0.55

	switch profile {
	case profileRisingBP:
		sys := 118.0 + float64((slot+index)%4)
		dia := 76.0 + float64((slot+index)%3)
		if inTrendPhase {
			t := (progress - 0.55) / 0.45
			sys = 122 + t*33 // → ~155, near clinical 160 / personal 140
			dia = 78 + t*18  // → ~96, near clinical 100 / personal 90
		}
		hr := 72.0 + float64(slot%8)
		return vitalsMeasurement(patientID, sys, dia, 36.6+float64(slot%3)*0.1, hr, 14+float64(slot%3), 97, &device, &note)

	case profileRisingGlucose:
		preMeal := domain.MealTimingPreMeal
		g := 98.0 + float64((slot+index)%6)
		if inTrendPhase {
			t := (progress - 0.55) / 0.45
			g = 105 + t*35 // → ~140, crosses personal 140 and clinical pre 126
		}
		return domain.Measurement{
			PatientID:  patientID,
			Glucose:    domain.Glucose{BloodGlucose: fp(g)},
			MealTiming: &preMeal,
			Device:     &device,
			Note:       &note,
		}

	case profileFallingGlucose:
		preMeal := domain.MealTimingPreMeal
		g := 118.0 - float64((slot+index)%5)
		if inTrendPhase {
			t := (progress - 0.55) / 0.45
			g = 110 - t*52 // → ~58, toward hypo / personal min 70
		}
		return domain.Measurement{
			PatientID:  patientID,
			Glucose:    domain.Glucose{BloodGlucose: fp(g)},
			MealTiming: &preMeal,
			Device:     &device,
			Note:       &note,
		}

	case profilePointAnomalies:
		// Mostly in-range vitals; reuse the rotating anomaly builder on a
		// subset of slots so point-threshold alerts still appear.
		if slot%5 == 0 || slot == total-1 {
			return buildSeedMeasurement(patientID, index+slot)
		}
		sys := 116.0 + float64(slot%10)
		dia := 74.0 + float64(slot%6)
		return vitalsMeasurement(patientID, sys, dia, 36.5+float64(slot%4)*0.1, 68+float64(slot%12), 13+float64(slot%4), 96+float64(slot%3), &device, &note)

	default: // profileStableMixed
		if slot%2 == 0 {
			sys := 115.0 + float64((slot/2)%8)
			dia := 73.0 + float64((slot/2)%5)
			return vitalsMeasurement(patientID, sys, dia, 36.5, 70+float64(slot%10), 14, 97, &device, &note)
		}
		preMeal := domain.MealTimingPreMeal
		postMeal := domain.MealTimingPostMeal
		timing := &preMeal
		g := 95.0 + float64(slot%20)
		if slot%4 == 1 {
			timing = &postMeal
			g = 120.0 + float64(slot%25)
		}
		return domain.Measurement{
			PatientID:  patientID,
			Glucose:    domain.Glucose{BloodGlucose: fp(g)},
			MealTiming: timing,
			Device:     &device,
			Note:       &note,
		}
	}
}

func vitalsMeasurement(
	patientID primitive.ObjectID,
	sys, dia, temp, hr, rr, spo2 float64,
	device, note *string,
) domain.Measurement {
	sys = math.Round(sys)
	dia = math.Round(dia)
	return domain.Measurement{
		PatientID:       patientID,
		Temperature:     fp(temp),
		HeartRate:       fp(hr),
		RespiratoryRate: fp(rr),
		SpO2:            fp(spo2),
		BloodPressure: domain.BloodPressure{
			Systolic:  fp(sys),
			Diastolic: fp(dia),
			MAP:       fp(math.Round(calculateMAP(sys, dia))),
		},
		Device: device,
		Note:   note,
	}
}

// evaluateAlertsForPatientHistory mirrors EvaluateAndCreateAlertActivity:
// point threshold first, then EvaluateTrends with edgeOnly when no threshold
// hit. No chat / push side effects.
func (s *Seeder) evaluateAlertsForPatientHistory(
	ctx context.Context,
	patientID primitive.ObjectID,
	threshold *domain.Threshold,
	measurements []*domain.Measurement,
	index int,
) (int, error) {
	created := 0
	values := make([]domain.Measurement, len(measurements))
	for i, m := range measurements {
		values[i] = *m
	}

	for i, measurement := range measurements {
		existing, err := s.alertRepo.FindByMeasurementID(ctx, measurement.ID)
		if err != nil {
			return created, err
		}
		if existing != nil {
			continue
		}

		thresholdViolations := measurement_helper.EvaluateMeasurementAgainstThreshold(measurement, threshold)

		asOf := measurement.CreatedAt
		if asOf.IsZero() {
			asOf = time.Now().UTC()
		}
		since := measurement_helper.TrendHistorySince(asOf)
		history := measurementsInWindow(values[:i+1], since, asOf)

		edgeOnly := len(thresholdViolations) == 0
		trendViolations := measurement_helper.EvaluateTrends(
			history,
			measurement,
			threshold,
			measurement.MealTiming,
			edgeOnly,
		)

		violations := append(thresholdViolations, trendViolations...)
		if len(violations) == 0 {
			continue
		}

		acknowledged := (index+i)%3 == 0
		status := domain.StatusOpen
		if acknowledged {
			status = domain.StatusAck
		}

		alert := &domain.Alert{
			ID:            primitive.NewObjectID(),
			PatientID:     patientID,
			MeasurementID: measurement.ID,
			Violations:    violations,
			Status:        status,
			Severity:      measurement_helper.AggregateSeverity(violations),
		}
		if _, err := s.alertRepo.Create(ctx, alert); err != nil {
			return created, err
		}

		triggeredAt := asOf.Add(time.Duration(1+i%9) * time.Minute)
		fields := bson.M{"createdAt": triggeredAt.UTC(), "updatedAt": triggeredAt.UTC()}
		if acknowledged {
			ackAt := triggeredAt.Add(time.Duration(15+(index+i)%165) * time.Minute)
			if now := time.Now().UTC(); !ackAt.Before(now) {
				ackAt = now.Add(-time.Minute)
			}
			fields["acknowledgedBy"] = threshold.DoctorID
			fields["acknowledgedAt"] = ackAt.UTC()
			fields["updatedAt"] = ackAt.UTC()
		}
		if err := s.setTimestampFields(ctx, "alerts", alert.ID, fields); err != nil {
			return created, err
		}
		created++
	}

	return created, nil
}

func measurementsInWindow(ms []domain.Measurement, since, asOf time.Time) []domain.Measurement {
	out := make([]domain.Measurement, 0, len(ms))
	for _, m := range ms {
		if m.CreatedAt.Before(since) {
			continue
		}
		if m.CreatedAt.After(asOf) {
			continue
		}
		out = append(out, m)
	}
	return out
}
