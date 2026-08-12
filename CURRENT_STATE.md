# BUDGET TRACKER — CURRENT STATE

> **New-chat continuation trigger:** Say **“Continue Budget Tracker.”**
>
> Use this document as the handoff point. Do not restart completed work or ask the user to re-explain the project unless the required detail is genuinely missing.

---

# 1. PROJECT

**Personal Budget App / Budget Tracker**

## Stack

- Next.js 16.3.0
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Vercel
- Git/GitHub

## Current Status

**Stable development state. Core budgeting, multi-user auth, navigation UX, and loading UX are working. Production build passes.**

---

# 2. COMPLETED CORE FUNCTIONALITY

- [x] Next.js / TypeScript / Tailwind / App Router setup
- [x] Supabase connected
- [x] Database schema and indexes
- [x] Row Level Security
- [x] Authentication
- [x] Login
- [x] Protected routes
- [x] Multiple authenticated users
- [x] User-specific budgets
- [x] User-specific budget heads
- [x] User-specific monthly budgets
- [x] User-specific monthly budget heads
- [x] User-specific transfers
- [x] Centralized financial calculation engine
- [x] Spending Pool
- [x] Daily Budget
- [x] Committed allocation
- [x] Fixed Expense / Investment / Saving classification
- [x] Paid / Used editing
- [x] Allocation editing
- [x] Transfers
- [x] Manual Push Remaining / one-month carry-forward behavior
- [x] Monthly navigation
- [x] Historical months
- [x] Future months
- [x] Salary editing
- [x] Home page
- [x] Customize Budget page
- [x] Logout
- [x] Personalized navigation/loading UX
- [x] Production build verification

Calculation tests reached 18 passing tests during development.

---

# 3. MULTI-USER SUPPORT

The application is now a true multi-user application.

Each authenticated user has independent:

- Budget heads
- Monthly budgets
- Monthly budget heads
- Transfers
- Carry-forward data
- Budget configuration

New users start with a blank budget configuration.

A previous bug caused a new user to inherit/show ₹31,500 salary. This was fixed.

New users now correctly start with:

```text
Salary = ₹0
```

Database isolation is enforced with RLS policies using:

```sql
auth.uid() = user_id
```

Never expose one user's financial data to another user.

---

# 4. DATABASE

## `budget_heads`

Reusable user-specific budget-head configuration.

## `monthly_budgets`

Month-level records including salary.

## `monthly_budget_heads`

Historical monthly snapshots containing allocation, carry-forward and paid/used amounts.

## `transfers`

Individual transfers between budget heads.

All user-owned records must remain isolated by `user_id`.

---

# 5. DASHBOARD

The dashboard currently supports:

- Salary
- Spending Pool
- Daily Budget
- Committed total
- Fixed Expenses breakdown
- Investments breakdown
- Savings breakdown
- Budget-head listing
- Monthly allocation editing
- Paid/Used editing
- Remaining balance
- Transfers
- Manual Push Remaining
- Month navigation
- Historical months
- Future months

Financial values are database-driven.

**Do not hard-code salary, allocations, Spending Pool or Daily Budget.**

---

# 6. HISTORICAL MONTH FIX — COMPLETE

Historical months such as July 2026 previously failed with:

```text
No budget exists for this historical month.
```

An attempted fix then produced:

```text
Past months cannot be initialized automatically.
```

The correct behavior is now implemented:

- Existing historical months load normally.
- Historical months are not automatically initialized.
- Current/future initialization remains allowed.
- Historical monthly snapshots remain protected.

This is currently working.

---

# 7. MANUAL CARRY-FORWARD / PUSH

The current model is manual.

Rules:

- User explicitly presses Push Remaining.
- Only the immediately following month receives the pushed amount.
- It does not automatically cascade.
- Original historical allocation/payment history remains intact.
- Duplicate pushes must not duplicate the same remaining amount.
- Existing transfer functionality remains separate.

---

# 8. HOME / NAVIGATION

Current route flow:

```text
Login
  ↓
Home
  ├── Dashboard
  ├── Customize Budget
  └── Logout
```

Supported navigation:

- Login → Home
- Home → Dashboard
- Home → Customize Budget
- Dashboard → Home
- Customize Budget → Home
- Logout → Login

---

# 9. CURRENT NAVIGATION / LOADING UX — APPROVED

Phase 1 navigation/loading UX is complete and currently approved.

Each route has a personalized loading experience.

## Login → Home

```text
Welcome back
Opening your budget...
```

## Home → Dashboard

```text
Opening your budget
Getting everything ready...
```

## Home → Customize Budget

```text
Preparing your budget
Opening your budget settings...
```

## Dashboard → Home

```text
Returning home
Taking you back to your budget hub...
```

## Customize Budget → Home

```text
Returning home
Taking you back to your budget hub...
```

## Logout → Login

```text
See you soon
Signing you out securely...
```

Visual theme:

- Light blue background
- Baby-pink cards/borders
- Navy text
- Animated dots / subtle icon animation

**Do not redesign this unless explicitly requested.**

---

# 10. INTENTIONAL 2-SECOND TRANSITION

The intentional transition delay is currently **2 seconds**.

Two places contain the actual 2000ms delay.

## `src/app/page.tsx`

Login → Home:

```tsx
setTimeout(() => {
  router.push("/home");
  router.refresh();
}, 2000);
```

## `src/components/PageTransition.tsx`

Reusable navigation transitions contain the 2-second delay.

If changing from 2 seconds to 1.5 seconds, change:

```text
2000 → 1500
```

in:

1. `src/app/page.tsx`
2. `src/components/PageTransition.tsx`

The `loading.tsx` files do not control this intentional delay.

### Important

This delay is UX only.

It does **not** reduce the actual database/server loading time.

---

# 11. MONTH NAVIGATOR — APPROVED STATE

File:

```text
src/app/dashboard/MonthNavigator.tsx
```

The current appearance is correct and must be preserved.

It has:

- Previous month arrow
- Month selector
- Year selector
- Next month arrow
- Button press/hover feedback
- Disabled state during navigation
- Baby-pink `Updating budget` pill
- Animated dots

The important implementation detail:

The `Updating budget` pill is **absolutely positioned** and therefore does not consume layout space.

This fixed a previous issue where the dashboard content was pushed downward.

## Approved layout behavior

The `Updating budget` indicator:

- Remains in the same pixel band as the top Home / Push controls.
- Does not push the month selectors downward.
- Does not push the dashboard content downward.
- Uses the existing baby-pink theme.
- Should not alter the arrow buttons' existing appearance.

**Do not change the MonthNavigator geometry casually.**

---

# 12. PERFORMANCE — CURRENT DECISION

The user tested the current cloud application and decided that month switching is **good enough for now**.

No performance optimization is currently required.

A performance improvement was proposed but deliberately skipped.

## Saved trigger

Say:

```text
Improve Budget Tracker Performance
```

and return the following exact deferred change.

### File

```text
src/app/dashboard/page.tsx
```

### Current issue

The `monthly_budget_heads` and `transfers` Supabase queries execute sequentially.

They can be fetched concurrently using `Promise.all`.

### Deferred replacement

```tsx
const [
  monthlyHeadsResult,
  transfersResult,
] = await Promise.all([
  supabase
    .from("monthly_budget_heads")
    .select(`
      id,
      budget_head_id,
      allocated_amount,
      carry_forward,
      paid_amount,
      budget_heads (
        name,
        head_type
      )
    `)
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudget.id
    )
    .order("created_at", {
      ascending: true,
    }),

  supabase
    .from("transfers")
    .select(
      "id, source_monthly_head_id, destination_monthly_head_id, amount, created_at"
    )
    .eq("user_id", user.id)
    .eq(
      "monthly_budget_id",
      monthlyBudget.id
    )
    .order("created_at", {
      ascending: false,
    }),
]);

const {
  data: monthlyHeads,
  error: monthlyHeadsError,
} =
  monthlyHeadsResult;

if (monthlyHeadsError) {
  throw new Error(
    monthlyHeadsError.message
  );
}

const {
  data: transfers,
  error: transfersError
} =
  transfersResult;

if (transfersError) {
  throw new Error(
    transfersError.message
  );
}
```

**Do not apply this automatically.**

Only return this change when the user asks for:

> **Improve Budget Tracker Performance**

---

# 13. CURRENT FILE MAP

## Login / Auth

```text
src/app/page.tsx
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/proxy.ts
proxy.ts
```

## Home

```text
src/app/home/page.tsx
src/app/home/LogoutButton.tsx
```

## Dashboard

```text
src/app/dashboard/page.tsx
src/app/dashboard/actions.ts
src/app/dashboard/MonthNavigator.tsx
src/app/dashboard/HomeButton.tsx
src/app/dashboard/loading.tsx
```

## Customize Budget

```text
src/app/customize-budget/page.tsx
src/app/customize-budget/HomeButton.tsx
src/app/customize-budget/loading.tsx
```

## Shared transition

```text
src/components/PageTransition.tsx
```

## Documentation

```text
PROJECT_SPEC.md
CURRENT_STATE.md
AI_INSTRUCTIONS.md
```

---

# 14. GIT / DEPLOYMENT

The project uses:

```text
main
origin/main
```

Normal workflow:

```powershell
git status
git add ...
git commit -m "..."
git push origin main
```

### PowerShell note

Do **not** use `&` as a command separator.

Use separate commands:

```powershell
git add ...
git commit -m "..."
git push origin main
```

Production build:

```powershell
npm run build
```

The build passed successfully after the latest navigation/loading changes.

---

# 15. LOCAL VS CLOUD DATABASE BEHAVIOR

Important distinction:

### Local code changes

Changing code locally does **not** modify the cloud database.

### Supabase dashboard changes

Creating users or modifying database records through the Supabase dashboard changes the cloud database immediately, even if local code has not been pushed.

### Code deployment

Local code reaches the Vercel cloud application after:

```text
Local code
  ↓
Git commit
  ↓
Git push
  ↓
Vercel deployment
  ↓
Cloud application
```

---

# 16. RECENT RESOLVED ISSUES

## New-user salary

### Problem

New users could show ₹31,500 instead of ₹0.

### Resolution

New users now start with:

```text
₹0
```

### Status

**RESOLVED**

---

## Historical month loading

### Problem

Historical months such as July 2026 showed:

```text
No budget exists for this historical month.
```

Then an attempted fix produced:

```text
Past months cannot be initialized automatically.
```

### Resolution

Existing historical months are now loaded normally.

Historical months are not automatically initialized.

### Status

**RESOLVED**

---

## MonthNavigator vertical displacement

### Problem

The new `Updating budget` indicator was inserted into normal layout flow and pushed the dashboard down.

### Resolution

The indicator is now absolutely positioned and does not consume layout space.

### Status

**RESOLVED**

---

## Login build syntax error

### Problem

`src/app/page.tsx` was missing a closing `}` for `handleLogin()`.

### Resolution

The file was corrected.

```text
npm run build
```

now passes.

### Status

**RESOLVED**

---

# 17. CURRENT APPROVED UX

The following areas are explicitly considered correct:

- MonthNavigator
- Updating budget pill
- Home → Dashboard transition
- Personalized route loading screens
- 2-second intentional transition
- Baby-pink theme
- Light-blue background
- Current dashboard spacing
- Existing arrow button appearance
- Current page positioning

**Do not redesign these areas unless the user explicitly requests it.**

---

# 18. CURRENT PROJECT STATUS

```text
Authentication                 COMPLETE
Multi-user support             COMPLETE
RLS isolation                  COMPLETE
Home                           COMPLETE
Dashboard                      COMPLETE
Customize Budget               COMPLETE
Monthly navigation             COMPLETE
Manual carry-forward           COMPLETE
Navigation UX                  COMPLETE
Loading UX                     COMPLETE
Production build               PASSING
Performance optimization       DEFERRED
```

Current month switching is considered responsive enough.

Do not optimize or redesign stable areas without explicit instruction.

---

# 19. FUTURE BACKLOG

Existing ideas:

- Question-mark/help button on each page
- Current Account Balance card
- Bank Account Tracker
- Further budget-head fixes/refinements
- Mobile UI refinements
- Performance optimization if month switching becomes slow
- Production audit

---

# 20. BANK ACCOUNT TRACKER — FUTURE

The Bank Account Tracker is **not implemented yet**.

Intended scope:

### Included

- Fixed Expense
- Investment

### Excluded

- Saving
- Other
- Spending Pool
- Salary

Only actual paid amounts reduce the tracked bank balance.

Concept:

```text
Starting Balance
+ Fixed Expense Allocation
+ Investment Allocation
- Actual Paid Amount
= Ending Balance
```

For subsequent months:

```text
Previous Ending Balance
+ Current Fixed Expense Allocation
+ Current Investment Allocation
- Actual Paid Amount
= Ending Balance
```

Historical months must remain protected.

The detailed Bank Account implementation plan from the previous state document remains a future plan.

---

# 21. HARD CONSTRAINTS

Do not:

- Hard-code salary
- Hard-code budget heads
- Hard-code current allocations
- Hard-code Spending Pool
- Hard-code Daily Budget
- Destroy historical records
- Allow transfers greater than available balance
- Expose another user's financial data
- Expose Supabase service-role credentials
- Introduce unnecessary features before core budgeting is stable

Financial calculations remain centralized in application business logic.

---

# 22. NEW-CHAT HANDOFF

Start a new chat with:

```text
Continue Budget Tracker.
```

This means:

- Continue from this exact project state.
- Use the current code/files as the source of truth.
- Do not restart completed features.
- Do not make the user repeat the project's history.
- Preserve the approved UX unless the user explicitly asks for changes.
- Treat this `CURRENT_STATE.md` as the project handoff document.

## Important trigger 1

```text
Continue Budget Tracker.
```

Meaning:

Continue from the latest known state of the Budget Tracker project, including:

```text
src/app/dashboard/actions.ts
src/app/dashboard/page.tsx
src/app/dashboard/MonthNavigator.tsx
src/app/dashboard/HomeButton.tsx
src/app/dashboard/loading.tsx

src/app/home/page.tsx
src/app/home/LogoutButton.tsx

src/app/customize-budget/page.tsx
src/app/customize-budget/HomeButton.tsx
src/app/customize-budget/loading.tsx

src/app/page.tsx

src/components/PageTransition.tsx

CURRENT_STATE.md
PROJECT_SPEC.md
AI_INSTRUCTIONS.md
```

Do not assume these files are identical to older versions. The latest local/project files are the source of truth.

## Important trigger 2

```text
Improve Budget Tracker Performance
```

Meaning:

Return the deferred `Promise.all()` optimization described in Section 12.

Do not automatically implement it.

---

# 23. CURRENT VERDICT

```text
BUDGET TRACKER — STABLE CURRENT STATE
```

Core multi-user budgeting works.

Navigation/loading UX works.

Production build passes.

Month switching is currently considered sufficiently responsive.

Performance optimization is intentionally deferred.

**Continue from here.**