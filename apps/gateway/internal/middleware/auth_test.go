package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret"

func sign(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := token.SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return s
}

func newRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(Auth(testSecret))
	handler := func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"userId": c.Request.Header.Get("X-User-Id"),
			"role":   c.Request.Header.Get("X-User-Role"),
		})
	}
	r.GET("/api/v1/products", handler)
	r.GET("/api/v1/products/:id", handler)
	r.POST("/api/v1/products", handler)
	r.GET("/api/v1/auth/me", handler)
	r.Any("/api/v1/orders", handler)
	return r
}

func TestPublicRoutesSkipAuth(t *testing.T) {
	r := newRouter()
	cases := []struct{ method, path string }{
		{http.MethodGet, "/api/v1/products"},
		{http.MethodGet, "/api/v1/products/abc"},
		{http.MethodGet, "/api/v1/auth/me"},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(tc.method, tc.path, nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("%s %s: want 200, got %d", tc.method, tc.path, w.Code)
		}
	}
}

func TestProtectedRouteRejectsMissingToken(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestWriteToCatalogRequiresToken(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("POST /products without token: want 401, got %d", w.Code)
	}
}

func TestValidTokenForwardsIdentity(t *testing.T) {
	r := newRouter()
	token := sign(t, jwt.MapClaims{
		"sub":  "user-123",
		"role": "admin",
		"exp":  time.Now().Add(time.Hour).Unix(),
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	if got := w.Body.String(); got != `{"role":"admin","userId":"user-123"}` {
		t.Errorf("forwarded identity mismatch: %s", got)
	}
}

func TestClientSuppliedIdentityHeadersAreStripped(t *testing.T) {
	r := newRouter()
	token := sign(t, jwt.MapClaims{"sub": "real-user", "exp": time.Now().Add(time.Hour).Unix()})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-User-Id", "spoofed")
	req.Header.Set("X-User-Role", "admin")
	r.ServeHTTP(w, req)
	if got := w.Body.String(); got != `{"role":"customer","userId":"real-user"}` {
		t.Errorf("spoofed headers not overridden: %s", got)
	}
}

func TestExpiredTokenRejected(t *testing.T) {
	r := newRouter()
	token := sign(t, jwt.MapClaims{"sub": "user-123", "exp": time.Now().Add(-time.Hour).Unix()})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expired token: want 401, got %d", w.Code)
	}
}
