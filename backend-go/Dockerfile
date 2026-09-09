FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server ./cmd/api

FROM gcr.io/distroless/static:nonroot
WORKDIR /app
COPY --from=builder /app/server /app/server
COPY --from=builder /app/openapi.yaml /app/openapi.yaml
EXPOSE 3000
ENTRYPOINT ["/app/server"]
