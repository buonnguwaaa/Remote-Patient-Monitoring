FROM golang:1.24-alpine AS builder
WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o worker cmd/worker/main.go

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=builder /build/server /server
COPY --from=builder /build/worker /worker

EXPOSE 8080