package seed

import (
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
					Dosage:       "500mg tablet",
					Route:        "oral",
					Instructions: "Take with meals to reduce stomach upset",
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
					Dosage:       "5mg tablet",
					Route:        "oral",
					Instructions: "Take at the same time each morning",
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
					Dosage:       "10mg tablet",
					Route:        "oral",
					Instructions: "Monitor blood pressure weekly",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, nil, nil),
					},
				},
				{
					DrugName:     "Atorvastatin",
					Dosage:       "20mg tablet",
					Route:        "oral",
					Instructions: "Take at bedtime; avoid grapefruit",
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
					Dosage:       "850mg tablet",
					Route:        "oral",
					Instructions: "Take after breakfast and dinner",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPostMeal, 1, nil, nil),
						dose(domain.TimeOfDayEvening, domain.MealTimingPostMeal, 1, nil, nil),
					},
				},
				{
					DrugName:     "Glipizide",
					Dosage:       "5mg tablet",
					Route:        "oral",
					Instructions: "Take 30 minutes before meals",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, domain.MealTimingPreMeal, 1, ip(7), ip(0)),
						dose(domain.TimeOfDayNoon, domain.MealTimingPreMeal, 1, ip(12), ip(0)),
					},
				},
				{
					DrugName:     "Insulin Glargine",
					Dosage:       "10 units",
					Route:        "subcutaneous",
					Instructions: "Inject at the same time every night",
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
					Dosage:       "20mg capsule",
					Route:        "oral",
					Instructions: "Take 30 minutes before breakfast",
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
					Dosage:       "50mg tablet",
					Route:        "oral",
					Instructions: "Do not stop abruptly",
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
					Dosage:       "50mg tablet",
					Route:        "oral",
					Instructions: "Weekday dosing only",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, nil, nil),
					},
				},
			},
			DaysOfWeek: []int{1, 2, 3, 4, 5},
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 7:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Hydrochlorothiazide",
					Dosage:       "25mg tablet",
					Route:        "oral",
					Instructions: "Take in the morning; stay hydrated",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(7), ip(45)),
					},
				},
			},
			DaysOfWeek: []int{1, 3, 5},
			Status:     prescriptionStatus(i),
			EndDate:    prescriptionEndDate(i, startDate),
		}
	case 8:
		return prescriptionProfile{
			Medications: []domain.PrescriptionMedication{
				{
					DrugName:     "Warfarin",
					Dosage:       "2.5mg tablet",
					Route:        "oral",
					Instructions: "Dose per INR; avoid sudden diet changes",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayEvening, "", 1, ip(18), ip(0)),
					},
				},
				{
					DrugName:     "Aspirin",
					Dosage:       "81mg tablet",
					Route:        "oral",
					Instructions: "Take with food if stomach upset occurs",
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
					Dosage:       "5mg tablet",
					Route:        "oral",
					Instructions: "For blood pressure control",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, nil, nil),
					},
				},
				{
					DrugName:     "Metoprolol",
					Dosage:       "25mg tablet",
					Route:        "oral",
					Instructions: "Twice daily for heart rate control",
					Schedule: []domain.MedicationDose{
						dose(domain.TimeOfDayMorning, "", 1, ip(8), ip(0)),
						dose(domain.TimeOfDayEvening, "", 1, ip(20), ip(0)),
					},
				},
				{
					DrugName:     "Furosemide",
					Dosage:       "20mg tablet",
					Route:        "oral",
					Instructions: "Take in the morning to avoid night urination",
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

func allDaysOfWeek() []int {
	return []int{1, 2, 3, 4, 5, 6, 7}
}

func prescriptionStatus(i int) domain.PrescriptionStatus {
	switch i % 4 {
	case 1:
		return domain.PrescriptionStatusCompleted
	case 2:
		return domain.PrescriptionStatusDiscontinued
	default:
		return domain.PrescriptionStatusActive
	}
}

func prescriptionEndDate(i int, startDate time.Time) *time.Time {
	switch i % 4 {
	case 1:
		end := startDate.AddDate(0, 1, 0)
		return &end
	case 2:
		end := startDate.AddDate(0, 0, 14)
		return &end
	case 3:
		end := startDate.AddDate(0, 6, 0)
		return &end
	default:
		return nil
	}
}

func pickPrescriptionDose(prescription *domain.Prescription, index int) (domain.PrescriptionMedication, domain.MedicationDose) {
	if len(prescription.Medications) == 0 {
		return domain.PrescriptionMedication{
				DrugName: "Metformin",
				Dosage:   "500mg tablet",
			}, domain.MedicationDose{
				TimeOfDay: domain.TimeOfDayMorning,
				PillCount: 1,
			}
	}

	medication := prescription.Medications[index%len(prescription.Medications)]
	if len(medication.Schedule) == 0 {
		return medication, domain.MedicationDose{
			TimeOfDay: domain.TimeOfDayMorning,
			PillCount: 1,
		}
	}

	return medication, medication.Schedule[index%len(medication.Schedule)]
}
