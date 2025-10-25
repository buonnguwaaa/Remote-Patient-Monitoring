package reminder

import "time"

type Kind string

const (
	KindMeasure    Kind = "measure"
	KindMedication Kind = "medication"
)

type Channel string

const (
	ChannelLocal Channel = "local"
	ChannelPush  Channel = "push"
)

type Reminder struct {
	ID         string    `json:"id" bson:"_id,omitempty"`
	PatientID  string    `json:"patientId" bson:"patientId"`
	Kind       Kind      `json:"kind" bson:"kind"`
	Message    string    `json:"message" bson:"message"`
	Time       string    `json:"time" bson:"time"` // "HH:MM"
	DaysOfWeek []int     `json:"daysOfWeek" bson:"daysOfWeek"`
	Timezone   string    `json:"timezone" bson:"timezone"`
	Channel    Channel   `json:"channel" bson:"channel"`
	Active     bool      `json:"active" bson:"active"`
	CreatedBy  string    `json:"createdBy" bson:"createdBy"`
	CreatedAt  time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt" bson:"updatedAt"`
}
