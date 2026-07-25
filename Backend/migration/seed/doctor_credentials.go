package seed

import (
	"fmt"
	"hash/fnv"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

// DoctorAcademicDegree gán học vị mẫu theo index (dùng chung seed + migration).
func DoctorAcademicDegree(index int) userDomain.AcademicDegree {
	switch index % 4 {
	case 0:
		return userDomain.AcademicDegreePhD
	case 1:
		return userDomain.AcademicDegreeMaster
	case 2:
		return userDomain.AcademicDegreeBachelor
	default:
		return ""
	}
}

// DoctorProfessionalQualification gán trình độ chuyên môn mẫu theo index.
func DoctorProfessionalQualification(index int) userDomain.ProfessionalQualification {
	switch index % 4 {
	case 0:
		return userDomain.ProfessionalQualificationCKII
	case 1:
		return userDomain.ProfessionalQualificationCKI
	case 2:
		return userDomain.ProfessionalQualificationResident
	default:
		return ""
	}
}

// DoctorAcademicTitle gán chức danh giáo sư mẫu; chỉ áp dụng khi học vị là Tiến sĩ.
func DoctorAcademicTitle(index int, degree userDomain.AcademicDegree) userDomain.AcademicTitle {
	if degree != userDomain.AcademicDegreePhD {
		return ""
	}
	switch index % 2 {
	case 0:
		return userDomain.AcademicTitleAssociateProfessor
	default:
		return userDomain.AcademicTitleProfessor
	}
}

// ExperienceRange là khoảng năm kinh nghiệm hợp lý theo học hàm / học vị / trình độ chuyên môn.
type ExperienceRange struct {
	Min, Max int
	Label    string
}

// DoctorExperienceRange trả khoảng năm KN kỳ vọng (credential cao nhất thắng).
// Chuẩn tham chiếu nghề y Việt Nam (ước lượng để seed/demo data trông hợp lý):
//
//	GS → 22–40, PGS → 16–32, TS/CKII → 12–28, ThS/CKI → 6–18,
//	Nội trú → 1–6, BS/CN → 2–12, mặc định → 1–15.
func DoctorExperienceRange(
	title userDomain.AcademicTitle,
	degree userDomain.AcademicDegree,
	qual userDomain.ProfessionalQualification,
) ExperienceRange {
	switch title {
	case userDomain.AcademicTitleProfessor:
		return ExperienceRange{22, 40, "GS"}
	case userDomain.AcademicTitleAssociateProfessor:
		return ExperienceRange{16, 32, "PGS"}
	}

	if degree == userDomain.AcademicDegreePhD || qual == userDomain.ProfessionalQualificationCKII {
		label := "TS"
		switch {
		case degree == userDomain.AcademicDegreePhD && qual == userDomain.ProfessionalQualificationCKII:
			label = "TS/CKII"
		case qual == userDomain.ProfessionalQualificationCKII:
			label = "CKII"
		}
		return ExperienceRange{12, 28, label}
	}

	if degree == userDomain.AcademicDegreeMaster || qual == userDomain.ProfessionalQualificationCKI {
		label := "ThS"
		switch {
		case degree == userDomain.AcademicDegreeMaster && qual == userDomain.ProfessionalQualificationCKI:
			label = "ThS/CKI"
		case qual == userDomain.ProfessionalQualificationCKI:
			label = "CKI"
		}
		return ExperienceRange{6, 18, label}
	}

	if qual == userDomain.ProfessionalQualificationResident {
		return ExperienceRange{1, 6, "Nội trú"}
	}
	if degree == userDomain.AcademicDegreeBachelor {
		return ExperienceRange{2, 12, "BS/CN"}
	}
	return ExperienceRange{1, 15, "BS"}
}

// DoctorYearsOfExperience chọn số năm KN trong khoảng hợp lệ (ổn định theo index).
func DoctorYearsOfExperience(
	index int,
	title userDomain.AcademicTitle,
	degree userDomain.AcademicDegree,
	qual userDomain.ProfessionalQualification,
) int {
	r := DoctorExperienceRange(title, degree, qual)
	return FitYearsOfExperience(indexKey(index), 0, r)
}

// FitYearsOfExperience chỉnh yearsOfExperience vào khoảng r.
// stableKey nên là ID bác sĩ (migration) hoặc index seed để kết quả idempotent.
// Nếu current đã nằm trong khoảng thì trả lại current.
func FitYearsOfExperience(stableKey string, current int, r ExperienceRange) int {
	if current >= r.Min && current <= r.Max {
		return current
	}

	span := r.Max - r.Min
	if span < 0 {
		span = 0
	}

	h := fnv.New32a()
	_, _ = h.Write([]byte(stableKey))
	sum := h.Sum32()

	var target int
	switch {
	case current > 0 && current < r.Min:
		// Quá ít KN so với học hàm/học vị → kéo lên nửa dưới khoảng.
		half := span / 2
		target = r.Min + int(sum%uint32(half+1))
	case current > r.Max:
		// Quá nhiều KN so với trình độ → kéo xuống nửa trên khoảng.
		half := span / 2
		target = r.Max - int(sum%uint32(half+1))
		if target < r.Min {
			target = r.Min
		}
	default:
		target = r.Min + int(sum%uint32(span+1))
	}

	if target < r.Min {
		target = r.Min
	}
	if target > r.Max {
		target = r.Max
	}
	return target
}

func indexKey(index int) string {
	return fmt.Sprintf("seed-doctor-%d", index)
}
