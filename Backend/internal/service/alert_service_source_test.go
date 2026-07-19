package service

import (
	"testing"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

func TestNormalizeViolationSource(t *testing.T) {
	tests := []struct {
		name string
		in   domain.ThresholdViolation
		want domain.ViolationSource
	}{
		{
			name: "keeps explicit threshold",
			in:   domain.ThresholdViolation{Rule: "temperature_max", Source: domain.ViolationSourceThreshold},
			want: domain.ViolationSourceThreshold,
		},
		{
			name: "keeps explicit trend",
			in:   domain.ThresholdViolation{Rule: "trend_rising_watch", Source: domain.ViolationSourceTrend},
			want: domain.ViolationSourceTrend,
		},
		{
			name: "backfills trend from rule",
			in:   domain.ThresholdViolation{Rule: "trend_falling_high"},
			want: domain.ViolationSourceTrend,
		},
		{
			name: "backfills threshold from rule",
			in:   domain.ThresholdViolation{Rule: "temperature_max"},
			want: domain.ViolationSourceThreshold,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeViolationSource(tt.in)
			if got.Source != tt.want {
				t.Fatalf("source=%q want %q", got.Source, tt.want)
			}
		})
	}
}
