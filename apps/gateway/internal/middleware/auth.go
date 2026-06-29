package middleware

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// productsReadPath matches public product browsing endpoints.
// GET /api/v1/products and GET /api/v1/products/{id} are public.
var productsReadPath = regexp.MustCompile(`^/api/v1/products(/[^/]+)?/?$`)

// isPublic reports whether a request may proceed without authentication.
func isPublic(method, path string) bool {
	if strings.HasPrefix(path, "/api/v1/auth/") {
		return true
	}
	if method == http.MethodGet && productsReadPath.MatchString(path) {
		return true
	}
	return false
}

// Auth validates the bearer JWT (HS256) for protected routes and forwards the
// authenticated identity to upstream services via the X-User-Id / X-User-Role
// headers. Any client-supplied identity headers are always stripped so they
// cannot be spoofed.
func Auth(secret string) gin.HandlerFunc {
	keyFunc := func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	}

	return func(c *gin.Context) {
		// Never trust client-provided identity headers.
		c.Request.Header.Del("X-User-Id")
		c.Request.Header.Del("X-User-Role")

		if isPublic(c.Request.Method, c.Request.URL.Path) {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or malformed Authorization header"})
			return
		}
		raw := strings.TrimPrefix(authHeader, "Bearer ")

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(raw, claims, keyFunc, jwt.WithValidMethods([]string{"HS256"}))
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		sub, _ := claims["sub"].(string)
		if sub == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token missing subject"})
			return
		}
		role, _ := claims["role"].(string)
		if role == "" {
			role = "customer"
		}

		c.Request.Header.Set("X-User-Id", sub)
		c.Request.Header.Set("X-User-Role", role)
		c.Next()
	}
}
