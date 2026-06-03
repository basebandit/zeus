.PHONY: build run test tidy docker

build:
	go build -o bin/gateway-service ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

tidy:
	go mod tidy

docker:
	docker build -t gateway-service .
