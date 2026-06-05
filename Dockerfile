# ---- Builder stage ----
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /build/micro-cer ./cmd/api

# ---- Runtime stage ----
FROM alpine:3.21

# Install runtime dependencies: ca-certificates for HTTPS AI providers, pdflatex
RUN apk add --no-cache \
    ca-certificates \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-lang-french \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy the binary
COPY --from=builder /build/micro-cer /app/micro-cer

# Copy built-in LaTeX templates
COPY --from=builder /build/internal/template /app/internal/template

# Create writable data directories
RUN mkdir -p /app/data/users /app/data/templates /app/uploads

EXPOSE 8080

ENTRYPOINT ["/app/micro-cer"]
