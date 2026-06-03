package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

// New builds a reverse proxy that forwards requests to target, preserving the
// original request path (upstream services expose the same /api/v1/... routes).
func New(target string) (gin.HandlerFunc, error) {
	u, err := url.Parse(target)
	if err != nil {
		return nil, err
	}

	rp := httputil.NewSingleHostReverseProxy(u)
	rp.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		log.Printf("gateway: upstream %s error: %v", target, err)
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"error":"upstream service unavailable"}`))
	}

	return func(c *gin.Context) {
		rp.ServeHTTP(c.Writer, c.Request)
	}, nil
}

// MustNew is New but panics on a bad target URL (used at startup).
func MustNew(target string) gin.HandlerFunc {
	h, err := New(target)
	if err != nil {
		log.Fatalf("gateway: invalid upstream URL %q: %v", target, err)
	}
	return h
}
