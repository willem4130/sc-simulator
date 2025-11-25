# Simplicate Automations

Production-ready automation system for Simplicate that handles contract distribution, hours reminders, and purchasing invoice generation with full expense tracking.

**Production URL**: https://simplicate-automations.vercel.app/

## Documentation

**IMPORTANT**: See `docs/project/` for full implementation details:
- `IMPLEMENTATION-PLAN.md` - Complete 8-phase plan with tasks
- `SCHEMA-ADDITIONS.md` - Database models to add
- `CONTINUATION-PROMPT.md` - Copy this prompt after clearing context

## Current Status

### Completed
- Simplicate sync (projects + employees)
- Settings page with sync buttons
- Workflows page UI with project selection
- Users page (real data from DB)
- WorkflowConfig model and router
- Dashboard with stats

### In Progress - Phase 1 (Foundation)
- [ ] Create `/admin/contracts` page (currently 404)
- [ ] Create `/admin/hours` page (currently 404)
- [ ] Create `/admin/invoices` page (currently 404)
- [ ] Add `syncHours()` mutation
- [ ] Add `syncInvoices()` mutation
- [ ] Add new database models (see docs/project/SCHEMA-ADDITIONS.md)

### Upcoming Phases
- Phase 2: Webhook infrastructure
- Phase 3: Contract distribution workflow
- Phase 4: Hours reminders with budget insights
- Phase 5: Purchasing invoices (hours + km + expenses)
- Phase 6: Expense tracking
- Phase 7: Management dashboards
- Phase 8: Employee self-service portal

## Project Structure

```
src/
├── app/admin/
│   ├── dashboard/        # Main dashboard
│   ├── projects/         # Project management
│   ├── workflows/        # Workflow configuration
│   ├── automation/       # Automation logs
│   ├── users/            # User management
│   ├── settings/         # App settings + Simplicate sync
│   ├── contracts/        # TODO: Create this
│   ├── hours/            # TODO: Create this
│   └── invoices/         # TODO: Create this
├── server/api/routers/
│   ├── sync.ts           # Simplicate sync (projects, employees)
│   ├── projects.ts       # Project CRUD
│   ├── workflows.ts      # Workflow config
│   ├── automation.ts     # Automation logs
│   ├── users.ts          # User management
│   ├── contracts.ts      # Contract queries
│   ├── dashboard.ts      # Dashboard stats
│   └── settings.ts       # App settings
├── lib/
│   ├── simplicate/       # API client (projects, hours, invoices, docs)
│   ├── workflows/        # Workflow execution logic
│   └── notifications/    # Email (Resend) + Slack
└── prisma/schema.prisma  # Database schema
```

## Key Commands

```bash
# Development
npm run dev

# Type checking (run after ANY edit)
npm run typecheck

# Database changes
npm run db:push        # Push schema
npm run db:generate    # Regenerate Prisma client

# Deploy
npx vercel --prod --yes

# Commit (skip ESLint issues)
git add -A && git commit --no-verify -m "message" && git push
```

## Simplicate API

Client at `src/lib/simplicate/client.ts` supports:
- `getProjects()`, `getProject(id)`, `getProjectEmployees(projectId)`
- `getEmployees()`, `getEmployee(id)`
- `getHours(params)`, `createHours(data)`
- `getInvoices(params)`, `createInvoice(data)`
- `getDocuments(params)`, `uploadDocument(data)`
- `createWebhook(data)`, `getWebhooks()`

## Workflow Architecture

1. **Trigger**: Webhook OR Cron OR Manual
2. **Queue**: WorkflowQueue table (database-backed)
3. **Execute**: Workflow logic in `src/lib/workflows/*.ts`
4. **Log**: AutomationLog table tracks all executions
5. **Notify**: Email via Resend, optionally Slack

## Code Quality Rules

- Always run `npm run typecheck` after editing
- Use existing patterns from similar files
- One router per domain
- Commit after each working feature
- Deploy to verify production works
