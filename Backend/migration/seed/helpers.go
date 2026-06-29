package seed

import (
	"fmt"
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

func fp(v float64) *float64 {
	return &v
}

func ip(v int) *int {
	return &v
}

func seedEmail(role string, index int) string {
	if index == 0 {
		switch role {
		case "admin":
			return adminEmail
		case "doctor":
			return doctorEmail
		case "patient":
			return patientEmail
		case "nurse":
			return nurseEmail
		}
	}
	return fmt.Sprintf("seed-%s-%02d@%s", role, index+1, seedDomain)
}

func seedPassword(role string) string {
	switch role {
	case "admin":
		return adminPassword
	case "doctor":
		return doctorPassword
	case "patient":
		return patientPassword
	case "nurse":
		return nursePassword
	default:
		return patientPassword
	}
}

func seedGender(index int) userDomain.Gender {
	if index%3 == 0 {
		return userDomain.GenderMale
	}
	if index%3 == 1 {
		return userDomain.GenderFemale
	}
	return userDomain.GenderOther
}

func seedDob(index int, baseYear int) time.Time {
	return time.Date(baseYear-(index%30), time.Month((index%12)+1), (index%28)+1, 0, 0, 0, 0, time.UTC)
}

func pick[T any](items []T, index int) T {
	return items[index%len(items)]
}

func daysAgo(index int) time.Time {
	return time.Now().UTC().Add(-time.Duration(index+1) * 24 * time.Hour)
}

func daysAhead(index int) time.Time {
	return time.Now().UTC().Add(time.Duration(index+1) * 24 * time.Hour)
}
