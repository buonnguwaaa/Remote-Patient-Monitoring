package seed

import (
	"fmt"
	"hash/fnv"
	"strings"
)

// PatientMedicalHistory builds a concise clinical medical-history paragraph
// aligned with the patient's diseaseTypes (THA / ĐTĐ / both).
//
// Intentionally omits treatment modality (no drug names / regimens) — only
// onset, adherence, negative complications, allergy, family history, lifestyle,
// and baseline numbers.
//
// Style target (example for THA):
//
//	"Tăng huyết áp được phát hiện 5 năm, tuân thủ điều trị tương đối.
//	 Chưa có tiền sử tai biến mạch máu não, nhồi máu cơ tim, suy tim.
//	 Không dị ứng thuốc. Có tiền sử gia đình: mẹ mắc tăng huyết áp.
//	 Bệnh nhân không hút thuốc, uống rượu bia ít."
func PatientMedicalHistory(index int, bloodPressure, glucose bool) string {
	if index < 0 {
		index = 0
	}
	switch {
	case bloodPressure && glucose:
		return formatCombinedHistory(index)
	case bloodPressure:
		return formatBPHistory(index)
	case glucose:
		return formatGlucoseHistory(index)
	default:
		return formatNoDiseaseHistory(index)
	}
}

// PatientMedicalHistoryForKey is like PatientMedicalHistory but derives the
// variation index from a stable key (e.g. patient ObjectID hex) so migrations
// stay deterministic per patient across re-runs.
func PatientMedicalHistoryForKey(stableKey string, bloodPressure, glucose bool) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(stableKey))
	// Compact positive index — never feed raw 32-bit hash into display numbers.
	idx := int(h.Sum32() % 100_000)
	return PatientMedicalHistory(idx, bloodPressure, glucose)
}

func formatBPHistory(index int) string {
	years := 2 + pickInt(index, 0, 12) // 2–13 năm
	adherence := pickOffset(adherenceLevels, index, 2)
	complications := pickOffset(bpComplications, index, 3)
	allergy := pickOffset(allergyClauses, index, 4)
	family := pickOffset(bpFamilies, index, 5)
	lifestyle := pickOffset(lifestyleClauses, index, 6)
	extra := pickOffset(bpExtras, index, 7)
	sys := 132 + pickInt(index, 8, 48)
	dia := 78 + pickInt(index, 9, 28)
	follow := followMonths(index, years)

	return fmt.Sprintf(
		"Tăng huyết áp được phát hiện %d năm, tuân thủ điều trị %s. %s. %s. Có tiền sử gia đình: %s. Bệnh nhân %s. Huyết áp nền lúc phát hiện khoảng %d/%d mmHg. %s. Đã được theo dõi liên tục khoảng %d tháng.",
		years, adherence, complications, allergy, family, lifestyle, sys, dia, extra, follow,
	)
}

func formatGlucoseHistory(index int) string {
	years := 2 + pickInt(index, 1, 12) // 2–13 năm
	adherence := pickOffset(adherenceLevels, index, 3)
	complications := pickOffset(glucoseComplications, index, 4)
	allergy := pickOffset(allergyClauses, index, 5)
	family := pickOffset(glucoseFamilies, index, 6)
	lifestyle := pickOffset(lifestyleClauses, index, 7)
	extra := pickOffset(glucoseExtras, index, 8)
	fasting := 7.0 + float64(pickInt(index, 9, 55))/10.0
	follow := followMonths(index, years)

	return fmt.Sprintf(
		"Đái tháo đường type 2 được phát hiện %d năm, tuân thủ điều trị %s. %s. %s. Có tiền sử gia đình: %s. Bệnh nhân %s. Đường huyết đói nền lúc phát hiện khoảng %.1f mmol/L. %s. Đã được theo dõi liên tục khoảng %d tháng.",
		years, adherence, complications, allergy, family, lifestyle, fasting, extra, follow,
	)
}

func formatCombinedHistory(index int) string {
	bpYears := 3 + pickInt(index, 0, 11)  // 3–13
	gluYears := 2 + pickInt(index, 3, 10) // 2–11
	if gluYears == bpYears {
		gluYears++
	}
	diseaseYears := bpYears
	if gluYears > diseaseYears {
		diseaseYears = gluYears
	}
	adherence := pickOffset(adherenceLevels, index, 2)
	complications := pickOffset(combinedComplications, index, 4)
	allergy := pickOffset(allergyClauses, index, 5)
	family := pickOffset(combinedFamilies, index, 6)
	lifestyle := pickOffset(lifestyleClauses, index, 7)
	extra := pickOffset(combinedExtras, index, 8)
	sys := 134 + pickInt(index, 10, 46)
	dia := 80 + pickInt(index, 11, 26)
	fasting := 7.2 + float64(pickInt(index, 12, 50))/10.0
	follow := followMonths(index, diseaseYears)
	order := pickOffset([]string{
		fmt.Sprintf("Tăng huyết áp được phát hiện %d năm và đái tháo đường type 2 %d năm", bpYears, gluYears),
		fmt.Sprintf("Đái tháo đường type 2 được phát hiện %d năm, kèm tăng huyết áp %d năm", gluYears, bpYears),
		fmt.Sprintf("Bệnh nhân mắc đồng thời tăng huyết áp (%d năm) và đái tháo đường type 2 (%d năm)", bpYears, gluYears),
	}, index, 9)

	return fmt.Sprintf(
		"%s, tuân thủ điều trị %s. %s. %s. Có tiền sử gia đình: %s. Bệnh nhân %s. Huyết áp nền khoảng %d/%d mmHg, đường huyết đói nền khoảng %.1f mmol/L. %s. Đã được theo dõi liên tục khoảng %d tháng.",
		order, adherence, complications, allergy, family, lifestyle, sys, dia, fasting, extra, follow,
	)
}

func formatNoDiseaseHistory(index int) string {
	focus := pickOffset(noDiseaseFocus, index, 1)
	lifestyle := pickOffset(lifestyleClauses, index, 2)
	extra := pickOffset(noDiseaseExtras, index, 3)
	allergy := pickOffset(allergyClauses, index, 4)
	sys := 110 + pickInt(index, 5, 25)
	dia := 70 + pickInt(index, 6, 15)
	// Không có bệnh nền: chỉ theo dõi sức khỏe chung vài tháng–~1.5 năm.
	follow := followMonths(index, 1)

	return fmt.Sprintf(
		"%s. %s. Bệnh nhân %s. Huyết áp tầm soát gần nhất khoảng %d/%d mmHg. %s. Đã được theo dõi sức khỏe khoảng %d tháng.",
		focus, allergy, lifestyle, sys, dia, extra, follow,
	)
}

// followMonths returns program follow-up duration in months, always consistent
// with disease onset: 3 months ≤ follow ≤ diseaseYears*12 (and ≤ 60).
func followMonths(index, diseaseYears int) int {
	if index < 0 {
		index = -index
	}
	if diseaseYears < 1 {
		diseaseYears = 1
	}
	maxFollow := diseaseYears * 12
	if maxFollow > 60 {
		maxFollow = 60 // theo dõi chương trình tối đa ~5 năm
	}
	minFollow := 3
	if diseaseYears >= 3 {
		minFollow = 6
	}
	if minFollow > maxFollow {
		minFollow = maxFollow
	}
	span := maxFollow - minFollow
	return minFollow + (index % (span + 1))
}

func pickOffset[T any](items []T, index, salt int) T {
	if len(items) == 0 {
		var zero T
		return zero
	}
	primes := []int{7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47}
	p := primes[salt%len(primes)]
	return items[((index*p)+salt)%len(items)]
}

func pickInt(index, salt, modulo int) int {
	if modulo <= 0 {
		return 0
	}
	primes := []int{7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47}
	p := primes[salt%len(primes)]
	return ((index * p) + salt) % modulo
}

var adherenceLevels = []string{"tương đối", "tốt", "chưa đều", "khá tốt"}

var allergyClauses = []string{
	"Không dị ứng thuốc",
	"Không dị ứng thuốc hay thực phẩm",
	"Không dị ứng thuốc; từng dị ứng nhẹ phấn hoa",
	"Không ghi nhận dị ứng thuốc kháng sinh",
}

var lifestyleClauses = []string{
	"không hút thuốc, uống rượu bia ít",
	"không hút thuốc, không uống rượu bia",
	"đã bỏ thuốc lá, hạn chế rượu bia",
	"không hút thuốc; chế độ ăn mặn vừa phải, ít vận động",
	"không hút thuốc; tập đi bộ nhẹ hàng ngày, uống rượu bia ít",
	"không hút thuốc; làm việc ngồi nhiều, ít tập thể dục",
	"không hút thuốc; ăn ngoài thường xuyên, rượu bia ít",
	"đã bỏ thuốc lá hơn 2 năm; hạn chế đồ mặn và rượu bia",
}

var bpComplications = []string{
	"Chưa có tiền sử tai biến mạch máu não, nhồi máu cơ tim, suy tim",
	"Chưa ghi nhận biến chứng tim mạch hay thần kinh",
	"Chưa có tiền sử đột quỵ, nhồi máu cơ tim; chức năng tim ổn định",
	"Chưa có tổn thương cơ quan đích rõ trên lâm sàng",
	"Chưa ghi nhận suy thận hay phù phổi cấp liên quan tăng huyết áp",
	"Điện tâm đồ gần nhất chưa thấy dày thất trái đáng kể",
}

var bpFamilies = []string{
	"mẹ mắc tăng huyết áp",
	"bố mắc tăng huyết áp",
	"bố và mẹ đều mắc tăng huyết áp",
	"anh trai mắc tăng huyết áp",
	"chị gái mắc tăng huyết áp",
	"ông nội mất vì đột quỵ, gia đình có tăng huyết áp",
}

var bpExtras = []string{
	"Theo dõi huyết áp tại nhà không đều",
	"Đã được tư vấn giảm muối và kiểm soát cân nặng",
	"Thỉnh thoảng đau đầu khi huyết áp tăng",
	"Huyết áp tâm thu lúc khám thường dao động quanh ngưỡng cao",
	"Đang tái khám ngoại trú định kỳ",
	"Chưa từng nhập viện vì cơn tăng huyết áp cấp",
}

var glucoseComplications = []string{
	"Chưa có biến chứng thận, võng mạc hay thần kinh ngoại biên",
	"Chưa ghi nhận loét bàn chân, suy thận hay giảm thị lực do đái tháo đường",
	"Chưa có tiền sử hạ đường huyết nặng phải nhập viện",
	"HbA1c gần nhất còn cao hơn mục tiêu",
	"Chưa phát hiện protein niệu hay tổn thương thần kinh ngoại biên",
	"Khám mắt định kỳ chưa ghi nhận bệnh võng mạc đái tháo đường",
}

var glucoseFamilies = []string{
	"mẹ mắc đái tháo đường type 2",
	"bố mắc đái tháo đường type 2",
	"anh/chị mắc đái tháo đường type 2",
	"bố và mẹ đều có tiền sử đái tháo đường",
	"cô/dì bên mẹ mắc đái tháo đường type 2",
	"ông ngoại mắc đái tháo đường type 2",
}

var glucoseExtras = []string{
	"Tự theo dõi đường huyết tại nhà chưa đều",
	"Đã được tư vấn chế độ ăn giảm tinh bột nhanh",
	"Thỉnh thoảng khát và tiểu nhiều khi đường huyết tăng",
	"Cân nặng đang cao hơn mức khuyến nghị",
	"Đang tái khám nội tiết định kỳ",
	"Chưa từng nhiễm toan ceton",
}

var combinedComplications = []string{
	"Chưa có tiền sử tai biến mạch máu não, nhồi máu cơ tim, suy tim hay biến chứng thận–mắt",
	"Chưa ghi nhận đột quỵ, nhồi máu cơ tim, suy thận hay tổn thương võng mạc",
	"Chưa có biến chứng tim mạch lớn, chưa loét bàn chân",
	"Chưa có tiền sử suy tim, đột quỵ hay hạ đường huyết nặng",
	"Chưa phát hiện tổn thương cơ quan đích rõ; chức năng thận ổn",
	"Chưa nhập viện vì biến chứng cấp của tăng huyết áp hay đái tháo đường",
}

var combinedFamilies = []string{
	"mẹ mắc tăng huyết áp, bố mắc đái tháo đường",
	"bố mẹ đều có bệnh lý mạch máu/chuyển hóa",
	"mẹ mắc tăng huyết áp và đái tháo đường",
	"bên nội có tăng huyết áp, bên ngoại có đái tháo đường",
	"anh trai mắc tăng huyết áp, chị gái mắc đái tháo đường type 2",
	"bố mất sớm vì bệnh tim mạch, mẹ mắc đái tháo đường",
}

var combinedExtras = []string{
	"Theo dõi huyết áp và đường huyết tại nhà chưa đều",
	"Đã được tư vấn giảm muối, giảm đường và tăng vận động",
	"Đang tái khám nội tổng quát định kỳ",
	"BMI cao; cần kiểm soát cân nặng tích cực hơn",
	"Thỉnh thoảng mệt khi chỉ số theo dõi tăng cao",
	"Chưa từng cấp cứu vì tăng huyết áp hay hạ đường huyết",
}

var noDiseaseFocus = []string{
	"Chưa ghi nhận bệnh mạn tính cần theo dõi thường xuyên",
	"Tiền sử nội khoa chưa có bệnh lý tăng huyết áp hay đái tháo đường",
	"Chưa có chẩn đoán bệnh lý tim mạch hay rối loạn chuyển hóa",
	"Khám sức khỏe gần nhất chưa phát hiện bệnh mạn tính đáng kể",
	"Chưa có bệnh nền nội khoa cần theo dõi dài hạn",
	"Tiền sử bệnh lý cấp tính đã ổn, hiện không bệnh nền theo dõi",
}

var noDiseaseExtras = []string{
	"Khám sức khỏe định kỳ trong giới hạn bình thường",
	"Hiện theo dõi sức khỏe chung",
	"Được khuyến cáo duy trì chế độ ăn và vận động hợp lý",
	"Chưa cần theo dõi bệnh mạn tính chuyên biệt",
	"Các chỉ số huyết áp và đường huyết tầm soát gần nhất bình thường",
	"Đang duy trì lối sống phòng ngừa bệnh không lây",
}

// IsSparseMedicalHistory reports whether history looks like the old short seed
// labels (or empty), so migrations can rewrite them safely.
func IsSparseMedicalHistory(history string) bool {
	h := strings.TrimSpace(history)
	if h == "" {
		return true
	}
	switch h {
	case "Tăng huyết áp",
		"Đái tháo đường type 2",
		"Hen suyễn",
		"Bệnh tim mạch",
		"Tăng huyết áp; Đái tháo đường type 2":
		return true
	}
	return len([]rune(h)) < 80
}
