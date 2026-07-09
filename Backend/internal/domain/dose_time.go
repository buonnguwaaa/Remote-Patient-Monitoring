package domain

import (
	"fmt"
	"time"
)

const (
	morningStartHour = 5
	noonStartHour    = 12
	eveningStartHour = 17
)

func (t TimeOfDay) IsValid() bool {
	switch t {
	case TimeOfDayMorning, TimeOfDayNoon, TimeOfDayEvening:
		return true
	default:
		return false
	}
}

// DefaultClockForTimeOfDay returns the default clock when a dose has no custom time.
func DefaultClockForTimeOfDay(timeOfDay TimeOfDay) (hour, minute int) {
	switch timeOfDay {
	case TimeOfDayMorning:
		return 8, 0
	case TimeOfDayNoon:
		return 12, 0
	case TimeOfDayEvening:
		return 18, 0
	default:
		return 8, 0
	}
}

// DoseClock resolves the effective reminder/intake clock for a dose.
func DoseClock(dose MedicationDose) (hour, minute int) {
	if dose.Hour != nil && dose.Minute != nil {
		return *dose.Hour, *dose.Minute
	}
	return DefaultClockForTimeOfDay(dose.TimeOfDay)
}

// TimeOfDayForClock maps a clock time into a morning/noon/evening bucket.
func TimeOfDayForClock(hour, minute int) (TimeOfDay, bool) {
	if minute < 0 || minute > 59 || hour < 0 || hour > 23 {
		return "", false
	}

	switch {
	case hour >= morningStartHour && hour < noonStartHour:
		return TimeOfDayMorning, true
	case hour >= noonStartHour && hour < eveningStartHour:
		return TimeOfDayNoon, true
	default:
		return TimeOfDayEvening, true
	}
}

// ValidateDoseTime ensures timeOfDay is set and optional custom clock fits the bucket.
func ValidateDoseTime(dose MedicationDose) error {
	if !dose.TimeOfDay.IsValid() {
		return fmt.Errorf("buổi uống thuốc không hợp lệ: %s", dose.TimeOfDay)
	}

	hasHour := dose.Hour != nil
	hasMinute := dose.Minute != nil
	if hasHour != hasMinute {
		return fmt.Errorf("giờ và phút phải cùng được nhập hoặc cùng để trống")
	}

	if !hasHour {
		return nil
	}

	if *dose.Hour < 0 || *dose.Hour > 23 || *dose.Minute < 0 || *dose.Minute > 59 {
		return fmt.Errorf("giờ (0-23) hoặc phút (0-59) không hợp lệ")
	}

	bucket, ok := TimeOfDayForClock(*dose.Hour, *dose.Minute)
	if !ok {
		return fmt.Errorf("thời gian không hợp lệ")
	}
	if bucket != dose.TimeOfDay {
		var todVN string
		switch dose.TimeOfDay {
		case "morning":
			todVN = "Sáng"
		case "noon":
			todVN = "Trưa"
		case "evening":
			todVN = "Tối"
		default:
			todVN = string(dose.TimeOfDay)
		}
		return fmt.Errorf("giờ %s không nằm trong khoảng thời gian của Buổi %s", FormatClock(*dose.Hour, *dose.Minute), todVN)
	}

	return nil
}

func DoseClockMatches(a, b MedicationDose) bool {
	ah, am := DoseClock(a)
	bh, bm := DoseClock(b)
	return ah == bh && am == bm
}

// FormatClock renders HH:MM in 24-hour format.
func FormatClock(hour, minute int) string {
	return fmt.Sprintf("%02d:%02d", hour, minute)
}

// FormatDoseClock renders the effective dose time.
func FormatDoseClock(dose MedicationDose) string {
	hour, minute := DoseClock(dose)
	return FormatClock(hour, minute)
}

// ReminderSlotTime builds the local fire time for a reminder on a scheduled day.
func ReminderSlotTime(scheduledDate time.Time, timezone string, hour, minute int) (time.Time, error) {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.Time{}, fmt.Errorf("múi giờ không hợp lệ: %w", err)
	}

	localDay := scheduledDate.In(loc)
	return time.Date(localDay.Year(), localDay.Month(), localDay.Day(), hour, minute, 0, 0, loc), nil
}
