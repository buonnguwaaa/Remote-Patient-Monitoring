package twilio

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	twiliosdk "github.com/twilio/twilio-go"
	openapi "github.com/twilio/twilio-go/rest/api/v2010"
)

type Client struct {
	client     *twiliosdk.RestClient
	from       string
	toOverride string
}

func NewClientFromEnv() (*Client, error) {
	accountSID := strings.TrimSpace(os.Getenv("TWILIO_ACCOUNT_SID"))
	authToken := strings.TrimSpace(os.Getenv("TWILIO_AUTH_TOKEN"))
	from := strings.TrimSpace(os.Getenv("TWILIO_FROM_NUMBER"))
	if accountSID == "" || authToken == "" || from == "" {
		return nil, errors.New("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN và TWILIO_FROM_NUMBER là bắt buộc")
	}

	client := twiliosdk.NewRestClientWithParams(twiliosdk.ClientParams{
		Username: accountSID,
		Password: authToken,
	})
	client.SetTimeout(10 * time.Second)
	return &Client{
		client:     client,
		from:       from,
		toOverride: strings.TrimSpace(os.Getenv("TWILIO_TO_NUMBER_OVERRIDE")),
	}, nil
}

func (c *Client) Send(ctx context.Context, to, body string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if c.toOverride != "" {
		to = c.toOverride
	}

	params := &openapi.CreateMessageParams{}
	params.SetTo(to)
	params.SetFrom(c.from)
	params.SetBody(body)
	_, err := c.client.Api.CreateMessage(params)
	return err
}
