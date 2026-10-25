# AdVibe Backend — reserved for B1

B0 intentionally does NOT introduce a running backend server. The existing Next.js frontend and its Vercel demo remain untouched.

Canonical starting documents:
- ../docs/backend/B0_ARCHITECTURE.md
- ../docs/backend/B0_DATABASE.md
- ../docs/backend/B0_API_MAPPING.md
- ../docs/backend/B0_DECISIONS.md
- ../docs/backend/BACKEND_ROADMAP.md
- ../contracts/openapi.v1.json

B1 will initialize Express + TypeScript, environment validation, middleware, error contract, /api/v1/health and test infrastructure here. B2 will add Prisma/Neon migrations. Never put secret values in committed files or NEXT_PUBLIC environment variables.
