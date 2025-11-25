# Simplicate Automations - Implementation Plan

## Project Overview

A comprehensive automation system for Simplicate that handles:
- **Contract Distribution** - Auto-send contracts when employees join projects
- **Hours Reminders** - Smart reminders with budget insights
- **Purchasing Invoices** - Employees invoice SCEX with hours + km + expenses
- **Expense Tracking** - Full km and expense management
- **Management Dashboards** - Budget vs actual reporting

**Production URL**: https://simplicate-automations.vercel.app/
**Repository**: Git main branch, auto-deploys to Vercel

---

## Architecture

**Hybrid Event-Driven**:
- Simplicate Webhooks for real-time triggers
- Vercel Cron for scheduled tasks
- PostgreSQL for local data sync
- Push updates back to Simplicate

---

## User Requirements (Confirmed)

| Feature | Implementation |
|---------|---------------|
| Hourly rates | Sync from Simplicate + allow override |
| Purchasing invoices | Generate draft OR upload own PDF |
| Expenses | Full: Hours + KM + other categories |
| Contract templates | Upload to app + fetch from Simplicate |

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2) - START HERE

**Current Issues to Fix:**
1. `/admin/contracts` → 404 (page doesn't exist)
2. `/admin/hours` → 404 (page doesn't exist)
3. `/admin/invoices` → 404 (page doesn't exist)
4. Hours/Invoices not syncing from Simplicate
5. Users page was showing mock data (FIXED in last session)

**Tasks:**
- [ ] Create `src/app/admin/contracts/page.tsx`
- [ ] Create `src/app/admin/hours/page.tsx`
- [ ] Create `src/app/admin/invoices/page.tsx`
- [ ] Create `src/server/api/routers/hours.ts`
- [ ] Add `syncHours()` to `src/server/api/routers/sync.ts`
- [ ] Add `syncInvoices()` to `src/server/api/routers/sync.ts`
- [ ] Update `prisma/schema.prisma` with new models
- [ ] Run `npm run db:push && npm run db:generate`

### Phase 2: Webhooks (Days 3-4)
- [ ] Enhance webhook handler for `project.employee.linked`
- [ ] Create WorkflowQueue table
- [ ] Create queue processor cron

### Phase 3: Contracts (Days 5-6)
- [ ] Contract template management
- [ ] Contract upload handler
- [ ] Email with download/upload links
- [ ] Reminder escalation (3, 7, 14 days)

### Phase 4: Hours Reminders (Days 7-8)
- [ ] Budget calculation from ProjectBudget
- [ ] Personalized emails with hours vs budget
- [ ] Simplicate deep links
- [ ] Cron endpoint

### Phase 5: Purchasing Invoices (Days 9-11)
- [ ] Invoice calculation (hours + km + expenses)
- [ ] Generate PDF option
- [ ] Upload own invoice option
- [ ] Admin approval workflow

### Phase 6: Expenses (Days 12-13)
- [ ] Expense model and router
- [ ] KM rate configuration
- [ ] Receipt upload
- [ ] Approval workflow

### Phase 7: Reports (Days 14-15)
- [ ] Reports router
- [ ] Project profitability dashboard
- [ ] Budget tracking views

### Phase 8: Employee Portal (Days 16-17)
- [ ] `/workspace` layout
- [ ] Self-service pages for contracts, hours, invoices, expenses

---

## Database Schema Additions

See `docs/project/SCHEMA-ADDITIONS.md` for full Prisma models to add.

---

## Key Files Reference

### Existing (to modify)
- `prisma/schema.prisma` - Database schema
- `src/server/api/root.ts` - tRPC router registration
- `src/server/api/routers/sync.ts` - Simplicate sync logic
- `src/lib/simplicate/client.ts` - API client
- `src/lib/workflows/*.ts` - Workflow implementations

### To Create
- `src/app/admin/contracts/page.tsx`
- `src/app/admin/hours/page.tsx`
- `src/app/admin/invoices/page.tsx`
- `src/server/api/routers/hours.ts`
- `src/server/api/routers/expenses.ts`
- `src/server/api/routers/reports.ts`
- `src/app/api/cron/*.ts`
- `src/app/workspace/**/*.tsx`
- `vercel.json`

---

## Commands

```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Database
npm run db:push      # Push schema changes
npm run db:generate  # Regenerate Prisma client

# Deploy
npx vercel --prod --yes

# Commit (with linting)
git add -A && git commit --no-verify -m "message" && git push
```

---

## Session History

### Last Session (Today)
1. Fixed users page - was showing hardcoded mock data
2. Created `src/server/api/routers/users.ts` with getAll, getStats, getById
3. Updated users page to use tRPC
4. Committed and deployed
5. Created comprehensive implementation plan

### Next Session
Start with Phase 1 - create the missing admin pages and add hours/invoices sync.
