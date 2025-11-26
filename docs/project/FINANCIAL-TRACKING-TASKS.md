# Financial Tracking - Task Progress

## Current Status: Phase 1 - Schema & Sync

---

### Phase 0: Bug Fix - Hours Sync Date Parsing - COMPLETE
- [x] Fix date parsing in syncHours() to handle edge cases
- [x] Deploy fix to production
- [ ] Re-sync hours to fix affected entries (can do after schema changes)

---

### Phase 1: Schema Extensions & Employee Sync
- [x] Add EmployeeType enum
- [x] Add User model financial fields
- [x] Extend ProjectMember model (salesRate, costRate)
- [x] Extend HoursEntry model (salesRate, costRate, revenue, cost, margin, rateSource, purchaseInvoiceId)
- [x] Add ProjectService hourTypeTariffs field
- [x] Create ServiceEmployeeRate model
- [x] Update SimplicateEmployee interface (hourly_sales_tariff, hourly_cost_tariff, type)
- [x] Update syncEmployees() for rate fields
- [x] Run db:push and verify
- [ ] Test employee sync with rate data
- [ ] Re-sync hours to populate salesRate from tariff

---

### Phase 2: Rate Resolution System
- [ ] Create src/lib/rates/resolver.ts
- [ ] Create rates router
- [ ] Add RateAuditLog model
- [ ] Implement resolveEffectiveRates()
- [ ] Add purchase rate calculation
- [ ] Test rate hierarchy

---

### Phase 3: Enhanced Hours Sync
- [ ] Update syncHours() for tariff fields
- [ ] Calculate revenue/cost/margin on sync
- [ ] Store rateSource
- [ ] Update syncServices() for hourTypeTariffs
- [ ] Test full sync cycle

---

### Phase 4: Financial Dashboard
- [ ] Create financials router
- [ ] Create /admin/financials page
- [ ] Implement summary stats
- [ ] Implement drill-down table
- [ ] Add filters
- [ ] Register router in root.ts

---

### Phase 5: Hours Page Enhancement
- [ ] Add Rate column
- [ ] Add Revenue column
- [ ] Add service/project subtotals
- [ ] Add billable filter

---

### Phase 6-8: Advanced Features
- [ ] Employee financial view
- [ ] Invoice matching
- [ ] Rate management UI

---

## Completed
(Move completed tasks here with date)

---

## Notes
(Add implementation notes, blockers, decisions here)
