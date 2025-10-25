package notificationtokens

import "time"

type NotificationToken struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	UserID    string    `json:"userId" bson:"userId"`
	FCMToken  string    `json:"fcmToken" bson:"fcmToken"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
}
