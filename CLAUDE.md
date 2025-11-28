# Simplicate Automations

Production-ready automation system for Simplicate that handles contract distribution, hours reminders, and purchasing invoice generation with full expense tracking.

**Production URL**: https://simplicate-automations.vercel.app/

## Documentation

**IMPORTANT**: See `docs/project/` for full implementation details:
- `IMPLEMENTATION-PLAN.md` - Complete 8-phase plan with tasks
- `SCHEMA-ADDITIONS.md` - Database models to add
- `CONTINUATION-PROMPT.md` - Copy this prompt after clearing context
- `FINANCIAL-TRACKING-PLAN.md` - Financial tracking system (revenue/costs/margins)
- `FINANCIAL-TRACKING-TASKS.md` - Financial tracking task progress

## Current Status

### Phase 1 - COMPLETE
- Simplicate sync (projects + employees + hours + invoices) with pagination
- Settings page with sync buttons
- Workflows page UI with project selection
- Users page (real data from DB)
- WorkflowConfig model and router
- Dashboard with stats
- `/admin/contracts` page with status filtering
- `/admin/hours` page - redesigned with project/client focus, filtering, sorting, monthly breakdown
- `/admin/invoices` page with sync button and stats
- New database models: ProjectMember, ProjectBudget, Expense, PurchasingInvoice, ContractTemplate, WorkflowQueue
- New routers: hours.ts, invoices.ts

### Phase 2 - COMPLETE
- [x] `project.employee.linked` webhook handler
- [x] Queue processor cron at `/api/cron/process-queue`
- [x] Vercel cron configuration (every minute)
- [x] Queue monitor UI on Automation page (tabs: Logs + Queue)
- [x] Queue endpoints: getQueue, getQueueStats, processQueueNow, addTestQueueItem

### Phase 3+ - Financial Tracking (Phases 0-3 COMPLETE)
**Goal**: Track revenue, costs, and margins at project-service-employee level

- [x] Phase 0: Fix hours sync date parsing bug
- [x] Phase 1: Schema extensions + employee rate sync (cost rates from /hrm/timetable)
- [x] Phase 2: Rate override system (resolver.ts, rates router)
- [x] Phase 3: Enhanced hours sync with revenue/cost/margin calculations (425/426 with financials)
- [ ] Phase 4: Financial dashboard (/admin/financials)
- [ ] Phase 5: Hours page enhancements (rate, revenue columns)
- [ ] Phase 6-8: Employee views, invoice matching, rate management UI

**Task tracking**: See `docs/project/FINANCIAL-TRACKING-TASKS.md`

### Phase 4 - Inbound Email & Invoice OCR (COMPLETE)
**Goal**: Automate purchase invoice processing via email with AI OCR

- [x] Database schema (InboundEmail, EmailAttachment models)
- [x] Email classification logic (address, subject, filename, AI fallback)
- [x] Claude Vision invoice OCR integration
- [x] Webhook endpoint (/api/email/inbound)
- [x] tRPC router for email management
- [x] Admin UI (/admin/email/inbox)
- [x] Automatic draft invoice creation from OCR

**Implementation**: See `docs/project/INBOUND-EMAIL-PLAN.md` for full architecture

### Future Phases
- Contract template management
- Hours reminders with budget insights
- SendGrid inbound parse configuration

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
│   ├── contracts/        # Contract management
│   ├── hours/            # Hours tracking
│   ├── invoices/         # Invoice management
│   └── financials/       # Financial dashboard (revenue/costs/margins)
├── server/api/routers/
│   ├── sync.ts           # Simplicate sync (projects, employees, hours, invoices)
│   ├── projects.ts       # Project CRUD
│   ├── workflows.ts      # Workflow config
│   ├── automation.ts     # Automation logs
│   ├── users.ts          # User management
│   ├── contracts.ts      # Contract queries
│   ├── hours.ts          # Hours queries and stats
│   ├── invoices.ts       # Invoice queries and stats
│   ├── dashboard.ts      # Dashboard stats
│   ├── settings.ts       # App settings
│   ├── financials.ts     # Financial queries (planned)
│   └── rates.ts          # Rate overrides CRUD (planned)
├── lib/
│   ├── simplicate/       # API client (projects, hours, invoices, docs)
│   ├── workflows/        # Workflow execution logic
│   ├── rates/            # Rate resolution logic (planned)
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

### Projects
- `getProjects()`, `getProject(id)`, `getProjectEmployees(projectId)`
- `getServices(params)`, `getService(id)` - Project services (diensten)

### HRM
- `getEmployees()`, `getEmployee(id)`

### Hours
- `getHours(params)`, `getAllHours(params)` - With pagination support
- `createHours(data)`
- `getHoursApproval(params)`, `getHoursApprovalStatuses()`
- `getHoursTypes()`

### Invoices
- `getInvoices(params)`, `createInvoice(data)`, `getInvoice(id)`

### Documents
- `getDocuments(params)`, `uploadDocument(data)`, `getDocument(id)`

### Costs & Expenses
- `getCostTypes()`, `getExpenses(params)`
- `getEmployeeExpenses(params)` - From hours module
- `getMileage(params)` - Kilometer registrations

### CRM
- `getOrganizations(params)`, `getOrganization(id)`

### Webhooks
- `createWebhook(data)`, `getWebhooks()`

### API Filtering (Simplicate v2 syntax)
```typescript
// Filter examples for getHours():
q[project_id]=xxx        // Filter by project
q[employee_id]=xxx       // Filter by employee
q[start_date][ge]=2024-01-01  // Date >= (greater or equal)
q[start_date][le]=2024-12-31  // Date <= (less or equal)
offset=0&limit=100       // Pagination
```

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

## Testing Rules

- **ONLY use willem@scex.nl for email testing** - Never send test emails to other addresses
- Willem's user ID: `cmiigv6fp000cjp045dym3457`
- Test email command:
  ```bash
  curl -s -X POST "https://simplicate-automations.vercel.app/api/trpc/hoursReport.sendReport" \
    -H "Content-Type: application/json" \
    -d '{"json":{"employeeId":"cmiigv6fp000cjp045dym3457","month":"2025-11"}}'
  ```

## Environment Variables (Production)

Required in Vercel:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `RESEND_API_KEY` - Email sending (from resend.com)
- `EMAIL_FROM` - Sender email address
- `SIMPLICATE_API_KEY` / `SIMPLICATE_API_SECRET` / `SIMPLICATE_DOMAIN` - Simplicate API access
- `ANTHROPIC_API_KEY` - Claude Vision API for invoice OCR (inbound email processing)

## Useful URLs

- **Production**: https://simplicate-automations.vercel.app/
- **Help (Dutch)**: https://simplicate-automations.vercel.app/admin/help
- **Email Inbox**: https://simplicate-automations.vercel.app/admin/email/inbox
- **Hours Reports**: https://simplicate-automations.vercel.app/admin/email/hours-reports
- **Sent Emails**: https://simplicate-automations.vercel.app/admin/email/sent
- **Settings/Sync**: https://simplicate-automations.vercel.app/admin/settings
- **Portal Links Admin**: https://simplicate-automations.vercel.app/admin/portal
- **Employee Portal**: https://simplicate-automations.vercel.app/portal/[token]
- **Inbound Email Webhook**: https://simplicate-automations.vercel.app/api/email/inbound
