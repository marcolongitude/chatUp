# Tracing Next Steps (Tempo + OpenTelemetry)

Current stack covers logs and metrics. To evolve to distributed tracing without replacing the current architecture:

## 1) Add Tempo

- Install `grafana/tempo` in namespace `observability`.
- Expose OTLP receiver (4317 gRPC / 4318 HTTP) only inside cluster.

## 2) Instrument backend-go with OpenTelemetry SDK

- Add OTel middleware for HTTP handlers.
- Add spans around DB operations and websocket event handlers.
- Propagate trace context from request headers to internal handlers.

## 3) Use Alloy as OTLP forwarder

- Extend Alloy config to receive OTLP and forward traces to Tempo.
- Keep Alloy as a single telemetry agent for logs + traces (+ optional metrics pipeline).

## 4) Correlate logs and traces

- Include `trace_id` and `span_id` in structured logs.
- Add Grafana links from logs to Tempo traces.

## 5) Alerting expansion

- Add latency and error SLO rules based on traces/RED metrics.

This path keeps the current LGTM + Alloy model and avoids migration rework.
