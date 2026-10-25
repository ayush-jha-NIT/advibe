# AdVibe Backend B1 — Express + TypeScript

B1 implements an isolated Node 22 / Express 5 / TypeScript HTTP API foundation. **Only GET /api/v1/health and GET /api/v1/ready are implemented.** There is no database, authentication, payments, KYC, payout gateway, device telemetry or integration with the existing frontend demo.

## Local setup

From repository root, with Node.js 22+:

\`\`\`bash
npm install --prefix backend
cp backend/.env.example backend/.env
npm --prefix backend run dev
\`\`\`

PowerShell copy: \`Copy-Item backend/.env.example backend/.env\`.
Server default: http://localhost:4000. The development script loads backend/.env if present.

\`\`\`bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/ready
npm --prefix backend run check
npm --prefix backend run build
npm --prefix backend start
\`\`\`

## Configuration
\`backend/.env.example\` lists NODE_ENV, HOST, PORT, CORS_ORIGINS, LOG_LEVEL and TRUST_PROXY. In production, set these as private process environment variables. CORS_ORIGINS must be explicitly provided as comma-separated HTTPS origins, never \`*\`. TRUST_PROXY=true requires an audited trusted proxy that overwrites forwarding headers. Never commit secrets or put backend credentials into NEXT_PUBLIC_ variables.

## Code layout
- \`src/server.ts\`: independent Node server, timeouts, signals and readiness draining.
- \`src/config/env.ts\`: Zod environment validation and fail-closed production CORS.
- \`src/app.ts\`: Express middleware, liveness/readiness and routing boundary.
- \`src/lib/\`: error type and redacting structured logger.
- \`src/middleware/\`: server request IDs, safe error envelope, Zod validation.
- \`tests/\`: unit and actual HTTP integration tests.
- \`scripts/smoke.mjs\`: starts compiled \`dist/server.js\` and verifies HTTP traffic.

Use \`npm --prefix backend run check\` for lint, types, tests, build and compiled smoke. Root Next.js checks remain independent. The B0 contract is \`../contracts/openapi.v1.json\`; documentation is \`../docs/backend/B1_IMPLEMENTATION.md\`.

B2 will implement Neon/Prisma, migrations and downstream readiness. Real cookie/domain decisions are blocked until B3.
