package user

import (
	"errors"
	"strings"
)

var ErrAcademicTitleRequiresPhD = errors.New("academic title requires phd degree")

// AcademicDegree là bằng cấp học thuật của bác sĩ.
// Giá trị lưu DB/API: bachelor (Cử nhân/BS), master (Thạc sĩ), phd (Tiến sĩ).
type AcademicDegree string

const (
	AcademicDegreeBachelor AcademicDegree = "bachelor" // Cử nhân → BS
	AcademicDegreeMaster   AcademicDegree = "master"   // Thạc sĩ → ThS
	AcademicDegreePhD      AcademicDegree = "phd"      // Tiến sĩ → TS
)

func (d AcademicDegree) degreeAbbrev() string {
	switch d {
	case AcademicDegreeMaster:
		return "ThS"
	case AcademicDegreePhD:
		return "TS"
	default:
		return ""
	}
}

// Label trả tên tiếng Việt để hiển thị cho người dùng.
func (d AcademicDegree) Label() string {
	switch d {
	case AcademicDegreeBachelor:
		return "Cử nhân"
	case AcademicDegreeMaster:
		return "Thạc sĩ"
	case AcademicDegreePhD:
		return "Tiến sĩ"
	default:
		return ""
	}
}

// ProfessionalQualification là trình độ chuyên môn của bác sĩ.
// Giá trị lưu DB/API: resident (Nội trú), cki (CKI), ckii (CKII).
type ProfessionalQualification string

const (
	ProfessionalQualificationResident ProfessionalQualification = "resident" // Nội trú
	ProfessionalQualificationCKI      ProfessionalQualification = "cki"      // Chuyên khoa I
	ProfessionalQualificationCKII     ProfessionalQualification = "ckii"     // Chuyên khoa II
)

func (q ProfessionalQualification) abbrev() string {
	switch q {
	case ProfessionalQualificationCKI:
		return "CKI"
	case ProfessionalQualificationCKII:
		return "CKII"
	default:
		return ""
	}
}

// Label trả tên tiếng Việt để hiển thị cho người dùng.
func (q ProfessionalQualification) Label() string {
	switch q {
	case ProfessionalQualificationResident:
		return "Nội trú"
	case ProfessionalQualificationCKI:
		return "Chuyên khoa I"
	case ProfessionalQualificationCKII:
		return "Chuyên khoa II"
	default:
		return ""
	}
}

// AcademicTitle là chức danh giáo sư của bác sĩ.
// Giá trị lưu DB/API: professor (Giáo sư), associate_professor (Phó Giáo sư).
type AcademicTitle string

const (
	AcademicTitleProfessor          AcademicTitle = "professor"           // Giáo sư → GS
	AcademicTitleAssociateProfessor AcademicTitle = "associate_professor" // Phó Giáo sư → PGS
)

func (t AcademicTitle) abbrev() string {
	switch t {
	case AcademicTitleProfessor:
		return "GS"
	case AcademicTitleAssociateProfessor:
		return "PGS"
	default:
		return ""
	}
}

// Label trả tên tiếng Việt để hiển thị cho người dùng.
func (t AcademicTitle) Label() string {
	switch t {
	case AcademicTitleProfessor:
		return "Giáo sư"
	case AcademicTitleAssociateProfessor:
		return "Phó Giáo sư"
	default:
		return ""
	}
}

type Doctor struct {
	MedicalStaff              `bson:",inline"`
	Specialization            string                      `json:"specialization,omitempty" bson:"specialization,omitempty"`                       // Chuyên khoa
	AcademicDegree            AcademicDegree              `json:"academicDegree,omitempty" bson:"academicDegree,omitempty"`                         // Bằng cấp học thuật
	ProfessionalQualification ProfessionalQualification   `json:"professionalQualification,omitempty" bson:"professionalQualification,omitempty"` // Trình độ chuyên môn
	AcademicTitle             AcademicTitle               `json:"academicTitle,omitempty" bson:"academicTitle,omitempty"`                           // Chức danh giáo sư
}

// ValidateCredentials kiểm tra chức danh GS/PGS chỉ được gán khi học vị là Tiến sĩ.
func ValidateCredentials(degree AcademicDegree, title AcademicTitle) error {
	if title.requiresPhD() && degree != AcademicDegreePhD {
		return ErrAcademicTitleRequiresPhD
	}
	return nil
}

func (d Doctor) ValidateCredentials() error {
	return ValidateCredentials(d.AcademicDegree, d.AcademicTitle)
}

func (t AcademicTitle) requiresPhD() bool {
	return t == AcademicTitleProfessor || t == AcademicTitleAssociateProfessor
}

// DisplayName ghép học hàm, học vị, trình độ chuyên môn và tên theo quy ước y khoa Việt Nam,
// ví dụ: "PGS.TS.BS CKII Nguyễn Văn A".
// Trường Name chỉ lưu tên cá nhân, không kèm danh hiệu hay prefix.
func (d Doctor) DisplayName() string {
	name := strings.TrimSpace(d.Name)
	if name == "" {
		return ""
	}

	var dotParts []string
	if abbr := d.AcademicTitle.abbrev(); abbr != "" {
		dotParts = append(dotParts, abbr)
	}
	if abbr := d.AcademicDegree.degreeAbbrev(); abbr != "" {
		dotParts = append(dotParts, abbr)
	}

	hasAnyCredential := len(dotParts) > 0 ||
		d.AcademicDegree == AcademicDegreeBachelor ||
		d.ProfessionalQualification != ""

	if hasAnyCredential {
		dotParts = append(dotParts, "BS")
	}

	var b strings.Builder
	if len(dotParts) > 0 {
		b.WriteString(strings.Join(dotParts, "."))
	}

	if qual := d.ProfessionalQualification.abbrev(); qual != "" {
		if b.Len() > 0 {
			b.WriteByte(' ')
		}
		b.WriteString(qual)
	}

	if b.Len() > 0 {
		b.WriteByte(' ')
	}
	b.WriteString(name)
	return b.String()
}
