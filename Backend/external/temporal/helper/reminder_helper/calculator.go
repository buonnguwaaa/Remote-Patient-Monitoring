package reminder_helper

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

// Returns next reminder time AFTER `from`
func CalculateNextReminderTime(
	from time.Time,
	r *domain.Reminder,
) (time.Time, bool) {

	loc, err := time.LoadLocation(r.Timezone)
	if err != nil {
		return time.Time{}, false
	}

	from = from.In(loc)

	// Start searching from next minute
	start := from.Add(time.Minute)

	for i := 0; i < 14; i++ { // search max 2 weeks ahead
		candidateDate := start.AddDate(0, 0, i)

		weekday := int(candidateDate.Weekday()) // 0=Sunday
		if !containsDay(r.DaysOfWeek, weekday) {
			continue
		}

		candidate := time.Date(
			candidateDate.Year(),
			candidateDate.Month(),
			candidateDate.Day(),
			r.Hour,
			r.Minute,
			0,
			0,
			loc,
		)

		if candidate.After(from) &&
			!candidate.Before(r.StartDate) &&
			!candidate.After(r.EndDate) {
			return candidate.UTC(), true
		}
	}

	return time.Time{}, false
}

func containsDay(days []int, day int) bool {
	for _, d := range days {
		if d == day {
			return true
		}
	}
	return false
}