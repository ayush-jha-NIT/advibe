# AdVibe B1 — backend initialization

Status: **Implemented as isolated runtime**. The completed four-portal Next.js frontend remains a browser-local demo, with no automatic fallback to API data.

## Implementation

| Area | Code | Evidence |
| --- | --- | --- |
| Express 5 / TypeScript / Node 22 | `backend/src/server.ts`, `app.ts` | independent build/start and real HTTP smoke |
| Environment safety | `src/config/env.ts` | Zod validation, bounded port, explicit HTTPS CORS for production, no wildcard |
| HTTP hardening | Helmet, strict CORS, JSON 64 KB cap, no-store | integration tests for allowed/denied origins, headers, invalid JSON/413 |
| Observability | Pino, UUID request ID | correlated sanitized error JSON; access logs omit query/body/auth details |
| Standard errors | `middleware/error-handler.ts` | 400/403/404/413/422/503/500 envelopes, no stack trace or leaked values |
| Validation | `middleware/validate.ts` | test valid and rejected Zod input |
| Liveness / process readiness | GET `/api/v1/health`, GET `/api/v1/ready` | 200 on healthy HTTP process; readiness 503 while shutdown drains |
| Resilience | timeouts, SIGTERM/SIGINT drain | compiled-server smoke and bounded shutdown |
| CI | `backend-verify` job | install, lint, typecheck, unit/HTTP tests, TypeScript build, smoke |

GET /health response: `{"data":{"message":"ok"}}`. GET /ready response: `{"data":{"message":"ready"}}`. No downstream dependencies exist in B1: neither endpoint guarantees Neon connectivity, an active Cashfree account or paired screens.

The OpenAPI contract has 81 operations: only the two System endpoints are implemented; the remainder remain B2–B23 design contracts. Envelopes and request IDs follow B0. CORS is not authentication; protected operations cannot be added before sessions, CSRF and RBAC.

## Developer workflow

```bash
npm install --prefix backend
npm --prefix backend run check
npm --prefix backend run dev
```

For local overrides copy `backend/.env.example` to `backend/.env`. The B1 runtime is intended for local/staging testing, not public handling of personal data, payment or device traffic.

## B2 handoff

B2 owns database schema, connection pooling, migration and seed policy, transactional constraints, backup validation and integration tests. Add a dependency-aware readiness probe only when the dependency is real. B3/B4 own production auth, CSRF and authorization. Render staging and production launch gates are later milestones.
