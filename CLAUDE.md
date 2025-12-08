# Simplicate Automations

Production-ready automation system for Simplicate: contract distribution, hours reminders, invoice generation with full financial tracking (revenue/cost/margin).

**Production**: https://simplicate-automations.vercel.app/ | **Stack**: Next.js 16 + tRPC + Prisma + PostgreSQL

## Documentation

See `docs/project/` for implementation details: `IMPLEMENTATION-PLAN.md`, `FINANCIAL-TRACKING-PLAN.md`, `INBOUND-EMAIL-PLAN.md`, `MILEAGE-TRACKING-PLAN.md`

## Project Structure

```
src/
├── app/                          # Next.js pages
│   ├── admin/                    # Admin dashboard (dashboard, projects, hours, invoices, contracts, workflows, automation, email, financials, rates, portal, help)
│   ├── api/                      # API routes (trpc, webhooks, cron, email/inbound)
│   └── portal/[token]/           # Employee self-service portal
├── server/api/routers/           # 18 tRPC routers (sync, projects, hours, invoices, contracts, workflows, automation, rates, financials, etc.)
├── lib/                          # Business logic (simplicate client, workflows, rates resolver, notifications, email service)
├── components/                   # React components (ui/, admin/)
└── prisma/schema.prisma          # 27 models (User, Project, Hours, Invoice, Contract, WorkflowQueue, InboundEmail, etc.)
```

## Code Quality - Zero Tolerance

After editing ANY file, run these commands and fix ALL errors:

```bash
# 1. Type check (CRITICAL - run after every edit)
npm run typecheck

# 2. Lint
npm run lint

# 3. Format check
npm run format:check

# If build required (API/schema changes)
npm run build
```

## Key Commands

```bash
npm run dev                        # Start dev server (Turbopack)
npm run typecheck                  # Type check (REQUIRED after edits)
npm run db:push                    # Push schema changes
npm run db:generate                # Regenerate Prisma client
npx vercel --prod --yes            # Deploy to production
git commit --no-verify -m "msg"    # Commit (skip pre-commit hooks if needed)
```

## Organization Rules

- **API routes** → `src/server/api/routers/` (one router per domain: sync.ts, hours.ts, invoices.ts, etc.)
- **Business logic** → `src/lib/` (workflows/, rates/, notifications/, simplicate/)
- **UI components** → `src/components/` (ui/ for shadcn, admin/ for custom)
- **Pages** → `src/app/admin/` (one folder per feature)
- **One responsibility per file** - keep files focused and modular

## Testing Rules

- **ONLY use willem@scex.nl for email testing** - Never send to other addresses
- Willem's user ID: `cmiigv6fp000cjp045dym3457`
- Test email: `curl -X POST "https://simplicate-automations.vercel.app/api/trpc/hoursReport.sendReport" -H "Content-Type: application/json" -d '{"json":{"employeeId":"cmiigv6fp000cjp045dym3457","month":"2025-11"}}'`

## Simplicate API (client.ts)

**Endpoints**: getProjects, getEmployees, getHours, getAllHours, getInvoices, getServices, getMileage, getDocuments, getTimetables, createWebhook
**Filtering**: `q[project_id]=xxx`, `q[start_date][ge]=2024-01-01`, `offset=0&limit=100`

## Workflow Architecture

1. **Trigger**: Webhook (Simplicate) / Cron (Vercel) / Manual
2. **Queue**: WorkflowQueue table → `/api/cron/process-queue` (runs every minute)
3. **Execute**: `src/lib/workflows/*.ts` logic
4. **Log**: AutomationLog table
5. **Notify**: Resend (email) + Slack (optional)

## Financial Tracking (Phases 0-3 COMPLETE)

- **Rate hierarchy**: Service-employee > Project-member > User override > User default > Simplicate
- **Calculations**: revenue (hours × salesRate), cost (hours × costRate), margin (revenue - cost)
- **Status**: Hours sync with financials ✅ | Financial dashboard (Phase 4) 🚧 | Mileage tracking (planned)

## Environment Variables (Vercel)

`DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `SIMPLICATE_API_KEY`, `SIMPLICATE_API_SECRET`, `SIMPLICATE_DOMAIN`, `ANTHROPIC_API_KEY`

## Useful URLs

- **Settings/Sync**: /admin/settings
- **Hours**: /admin/hours
- **Invoices**: /admin/invoices
- **Email Inbox**: /admin/email/inbox
- **Portal Links**: /admin/portal
- **Help (Dutch)**: /admin/help
