package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"micro-cer/internal/api/cerctx"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestCerAuthValidSignature(t *testing.T) {
	t.Setenv("CER_SHARED_SECRET", "test-secret")

	body := []byte(`{"title":"Test"}`)
	userKey := "42"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	apiPath := "jobs/cer"
	bodyHash := sha256.Sum256(body)
	payload := strings.Join([]string{userKey, ts, "POST", apiPath, hex.EncodeToString(bodyHash[:])}, "|")
	mac := hmac.New(sha256.New, []byte("test-secret"))
	_, _ = mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/jobs/cer", bytes.NewReader(body))
	req.Header.Set(headerUserKey, userKey)
	req.Header.Set(headerTimestamp, ts)
	req.Header.Set(headerSignature, sig)

	called := false
	handler := CerAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		if got := cerctx.UserKeyFromContext(r.Context()); got != userKey {
			t.Fatalf("expected user key %s, got %s", userKey, got)
		}
	}))

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	if !called {
		t.Fatal("expected handler to be called")
	}
}

/*func TestCerAuthMultipartUsesEmptyBodyHash(t *testing.T) {
	t.Setenv("CER_SHARED_SECRET", "test-secret")

	userKey := "42"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	apiPath := "prosits"
	emptyHash := hex.EncodeToString(sha256.Sum256(nil)[:])
	payload := strings.Join([]string{userKey, ts, "POST", apiPath, emptyHash}, "|")
	mac := hmac.New(sha256.New, []byte("test-secret"))
	_, _ = mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))

	body := []byte("--boundary\r\nContent-Disposition: form-data; name=\"file\"\r\n\r\nbytes\r\n--boundary--\r\n")
	req := httptest.NewRequest(http.MethodPost, "/api/prosits", bytes.NewReader(body))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=boundary")
	req.Header.Set(headerUserKey, userKey)
	req.Header.Set(headerTimestamp, ts)
	req.Header.Set(headerSignature, sig)

	rr := httptest.NewRecorder()
	CerAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
}*/

func TestCerAuthRejectsMissingHeaders(t *testing.T) {
	t.Setenv("CER_SHARED_SECRET", "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/api/themes", nil)
	rr := httptest.NewRecorder()
	CerAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}
