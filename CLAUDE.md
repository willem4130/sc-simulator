# Simplicate Automations

Production-ready automation system for Simplicate that handles contract distribution, hours reminders, and invoice generation with a full-stack Next.js admin dashboard.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Protected route group
│   ├── (public)/          # Public route group
│   ├── admin/             # Admin dashboard pages (dashboard, projects, users, settings, automation)
│   ├── api/               # REST API routes (health, webhooks, tRPC)
│   └── sentry-test/       # Error tracking test page
├── components/            # React components
│   └── ui/                # shadcn/ui components (card, button, table, badge, etc.)
├── lib/                   # Utilities and integrations
│   ├── notifications/     # Email (Resend) and Slack notification handlers
│   ├── simplicate/        # Simplicate API client and type definitions
│   ├── workflows/         # Automation workflows (contract distribution, hours reminders, invoice generation)
│   ├── api-middleware.ts  # API helpers (rate limiting, validation, auth)
│   └── rate-limit.ts      # Upstash Redis rate limiting
├── server/                # Backend code
│   ├── api/               # tRPC routers (dashboard, projects, automation, contracts)
│   └── db/                # Prisma client instance
├── trpc/                  # tRPC client configuration
└── env.js                 # Environment variable validation (Zod schemas)

prisma/
└── schema.prisma          # Database schema (Project, Contract, HoursEntry, Invoice, AutomationLog, User)
```

## Tech Stack

**Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, shadcn/ui
**Backend:** tRPC v11, Prisma ORM, PostgreSQL (Neon), NextAuth v5
**Integrations:** Simplicate API, Slack, Resend (Email), Vercel Analytics, Sentry
**Tools:** Upstash Redis (rate limiting), Zod (validation), Vitest, Playwright

## Organization Rules

**Keep code organized and modularized:**
- Admin pages → `/app/admin`, one page per feature
- API routes → `/app/api`, grouped by resource
- tRPC routers → `/server/api/routers`, one router per domain (projects, automation, etc.)
- Simplicate integration → `/lib/simplicate`, client + types
- Workflows → `/lib/workflows`, one file per automation type
- Components → `/components/ui` (shadcn/ui), custom components in `/components`
- Types → Co-located with usage or in router files

**Modularity principles:**
- Single responsibility per file
- Clear, descriptive file names (e.g., `contract-distribution.ts` not `helper.ts`)
- Group related functionality (workflows together, notifications together)
- Avoid monolithic files

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint validation
npm run format:check # Prettier formatting check
```

Fix ALL errors/warnings before continuing.

**If changes require server restart (not hot-reloadable):**
1. Restart: `npm run dev`
2. Read server output/logs
3. Fix ALL warnings/errors before continuing

**Database changes:**
```bash
npm run db:push      # Push schema changes
npm run db:generate  # Regenerate Prisma client
```
