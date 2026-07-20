package seed

import userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"

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
