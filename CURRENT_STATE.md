# Note to Self
Fix other budget head
Fix carryforward



# CURRENT STATE
Developing
## Project
Personal Budget App

## Status
Development

## Current Milestone
Monthly budget dashboard

## Completed

- [x] Project created
- [x] Next.js configured
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [x] ESLint configured
- [x] App Router configured
- [x] Supabase project created
- [x] Supabase packages installed
- [x] Environment variables configured
- [x] Supabase browser client created
- [x] Supabase server client created
- [x] Supabase connected
- [x] Database schema created
- [x] Row Level Security enabled
- [x] Database indexes created
- [x] Database policies created
- [x] Database connection tested
- [x] Basic application connection test created
- [x] Supabase authentication configured
- [x] Private user created
- [x] Login page implemented
- [x] Password authentication tested
- [x] Protected dashboard implemented
- [x] Authentication session protection implemented
- [x] Unauthenticated dashboard access tested
- [x] Temporary Supabase connection test removed/replaced
- [x] Login page confirmed working after replacement
- [x] Protected dashboard confirmed working after replacement
- [x] Initial budget heads seeded through the application
- [x] Initial budget-head persistence verified
- [x] Budget heads stored in Supabase
- [x] Budget head categories confirmed editable/data-driven
- [x] Centralized financial calculation engine created
- [x] Spending pool calculation implemented
- [x] Daily budget calculation implemented
- [x] Transfer validation implemented
- [x] Carry-forward calculation implemented
- [x] Automated calculation tests created
- [x] All 14 calculation tests passing
- [x] Committed allocation calculation centralized
- [x] Fixed Expense / Investment / Saving classification implemented
- [x] Other heads excluded from committed allocation
- [x] Calculation test suite expanded to 17 passing tests
- [x] Dashboard verified after calculation-engine update
- [x] Monthly summary breakdown implemented
- [x] Fixed Expenses / Investments / Savings displayed separately
- [x] Spending Pool and Daily Budget verified
- [x] Dashboard summary verified after UI update
- [x] Dashboard loads the latest saved monthly budget
- [x] August 2026 remains correctly loaded after dynamic month selection
- [x] Daily budget now derives calendar days from the loaded month
- [x] Dashboard verified after month-loading change
- [x] Dashboard summary redesigned into primary metrics + horizontal committed breakdown
- [x] Salary, Spending Pool, and Daily Budget shown as primary cards
- [x] Committed total shown with Fixed Expenses, Investments, and Savings breakdown
- [x] Dashboard layout verified
- [x] 18 calculation tests passing
- [x] Salary editing implemented for the active monthly budget
- [x] Salary update persisted to Supabase
- [x] Spending Pool recalculates after salary change
- [x] Daily Budget recalculates after salary change
- [x] Salary persistence verified after page reload
- [x] Salary restored to ₹31,500
- [x] 18 calculation tests passing
- [x] Final database verification completed
- [x] Dashboard values match database values
- [x] Task #8 complete
- [x] Monthly budget-head allocation editing implemented
- [x] Monthly allocation changes persist to Supabase
- [x] Allocation changes recalculate Committed
- [x] Allocation changes recalculate Spending Pool
- [x] Allocation changes recalculate Daily Budget
- [x] Historical monthly snapshot is updated rather than reusable budget-head defaults
- [x] Budget-head editing verified
- [x] 18 calculation tests passing
- [x] Paid / Used editing implemented
- [x] Paid / Used changes persist to Supabase
- [x] Remaining balance recalculates from Paid / Used
- [x] Paid / Used cannot exceed allocation
- [x] Paid / Used editing verified
- [x] 18 calculation tests passing
- [x] Transfer UI implemented
- [x] Transfers persist to Supabase
- [x] Source balance decreases after transfer
- [x] Destination balance increases after transfer
- [x] Transfer amount validation verified
- [x] Self-transfer prevention verified
- [x] Transfer persistence verified
- [x] 18 calculation tests passing
- [x] Automatic monthly carry-forward implemented
- [x] Previous month's final balances are used to initialize the next month's carry-forward
- [x] Carry-forward accounts for paid/used amounts and transfers
- [x] Existing historical months are preserved
- [x] Carry-forward verified with Electricity test case: ₹3,000 allocation, ₹425 paid/used, ₹2,575 carried forward
- [x] September 2026 recreated and verified with ₹2,575 Electricity carry-forward and ₹5,575 total available
- [x] Mandatory functional test cases completed
- [x] Transfer + carry-forward test passed
- [x] No-transfer carry-forward test passed
- [x] Carry-forward + Paid/Used test passed
- [x] Multiple-transfer test passed
- [x] Historical month isolation verified
- [x] Transfer validation verified
- [x] Data persistence verified
- [x] Month navigation verified
- [x] Budget-head ordering verified

## Database Structure

### budget_heads
Stores reusable, editable budget-head configuration.

### monthly_budgets
Stores month-level information including salary.

### monthly_budget_heads
Stores historical monthly snapshots of budget heads.

### transfers
Stores individual transfers between budget heads.

## Files Created / Changed
### Authentication
- src/app/page.tsx
- src/app/dashboard/page.tsx
- src/lib/supabase/proxy.ts
- proxy.ts
### Project
- package.json
- package-lock.json
- Next.js configuration files
- TypeScript configuration files

### Supabase
- .env.local
- src/lib/supabase/client.ts
- src/lib/supabase/server.ts

### Application
- src/app/page.tsx

### Project Documentation
- PROJECT_SPEC.md
- CURRENT_STATE.md
- AI_INSTRUCTIONS.md

## Currently Working On
Preparing the application for Step 14: mobile UI.

## Budget Configuration & Navigation — Implementation Plan

### Step 1 — Home Page + Navigation
- Create authenticated Home page
- After login, route user to Home
- Provide Dashboard option
- Provide Customize Budget option
- Provide Logout option
- Allow Dashboard → Home
- Allow Customize Budget → Home

### Step 2 — Budget-Head CRUD Server Actions
- Add budget head
- Edit budget head name
- Edit budget head type
- Edit default monthly allocation
- Deactivate budget head
- Preserve historical records

### Step 3 — Customize Budget UI
- Create dedicated Customize Budget page
- Display all active budget heads
- Add "+ Add Budget Head"
- Add Edit controls
- Add Deactivate controls
- Support mobile layout

### Step 4 — Connect New Heads to Future Monthly Budgets
- New active heads appear in future months
- Updated allocations apply to future months
- Deactivated heads do not appear in newly created months
- Existing monthly records remain unchanged

### Step 5 — Verify Historical Months Aren't Altered
- Test allocation changes
- Test name changes
- Test type changes
- Test deactivation
- Test newly added heads
- Confirm historical monthly snapshots remain intact

### Step 6 — Logout + Navigation Testing
- Test login → Home
- Test Home → Dashboard
- Test Home → Customize Budget
- Test Dashboard → Home
- Test Customize Budget → Home
- Test Logout → Login
- Test protected routes while logged out

### Step 7 — Production Build
- Run `npm run build`
- Fix all TypeScript/build errors
- Confirm production build succeeds

### Step 8 — Update Project Documentation
- Update CURRENT_STATE.md
- Update project checklist
- Record completed functionality
- Record remaining issues
- Confirm implementation status

## Next Task

1. Configure Supabase authentication. 🟢
2. Create private login page. 🟢
3. Protect the application from unauthenticated users. 🟢
4. Verify authenticated database access. 🟢
5. Remove/replace the temporary Supabase connection test. 🟢
6. Seed initial budget heads through the application. 🟢
7. Build centralized financial calculation logic. 🟢
8. Build the monthly budget dashboard. 🟢
9. Build budget-head editing. 🟢
10. Build paid/used functionality. 🟢
11. Build transfer functionality. 🟢
12. Build automatic carry-forward. 🟢
13. Build monthly navigation. 🟢
14. Build mobile UI. 🟢
15. Run mandatory functional test cases from PROJECT_SPEC.md. 🟢
16. Deploy. 🟢

## Known Issues

- The current login page is functional but is still a basic implementation.
- The dashboard is currently only a placeholder.
- No budget data has been seeded yet.
- No production budget UI has been built yet.

## Decisions

- Single private user
- One web application
- Persistent Supabase/PostgreSQL database
- Budget heads are editable
- Historical monthly data must never be overwritten
- Transfers are stored as individual records
- No detailed expense tracker
- Carry-forward is automatic
- Current budget values are initial data, not hard-coded rules
- Budget categories are not hard-locked
- Inactive budget heads retain historical records
- Financial calculations will be centralized in application business logic
- Row Level Security is enabled for database protection

## Important Constraints

- Do not hard-code budget heads.
- Do not hard-code salary.
- Do not hard-code current allocations.
- Do not hard-code the spending pool.
- Do not hard-code the daily budget.
- Do not use spreadsheet-style cell logic.
- Do not destroy historical records when configuration changes.
- Do not allow transfers greater than available balance.
- Do not expose personal financial data publicly.
- Do not expose Supabase service-role credentials.
- Do not build a detailed expense tracker.
- Do not introduce unnecessary features before the core budgeting system is stable.
