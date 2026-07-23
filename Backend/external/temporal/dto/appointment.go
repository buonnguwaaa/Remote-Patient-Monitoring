package dto

type AppointmentReminderWorkflowInput struct {
	AppointmentID string
}

// AppointmentReminderKind identifies which lead-time reminder to send.
// Values: "1d" (24 hours before) or "2h" (2 hours before).
type AppointmentReminderKind string

const (
	AppointmentReminderKind1d AppointmentReminderKind = "1d"
	AppointmentReminderKind2h AppointmentReminderKind = "2h"
)

type SendAppointmentReminderInput struct {
	AppointmentID string
	Kind          AppointmentReminderKind
}
