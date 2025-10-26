## Hướng dẫn chạy Backend

### Yêu cầu
- Đã cài đặt Go (>= 1.23)

### Cài đặt thư viện
Chạy lệnh sau để cài đặt các thư viện cần thiết:

```bash
go mod tidy
```

### Chạy server
Chạy lệnh các lệnh sau để khởi động server backend:

```bash
make run
```

```bash
go run cmd/server/main.go
```

Hoặc build trước rồi chạy:

```bash
go build -o server cmd/server/main.go
./server
```

Server sẽ chạy ở địa chỉ: http://localhost:8080
Kiểm tra bằng cách truy cập: http://localhost:8080/ping
