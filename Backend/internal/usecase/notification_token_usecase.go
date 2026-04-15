package usecase

type RegisterNotificationTokenInput struct {
	UserID   string
	DeviceID string
	Platform string
	Provider string
	Token    string
}

type DeactivateNotificationTokenInput struct {
	UserID   string
	DeviceID string
}
