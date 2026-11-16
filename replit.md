# TechEra BIOGLOW Tracker

Aplicativo interno da equipe TechEra para registrar rounds, acompanhar pontuação e orientar treinos da temporada BIOGLOW 2026–2027 da FIRST LEGO League Challenge.

## Run & Operate

- Preview starts the web app and API through their configured Replit workflows.
- `pnpm --filter @workspace/bioglow-tracker run dev` — run the web app (requires `PORT` and `BASE_PATH`)
- `pnpm --filter @workspace/api-server run dev` — build and run the API server (port 8080 in Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Database schema changes require explicit user authorization; do not run schema pushes without it.
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Commit and push all requested changes for this app to the existing GitHub repository.
- This project uses an external database; do not change its connection, schema, or data without explicit authorization.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
