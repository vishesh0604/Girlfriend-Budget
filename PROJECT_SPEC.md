# Working Notes

This section is a running to-do / done list for small changes.
The 50 numbered sections below are the product specification.
CURRENT_STATE.md holds the detailed implementation status.

## Done

- Budget-head allocation edits now reflect on the dashboard and only
  affect the current and future months, never past months.
- Paid / Used is capped at Allocated + carry-forward + moves in, and the
  cap updates as balances change.
- "Pay in full" button on each budget-head card: sets Paid / Used so the
  remaining balance drops to zero.
- Editable Notes field on each budget-head card, saved per head per month.
- Renamed "Transfer" to "Move funds" across the whole app (button, form,
  history section, help text, error messages).
- Tightened the budget-head card layout so the cards are more compact.
- Salary edits now apply to the current month and every later month that
  exists, and never change past months. New future months carry the
  salary forward from the most recent earlier month.
- Confirmation prompts (undo a move, clear a move from a card, deactivate
  or delete a budget head) use the app's own styled dialog instead of the
  browser's native popup.
- Reverse Push now clears the carried-forward amount from whichever month
  it is visible in, so it can be undone from the receiving month, not
  only from the month the push was made.
- Save buttons on the inline editors use the app's blue instead of black.
- Daily Spending Tracker (section 51) is fully built: Fixed Expenses
  rename + third home card; spending categories (seed / add / rename /
  delete); expense logging with the Spending Pool / Spent / Remaining
  summary; a "Month overview" calendar popup; "Move remaining" (split
  freely between next month's pool and any Fixed head, with the Fixed
  head receiving it as a transfer-in that lifts its balance and the
  Current Account Balance without touching allocations); and per-month
  Credits (extra money in an "Activity" feed alongside expenses, shown
  green, added to Available without changing the Spending Pool). Per-day
  and over/under-spending indicators were built then removed at the
  user's request.
- Site-wide top loading strip (RefreshProvider in the root layout) shows
  during any mutation's action + refresh. The Daily Spending header
  actions collapse into a "More" menu on mobile.
- Daily Spending "By category" card has a "View chart" popup: an animated
  donut of the whole spending pool (categories + moved out + remaining)
  with an amount/percentage legend.
- Each spending category can be assigned a colour in Manage categories;
  the colour drives its pie slice and its Activity-list pill.

## To Do

- Show carried-forward money on the Fixed Expenses budget-head card (a
  "Carried over" line, shown only when non-zero, with an inline Undo).
- Update the /home help "?" wording; add a help note for editing a fund
  move; revisit the /dashboard help "?" wording.
- Show carried-forward money on the budget-head card (a "Carried over"
  line, shown only when it is non-zero, with an inline Undo).
- Update the /home help "?" to say the site only accounts for fixed
  monthly expenses, not day-to-day spending.
- Add a help note / undo affordance for editing a fund move.
- Revisit the wording of the /dashboard help "?".

# Personal Budget App — Project Specification

Version: 1.0
Status: Planning
Primary user: One private user
Purpose: Personal monthly budget management

---

# 1. PROJECT PURPOSE

Build a private, personal monthly budgeting web application.

The application is being built specifically for one person (the user's girlfriend).

It is NOT intended to be a public multi-user budgeting platform.

The purpose is to replace a spreadsheet-based monthly budget with a proper web application that:

- remembers all budget information
- remembers monthly history
- remembers actual amounts paid/used
- remembers transfers
- automatically calculates balances
- automatically carries unused balances into future months
- allows budget heads to be added, removed, renamed and edited
- allows allocations to change over time
- preserves historical data when future budget settings change
- works properly on desktop and mobile
- is simple and pleasant to use

The application must be data-driven rather than spreadsheet/cell-driven.

---

# 2. CORE PRINCIPLE

The application must NOT be designed around fixed rows, cells or hard-coded budget categories.

Think in terms of:

Budget Configuration
        ↓
Monthly Budget Record
        ↓
Paid / Used
        ↓
Remaining
        ↓
Transfer
        ↓
Final Balance
        ↓
Next Month Carry Forward

The database is the source of truth.

The UI displays and modifies the database.

Financial calculations must be implemented as application business logic rather than scattered spreadsheet-like formulas.

---

# 3. CURRENT EXAMPLE BUDGET

Current monthly salary:

₹31,500

Current planned allocation:

Fixed expenses:
₹7,350

Investment:
₹5,150

Saving:
₹4,000

Total fixed expenses + investment + saving:

₹16,500

Monthly spending pool:

₹31,500 - ₹16,500 = ₹15,000

Current approximate daily spending target:

₹500/day

These numbers are CURRENT VALUES ONLY.

They must NOT be hard-coded into the application.

The user must be able to edit them.

---

# 4. CURRENT BUDGET HEADS

Current heads:

| Head | Type | Current Monthly Allocation |
|---|---|---:|
| Home Rent | Fixed Expense | ₹1,666 |
| Appliances Rent | Fixed Expense | ₹407 |
| Maid | Fixed Expense | ₹333 |
| Garbage Man | Fixed Expense | ₹83 |
| WiFi | Fixed Expense | ₹166 |
| Electricity | Fixed Expense | ₹3,000 |
| Gym | Fixed Expense | ₹1,500 |
| Apple Plus | Fixed Expense | ₹195 |
| Investment | Investment | ₹5,150 |
| Saving | Saving | ₹4,000 |

These are NOT hard-coded application categories.

They are initial data.

---

# 5. EVERYTHING MUST BE EDITABLE

The user must be able to edit:

- salary
- budget head name
- budget head type
- monthly allocation
- whether a head is active
- future allocations
- budget configuration

The user must NOT need to edit code for normal budget changes.

---

# 6. BUDGET HEADS

A budget head is a reusable budget category.

Example:

Name:
Electricity

Type:
Fixed Expense

Monthly allocation:
₹3,000

Another:

Name:
Emergency Fund

Type:
Saving

Monthly allocation:
₹4,000

The application must not treat Electricity, Saving, Investment, etc. as special hard-coded objects.

They are ordinary budget heads with properties.

Minimum head types:

- Fixed Expense
- Investment
- Saving
- Other

The architecture should allow additional types later.

---

# 7. ADDING A NEW HEAD

There must be an obvious:

"+ Add Budget Head"

action.

Example:

Name:
Netflix

Type:
Fixed Expense

Monthly allocation:
₹649

After saving, Netflix becomes available for future monthly budgets.

The user must NOT need to:

- modify code
- add database columns
- add spreadsheet rows
- manually modify every month

---

# 8. EDITING A HEAD

Existing heads must be editable.

Example:

Electricity:

₹3,000 → ₹3,500

The new amount should affect future budgeting.

It must NOT rewrite historical months.

---

# 9. DEACTIVATING HEADS

Budget heads should preferably support:

Active
Inactive

If Gym is no longer used:

Gym → Inactive

Historical Gym records must remain intact.

The head should simply stop appearing in future active monthly budgets.

Do NOT permanently delete historical financial information when a head is deactivated.

---

# 10. HISTORICAL DATA

This is critical.

Separate:

A. Budget Configuration

from:

B. Historical Monthly Records

Example:

August 2026:

Electricity allocation:
₹3,000

Actual bill:
₹425

Remaining:
₹2,575

Transferred:
₹2,575 → Emergency Fund

Later, the user changes Electricity's default allocation:

₹3,000 → ₹3,500

August must remain:

₹3,000 allocation
₹425 used
₹2,575 transferred

September can use:

₹3,500 allocation

Changing future settings must never rewrite historical records.

---

# 11. MONTHLY SYSTEM

The application operates by month.

Examples:

August 2026
September 2026
October 2026
November 2026
...

The user should be able to navigate between months.

Example UI:

< August 2026 >

or:

August 2026 ▼

The application must not require manually creating a new monthly table.

---

# 12. MONTHLY BUDGET RECORD

Each active budget head has a monthly record containing at least:

- budget head reference
- month
- allocated amount
- carry-forward amount
- total available
- paid/used amount
- remaining amount
- transfers out
- transfers in
- final balance
- carry-forward to next month

---

# 13. MONTHLY CALCULATIONS

For each budget head:

Total Available:

Allocated + Carry Forward

Remaining:

Total Available - Paid/Used

Final Balance:

Remaining - Transfers Out + Transfers In

Next Month Carry Forward:

Final Balance

All calculations must safely handle:

- zero
- blank inputs
- missing values
- decimal amounts

Never produce:

- NaN
- undefined
- Infinity
- broken calculations

---

# 14. PAID / USED

Scope note: this section governs the Fixed Expenses tracker only. The
Daily Spending Tracker (section 51) is a deliberate transaction-level
expense log and is exempt.

The Fixed Expenses tracker is NOT an expense tracker.

Do NOT build detailed transaction-level expense tracking into Fixed
Expenses.

The user only enters the total actual amount used/paid for each budget head in a month.

Example:

Electricity:

Allocated:
₹3,000

Paid / Used:
₹425

Remaining:
₹2,575

There is no need to enter individual electricity transactions.

If nothing was used:

Paid / Used = ₹0

---

# 15. TRANSFER SYSTEM

Unused money can be transferred from one budget head to another.

Example:

Electricity:

Allocated:
₹3,000

Paid:
₹425

Remaining:
₹2,575

User selects:

Transfer To:
Emergency Fund

Transfer Amount:
₹2,575

The application records:

Electricity → Emergency Fund
₹2,575

Electricity final balance becomes:

₹0

Emergency Fund receives:

₹2,575

---

# 16. TRANSFER UI

Transfer destination should use a dropdown.

Example:

Transfer To:
[ Emergency Fund ▼ ]

Transfer Amount:
[ ₹2,575 ]

The dropdown should contain active budget heads.

The user should not normally have to type category names.

---

# 17. TRANSFER VALIDATION

A transfer cannot exceed the available remaining balance.

Example:

Remaining:
₹2,575

Attempted transfer:
₹4,000

Reject it.

Display something like:

"You can transfer a maximum of ₹2,575."

Do not allow invalid financial states.

---

# 18. MULTIPLE TRANSFERS

The application must support multiple transfers.

Example:

Electricity → Emergency Fund:
₹2,575

Gym → Emergency Fund:
₹500

Apple Plus → Emergency Fund:
₹100

Emergency Fund receives:

₹3,175

Transfers should be stored as individual records.

Do NOT only store a formatted text string.

The UI may display:

Electricity ₹2,575
Gym ₹500
Apple Plus ₹100

But the database should retain each transfer separately.

---

# 19. TRANSFER HISTORY

A transfer should have information such as:

- month
- source head
- destination head
- amount
- timestamp

This allows the application to reconstruct balances accurately.

---

# 20. CARRY FORWARD

At month end:

Final Balance becomes next month's Carry Forward.

Example:

August:

Emergency Fund
Allocated: ₹4,000
Used: ₹0
Received: ₹2,575
Final Balance: ₹6,575

September:

Carry Forward:
₹6,575

September Allocation:
₹4,000

Total Available:
₹10,575

The user should never manually copy the balance.

---

# 21. UNUSED MONEY

If unused money is not transferred, it automatically carries forward.

Example:

Allocated:
₹4,000

Used:
₹0

Transfers out:
₹0

Final Balance:
₹4,000

Next month:

Carry Forward:
₹4,000

---

# 22. VARIABLE EXPENSES

Some allocations represent expected/average expenses rather than fixed bills.

Electricity is the primary example.

Allocation:
₹3,000

Actual bill:
₹425

The application must use the actual paid amount.

Difference:

₹2,575

That amount can either:

1. be transferred to another head

OR

2. remain in the current head and carry forward

---

# 23. SALARY

Salary must be editable.

Current salary:
₹31,500

If salary becomes:

₹35,000

the application recalculates the monthly budget.

Salary should also support historical monthly values where necessary.

Changing future salary must not rewrite previous months.

---

# 24. SPENDING POOL

Current logic:

Salary:
₹31,500

Committed:

Fixed Expenses:
₹7,350

Investment:
₹5,150

Saving:
₹4,000

Total committed:
₹16,500

Spending Pool:

₹15,000

The spending pool should be calculated dynamically.

Never hard-code ₹15,000.

---

# 25. DAILY BUDGET

Current approximate daily target:

₹500

This is calculated from:

Monthly Spending Pool / number of days

The preferred default is actual calendar days.

For example:

August 2026:

₹15,000 / 31

The application may eventually allow:

- calendar days
- 30-day basis
- custom basis

but this should not complicate the initial UI.

---

# 26. DASHBOARD

The dashboard should show a concise overview.

Example:

August 2026

Salary:
₹31,500

Committed:
₹16,500

Spending Pool:
₹15,000

Daily Budget:
₹484/day

Then show the budget heads and their current states.

The dashboard should prioritize clarity over analytics.

---

# 27. NO EXPENSE TRACKER (FIXED EXPENSES ONLY)

Scope note: this section governs the Fixed Expenses tracker only. The
Daily Spending Tracker (section 51) IS a transaction-level expense log by
explicit user decision.

For Fixed Expenses, do NOT build:

- individual purchase tracking
- merchant tracking
- receipt uploads
- bank transaction imports
- detailed spending categories

Fixed Expenses only needs monthly "Paid / Used" totals.

---

# 28. UI STYLE

The application should feel like a polished personal finance app.

It should be:

- clean
- modern
- minimal
- intuitive
- fast
- attractive
- mobile-friendly

Avoid:

- spreadsheet-like UI
- huge tables
- unnecessary charts
- excessive colors
- excessive animation
- clutter
- financial jargon

---

# 29. MOBILE DESIGN

Mobile is important.

Do NOT simply shrink a desktop table.

On mobile, a budget head can become a card.

Example:

Electricity

Allocated      ₹3,000
Used           ₹425
Remaining      ₹2,575

[ Transfer ]

Transfer To:
[ Emergency Fund ▼ ]

Amount:
[ ₹2,575 ]

This is preferable to forcing a 12-column table onto a phone.

---

# 30. DATA STORAGE

The application MUST persist data.

Do NOT rely on React state as permanent storage.

Do NOT use localStorage as the primary database.

The user should be able to:

- close the browser
- reopen the site
- return later

and find all information intact.

---

# 31. RECOMMENDED STACK

Preferred:

Frontend:
Next.js / React

Language:
TypeScript

Database:
Supabase / PostgreSQL

Hosting:
Vercel

Use a stack that is simple enough to maintain.

If another stack is strongly preferable, explain why before changing it.

---

# 32. DATABASE DESIGN

The database should conceptually contain:

1. Budget Heads
2. Monthly Budgets / Salary Records
3. Monthly Budget Head Records
4. Transfers

Potential structure:

budget_heads
- id
- name
- type
- default_monthly_allocation
- active
- created_at
- updated_at

monthly_budget_heads
- id
- month
- budget_head_id
- allocated_amount
- paid_amount
- carry_forward
- created_at
- updated_at

transfers
- id
- month
- source_head_id
- destination_head_id
- amount
- created_at

monthly_budget / salary records
- month
- salary
- other month-level settings

Exact schema may be refined during implementation.

---

# 33. DATABASE PRINCIPLE

Do not store everything as one giant JSON blob.

Use a sensible relational structure.

Transfers should be individual records.

Historical monthly values should be persisted.

Budget configuration should be separate from monthly historical data.

---

# 34. SINGLE USER

This is a private application for one person.

Do NOT build unnecessary multi-user functionality.

No:

- social accounts
- public profiles
- household collaboration
- team features

If authentication is required for privacy, use a simple private authentication mechanism.

---

# 35. SECURITY

This application contains personal financial information.

Do not expose the database publicly.

If Supabase is used:

- enable Row Level Security
- protect database access
- never expose service-role credentials
- use environment variables
- never put secrets into frontend code

---

# 36. BUSINESS LOGIC

Financial calculations must be centralized.

Create reusable functions/services for:

calculateTotalAvailable()
calculateRemaining()
calculateTransfersOut()
calculateTransfersIn()
calculateFinalBalance()
calculateCarryForward()
calculateSpendingPool()
calculateDailyBudget()
validateTransfer()

Do not scatter these calculations throughout UI components.

---

# 37. MONTH TRANSITION

Month transitions must use saved historical data.

Example:

August Electricity:

Final balance:
₹2,575

if not transferred:

September Electricity Carry Forward:
₹2,575

If transferred:

August Electricity final:
₹0

September Electricity Carry Forward:
₹0

This should be derived from actual saved records.

---

# 38. EXAMPLE TEST CASE

The application must correctly handle:

Salary:
₹31,500

Electricity:
Allocated ₹3,000

Paid:
₹425

Remaining:
₹2,575

Transfer:

Electricity → Emergency Fund
₹2,575

Emergency Fund:

Initial allocation:
₹4,000

Received:
₹2,575

Final:
₹6,575

Next month:

Emergency Fund allocation:
₹4,000

Carry Forward:
₹6,575

Available:
₹10,575

This is a mandatory functional test.

---

# 39. SECOND TEST CASE

Electricity:

Allocated:
₹3,000

Paid:
₹425

Remaining:
₹2,575

No transfer.

Expected:

Electricity final:
₹2,575

Next month's Electricity carry forward:
₹2,575

---

# 40. THIRD TEST CASE

Emergency Fund:

Allocated:
₹4,000

Carry Forward:
₹6,575

Paid:
₹2,000

No transfer.

Expected final:
₹8,575

Next month carry forward:
₹8,575

---

# 41. FOURTH TEST CASE

Multiple transfers:

Electricity → Emergency Fund:
₹2,575

Gym → Emergency Fund:
₹500

Apple Plus → Emergency Fund:
₹100

Emergency Fund should receive:
₹3,175

Each transfer must remain independently identifiable.

---

# 42. THINGS THE APPLICATION MUST NOT DO

Do NOT:

- hard-code current budget heads
- hard-code current salary
- hard-code ₹15,000 spending pool
- hard-code ₹500 daily budget
- overwrite historical data when settings change
- require manual monthly copying
- require manual carry-forward
- allow transfers exceeding available balance
- destroy history when a head is deactivated
- rely on spreadsheet cell references
- use localStorage as the primary database
- create a detailed expense tracker
- overcomplicate the UI
- build unnecessary financial features
- build multi-user functionality without a clear need

---

# 43. FUTURE FEATURES

Possible future additions:

- yearly overview
- monthly notes
- savings goals
- export to CSV
- backup/export
- custom themes
- spending-pool history
- savings progress

These should NOT be implemented until the core budgeting system is stable.

---

# 44. DEVELOPMENT METHODOLOGY

The project will be built in VS Code.

Development should be incremental.

Do NOT dump an entire huge application into one response.

However, do NOT artificially split simple work into many tiny responses either.

For each milestone:

1. Explain what is being built.
2. Tell me which files to create/edit.
3. Give complete code for the relevant files.
4. Give exact terminal commands.
5. Explain how to test it.
6. Tell me what successful output should look like.
7. Fix errors before moving to the next major milestone.

---

# 45. SOURCE OF TRUTH

This file is authoritative.

Any AI working on the project must:

1. Read PROJECT_SPEC.md before making architectural changes.
2. Treat this file as the current product specification.
3. Not contradict it without explicit instruction.
4. Not invent new requirements.
5. Not remove existing requirements silently.
6. Update this file if the product requirements are deliberately changed.

---

# 46. CHANGE CONTROL

If the user changes a requirement:

- acknowledge the change
- explain its impact
- update PROJECT_SPEC.md
- ensure the implementation follows the new requirement
- do not preserve obsolete behavior merely because it existed before

---

# 47. CURRENT STATUS

Status:
Built and in active use.

The application is implemented and deployed on Vercel with a Supabase
backend. Authentication, multi-user isolation, budget heads, monthly
budgets, monthly navigation, historical months, manual carry-forward
(Push Remaining), fund moves, per-head notes, salary editing, the
Customize Budget page, Current Account Balance, and the contextual help
system are all working. The production build passes.

CURRENT_STATE.md is the implementation source of truth and holds the
detailed, up-to-date status. This file remains the product source of
truth.

Next step:

Work through the To Do list in the Working Notes at the top of this file.

---

# 48. FIRST IMPLEMENTATION MILESTONE

The first implementation milestone should be:

1. Create Next.js/TypeScript project.
2. Establish project structure.
3. Configure environment variables.
4. Connect Supabase.
5. Create initial database schema.
6. Verify database connection.
7. Create basic application shell.

Do not build the entire UI before confirming the database architecture.

---

# 49. SUCCESS CRITERIA

The application is considered successful when:

- all budget heads are editable
- salary is editable
- monthly allocations are editable
- new heads can be added without code changes
- heads can be deactivated without deleting history
- paid/used amounts can be entered
- transfers work
- multiple transfers work
- transfer validation works
- transferred amounts appear in destination heads
- balances calculate correctly
- carry-forward works automatically
- historical months remain unchanged
- future configuration changes work correctly
- data persists after closing/reopening
- the app works on mobile
- the app works on desktop
- no spreadsheet-style manual formulas are required
- no individual expense tracker is required

---

# 50. FINAL PRODUCT PRINCIPLE

Keep the application simple.

The user should be able to open the app and understand:

"How much money did I allocate?"
"How much have I used?"
"How much remains?"
"Where did I transfer it?"
"How much do I have available?"
"What is carrying into next month?"

Everything else is secondary.

---

# 51. DAILY SPENDING TRACKER

Status: Planned. Not yet implemented.

## Purpose

A second, independent tracker for discretionary day-to-day spending, drawn
from the monthly Spending Pool (Salary - Committed). It runs alongside the
Fixed Expenses tracker (formerly "Dashboard") and Customize Budget as a
third area reached from the home page.

Sections 14 and 27 ("no expense tracker") apply to the Fixed Expenses
tracker only. The Daily Spending Tracker is a deliberate, transaction-level
expense log, added by explicit user decision.

## Independence

Fixed Expenses and Daily Spending do not share budget heads, categories,
tables or logic. The only connection is a one-way action: leftover
Spending Pool money can be moved out (see "Move remaining").

## It is a ledger, not allocations

There are no per-category cards or allocations. The page is a running list
of transactions. A prominent "+ Add expense" button is the primary action.

Each expense has exactly four fields:

- category (required; defaults to "Miscellaneous")
- amount
- note (optional)
- date

## Categories

- Reusable tags only - they carry no budget.
- Fully user-managed via a "Manage categories" button at the top of the
  page (same treatment as "Push remaining amount" on Fixed Expenses): a
  popup to add, rename and delete categories.
- A starter set is seeded for new users: Food, Shopping, Transportation,
  Household, Utility, Entertainment, Miscellaneous. "Miscellaneous" always
  exists and cannot be deleted.
- Deleting a category that is in use: confirm first ("This category is used
  in N expenses. Delete it?"). On confirm, the category is removed and its
  expenses are reassigned to "Miscellaneous" - the expenses themselves are
  never deleted.
- Each category can be given a colour (Edit in the Manage categories
  popup: a swatch grid plus "Auto"). The colour follows the category
  everywhere - the Activity-list category pill is filled with it (text
  auto-set to black/white for contrast) and the By category pie uses it
  for that category's slice. "Auto" (no colour stored) falls back to a
  fixed positional palette in the pie and the default blue pill in the
  list.

## The money model

For a given month M:

    Spending Pool (M)  =  (Salary(M) - Committed(M))  +  carried in from M-1
    Credits (M)        =  sum of credit amounts dated in M
    Available (M)      =  Spending Pool(M) + Credits(M)
    Total spent (M)    =  sum of all expense amounts dated in M
    Moved out (M)      =  sum of "move remaining" amounts from M
    Remaining (M)      =  Available(M) - Total spent(M) - Moved out(M)

"Carried in from M-1" is derived from M-1's move-remaining records whose
destination is "next month" - not a stored balance. Undoing a move is
deleting its record.

Salary and Committed come from the Fixed Expenses side and are read-only
here.

## Credits

A credit is extra money to spend in one month only - a gift, a refund.
Fields: a day, an amount, an optional note. No category.

- A credit adds to Available for its month. It never changes the Spending
  Pool number shown in the UI, and it never carries into another month.
- The summary keeps "Spending Pool" as (Salary - Committed + carried in),
  with a green note "+ X credited this month" when there are credits.
  Remaining reflects the credited total.
- Credits appear in the same Activity feed as expenses, styled green
  (the emerald accent used by Pay in full / Push remaining). Editable and
  deletable like expenses.
- Credits do NOT appear in the Month overview calendar or the "By
  category" breakdown - those stay expense-only.

## Move remaining

Leftover Remaining can be moved out, in any split:

- to next month's Spending Pool, and/or
- to any active Fixed Expenses budget head for the same month (rent,
  electricity, investment, saving - any of them).

A move into a Fixed head is recorded as a transfer-in on that head. It
does NOT change the head's allocation, so Committed and the Spending Pool
are unaffected - no feedback loop. The head shows the received amount and
the Current Account Balance rises accordingly.

Partial and multiple moves are allowed (e.g. move 2,000 to Saving + 1,000
to next month, out of 3,000 remaining).

## Summary

Only three figures are shown, and no per-day or pace/over-under-spending
indicator (removed by user decision - the ever-changing per-day number
was not wanted):

    Spending Pool (M)  =  (Salary(M) - Committed(M)) + carried in from M-1
    Spent (M)          =  sum of expense amounts dated in M
    Remaining (M)      =  Spending Pool(M) + Credits(M) - Spent(M) - Moved out(M)

The Spending Pool card carries a "+ X credited this month" note when
Credits(M) > 0.

## Page layout

- Month navigator (shared component with Fixed Expenses)
- Toolbar: "+ Add expense" and "+ Add credit" always visible; "Month
  overview", "Move remaining" and "Manage categories" alongside on
  desktop, folded into a "More" menu on mobile
- Summary: Spending Pool, Spent, Remaining
- Calendar grid ("Month overview" popup): each day cell shows that day's
  expense total; tap a day to view and add its expenses. Expense-only.
- Category breakdown: total spent per category for the month. Expense-only.
  A "View chart" button opens a popup with an animated donut of the whole
  spending pool - one slice per category, then "Moved out" (if any), then
  "Remaining" - with a legend of amount + percentage per slice. Slice
  colours come from each category's assigned colour (positional palette
  fallback). If spending exceeds the pool, Remaining drops out and an
  "over by X" note shows.
- Activity list: expenses and credits in one feed, newest first; each row
  is editable and deletable. Expense rows baby-pink, credit rows green.
- "Move remaining" action

Historical months keep their transactions unchanged. Changing the current
month never rewrites past months.

## Naming

- The former "Dashboard" is relabelled "Fixed Expenses" throughout (route
  stays /dashboard).
- The new page is "Daily Spending Tracker" (route /daily-spending).
- Home page shows three cards: Fixed Expenses, Daily Spending Tracker,
  Customize Budget.

## Data

    spending_categories   id, user_id, name, is_default, color (nullable,
                          '#rrggbb'), created_at, updated_at
    spending_entries      id, user_id, entry_date, category_id, amount,
                          note, created_at, updated_at
    spending_credits      id, user_id, entry_date, amount, note,
                          created_at, updated_at
    spending_moves        id, user_id, month_start, amount, destination_kind
                          ('next_month' | 'budget_head'),
                          destination_monthly_head_id (nullable), created_at

All rows isolated by user_id with RLS (auth.uid() = user_id).

## Build milestones

1. Relabel Dashboard -> Fixed Expenses; add the third home-page card.
   DONE.
2. Schema + category management popup + seeded defaults. DONE.
3. Add expense, transactions list, summary (Spending Pool / Spent /
   Remaining). DONE.
4. Calendar view (as a "Month overview" popup). DONE.
5. Move remaining (split between next month and any Fixed head) + the
   transfer-in bridge to Fixed head balances, and carried-in from the
   previous month's "next month" moves. DONE.
