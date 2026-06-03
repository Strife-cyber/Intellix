package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"micro-cer/internal/api/cerctx"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	headerUserKey   = "X-CER-USER-KEY"
	headerTimestamp = "X-CER-TIMESTAMP"
	headerSignature = "X-CER-SIGNATURE"
)

func CerAuth(next http.Handler) http.Handler {
	secret := strings.Trim(strings.TrimSpace(os.Getenv("CER_SHARED_SECRET")), `"'`)
	if secret == "" {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "CER_SHARED_SECRET is not configured", http.StatusInternalServerError)
		})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userKey := strings.TrimSpace(r.Header.Get(headerUserKey))
		timestamp := strings.TrimSpace(r.Header.Get(headerTimestamp))
		signature := strings.TrimSpace(r.Header.Get(headerSignature))

		if userKey == "" || timestamp == "" || signature == "" {
			http.Error(w, "missing CER auth headers", http.StatusUnauthorized)
			return
		}

		ts, err := strconv.ParseInt(timestamp, 10, 64)
		if err != nil {
			http.Error(w, "invalid timestamp", http.StatusUnauthorized)
			return
		}

		now := time.Now().Unix()
		if ts < now-300 || ts > now+60 {
			http.Error(w, "timestamp expired", http.StatusUnauthorized)
			return
		}

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "unable to read body", http.StatusBadRequest)
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

		apiPath := strings.TrimPrefix(r.URL.Path, "/api/")
		bodyHashHex := cerBodyHashHex(r.Header.Get("Content-Type"), bodyBytes)
		payload := strings.Join([]string{
			userKey,
			timestamp,
			strings.ToUpper(r.Method),
			apiPath,
			bodyHashHex,
		}, "|")

		mac := hmac.New(sha256.New, []byte(secret))
		_, _ = mac.Write([]byte(payload))
		expected := hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(expected), []byte(signature)) {
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}

		ctx := cerctx.WithUserKey(r.Context(), userKey)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// cerBodyHashHex returns the SHA-256 hex digest used in the HMAC payload.
// Multipart uploads are signed with an empty body on the Laravel proxy (the
// boundary bytes are not known ahead of time), so both sides use e3b0c442…
// for multipart/form-data requests.
func cerBodyHashHex(contentType string, body []byte) string {
	ct := strings.ToLower(strings.TrimSpace(contentType))
	if strings.HasPrefix(ct, "multipart/form-data") {
		body = nil
	}
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}
