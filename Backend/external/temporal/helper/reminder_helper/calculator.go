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

	if len(r.Times) == 0 {
		return time.Time{}, false
	}

	// Don't start searching before the reminder becomes active. Without this,
	// a reminder whose StartDate is more than the search window (2 weeks) in the
	// future would yield no candidate and be wrongly treated as expired.
	if start := r.StartDate.In(loc); from.Before(start) {
		from = start
	}

	for i := 0; i < 14; i++ { // search max 2 weeks ahead
		candidateDate := from.AddDate(0, 0, i)

		weekday := int(candidateDate.Weekday()) // 0=Sunday
		if !containsDay(r.DaysOfWeek, weekday) {
			continue
		}

		// A reminder may have several fire times per day; pick the earliest
		// valid one that is still in the future relative to `from`.
		var best time.Time
		found := false
		for _, t := range r.Times {
			candidate := time.Date(
				candidateDate.Year(),
				candidateDate.Month(),
				candidateDate.Day(),
				t.Hour,
				t.Minute,
				0,
				0,
				loc,
			)

			if candidate.After(from) &&
				!candidate.Before(r.StartDate) &&
				!candidate.After(r.EndDate) {
				if !found || candidate.Before(best) {
					best = candidate
					found = true
				}
			}
		}

		if found {
			return best.UTC(), true
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
