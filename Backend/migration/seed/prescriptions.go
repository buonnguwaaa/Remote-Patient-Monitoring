package seed

import (
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type prescriptionProfile struct {
	Medications []domain.PrescriptionMedication
	DaysOfWeek  []int
	Status      domain.PrescriptionStatus
	EndDate     *time.Time
}

func buildPrescriptionProfile(i int, startDate time.Time) prescriptionProfile {
	switch i % 10 {
	case 0:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Metformin",
					Dosage:       "Viên 500mg",
					Route:        "Uống",
					Instructions: "Uống cùng bữa ăn để giảm kích ứng dạ dày",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPostMeal, 1, nil, nil),
						dose(domain.TimeOfDayEvening, domain.MealTimingPostMeal, 1, nil, nil),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 1:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Amlodipine",
					Dosage:       "Viên 5mg",
					Route:        "Uống",
					Instructions: "Uống vào cùng một thời điểm mỗi buổi sáng",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(7), ip(30)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 2:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Lisinopril",
					Dosage:       "Viên 10mg",
					Route:        "Uống",
					Instructions: "Theo dõi huyết áp hàng tuần",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, nil, nil),
					},
				},
				{
					DrugName:     "Atorvastatin",
					Dosage:       "Viên 20mg",
					Route:        "Uống",
					Instructions: "Uống trước khi đi ngủ; tránh dùng bưởi",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayEvening, "", 1, ip(21), ip(0)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 3:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Metformin",
					Dosage:       "Viên 850mg",
					Route:        "Uống",
					Instructions: "Uống sau bữa sáng và bữa tối",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPostMeal, 1, nil, nil),
						dose(domain.TimeOfDayEvening, domain.MealTimingPostMeal, 1, nil, nil),
					},
				},
				{
					DrugName:     "Glipizide",
					Dosage:       "Viên 5mg",
					Route:        "Uống",
					Instructions: "Uống trước bữa ăn 30 phút",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPreMeal, 1, ip(7), ip(0)),
						dose(domain.TimeOfDayNoon, domain.MealTimingPreMeal, 1, ip(12), ip(0)),
					},
				},
				{
					DrugName:     "Insulin Glargine",
					Dosage:       "10 đơn vị",
					Route:        "Tiêm dưới da",
					Instructions: "Tiêm vào cùng một thời điểm mỗi tối",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayEvening, "", 1, ip(22), ip(0)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 4:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Omeprazole",
					Dosage:       "Viên nang 20mg",
					Route:        "Uống",
					Instructions: "Uống trước bữa sáng 30 phút",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPreMeal, 1, ip(6), ip(30)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 5:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Metoprolol",
					Dosage:       "Viên 50mg",
					Route:        "Uống",
					Instructions: "Không tự ý ngừng thuốc đột ngột",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(8), ip(0)),
						dose(domain.TimeOfDayEvening, "", 0.5, ip(20), ip(0)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 6:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Losartan",
					Dosage:       "Viên 50mg",
					Route:        "Uống",
					Instructions: "Dùng đều đặn mỗi ngày, không tự ý bỏ liều",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, nil, nil),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 7:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Hydrochlorothiazide",
					Dosage:       "Viên 25mg",
					Route:        "Uống",
					Instructions: "Uống vào buổi sáng; uống nhiều nước",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(7), ip(45)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 8:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Warfarin",
					Dosage:       "Viên 2.5mg",
					Route:        "Uống",
					Instructions: "Liều dùng theo chỉ số INR; tránh thay đổi chế độ ăn đột ngột",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayEvening, "", 1, ip(18), ip(0)),
					},
				},
				{
					DrugName:     "Aspirin",
					Dosage:       "Viên 81mg",
					Route:        "Uống",
					Instructions: "Uống cùng thức ăn nếu bị khó chịu dạ dày",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPostMeal, 1, nil, nil),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	default:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Amlodipine",
					Dosage:       "Viên 5mg",
					Route:        "Uống",
					Instructions: "Dùng để kiểm soát huyết áp",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, nil, nil),
					},
				},
				{
					DrugName:     "Metoprolol",
					Dosage:       "Viên 25mg",
					Route:        "Uống",
					Instructions: "Dùng 2 lần mỗi ngày để kiểm soát nhịp tim",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(8), ip(0)),
						dose(domain.TimeOfDayEvening, "", 1, ip(20), ip(0)),
					},
				},
				{
					DrugName:     "Furosemide",
					Dosage:       "Viên 20mg",
					Route:        "Uống",
					Instructions: "Uống vào buổi sáng để tránh đi tiểu đêm",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(7), ip(0)),
					},
				},
			},
			DaysOfWeek: allDaysOfWeek(),
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	}
}

func dose(
	timeOfDay domain.TimeOfDay,
	meal domain.MealTiming,
	pillCount float64,
	hour, minute *int,
) domain.MedicationDose {
	d := domain.MedicationDose{
		TimeOfDay: timeOfDay,
		PillCount: pillCount,
		Hour:      hour,
		Minute:    minute,
	}
	if meal != "" {
		d.MealTiming = meal
	}
	return d
}

// allDaysOfWeek returns every day using Go's time.Weekday convention
// (0=Sunday..6=Saturday), matching domain.Reminder/domain.Prescription.DaysOfWeek.
func allDaysOfWeek() []int {
	return []int{0, 1, 2, 3, 4, 5, 6}
}

// prescriptionStatus never reports a prescription as still ongoing ("active")
// - the whole prescription->reminder chain is seeded in the past (see
// prescriptionEndDate), so every course is either finished as prescribed or
// stopped early.
func prescriptionStatus(i int) domain.PrescriptionStatus {
	if i%4 == 2 {
		return domain.PrescriptionStatusDiscontinued
	}
	return domain.PrescriptionStatusCompleted
}

// prescriptionEndDate always returns a concrete date strictly in the past.
// It must never fall back to nil: domain.PrescriptionEffectiveEndDate treats
// a nil EndDate as "startDate + 1 year", which - given startDate is itself
// only days/weeks in the past - would land in the future and produce a
// still-"firing" medication reminder that no Temporal workflow ever created.
func prescriptionEndDate(i int, startDate time.Time) *time.Time {
	var end time.Time
	switch i % 4 {
	case 1:
		end = startDate.AddDate(0, 1, 0)
	case 2:
		end = startDate.AddDate(0, 0, 14)
	case 3:
		end = startDate.AddDate(0, 6, 0)
	default:
		end = startDate.AddDate(0, 2, 0)
	}
	if cutoff := time.Now().UTC().AddDate(0, 0, -2); end.After(cutoff) {
		end = cutoff
	}
	return &end
}

// medicationIntakeSchedule picks a (scheduledDate, takenAt) pair that is
// actually valid for the prescription: scheduledDate falls on/after its
// StartDate, before its effective EndDate, and on one of its DaysOfWeek, and
// is truncated to midnight in the prescription's timezone - mirroring
// medicationIntakeService.isPrescriptionScheduledOnDate / startOfDayInTimezone
// so seeded intakes line up the same way a real "mark as taken" would.
func medicationIntakeSchedule(prescription *domain.Prescription, dose domain.MedicationDose, index int, now time.Time) (time.Time, time.Time) {
	loc, err := time.LoadLocation(prescription.Timezone)
	if err != nil {
		loc = time.UTC
	}

	start := startOfDayIn(prescription.StartDate, loc)
	end := startOfDayIn(domain.PrescriptionEffectiveEndDate(prescription.EndDate, prescription.StartDate), loc)
	upper := startOfDayIn(now, loc)
	if end.Before(upper) {
		upper = end
	}
	if !upper.After(start) {
		upper = start.AddDate(0, 0, 1)
	}

	validDays := make([]time.Time, 0, 7)
	for d := start; d.Before(upper) && len(validDays) < 7; d = d.AddDate(0, 0, 1) {
		if containsDay(prescription.DaysOfWeek, int(d.Weekday())) {
			validDays = append(validDays, d)
		}
	}

	scheduledDate := start
	if len(validDays) > 0 {
		scheduledDate = validDays[index%len(validDays)]
	}

	hour, minute := domain.DoseClock(dose)
	takenAt := time.Date(scheduledDate.Year(), scheduledDate.Month(), scheduledDate.Day(), hour, minute, 0, 0, loc).
		Add(time.Duration(5+index%10) * time.Minute)

	return scheduledDate.UTC(), takenAt.UTC()
}

func startOfDayIn(t time.Time, loc *time.Location) time.Time {
	local := t.In(loc)
	y, m, d := local.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

func containsDay(daysOfWeek []int, weekday int) bool {
	for _, d := range daysOfWeek {
		if d == weekday {
			return true
		}
	}
	return false
}

// medicationReminderSlot mirrors one fire time of the medication reminder
// that prescriptionService.createMedicationReminders builds for a real
// prescription: every distinct dose clock across all medications becomes a
// single slot, and every dose at that clock contributes a message line.
type medicationReminderSlot struct {
	hour     int
	minute   int
	messages []string
}

// medicationReminderSlots groups a prescription's medication doses by clock
// time, matching prescriptionService.groupReminderSlots so seeded medication
// reminders look like ones created through the real prescription API.
func medicationReminderSlots(medications []domain.PrescriptionMedication) []medicationReminderSlot {
	bySlot := make(map[[2]int]*medicationReminderSlot)
	order := make([][2]int, 0)

	for _, med := range medications {
		for _, dose := range med.Schedule {
			hour, minute := domain.DoseClock(dose)
			key := [2]int{hour, minute}
			slot, ok := bySlot[key]
			if !ok {
				slot = &medicationReminderSlot{hour: hour, minute: minute}
				bySlot[key] = slot
				order = append(order, key)
			}
			slot.messages = append(slot.messages, formatDoseReminderMessage(med, dose))
		}
	}

	sort.Slice(order, func(i, j int) bool {
		if order[i][0] != order[j][0] {
			return order[i][0] < order[j][0]
		}
		return order[i][1] < order[j][1]
	})

	slots := make([]medicationReminderSlot, 0, len(order))
	for _, key := range order {
		slots = append(slots, *bySlot[key])
	}
	return slots
}

func formatDoseReminderMessage(med domain.PrescriptionMedication, dose domain.MedicationDose) string {
	suffix := ""
	if label := domain.MealTimingLabel(dose.MealTiming); label != "" {
		suffix = " " + label
	}
	return fmt.Sprintf("Uống %s %s (%s)%s", formatPillCount(dose.PillCount), med.DrugName, med.Dosage, suffix)
}

func formatPillCount(count float64) string {
	if count == float64(int(count)) {
		return strconv.Itoa(int(count))
	}
	return strconv.FormatFloat(count, 'f', -1, 64)
}
