# Simplicate Automations

Production-ready automation system for Simplicate that handles contract distribution, hours reminders, and purchasing invoice generation with full expense tracking.

**Production URL**: https://simplicate-automations.vercel.app/

## Documentation

**IMPORTANT**: See `docs/project/` for full implementation details:
- `IMPLEMENTATION-PLAN.md` - Complete 8-phase plan with tasks
- `SCHEMA-ADDITIONS.md` - Database models to add
- `CONTINUATION-PROMPT.md` - Copy this prompt after clearing context

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

### Next - Phase 3 (Contracts)
- [ ] Contract template management
- [ ] Contract upload handler
- [ ] Email with download/upload links
- [ ] Reminder escalation (3, 7, 14 days)

### Upcoming Phases
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
│   ├── contracts/        # Contract management
│   ├── hours/            # Hours tracking
│   └── invoices/         # Invoice management
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
