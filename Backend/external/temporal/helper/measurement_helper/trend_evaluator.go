package measurement_helper

import (
	"math"
	"sort"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	trendBaselineWindow    = 14 * 24 * time.Hour
	trendSlopeWindow       = 7 * 24 * time.Hour
	trendHistoryLookback   = 21 * 24 * time.Hour // prior 7d cycle + 14d baseline for that cycle
	minConsecutiveSameWay  = 3
	zScoreWatchThreshold   = 1.5
	zScoreResetThreshold   = 1.0
	proximityWatchRatio    = 0.85
	proximityHighRatio     = 0.90
	rSquaredSignificant    = 0.5
	pValueSignificant      = 0.05
	minPointsForRegression = 3
	minPointsForBaseline   = 3
)

// Absolute clinical danger lines used for proximity_ratio (ngưỡng tuyệt đối).
const (
	absSysMax      = 160.0 // THA độ 2 — QĐ 3192/QĐ-BYT
	absDiaMax      = 100.0 // THA độ 2 — QĐ 3192/QĐ-BYT
	absGlucosePre  = 126.0 // QĐ 5481 fasting
	absGlucosePost = 200.0 // QĐ 5481 post-meal / OGTT
	absGlucoseHypo = 54.0  // ADA/BYT level 2 hypoglycemia
)

type trendDirection int

const (
	trendRising trendDirection = iota
	trendFalling
)

type trendLevel int

const (
	trendLevelNone trendLevel = iota
	trendLevelWatch
	trendLevelHigh
)

type trendPoint struct {
	At    time.Time
	Value float64
}

type trendMetrics struct {
	Slope              float64
	RSquared           float64
	PValue             float64
	ZScore             float64
	ProximityWatch     float64
	ProximityHigh      float64
	ConsecutiveSameWay int
	HasSlope           bool
	HasZScore          bool
}

type trendVitalSpec struct {
	vitalType      string
	ruleWatch      string
	ruleHigh       string
	direction      trendDirection
	clinicalLimit  float64 // ceiling (rising) or floor (falling)
	watchLimit     float64
	extract        func(domain.Measurement) (float64, bool)
}

// EvaluateTrends runs rising trends (BP sys/dia + glucose) and falling glucose
// trends, then concatenates violations.
func EvaluateTrends(history []domain.Measurement, current *domain.Measurement, personal *domain.Threshold, mealTiming *domain.MealTiming, edgeOnly bool) []domain.ThresholdViolation {
	rising := EvaluateRisingTrends(history, current, personal, mealTiming, edgeOnly)
	falling := EvaluateFallingGlucoseTrends(history, current, personal, edgeOnly)
	return append(rising, falling...)
}

// EvaluateRisingTrends returns rising-trend violations for BP / glucose max.
//
// edgeOnly controls spam vs merge behavior:
//   - true  (trend-only alerts): emit only when level rises (none→watch or
//     watch→high), so an ongoing trend does not create an alert every reading.
//   - false (merge into an existing alert reason): emit whenever the current
//     level is watch or high, so a threshold alert can carry active trend
//     violations in the same Alert document.
//
// Watch proximity uses watchLimit = min(personalMax, clinicalMax) when personal
// is set, else clinical — personal can only pull Watch earlier. High proximity
// always uses clinicalMax.
func EvaluateRisingTrends(history []domain.Measurement, current *domain.Measurement, personal *domain.Threshold, mealTiming *domain.MealTiming, edgeOnly bool) []domain.ThresholdViolation {
	return evaluateDirectedTrends(history, current, edgeOnly, risingTrendSpecs(personal, mealTiming))
}

// EvaluateFallingGlucoseTrends detects sustained downward glucose toward hypo.
// Watch floor = max(personalMin, clinicalMin=54) when personal is set, else 54.
// High always anchors to clinical 54. Proximity = floor / latest (≥0.85 / ≥0.90).
func EvaluateFallingGlucoseTrends(history []domain.Measurement, current *domain.Measurement, personal *domain.Threshold, edgeOnly bool) []domain.ThresholdViolation {
	return evaluateDirectedTrends(history, current, edgeOnly, []trendVitalSpec{{
		vitalType:     "glucose",
		ruleWatch:     "trend_falling_watch",
		ruleHigh:      "trend_falling_high",
		direction:     trendFalling,
		clinicalLimit: absGlucoseHypo,
		watchLimit:    trendWatchFloor(personalGlucoseMin(personal), absGlucoseHypo),
		extract: func(m domain.Measurement) (float64, bool) {
			if m.Glucose.BloodGlucose == nil {
				return 0, false
			}
			return *m.Glucose.BloodGlucose, true
		},
	}})
}

func risingTrendSpecs(personal *domain.Threshold, mealTiming *domain.MealTiming) []trendVitalSpec {
	return []trendVitalSpec{
		{
			vitalType:     "blood_pressure_systolic",
			ruleWatch:     "trend_rising_watch",
			ruleHigh:      "trend_rising_high",
			direction:     trendRising,
			clinicalLimit: absSysMax,
			watchLimit:    trendWatchLimit(personalSysMax(personal), absSysMax),
			extract: func(m domain.Measurement) (float64, bool) {
				if m.BloodPressure.Systolic == nil {
					return 0, false
				}
				return *m.BloodPressure.Systolic, true
			},
		},
		{
			vitalType:     "blood_pressure_diastolic",
			ruleWatch:     "trend_rising_watch",
			ruleHigh:      "trend_rising_high",
			direction:     trendRising,
			clinicalLimit: absDiaMax,
			watchLimit:    trendWatchLimit(personalDiaMax(personal), absDiaMax),
			extract: func(m domain.Measurement) (float64, bool) {
				if m.BloodPressure.Diastolic == nil {
					return 0, false
				}
				return *m.BloodPressure.Diastolic, true
			},
		},
		{
			vitalType:     "glucose",
			ruleWatch:     "trend_rising_watch",
			ruleHigh:      "trend_rising_high",
			direction:     trendRising,
			clinicalLimit: absoluteGlucoseMax(mealTiming),
			watchLimit:    trendWatchLimit(personalGlucoseMax(personal), absoluteGlucoseMax(mealTiming)),
			extract: func(m domain.Measurement) (float64, bool) {
				if m.Glucose.BloodGlucose == nil {
					return 0, false
				}
				return *m.Glucose.BloodGlucose, true
			},
		},
	}
}

func evaluateDirectedTrends(history []domain.Measurement, current *domain.Measurement, edgeOnly bool, vitals []trendVitalSpec) []domain.ThresholdViolation {
	if current == nil || len(vitals) == 0 {
		return nil
	}

	sorted := append([]domain.Measurement(nil), history...)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].CreatedAt.Before(sorted[j].CreatedAt)
	})

	if !containsMeasurementID(sorted, current.ID) {
		sorted = append(sorted, *current)
		sort.Slice(sorted, func(i, j int) bool {
			return sorted[i].CreatedAt.Before(sorted[j].CreatedAt)
		})
	}

	asOf := current.CreatedAt
	if asOf.IsZero() {
		asOf = time.Now().UTC()
	}

	var violations []domain.ThresholdViolation
	for _, v := range vitals {
		points := extractTrendPoints(sorted, v.extract)
		if len(points) == 0 {
			continue
		}

		currLevel, _ := decideTrendLevel(points, asOf, v.watchLimit, v.clinicalLimit, v.direction)
		if currLevel == trendLevelNone {
			continue
		}

		if edgeOnly {
			prevAsOf, ok := previousPointTime(points, asOf)
			prevLevel := trendLevelNone
			if ok {
				prevLevel, _ = decideTrendLevel(points, prevAsOf, v.watchLimit, v.clinicalLimit, v.direction)
			}
			if currLevel <= prevLevel {
				continue
			}
		}

		rule := v.ruleWatch
		sev := domain.SeverityInfo
		displayLimit := v.watchLimit
		if currLevel == trendLevelHigh {
			rule = v.ruleHigh
			sev = domain.SeverityHigh
			displayLimit = v.clinicalLimit
		}

		observed := points[len(points)-1].Value
		for i := len(points) - 1; i >= 0; i-- {
			if !points[i].At.After(asOf) {
				observed = points[i].Value
				break
			}
		}

		violations = append(violations, domain.ThresholdViolation{
			Type:      v.vitalType,
			Rule:      rule,
			Observed:  observed,
			Threshold: displayLimit,
			Severity:  sev,
		})
	}

	return violations
}

// trendWatchLimit (rising / max side) = min(personal, clinical) when personal set.
func trendWatchLimit(personal, clinical float64) float64 {
	if personal <= 0 {
		return clinical
	}
	return math.Min(personal, clinical)
}

// trendWatchFloor (falling / min side) = max(personal, clinical) when personal set.
// Stricter personal min is higher (e.g. 70 vs 54) and pulls Watch earlier.
func trendWatchFloor(personal, clinical float64) float64 {
	if personal <= 0 {
		return clinical
	}
	return math.Max(personal, clinical)
}

func personalSysMax(t *domain.Threshold) float64 {
	if t == nil {
		return 0
	}
	return t.SysMax
}

func personalDiaMax(t *domain.Threshold) float64 {
	if t == nil {
		return 0
	}
	return t.DiaMax
}

func personalGlucoseMax(t *domain.Threshold) float64 {
	if t == nil || t.GlucoseMax == nil {
		return 0
	}
	return *t.GlucoseMax
}

func personalGlucoseMin(t *domain.Threshold) float64 {
	if t == nil || t.GlucoseMin == nil {
		return 0
	}
	return *t.GlucoseMin
}

func containsMeasurementID(ms []domain.Measurement, id primitive.ObjectID) bool {
	for i := range ms {
		if ms[i].ID == id {
			return true
		}
	}
	return false
}

func absoluteGlucoseMax(mealTiming *domain.MealTiming) float64 {
	if effectiveMealTiming(mealTiming) == domain.MealTimingPostMeal {
		return absGlucosePost
	}
	return absGlucosePre
}

func extractTrendPoints(history []domain.Measurement, extract func(domain.Measurement) (float64, bool)) []trendPoint {
	out := make([]trendPoint, 0, len(history))
	for _, m := range history {
		v, ok := extract(m)
		if !ok {
			continue
		}
		out = append(out, trendPoint{At: m.CreatedAt, Value: v})
	}
	return out
}

func previousPointTime(points []trendPoint, asOf time.Time) (time.Time, bool) {
	var prev time.Time
	found := false
	for _, p := range points {
		if p.At.After(asOf) {
			break
		}
		if p.At.Equal(asOf) {
			break
		}
		prev = p.At
		found = true
	}
	return prev, found
}

func decideTrendLevel(points []trendPoint, asOf time.Time, watchLimit, clinicalLimit float64, dir trendDirection) (trendLevel, trendMetrics) {
	upto := pointsAtOrBefore(points, asOf)
	m := computeTrendMetrics(upto, asOf, watchLimit, clinicalLimit, dir)

	if shouldResetTrend(upto, asOf, watchLimit, clinicalLimit, dir, m) {
		return trendLevelNone, m
	}

	if !meetsWatchTrend(m, dir) {
		return trendLevelNone, m
	}

	priorAsOf := asOf.Add(-trendSlopeWindow)
	priorPoints := pointsAtOrBefore(points, priorAsOf)
	priorMetrics := computeTrendMetrics(priorPoints, priorAsOf, watchLimit, clinicalLimit, dir)
	// High always anchors to clinicalLimit (ProximityHigh), never personal.
	if meetsWatchTrend(priorMetrics, dir) && m.ProximityHigh >= proximityHighRatio {
		return trendLevelHigh, m
	}

	return trendLevelWatch, m
}

func shouldResetTrend(points []trendPoint, asOf time.Time, watchLimit, clinicalLimit float64, dir trendDirection, current trendMetrics) bool {
	// Z recovery alone must not clear a still-dangerous proximity excursion
	// (e.g. falling glucose near 54 after baseline drifted down with the trend).
	if current.HasZScore && current.ProximityWatch < proximityWatchRatio {
		switch dir {
		case trendRising:
			if current.ZScore < zScoreResetThreshold {
				return true
			}
		case trendFalling:
			if current.ZScore > -zScoreResetThreshold {
				return true
			}
		}
	}

	prevAsOf, ok := previousPointTime(points, asOf)
	if !ok {
		return false
	}
	prevMetrics := computeTrendMetrics(pointsAtOrBefore(points, prevAsOf), prevAsOf, watchLimit, clinicalLimit, dir)
	if !current.HasSlope || !prevMetrics.HasSlope {
		return false
	}
	switch dir {
	case trendRising:
		return current.Slope <= 0 && prevMetrics.Slope <= 0
	case trendFalling:
		return current.Slope >= 0 && prevMetrics.Slope >= 0
	}
	return false
}

func meetsWatchTrend(m trendMetrics, dir trendDirection) bool {
	if !m.HasSlope {
		return false
	}
	significant := m.PValue < pValueSignificant || m.RSquared > rSquaredSignificant
	if !significant {
		return false
	}
	if m.ConsecutiveSameWay < minConsecutiveSameWay {
		return false
	}

	switch dir {
	case trendRising:
		if m.Slope <= 0 {
			return false
		}
		excursion := m.ProximityWatch >= proximityWatchRatio
		if m.HasZScore && m.ZScore >= zScoreWatchThreshold {
			excursion = true
		}
		return excursion
	case trendFalling:
		if m.Slope >= 0 {
			return false
		}
		excursion := m.ProximityWatch >= proximityWatchRatio
		if m.HasZScore && m.ZScore <= -zScoreWatchThreshold {
			excursion = true
		}
		return excursion
	}
	return false
}

func pointsAtOrBefore(points []trendPoint, asOf time.Time) []trendPoint {
	n := 0
	for n < len(points) && !points[n].At.After(asOf) {
		n++
	}
	return points[:n]
}

func computeTrendMetrics(points []trendPoint, asOf time.Time, watchLimit, clinicalLimit float64, dir trendDirection) trendMetrics {
	var m trendMetrics
	if len(points) == 0 || watchLimit <= 0 || clinicalLimit <= 0 {
		return m
	}

	latest := points[len(points)-1]
	switch dir {
	case trendRising:
		m.ProximityWatch = latest.Value / watchLimit
		m.ProximityHigh = latest.Value / clinicalLimit
		m.ConsecutiveSameWay = countConsecutiveRising(points)
	case trendFalling:
		// Approaching a floor: proximity rises as latest falls toward the limit.
		if latest.Value > 0 {
			m.ProximityWatch = watchLimit / latest.Value
			m.ProximityHigh = clinicalLimit / latest.Value
		}
		m.ConsecutiveSameWay = countConsecutiveFalling(points)
	}

	baselineFrom := asOf.Add(-trendBaselineWindow)
	baselineVals := valuesInWindow(points, baselineFrom, asOf)
	if mean, std, ok := baselineMeanStd(baselineVals); ok {
		m.HasZScore = true
		if std > 0 {
			m.ZScore = (latest.Value - mean) / std
		} else {
			m.HasZScore = false
		}
	}

	slopeFrom := asOf.Add(-trendSlopeWindow)
	slopePoints := pointsInWindow(points, slopeFrom, asOf)
	if slope, r2, p, ok := linearRegression(slopePoints); ok {
		m.HasSlope = true
		m.Slope = slope
		m.RSquared = r2
		m.PValue = p
	}

	return m
}

func valuesInWindow(points []trendPoint, from, to time.Time) []float64 {
	vals := make([]float64, 0, len(points))
	for _, p := range points {
		if p.At.Before(from) || p.At.After(to) {
			continue
		}
		vals = append(vals, p.Value)
	}
	return vals
}

func pointsInWindow(points []trendPoint, from, to time.Time) []trendPoint {
	out := make([]trendPoint, 0, len(points))
	for _, p := range points {
		if p.At.Before(from) || p.At.After(to) {
			continue
		}
		out = append(out, p)
	}
	return out
}

// baselineMeanStd drops Tukey outliers (outside Q1−1.5·IQR … Q3+1.5·IQR)
// then returns mean/std of the remaining 14-day values.
func baselineMeanStd(values []float64) (mean, std float64, ok bool) {
	cleaned := removeIQROutliers(values)
	if len(cleaned) < minPointsForBaseline {
		return 0, 0, false
	}
	var sum float64
	for _, v := range cleaned {
		sum += v
	}
	mean = sum / float64(len(cleaned))
	var ss float64
	for _, v := range cleaned {
		d := v - mean
		ss += d * d
	}
	std = math.Sqrt(ss / float64(len(cleaned)))
	return mean, std, true
}

func removeIQROutliers(values []float64) []float64 {
	if len(values) < minPointsForBaseline {
		return append([]float64(nil), values...)
	}
	sorted := append([]float64(nil), values...)
	sort.Float64s(sorted)
	q1 := percentileSorted(sorted, 0.25)
	q3 := percentileSorted(sorted, 0.75)
	iqr := q3 - q1
	lo := q1 - 1.5*iqr
	hi := q3 + 1.5*iqr
	out := make([]float64, 0, len(values))
	for _, v := range values {
		if v < lo || v > hi {
			continue
		}
		out = append(out, v)
	}
	return out
}

func percentileSorted(sorted []float64, p float64) float64 {
	if len(sorted) == 1 {
		return sorted[0]
	}
	idx := p * float64(len(sorted)-1)
	lo := int(math.Floor(idx))
	hi := int(math.Ceil(idx))
	if lo == hi {
		return sorted[lo]
	}
	w := idx - float64(lo)
	return sorted[lo]*(1-w) + sorted[hi]*w
}

// linearRegression fits value ~ a + b·days (days from first point in window).
// Returns slope b (units/day), R², and two-tailed p-value for H0: b = 0.
func linearRegression(points []trendPoint) (slope, rSquared, pValue float64, ok bool) {
	n := len(points)
	if n < minPointsForRegression {
		return 0, 0, 1, false
	}

	t0 := points[0].At
	xs := make([]float64, n)
	ys := make([]float64, n)
	var sumX, sumY float64
	for i, p := range points {
		xs[i] = p.At.Sub(t0).Hours() / 24.0
		ys[i] = p.Value
		sumX += xs[i]
		sumY += ys[i]
	}
	meanX := sumX / float64(n)
	meanY := sumY / float64(n)

	var sxx, syy, sxy float64
	for i := 0; i < n; i++ {
		dx := xs[i] - meanX
		dy := ys[i] - meanY
		sxx += dx * dx
		syy += dy * dy
		sxy += dx * dy
	}
	if sxx == 0 {
		return 0, 0, 1, false
	}

	slope = sxy / sxx
	intercept := meanY - slope*meanX

	var ssRes float64
	for i := 0; i < n; i++ {
		pred := intercept + slope*xs[i]
		r := ys[i] - pred
		ssRes += r * r
	}
	if syy == 0 {
		rSquared = 1
	} else {
		rSquared = 1 - ssRes/syy
		if rSquared < 0 {
			rSquared = 0
		}
	}

	df := n - 2
	if df <= 0 || ssRes == 0 {
		// Perfect fit with df: treat as highly significant when slope != 0.
		if slope != 0 && ssRes == 0 {
			return slope, rSquared, 0, true
		}
		return slope, rSquared, 1, true
	}
	se := math.Sqrt((ssRes / float64(df)) / sxx)
	if se == 0 {
		if slope != 0 {
			return slope, rSquared, 0, true
		}
		return slope, rSquared, 1, true
	}
	tStat := slope / se
	pValue = studentTTwoTailedP(math.Abs(tStat), df)
	return slope, rSquared, pValue, true
}

func countConsecutiveRising(points []trendPoint) int {
	if len(points) < 2 {
		return 0
	}
	count := 0
	for i := len(points) - 1; i > 0; i-- {
		if points[i].Value > points[i-1].Value {
			count++
			continue
		}
		break
	}
	return count
}

func countConsecutiveFalling(points []trendPoint) int {
	if len(points) < 2 {
		return 0
	}
	count := 0
	for i := len(points) - 1; i > 0; i-- {
		if points[i].Value < points[i-1].Value {
			count++
			continue
		}
		break
	}
	return count
}

// studentTTwoTailedP returns P(|T_df| > t) via the regularized incomplete beta.
func studentTTwoTailedP(t float64, df int) float64 {
	if df <= 0 {
		return 1
	}
	if t == 0 {
		return 1
	}
	x := float64(df) / (float64(df) + t*t)
	return regularizedIncompleteBeta(0.5*float64(df), 0.5, x)
}

// regularizedIncompleteBeta computes I_x(a,b) = B_x(a,b)/B(a,b).
func regularizedIncompleteBeta(a, b, x float64) float64 {
	if x <= 0 {
		return 0
	}
	if x >= 1 {
		return 1
	}
	la, _ := math.Lgamma(a)
	lb, _ := math.Lgamma(b)
	lab, _ := math.Lgamma(a + b)
	front := math.Exp(math.Log(x)*a+math.Log(1-x)*b-(la+lb-lab)) / a

	// Continued fraction (Lentz) for the incomplete beta.
	const maxIter = 200
	const eps = 1e-10
	f := 1.0
	c := 1.0
	d := 1 - (a+b)*x/(a+1)
	if math.Abs(d) < 1e-30 {
		d = 1e-30
	}
	d = 1 / d
	f = d
	for i := 1; i <= maxIter; i++ {
		m := float64(i)
		numer := m * (b - m) * x / ((a + 2*m - 1) * (a + 2*m))
		d = 1 + numer*d
		if math.Abs(d) < 1e-30 {
			d = 1e-30
		}
		c = 1 + numer/c
		if math.Abs(c) < 1e-30 {
			c = 1e-30
		}
		d = 1 / d
		f *= d * c

		numer = -(a + m) * (a + b + m) * x / ((a + 2*m) * (a + 2*m + 1))
		d = 1 + numer*d
		if math.Abs(d) < 1e-30 {
			d = 1e-30
		}
		c = 1 + numer/c
		if math.Abs(c) < 1e-30 {
			c = 1e-30
		}
		d = 1 / d
		delta := d * c
		f *= delta
		if math.Abs(delta-1) < eps {
			break
		}
	}
	return front * f
}

// TrendHistorySince returns the lookback start time for fetching measurements
// needed by EvaluateRisingTrends (21 days before asOf).
func TrendHistorySince(asOf time.Time) time.Time {
	return asOf.Add(-trendHistoryLookback)
}
