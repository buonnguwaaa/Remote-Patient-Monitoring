package seed

// Clinic locations used by the doctor web AppointmentPage LOCATION_OPTIONS.
// Keep this list in sync with Frontend/web/src/pages/AppointmentPage.tsx.
var ClinicLocations = []string{
	"Hệ thống Y Tế Tim Mạch - Tiểu Đường 315, Chi nhánh Tô Hiến Thành, Phường Hoà Hưng, TP.HCM",
	"Hệ thống Y Tế Tim Mạch - Tiểu Đường 315, Chi nhánh Lê Văn Việt, Phường Tăng Nhơn Phú, TP.HCM",
	"Hệ thống Y Tế Tim Mạch - Tiểu Đường 315, Chi nhánh Huỳnh Tấn Phát, Phường Tân Thuận, TP.HCM",
	"Phòng khám Nội Tổng Quát - Tim Mạch Thiên Phúc, 550/6/10 Trần Quang Cơ, Phường Tân Thới Hiệp, TP.HCM",
	"Phòng khám Tim Mạch Hồng Tâm, 105 Thành Thái, Phường Diên Hồng, TP.HCM",
	"Phòng khám Nội Tiết - Tiểu Đường PGS.TS.BS Nguyễn Thị Bích Đào, 215F Nguyễn Trãi, Phường Nguyễn Cư Trinh, TP.HCM",
}

const (
	clinicCardiologyOnly   = 4 // Hồng Tâm — tim mạch only
	clinicEndocrinologyOnly = 5 // Bích Đào — tiểu đường only
)

// AllowedClinicLocations returns the clinics a patient may visit based on
// diseaseTypes:
//
//	both / neither → 315 branches + Thiên Phúc (indexes 0–3)
//	bloodPressure only → above + Hồng Tâm (exclude nội tiết)
//	glucose only → above + Bích Đào (exclude tim mạch)
func AllowedClinicLocations(bloodPressure, glucose bool) []string {
	idxs := allowedClinicIndexes(bloodPressure, glucose)
	out := make([]string, len(idxs))
	for i, idx := range idxs {
		out[i] = ClinicLocations[idx]
	}
	return out
}

func allowedClinicIndexes(bloodPressure, glucose bool) []int {
	switch {
	case bloodPressure && !glucose:
		return []int{0, 1, 2, 3, clinicCardiologyOnly}
	case glucose && !bloodPressure:
		return []int{0, 1, 2, 3, clinicEndocrinologyOnly}
	default:
		// both diseases, or neither recorded → general / dual clinics only
		return []int{0, 1, 2, 3}
	}
}

// ClinicLocationForDisease picks a stable clinic from the allowed set for
// the given disease flags. salt should vary per appointment so one patient
// with multiple visits does not always land on the same branch.
func ClinicLocationForDisease(bloodPressure, glucose bool, salt int) string {
	allowed := AllowedClinicLocations(bloodPressure, glucose)
	if salt < 0 {
		salt = -salt
	}
	return allowed[salt%len(allowed)]
}

// IsClinicLocationAllowed reports whether location is in the disease-matched
// allowlist (exact string match).
func IsClinicLocationAllowed(location string, bloodPressure, glucose bool) bool {
	for _, loc := range AllowedClinicLocations(bloodPressure, glucose) {
		if loc == location {
			return true
		}
	}
	return false
}
