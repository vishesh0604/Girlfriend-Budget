BUDGET TRACKER — CURRENT STATE

New-chat continuation trigger: Say “Continue Budget Tracker.”

Use this document as the handoff point. Do not restart completed work or ask the user to re-explain the project unless the required detail is genuinely missing.

1. PROJECT

Personal Budget App / Budget Tracker

Stack

Next.js 16.3.0

React

TypeScript

Tailwind CSS

Supabase Auth

Supabase PostgreSQL

Supabase RLS

Vercel

Git/GitHub

Current Status

Stable development state. Core budgeting, multi-user auth, navigation UX, loading UX, Current Account Balance, contextual HelpButtons, scrollable popups, homepage decorative background, and Developer Logs are working. Production build passes.

2. COMPLETED CORE FUNCTIONALITY

Next.js / TypeScript / Tailwind / App Router setup

Supabase connected

Database schema and indexes

Row Level Security

Authentication

Login

Protected routes

Multiple authenticated users

User-specific budgets

User-specific budget heads

User-specific monthly budgets

User-specific monthly budget heads

User-specific transfers

Centralized financial calculation engine

Spending Pool

Daily Budget

Committed allocation

Fixed Expense / Investment / Saving classification

Paid / Used editing

Allocation editing

Transfers

Manual Push Remaining / one-month carry-forward behavior

Monthly navigation

Historical months

Future months

Salary editing

Home page

Customize Budget page

Logout

Personalized navigation/loading UX

Production build verification

Current Account Balance

Current Account Balance breakdown

Five contextual HelpButtons

Shared Help popup system

Scrollable Help popups

Scrollable Push Remaining popup

Homepage login-style decorative background

Developer Logs button

Developer Logs popup

Calculation tests reached 18 passing tests during development.

3. MULTI-USER SUPPORT

The application is now a true multi-user application.

Each authenticated user has independent:

Budget heads

Monthly budgets

Monthly budget heads

Transfers

Carry-forward data

Budget configuration

New users start with a blank budget configuration.

A previous bug caused a new user to inherit/show ₹31,500 salary. This was fixed.

New users now correctly start with:

Salary = ₹0

Database isolation is enforced with RLS policies using:

auth.uid() = user_id

Never expose one user's financial data to another user.

4. DATABASE

budget_heads

Reusable user-specific budget-head configuration.

monthly_budgets

Month-level records including salary.

monthly_budget_heads

Historical monthly snapshots containing allocation, carry-forward and paid/used amounts.

transfers

Individual transfers between budget heads.

All user-owned records must remain isolated by user_id.

5. DASHBOARD

The dashboard currently supports:

Salary

Spending Pool

Daily Budget

Committed total

Fixed Expenses breakdown

Investments breakdown

Savings breakdown

Budget-head listing

Monthly allocation editing

Paid/Used editing

Remaining balance

Transfers

Manual Push Remaining

Month navigation

Historical months

Future months

Current Balances summary

Current Account Balance

Financial values are database-driven.

Do not hard-code salary, allocations, Spending Pool or Daily Budget.

6. HISTORICAL MONTH FIX — COMPLETE

Historical months such as July 2026 previously failed with:

No budget exists for this historical month.

An attempted fix then produced:

Past months cannot be initialized automatically.

The correct behavior is now implemented:

Existing historical months load normally.

Historical months are not automatically initialized.

Current/future initialization remains allowed.

Historical monthly snapshots remain protected.

This is currently working.

7. MANUAL CARRY-FORWARD / PUSH

The current model is manual.

Rules:

User explicitly presses Push Remaining.

Only the immediately following month receives the pushed amount.

It does not automatically cascade.

Original historical allocation/payment history remains intact.

Duplicate pushes must not duplicate the same remaining amount.

Existing transfer functionality remains separate.

8. HOME / NAVIGATION

Current route flow:

Login
  ↓
Home
  ├── Dashboard
  ├── Customize Budget
  └── Logout

Supported navigation:

Login → Home

Home → Dashboard

Home → Customize Budget

Dashboard → Home

Customize Budget → Home

Logout → Login

9. CURRENT NAVIGATION / LOADING UX — APPROVED

Phase 1 navigation/loading UX is complete and currently approved.

Each route has a personalized loading experience.

Login → Home

Welcome back
Opening your budget...

Home → Dashboard

Opening your budget
Getting everything ready...

Home → Customize Budget

Preparing your budget
Opening your budget settings...

Dashboard → Home

Returning home
Taking you back to your budget hub...

Customize Budget → Home

Returning home
Taking you back to your budget hub...

Logout → Login

See you soon
Signing you out securely...

Visual theme:

Light blue background

Baby-pink cards/borders

Navy text

Animated dots / subtle icon animation

Do not redesign this unless explicitly requested.

10. INTENTIONAL 2-SECOND TRANSITION

The intentional transition delay is currently 2 seconds.

Two places contain the actual 2000ms delay.

src/app/page.tsx

Login → Home:

setTimeout(() => {
  router.push("/home");
  router.refresh();
}, 2000);

src/components/PageTransition.tsx

Reusable navigation transitions contain the 2-second delay.

If changing from 2 seconds to 1.5 seconds, change:

2000 → 1500

in:

src/app/page.tsx

src/components/PageTransition.tsx

The loading.tsx files do not control this intentional delay.

Important

This delay is UX only.

It does not reduce the actual database/server loading time.

11. MONTH NAVIGATOR — APPROVED STATE

File:

src/app/dashboard/MonthNavigator.tsx

The current appearance is correct and must be preserved.

It has:

Previous month arrow

Month selector

Year selector

Next month arrow

Button press/hover feedback

Disabled state during navigation

Baby-pink Updating budget pill

Animated dots

The important implementation detail:

The Updating budget pill is absolutely positioned and therefore does not consume layout space.

This fixed a previous issue where the dashboard content was pushed downward.

Approved layout behavior

The Updating budget indicator:

Remains in the same pixel band as the top Home / Push controls.

Does not push the month selectors downward.

Does not push the dashboard content downward.

Uses the existing baby-pink theme.

Should not alter the arrow buttons' existing appearance.

Do not change the MonthNavigator geometry casually.

12. PERFORMANCE — CURRENT DECISION

The user tested the current cloud application and decided that month switching is good enough for now.

No performance optimization is currently required.

A performance improvement was proposed but deliberately skipped.

Saved trigger

Say:

Improve Budget Tracker Performance

and return the following exact deferred change.

File

src/app/dashboard/page.tsx

Current issue

The monthly_budget_heads and transfers Supabase queries execute sequentially.

They can be fetched concurrently using Promise.all.

Deferred replacement

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

Do not apply this automatically.

Only return this change when the user asks for:

Improve Budget Tracker Performance

13. CURRENT ACCOUNT BALANCE — COMPLETE

Purpose

The Current Account Balance is a calculated budgeting balance.

It is not a live bank balance and does not connect to any bank account.

It does not require:

Bank credentials

Account numbers

Bank APIs

Bank statements

External financial account data

The application calculates it entirely from existing budget data.

Calculation

Current Account Balance
=
Sum of remaining balances across all budget heads

It uses the same remaining-balance information represented by the Dashboard's Current Balances summary.

The balance updates whenever the underlying budget-head balances update.

Breakdown

The card displays:

Total Current Account Balance

Individual budget-head names

Remaining balance for each displayed head

Budget heads with ₹0 remaining are not displayed in the breakdown.

Account-structure assumption

The budgeting model assumes:

Fixed Expenses + Investments + Savings
→ one particular bank account

Spending Pool
→ another bank account

Approved popup wording:

The system assumes that your Fixed Expenses, Investments,
and Savings are kept in one particular bank account, while
your Spending Pool is kept in another bank account.

The Current Account Balance shown here represents the money
remaining across your budget heads based on this budgeting
structure.

This is a budgeting assumption only. The app does not connect to either bank account.

26. CONTEXTUAL HELP / QUESTION-MARK SYSTEM — COMPLETE

A shared contextual HelpButton system is implemented.

There are five approved help-button locations:

1. /home
2. /dashboard
3. Push Remaining popup
4. /customize-budget
5. Current Account Balance card

All five use the same popup behavior and visual theme, while their content is different.

Shared popup behavior

Baby-pink popup

Existing website font/typography

Navy text

Rounded corners

Existing border/shadow treatment

No close X

Clicking outside closes the popup

Internal scrolling for long content

Popup height adapts to content when practical

Internal scrollbar when content exceeds available viewport

Scrollbar visually integrated into the popup

Must not use the native Windows scrollbar appearance

The page behind the popup must not scroll when the popup itself is scrollable

/home HelpButton

The Home ? is positioned below "What would you like to do?".

Its spacing is controlled locally on /home.

Important:

Do not change global HelpButton spacing to adjust the Home ?.

The Home popup explains:

Dashboard

Customize Budget

/dashboard HelpButton

The Dashboard ? is positioned beside the Home-button area at the approved vertical height.

Its popup explains:

Dashboard overview

Month navigator

Salary

Spending Pool

Daily Spending Limit / Daily Budget

Commitments

Fixed Expenses

Investments

Savings

Budget heads

Initial-card calculations

Current Balances

Current Account Balance

Push Remaining

The Dashboard popup briefly mentions that Current Account Balance and Push Remaining have their own ? explanations.

Push Remaining HelpButton

The Push Remaining popup has its own ? beside the popup heading.

The popup:

Uses the normal baby-pink popup theme

Has internal scrolling

Uses an aesthetic integrated scrollbar

Adapts to content when possible

Becomes viewport-limited and scrollable when content is too large

/customize-budget HelpButton

Customize Budget has its own ? using the same shared popup system.

Current Account Balance HelpButton

The Current Account Balance card has a ? beside its heading.

Its popup explains:

What Current Account Balance means

How it is calculated

Why zero-balance heads are omitted

The account-structure assumption

That it is not a live bank balance

27. HOMEPAGE DECORATIVE BACKGROUND — COMPLETE

The /home page now uses the same decorative background design as the login page.

Reference:

src/app/page.tsx

The decoration is applied only to /home.

The design includes the existing:

Light-blue base

Large pastel-blue decorative circles

Smaller light-blue decorative elements

Do not redesign the login page merely because /home reuses its visual treatment.

24. DEVELOPER LOGS — COMPLETE

Developer Logs are implemented on /home.

Button

Developer Logs is a small button, not a card.

Approved placement:

Top-left

Approximately 16px from top

Approximately 16px from left

Similar structural treatment to the Home button

The button is:

Pastel purple

Rounded

Small

Interactive

Soft/consistent with the website theme

Only the button is purple.

The Developer Logs popup is not purple.

Popup

The Developer Logs popup follows the standard site popup:

Baby pink

Navy text

Existing rounded/shadow style

Internal scrolling if required

Click outside to close

No close X

The popup contains recent developer changes.

Future developer changes should be added as new entries rather than deleting the existing history.

25. CURRENT FILE MAP



Login / Auth

src/app/page.tsx
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/proxy.ts
proxy.ts

Home

src/app/home/page.tsx
src/app/home/LogoutButton.tsx

Dashboard

src/app/dashboard/page.tsx
src/app/dashboard/actions.ts
src/app/dashboard/MonthNavigator.tsx
src/app/dashboard/HomeButton.tsx
src/app/dashboard/loading.tsx

Customize Budget

src/app/customize-budget/page.tsx
src/app/customize-budget/HomeButton.tsx
src/app/customize-budget/loading.tsx

Shared transition

src/components/PageTransition.tsx

Home

src/app/home/page.tsx
src/app/home/LogoutButton.tsx
src/app/home/HelpButton.tsx
src/app/home/DeveloperLogsButton.tsx

Dashboard

src/app/dashboard/page.tsx
src/app/dashboard/actions.ts
src/app/dashboard/MonthNavigator.tsx
src/app/dashboard/HomeButton.tsx
src/app/dashboard/loading.tsx

Customize Budget

src/app/customize-budget/page.tsx
src/app/customize-budget/HomeButton.tsx
src/app/customize-budget/loading.tsx

Shared transition

src/components/PageTransition.tsx

Documentation

PROJECT_SPEC.md
CURRENT_STATE.md
AI_INSTRUCTIONS.md

14. GIT / DEPLOYMENT

The project uses:

main
origin/main

Normal workflow:

git status
git add ...
git commit -m "..."
git push origin main

PowerShell note

Do not use & as a command separator.

Use separate commands:

git add ...
git commit -m "..."
git push origin main

Production build:

npm run build

The build passed successfully after the latest navigation/loading changes.

15. LOCAL VS CLOUD DATABASE BEHAVIOR

Important distinction:

Local code changes

Changing code locally does not modify the cloud database.

Supabase dashboard changes

Creating users or modifying database records through the Supabase dashboard changes the cloud database immediately, even if local code has not been pushed.

Code deployment

Local code reaches the Vercel cloud application after:

Local code
  ↓
Git commit
  ↓
Git push
  ↓
Vercel deployment
  ↓
Cloud application

16. RECENT RESOLVED ISSUES

New-user salary

Problem

New users could show ₹31,500 instead of ₹0.

Resolution

New users now start with:

₹0

Status

RESOLVED

Historical month loading

Problem

Historical months such as July 2026 showed:

No budget exists for this historical month.

Then an attempted fix produced:

Past months cannot be initialized automatically.

Resolution

Existing historical months are now loaded normally.

Historical months are not automatically initialized.

Status

RESOLVED

MonthNavigator vertical displacement

Problem

The new Updating budget indicator was inserted into normal layout flow and pushed the dashboard down.

Resolution

The indicator is now absolutely positioned and does not consume layout space.

Status

RESOLVED

Login build syntax error

Problem

src/app/page.tsx was missing a closing } for handleLogin().

Resolution

The file was corrected.

npm run build

now passes.

Status

RESOLVED

17. CURRENT APPROVED UX

The following areas are explicitly considered correct:

MonthNavigator

Updating budget pill

Home → Dashboard transition

Personalized route loading screens

2-second intentional transition

Baby-pink theme

Light-blue background

Current dashboard spacing

Existing arrow button appearance

Current page positioning

Dashboard Home button

Customize Budget Home button matching Dashboard

Five HelpButtons

Help popup theme

Help popup internal scrolling

Push Remaining popup internal scrolling

Current Account Balance card and breakdown

Homepage decorative background

Developer Logs button

Developer Logs popup

Do not redesign these areas unless the user explicitly requests it.

18. CURRENT PROJECT STATUS

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
Current Account Balance        COMPLETE
Contextual Help System         COMPLETE
Help Popup Scrolling           COMPLETE
Developer Logs                 COMPLETE
Homepage Background            COMPLETE
Production build               PASSING
Performance optimization       DEFERRED

Current month switching is considered responsive enough.

Do not optimize or redesign stable areas without explicit instruction.

19. FUTURE BACKLOG

Existing ideas:

Further contextual help refinements

Bank Account Tracker

Further budget-head fixes/refinements

Mobile UI refinements

Performance optimization if month switching becomes slow

Production audit

Additional Developer Log entries

Potential future UX refinements

Do not automatically implement backlog items.

20. BANK ACCOUNT TRACKER — FUTURE

The Bank Account Tracker is not implemented yet.

Intended scope:

Included

Fixed Expense

Investment

Excluded

Saving

Other

Spending Pool

Salary

Only actual paid amounts reduce the tracked bank balance.

Concept:

Starting Balance
+ Fixed Expense Allocation
+ Investment Allocation
- Actual Paid Amount
= Ending Balance

For subsequent months:

Previous Ending Balance
+ Current Fixed Expense Allocation
+ Current Investment Allocation
- Actual Paid Amount
= Ending Balance

Historical months must remain protected.

The detailed Bank Account implementation plan from the previous state document remains a future plan.

21. HARD CONSTRAINTS

Do not:

Hard-code salary

Hard-code budget heads

Hard-code current allocations

Hard-code Spending Pool

Hard-code Daily Budget

Destroy historical records

Allow transfers greater than available balance

Expose another user's financial data

Expose Supabase service-role credentials

Introduce unnecessary features before core budgeting is stable

Connect to bank accounts without explicit future approval

Treat Current Account Balance as a live bank balance

Change shared HelpButton styling to solve a single-instance spacing issue

Break approved popup scrolling

Replace the standard baby-pink popup theme

Change approved Home button styling without explicit instruction

Redesign stable dashboard navigation/layout

Rewrite unrelated code when making a targeted change

Dump entire large files unnecessarily

Skip build verification after a code change

Financial calculations remain centralized in application business logic.

Financial calculations remain centralized in application business logic.

22. DEVELOPMENT WORKFLOW / OUTPUT INSTRUCTIONS

These instructions apply to all future Budget Tracker development work.

Code Changes

When modifying project code:

For large files, do not provide the entire file.

Pinpoint the exact file that needs modification.

Identify the exact section/location to change.

State exactly what existing code to find.

State exactly what to replace it with.

Only provide the complete file when it is reasonably small (generally fewer than ~600 lines) and doing so materially reduces the risk of implementation errors.

If the user explicitly insists on receiving the entire large file, provide it rather than arguing about the size.

Avoid unnecessary changes to unrelated files or code.

Preserve all existing functionality and approved UX unless the user explicitly requests a change.

When making a spacing-only change, prefer the smallest possible Tailwind/CSS adjustment rather than rewriting the component.

When the user asks for a complete replacement and the file is reasonably small, provide the complete replacement in one markdown code block.

Do not invent file paths. If the exact component location is uncertain, ask for the file or use the project files as the source of truth.

Visual/UI Changes

Make visual changes incrementally.

Preserve the existing website typography and font family.

Preserve the established light-blue / baby-pink / navy theme.

Shared components should remain shared; do not create separate popup systems for individual ? buttons.

If one ? needs different spacing, change its local wrapper rather than changing global HelpButton spacing.

The five HelpButtons share the same popup behavior/theme, but their content is different.

Help popups have no close X.

Clicking outside a popup closes it.

Long popup content must scroll inside the popup rather than scrolling the page behind it.

Popup height should adapt to content when practical, with an internal scrollbar when content exceeds the available viewport.

The scrollbar should visually belong to the popup and must not look like a native Windows scrollbar.

Developer Logs button is pastel purple; its popup remains the normal baby-pink site popup.

Developer Logs is a small top-left button, not a card.

The /home page uses the login page's decorative background design; this decoration is only for /home.

After Every Code Change

After each individual code change, follow this exact sequence:

Tell the user to run:

npm run build

Have the user test the changed functionality locally.

Wait for the user to confirm that it works before moving to the next change.

Only after successful build + local test + user confirmation should the change be committed.

23. NEW-CHAT HANDOFF

Start a new chat with:

Continue Budget Tracker.

This means:

Continue from this exact project state.

Use the current code/files as the source of truth.

Do not restart completed features.

Do not make the user repeat the project's history.

Preserve the approved UX unless the user explicitly asks for changes.

Treat this CURRENT_STATE.md as the project handoff document.

Important trigger 1

Continue Budget Tracker.

Meaning:

Continue from the latest known state of the Budget Tracker project, including:

src/app/dashboard/actions.ts
src/app/dashboard/page.tsx
src/app/dashboard/MonthNavigator.tsx
src/app/dashboard/HomeButton.tsx
src/app/dashboard/loading.tsx

src/app/home/page.tsx
src/app/home/LogoutButton.tsx
src/app/home/HelpButton.tsx
src/app/home/DeveloperLogsButton.tsx

src/app/customize-budget/page.tsx
src/app/customize-budget/HomeButton.tsx
src/app/customize-budget/loading.tsx

src/app/page.tsx

src/components/PageTransition.tsx

CURRENT_STATE.md
PROJECT_SPEC.md
AI_INSTRUCTIONS.md

Do not assume these files are identical to older versions. The latest local/project files are the source of truth.

Important trigger 2

Improve Budget Tracker Performance

Meaning:

Return the deferred Promise.all() optimization described in Section 12.

Do not automatically implement it.

23. CURRENT VERDICT

BUDGET TRACKER — STABLE CURRENT STATE

Core multi-user budgeting works.

Navigation/loading UX works.

Current Account Balance works.

Contextual Help System works.

Help popup scrolling works.

Developer Logs works.

Homepage decorative background works.

Production build passes.

Month switching is currently considered sufficiently responsive.

Performance optimization is intentionally deferred.

Continue from here.