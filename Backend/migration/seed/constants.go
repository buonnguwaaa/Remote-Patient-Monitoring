package seed

const (
	seedCount = 50

	// adminCount is intentionally much smaller than seedCount: a handful of
	// admin accounts is enough for demo/testing purposes, unlike
	// doctors/nurses/patients which need one-per-index pairing throughout
	// the rest of the seed data.
	adminCount = 5

	// appendExtraPatientsPerDoctor is how many additional patients RunAppend
	// attaches to each active doctor found in the database.
	appendExtraPatientsPerDoctor = 15

	// appendPatientsPerDoctorStride is the fixed index range reserved per
	// doctor, independent of appendExtraPatientsPerDoctor. Raising the count
	// later (e.g. 10 → 15) then only fills more of each doctor's own range
	// instead of shifting every later doctor's patient emails onto accounts
	// that were created for (and assigned to) a different doctor.
	appendPatientsPerDoctorStride = 100

	// appendPatientIndexBase offsets new patient emails/names/phones so they
	// never collide with the original seed patients (indexes 0..seedCount-1)
	// or with patients created by the previous revision of RunAppend, which
	// used the 1000..1999 range.
	appendPatientIndexBase = 2000

	// Measurement history series (per patient). Span/count vary by patient
	// index so windows are consecutive but not identical across everyone.
	// 16–24 daily-ish readings over 18–25 days covers the trend lookback
	// (~21d) used by EvaluateTrends.
	historyMinReadings = 16
	historyMaxReadings = 24
	historyMinSpanDays = 18
	historyMaxSpanDays = 25

	localProvider = "local"
	seedTimezone  = "Asia/Ho_Chi_Minh"
	seedDomain    = "rpm.local"

	adminEmail   = "admin@gmail.com"
	doctorEmail  = "doctor@gmail.com"
	patientEmail = "patient@gmail.com"
	nurseEmail   = "nurse@gmail.com"

	// The default demo accounts (index 0 of each role, e.g. admin@gmail.com)
	// keep their original, distinct passwords.
	adminPassword   = "Admin@123"
	doctorPassword  = "Doctor12345@"
	patientPassword = "Patient12345@"
	nursePassword   = "Nurse@123"

	// seedSharedPassword is used for every other generated seed user
	// (index > 0), so those accounts all share one password.
	seedSharedPassword = "Seed@12345"
)

// vietnameseSurnames covers the most common Vietnamese family names (họ).
var vietnameseSurnames = []string{
	"Nguyễn", "Trần", "Lê", "Phạm", "Hoàng",
	"Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
	"Bùi", "Đỗ", "Hồ", "Ngô", "Dương",
	"Lý", "Trương", "Đinh", "Tạ", "Lưu",
}

// Middle names (tên đệm), grouped by gender, as is conventional in
// Vietnamese full names ("Họ" + "Tên đệm" + "Tên").
var maleMiddleNames = []string{
	"Văn", "Hữu", "Đức", "Quang", "Minh",
	"Thành", "Công", "Trọng", "Xuân", "Đình",
}

var femaleMiddleNames = []string{
	"Thị", "Ngọc", "Thanh", "Kim", "Diệu",
	"Bích", "Hồng", "Thu", "Phương", "Tuyết",
}

var neutralMiddleNames = []string{
	"Gia", "Nhật", "Anh", "Bảo", "Khánh", "Duy",
}

// Given names (tên), grouped by gender.
var maleGivenNames = []string{
	"An", "Bình", "Cường", "Dũng", "Giang",
	"Hải", "Huy", "Khang", "Long", "Minh",
	"Nam", "Phúc", "Quân", "Sơn", "Tâm",
	"Thắng", "Tuấn", "Việt", "Vũ", "Đạt",
}

var femaleGivenNames = []string{
	"Anh", "Bích", "Chi", "Diệp", "Hà",
	"Hương", "Lan", "Linh", "Mai", "Ngân",
	"Nhung", "Oanh", "Phương", "Quyên", "Thảo",
	"Trang", "Tuyết", "Uyên", "Vy", "Yến",
}

var neutralGivenNames = []string{
	"An", "Bình", "Chi", "Giang", "Hà",
	"Khang", "Lam", "Minh", "Nam", "Phương",
	"Quân", "Sương", "Tâm", "Uyên", "Vy",
}

// departmentNames lists clinical departments in scope for hypertension and
// diabetes remote monitoring.
var departmentNames = []string{
	"Khoa Tim mạch",
	"Khoa Nội Tổng quát",
	"Khoa Nội tiết",
}

// DepartmentNames returns the in-scope department catalog used by seed and
// migrations. Callers must treat the slice as read-only.
func DepartmentNames() []string {
	out := make([]string, len(departmentNames))
	copy(out, departmentNames)
	return out
}
