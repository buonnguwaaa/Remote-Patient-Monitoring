package fcm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const firebaseMessagingScope = "https://www.googleapis.com/auth/firebase.messaging"

type Client struct {
	httpClient  *http.Client
	tokenSource oauth2.TokenSource
	projectID   string
}

type serviceAccountConfig struct {
	ProjectID string `json:"project_id"`
}

type sendMessageRequest struct {
	Message fcmMessage `json:"message"`
}

type fcmMessage struct {
	Token        string              `json:"token"`
	Notification fcmNotification     `json:"notification"`
	Data         map[string]string   `json:"data,omitempty"`
	Android      *fcmAndroidSettings `json:"android,omitempty"`
	APNS         *fcmAPNSSettings    `json:"apns,omitempty"`
}

type fcmNotification struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

type fcmAndroidSettings struct {
	Priority     string                  `json:"priority,omitempty"`
	Notification *fcmAndroidNotification `json:"notification,omitempty"`
}

type fcmAndroidNotification struct {
	ChannelID string `json:"channel_id,omitempty"`
	Sound     string `json:"sound,omitempty"`
}

type fcmAPNSSettings struct {
	Payload *fcmAPNSPayload `json:"payload,omitempty"`
}

type fcmAPNSPayload struct {
	APS *fcmAPSSettings `json:"aps,omitempty"`
}

type fcmAPSSettings struct {
	Sound string `json:"sound,omitempty"`
}

type fcmErrorResponse struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
		Details []struct {
			Type      string `json:"@type"`
			ErrorCode string `json:"errorCode"`
		} `json:"details"`
	} `json:"error"`
}

func NewClientFromEnv() (*Client, error) {
	credentialsFile := strings.TrimSpace(os.Getenv("FIREBASE_CREDENTIALS_FILE"))
	if credentialsFile == "" {
		return nil, fmt.Errorf("FIREBASE_CREDENTIALS_FILE is required")
	}

	credentialsJSON, err := os.ReadFile(credentialsFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read firebase credentials file: %w", err)
	}

	var serviceAccount serviceAccountConfig
	if err := json.Unmarshal(credentialsJSON, &serviceAccount); err != nil {
		return nil, fmt.Errorf("failed to parse firebase credentials file: %w", err)
	}
	if strings.TrimSpace(serviceAccount.ProjectID) == "" {
		return nil, fmt.Errorf("firebase service account missing project_id")
	}

	jwtConfig, err := google.JWTConfigFromJSON(credentialsJSON, firebaseMessagingScope)
	if err != nil {
		return nil, fmt.Errorf("failed to create firebase jwt config: %w", err)
	}

	return &Client{
		httpClient:  &http.Client{Timeout: 10 * time.Second},
		tokenSource: jwtConfig.TokenSource(context.Background()),
		projectID:   strings.TrimSpace(serviceAccount.ProjectID),
	}, nil
}

func (c *Client) Send(ctx context.Context, token string, title string, body string, data map[string]string) error {
	if strings.TrimSpace(token) == "" {
		return fmt.Errorf("%w: empty registration token", service.ErrInvalidPushToken)
	}

	accessToken, err := c.tokenSource.Token()
	if err != nil {
		return fmt.Errorf("failed to get firebase access token: %w", err)
	}

	requestBody := sendMessageRequest{
		Message: fcmMessage{
			Token:        token,
			Notification: fcmNotification{Title: title, Body: body},
			Data:         data,
			Android: &fcmAndroidSettings{
				Priority: "HIGH",
				Notification: &fcmAndroidNotification{
					ChannelID: "default",
					Sound:     "rpm_notification",
				},
			},
			APNS: &fcmAPNSSettings{
				Payload: &fcmAPNSPayload{
					APS: &fcmAPSSettings{
						Sound: "rpm_notification.wav",
					},
				},
			},
		},
	}

	payload, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("failed to marshal fcm payload: %w", err)
	}

	endpoint := fmt.Sprintf("https://fcm.googleapis.com/v1/projects/%s/messages:send", c.projectID)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("failed to create fcm request: %w", err)
	}

	request.Header.Set("Authorization", "Bearer "+accessToken.AccessToken)
	request.Header.Set("Content-Type", "application/json")

	response, err := c.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("failed to send fcm request: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode >= 200 && response.StatusCode < 300 {
		return nil
	}

	bodyBytes, _ := io.ReadAll(response.Body)
	var fcmErr fcmErrorResponse
	if err := json.Unmarshal(bodyBytes, &fcmErr); err == nil {
		if isInvalidTokenError(fcmErr) {
			return fmt.Errorf("%w: %s", service.ErrInvalidPushToken, fcmErr.Error.Message)
		}
		return fmt.Errorf("fcm send failed: status=%d code=%s message=%s", response.StatusCode, fcmErr.Error.Status, fcmErr.Error.Message)
	}

	bodyText := strings.TrimSpace(string(bodyBytes))
	if looksLikeInvalidToken(response.StatusCode, bodyText) {
		return fmt.Errorf("%w: %s", service.ErrInvalidPushToken, bodyText)
	}

	return fmt.Errorf("fcm send failed: status=%d body=%s", response.StatusCode, bodyText)
}

func isInvalidTokenError(fcmErr fcmErrorResponse) bool {
	status := strings.ToUpper(strings.TrimSpace(fcmErr.Error.Status))
	message := strings.ToLower(strings.TrimSpace(fcmErr.Error.Message))

	if status == "UNREGISTERED" {
		return true
	}
	if status == "INVALID_ARGUMENT" && strings.Contains(message, "token") {
		return true
	}

	for _, detail := range fcmErr.Error.Details {
		errorCode := strings.ToUpper(strings.TrimSpace(detail.ErrorCode))
		if errorCode == "UNREGISTERED" || errorCode == "INVALID_ARGUMENT" {
			return true
		}
	}

	return false
}

func looksLikeInvalidToken(statusCode int, body string) bool {
	if statusCode != http.StatusBadRequest && statusCode != http.StatusNotFound {
		return false
	}

	body = strings.ToLower(body)
	return strings.Contains(body, "unregistered") ||
		strings.Contains(body, "registration token") ||
		strings.Contains(body, "invalid argument")
}
