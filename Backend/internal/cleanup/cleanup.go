package cleanup

import (
	"context"
	"fmt"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"time"
)

// Hàm này nên được gọi khi khởi động server để dọn dẹp token hết hạn định kỳ
func StartRefreshTokenCleanup() {
	go func() {
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			deleted, err := repositories.DeleteExpiredRefreshTokens(ctx)
			if err == nil && deleted > 0 {
				fmt.Printf("Deleted %d expired refresh tokens\n", deleted)
			}
			cancel()
			time.Sleep(1 * time.Hour)
		}
	}()
}
