package cleanup

import (
	"context"
	"fmt"
	"time"
	"RPM-Backend/internal/repository"
)

// Hàm này nên được gọi khi khởi động server để dọn dẹp token hết hạn định kỳ
func StartRefreshTokenCleanup() {
	go func() {
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			deleted, err := repository.DeleteExpiredRefreshTokens(ctx)
			if err == nil && deleted > 0 {
				fmt.Printf("Deleted %d expired refresh tokens\n", deleted)
			}
			cancel()
			time.Sleep(1 * time.Hour)
		}
	}()
}
