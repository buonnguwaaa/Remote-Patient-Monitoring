package user

type Patient struct {
	BaseUser `bson:",inline"`
}
