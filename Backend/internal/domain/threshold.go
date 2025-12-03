package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Threshold struct {
	ID                 primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID          primitive.ObjectID `json:"patientId" bson:"patientId"`
	DoctorID           primitive.ObjectID `json:"doctorId" bson:"doctorId"`
	TemperatureMin     float64            `json:"temperatureMin,omitempty" bson:"temperatureMin,omitempty"`
	TemperatureMax     float64            `json:"temperatureMax,omitempty" bson:"temperatureMax,omitempty"`
	HeartRateMin       float64            `json:"heartRateMin,omitempty" bson:"heartRateMin,omitempty"`
	HeartRateMax       float64            `json:"heartRateMax,omitempty" bson:"heartRateMax,omitempty"`
	RespiratoryRateMin float64            `json:"respiratoryRateMin,omitempty" bson:"respiratoryRateMin,omitempty"`
	RespiratoryRateMax float64            `json:"respiratoryRateMax,omitempty" bson:"respiratoryRateMax,omitempty"`
	SpO2Min            float64            `json:"spo2Min,omitempty" bson:"spo2Min,omitempty"`
	SysMin             float64            `json:"sysMin,omitempty" bson:"sysMin,omitempty"`
	SysMax             float64            `json:"sysMax,omitempty" bson:"sysMax,omitempty"`
	DiaMin             float64            `json:"diaMin,omitempty" bson:"diaMin,omitempty"`
	DiaMax             float64            `json:"diaMax,omitempty" bson:"diaMax,omitempty"`
	GlucoseMin         *float64           `json:"glucoseMin,omitempty" bson:"glucoseMin,omitempty"`
	GlucoseMax         *float64           `json:"glucoseMax,omitempty" bson:"glucoseMax,omitempty"`
	EffectiveFrom      time.Time          `json:"effectiveFrom" bson:"effectiveFrom"`
	EffectiveTo        *time.Time         `json:"effectiveTo,omitempty" bson:"effectiveTo,omitempty"`
	CreatedAt          time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt          time.Time          `json:"updatedAt" bson:"updatedAt"`
}
