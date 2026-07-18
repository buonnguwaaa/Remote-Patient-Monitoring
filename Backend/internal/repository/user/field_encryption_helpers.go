package user

import (
	"fmt"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

const phoneField = "phone"

func encryptMappedStringFields(crypto util.FieldEncryptor, updateData map[string]interface{}, fields []string) (map[string]interface{}, error) {
	if crypto == nil || !crypto.Enabled() || len(updateData) == 0 {
		return updateData, nil
	}

	out := make(map[string]interface{}, len(updateData))
	for k, v := range updateData {
		out[k] = v
	}

	for _, field := range fields {
		raw, ok := out[field]
		if !ok {
			continue
		}
		text, ok := raw.(string)
		if !ok {
			continue
		}
		encrypted, err := crypto.Encrypt(text)
		if err != nil {
			return nil, fmt.Errorf("encrypt %s: %w", field, err)
		}
		out[field] = encrypted
	}
	return out, nil
}
