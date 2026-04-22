package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "chatup_http_requests_total",
			Help: "Total number of HTTP requests by route, method and status code.",
		},
		[]string{"method", "route", "status"},
	)
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "chatup_http_request_duration_seconds",
			Help:    "HTTP request latency in seconds by route and method.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "route"},
	)
	httpErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "chatup_http_errors_total",
			Help: "Total number of HTTP responses with status code >= 400.",
		},
		[]string{"method", "route", "status"},
	)
	websocketConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "chatup_websocket_connections_active",
			Help: "Current number of active websocket connections.",
		},
	)
	websocketMessagesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "chatup_websocket_messages_total",
			Help: "Total number of websocket messages by direction and type.",
		},
		[]string{"direction", "type"},
	)
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.ResponseWriter.Write(b)
}

func MetricsHandler() http.Handler {
	return promhttp.Handler()
}

func HTTPMetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		recorder := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(recorder, r)

		route := r.URL.Path
		statusCode := recorder.status
		if statusCode == 0 {
			statusCode = http.StatusOK
		}
		status := strconv.Itoa(statusCode)
		method := r.Method

		httpRequestsTotal.WithLabelValues(method, route, status).Inc()
		httpRequestDuration.WithLabelValues(method, route).Observe(time.Since(started).Seconds())
		if statusCode >= 400 {
			httpErrorsTotal.WithLabelValues(method, route, status).Inc()
		}
	})
}

func IncWSConnection() { websocketConnectionsActive.Inc() }
func DecWSConnection() { websocketConnectionsActive.Dec() }
func IncWSInbound(msgType string) {
	websocketMessagesTotal.WithLabelValues("in", msgType).Inc()
}
func IncWSOutbound(msgType string) {
	websocketMessagesTotal.WithLabelValues("out", msgType).Inc()
}
