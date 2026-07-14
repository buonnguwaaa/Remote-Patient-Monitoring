package domain

type MealTiming string

const (
	MealTimingPreMeal  MealTiming = "pre_meal"
	MealTimingPostMeal MealTiming = "post_meal"
)

func (m MealTiming) IsValid() bool {
	switch m {
	case MealTimingPreMeal, MealTimingPostMeal:
		return true
	default:
		return false
	}
}

func MealTimingLabel(m MealTiming) string {
	switch m {
	case MealTimingPreMeal:
		return "trước ăn"
	case MealTimingPostMeal:
		return "sau ăn"
	default:
		return ""
	}
}
