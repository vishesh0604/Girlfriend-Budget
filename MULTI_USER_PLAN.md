# Multi-user plan

Turning Budget Tracker from a private 2-person app into something anyone
can sign up for. Also folds in the pending **timezone fix** (section 7).

**Status:** in progress. Work through it in the order in "Suggested
order" at the bottom.

### Progress

- ✅ **Step 1 — Supabase config.** Email OTP on, sign-ups on, confirm-email
  on, min password 8. Site URL + redirect URLs set for
  `girlfriendbudget.vercel.app` and `localhost:3000`. (pushed)
- ✅ **Step 2 — auth proxy.** `src/proxy.ts` (Next 16 renamed middleware →
  proxy) wired to `src/lib/supabase/proxy.ts` `updateSession`; switched
  to `getClaims()`. Sessions stay fresh, protected routes gated. (pushed,
  commit `1cb2880`)
- ✅ **Step 3 — `profiles` table.** Created in Supabase with RLS,
  `handle_new_user()` trigger, `touch_updated_at()` trigger, backfilled
  for the 2 existing users. (SQL run by hand — not in repo)
- ✅ **Step 4 — auth UI.** Merged to `main` (commit `b79bc19`). Rewritten
  login (`src/app/page.tsx`), `/auth/sign-up`, `/auth/reset`,
  `src/app/auth/AuthShell.tsx` + `fields.tsx`. All three flows tested:
  sign up → 6-digit code → verified; log in; forgot password → code →
  new password. Existing accounts unaffected.
- ✅ **Step 9 — SMTP (done early, was blocking Step 4).** Brevo free plan,
  single verified sender (Gmail, click-to-verify, no DNS). Custom SMTP
  configured in Supabase (`smtp-relay.brevo.com:587`, login is the
  `...@smtp-brevo.com` string, password is the Brevo SMTP key). Email OTP
  length set to 6. Email rate limit raised. Branded templates for
  "Confirm signup" + "Magic Link" pasted in — source of truth in
  `emails/`. Caveat still stands: Brevo sends from a `@*.brevosend.com`
  address and there's no SPF/DKIM for gmail.com, so some mail may land in
  spam until a real domain is bought (~$10/yr) and domain-authenticated.

- ✅ **Step 5 — settings.** A **popup** (not a page), opened from the gear
  on the home page. `settings/SettingsButton.tsx` (modal),
  `SettingsForm.tsx`, `SearchableSelect.tsx` (custom search+scroll
  dropdown), `currencies.ts` (15), `actions.ts`
  (`getMyProfile` / `updateProfile`). Saves to `profiles.timezone` /
  `.currency` on select. No migration (columns exist from Step 3).
  Commit `487b2bf`.
- ✅ **Step 6 — timezone sweep.** `src/lib/time.ts` → `nowInZone(tz)` +
  `monthStartOf`; `src/lib/supabase/viewer.ts` → `getViewerNow` /
  `getViewerMonthStart` (read `profiles.timezone`, fallback
  `Asia/Kolkata`). Wired through: `home/page.tsx` + `homeSummary.ts`
  (now takes `now`), `dashboard/page.tsx` (`currentMonthStart` +
  `daysUntilDue`), `daily-spending/page.tsx` (`currentMonthStart` +
  `todayDay`), `dashboard/actions.ts` (all 7 `currentMonthStart`
  gates), `daily-spending/actions.ts` (`getSpendingReport` default
  "to"). Client date code (`BudgetHeadEditor` due label) already used
  the browser clock — untouched.

- ✅ **Step 7 — currency sweep.** `src/lib/currencies.ts` (moved from
  settings/), `src/lib/money.ts` → `formatMoney(amount, currency)` +
  `currencySymbol`, `src/components/CurrencyProvider.tsx` →
  `useMoney()` / `useCurrency()` / `useCurrencySymbol()`.
  `layout.tsx` fetches `profiles.currency` once and wraps everything in
  `<CurrencyProvider>`. Client components use the hooks; server pages
  (dashboard, daily-spending, home, customize-budget) fetch currency
  and use `formatMoney`. PDF: `pdfMoney(amount, currency)` in
  `spendingReport.ts` (INR → "Rs" for the Helvetica glyph gap, others →
  narrow symbol / code), threaded via a `currency` prop on
  `SpendingReportPdf`. Input placeholders `₹0` → `0`. Validation-error
  amount strings had `₹` stripped (rare, pure `calculations.ts` can't
  see currency). All money is now viewer-currency.

- ✅ **Step 8 — onboarding, privacy note, delete account.**
  - Onboarding: home page shows a "Welcome — add budget heads, then set
    your salary" banner while `summary.headCount === 0`.
  - Privacy note: one line in `AuthShell` under every auth screen.
  - Delete account: `public.delete_own_account()` (security-definer,
    deletes user-owned rows in RESTRICT-safe order then `auth.users`),
    `deleteAccount()` action (`rpc` + `signOut`), and a "Danger zone"
    in the Settings popup (type DELETE → "Delete forever" →
    `window.location = "/"`). The two RESTRICT FKs
    (`spending_entries.category_id`, `monthly_budget_heads.budget_head_id`)
    are handled by delete order, not a schema change.

---

## ✅ Plan complete

All 8 steps + SMTP done and on `main`. Her Penny is a sign-up-and-use
product: open registration (email + password + OTP), sticky sessions,
per-user data isolation, a settings popup (timezone + currency, both
respected app-wide), branded email, onboarding, and account deletion.

Remaining nice-to-haves (not blocking):
- Buy a domain (~$10/yr) → domain-authenticate the sender in Brevo for
  inbox deliverability; then also move the app off `*.vercel.app`.
- `calculations.ts` validation-error strings show a bare number instead
  of a currency symbol (pure module, no currency context).
- Auth pages (`/`, `/auth/*`) went from static to dynamic because
  `layout.tsx` now reads cookies for currency — negligible, but could
  be optimised.

---

## What already exists (the foundation)

- Supabase Auth manages sessions via cookies (`@supabase/ssr`,
  `src/lib/supabase/{client,server}.ts`).
- **Every table has `user_id` + RLS `auth.uid() = user_id`.** Data
  isolation is already complete — adding more users exposes nothing.
- Login page at `src/app/page.tsx` (email + password today).
- `getAuthUserId()` helper; per-page `redirect("/")` auth gating.

So this is not a re-architecture. It's: an open front door (sign-up), a
hallway (session middleware), and a preferences drawer (profiles +
settings page).

---

## 1. Open sign-up

**Decision (locked in):** password-based auth. Users sign up with email +
password; a 6-digit OTP verifies the email on signup and is also the
mechanism for password reset. No magic-link-only login.

### Supabase dashboard (no code)
- [ ] Authentication → Sign In / Providers → Email:
  - Email provider ON
  - **Enable Email OTP** ON (used for the signup confirm code and the
    password-reset code)
  - **"Allow new users to sign up"** ON (currently OFF)
  - **"Confirm email"** ON (signups must verify)
  - Set a **minimum password length** (8+); enable the leaked-password
    (HIBP) check if offered.
- [ ] Authentication → URL Configuration: Site URL = Vercel domain; add
      redirect URLs (`https://<domain>/**` and `http://localhost:3000/**`).
- [ ] Authentication → Sessions: leave default.

### Code — three flows
- [ ] **Sign up** — email + password → `signUp({ email, password })` →
      Supabase emails a 6-digit code → `verifyOtp({ email, token, type:
      "signup" })` → verified + session.
- [ ] **Log in** — email + password → `signInWithPassword` (roughly the
      current `src/app/page.tsx`, minus the 2s fake delay).
- [ ] **Forgot password** — email → `resetPasswordForEmail` (or
      `signInWithOtp`) → 6-digit code → `verifyOtp({ ..., type:
      "recovery" })` → `updateUser({ password })`.
- [ ] New user (no budget heads yet) → route to `/setup` / first-run
      wizard, not an empty dashboard.
- [ ] Handle error states everywhere: wrong code, expired code, typo'd
      email, weak password, email already registered, rate-limited.

---

## 2. Email delivery (do not skip before sharing)

Supabase's built-in email sender is throttled to a few per hour — fine
for building/testing with a handful of addresses, not for real users.

- [ ] Authentication → Emails → SMTP Settings: connect Resend / Postmark
      / SES / Brevo (free tiers are enough).
- [ ] "From" address on a domain you control (needs DNS records —
      SPF/DKIM — so not a "sleepy" task).
- [ ] Brand both templates: **Confirm signup** and **Reset password**.

---

## 3. "Stay logged in"

- [ ] **Add `src/middleware.ts`** — the standard `@supabase/ssr`
      middleware that refreshes the session cookie and rotates the
      refresh token on every request. There is none today; this is the
      single biggest fix for "logging in again and again". Also move
      auth gating here (one place instead of per-page redirects).
- [ ] Authentication → Sessions: set JWT expiry (default 1h,
      auto-refreshed) and session time-box (or leave unlimited).
- [ ] **No "Remember me" checkbox** — Supabase persists sessions by
      default; a budget app should always remember.

---

## 4. Settings page + gear icon

- [ ] Gear icon top-right of `/home` (mirrors the Developer Logs button
      on the left).
- [ ] New `/settings` page: email (read-only), **timezone**,
      **currency**, Log out, Delete account.
- [ ] Server component reads current prefs; client form saves via a
      server action.

---

## 5. Preferences storage — `profiles` table

Standard Supabase pattern. Run in the SQL editor:

- [ ] `profiles (id uuid primary key references auth.users(id) on delete
      cascade, timezone text, currency text default 'INR', display_name
      text, created_at timestamptz default now())`
- [ ] RLS: `auth.uid() = id` for select / insert / update.
- [ ] `handle_new_user()` trigger function + trigger on `auth.users`
      insert → auto-creates a blank profile for every signup.
- [ ] Backfill: insert profile rows for the existing 2 users.

(Alternative: stash `{timezone, currency}` in `auth.users`
`user_metadata` — works for 2 fields, skips the table, but a real
profiles table is worth having anyway.)

---

## 6. Currency

- [ ] `currency` column on profiles (default `'INR'`).
- [ ] One `formatMoney(amount, currency)` helper; replace the ~40
      hardcoded `₹` / `toLocaleString("en-IN")` sites with it.
- [ ] PDF report: the "Rs vs ₹" font issue applies per currency — the
      embedded font must have the glyph, else fall back to the ISO code.
      See `memory/monthly-report-pdf.md`.
- [ ] Display-only. No FX conversion — each user's numbers render in
      their own currency.

---

## 7. Timezone (folds in the old timezone-plan memory)

**Principle:** every "what day / what month is it" decision resolves to
the *viewer's* local day — not the server's (UTC on Vercel), not a
hardcoded zone.

- [ ] `viewerNow()` / `viewerToday()` helper in `src/lib/time.ts` that
      reads `profile.timezone` (fallback `'Asia/Kolkata'`).
- [ ] Detect the browser zone on signup
      (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and store it
      on the profile; let the settings page override it.
- [ ] Sweep the server-side date sites (client-side date code already
      uses the browser clock and is fine):

| Location | What it drives |
|---|---|
| `home/page.tsx` + `home/homeSummary.ts` | bill pill "due in N days", "₹/day" divisor, month-end nudge (28th) — **currently hardcoded IST via `nowInIST()`** |
| `daily-spending/page.tsx` → `getCurrentMonthStart()` | which month's pool loads |
| `daily-spending/page.tsx` → `todayDay` | calendar "today" highlight + Add-form default date (`SpendingCalendar` inherits this prop) |
| `dashboard/page.tsx` → `getCurrentMonthStart()` | default month + past/future gate |
| `dashboard/actions.ts` (~7 `currentMonthStart` spots) | "edit current/future months only" gates + future-month propagation |
| `daily-spending/actions.ts` → `getSpendingReport` | default report "to" date |

- [ ] Leave alone (not timezone bugs): `new Date().toISOString()` storage
      stamps; `toLocaleString("en-IN")` number formatting; month-label
      formatting from `"YYYY-MM-01"` strings; `isValidDate` (pure UTC by
      design).
- [ ] Current state: `src/lib/time.ts` has `nowInIST()` (hardcoded IST)
      wired into the home page only. Everything else server-side is on
      UTC. Replace `nowInIST()` with the profile-aware helper.

---

## 8. What real users will expose

- [ ] **Onboarding** — a brand-new user has no salary, no heads, no
      categories. Guided first run, not empty pages. (Categories are
      seeded on first `/daily-spending` visit — verify that still fires.)
- [ ] **Account deletion** — audit every data table is `references
      auth.users(id) on delete cascade` (migration if not); then delete
      is one call.
- [ ] **Privacy note** — one line: data is yours, stored in Supabase.
- [ ] **Cost** — Supabase free tier is fine for a long time for an app
      this light. First limit you'll hit is auth email rate → hence
      real SMTP (section 2).

---

## Who does what

| Where | What |
|---|---|
| **Supabase dashboard** (click) | enable OTP · URL config · SMTP · email templates · session settings |
| **Supabase SQL editor** (run migrations Claude writes) | `profiles` table + RLS · new-user trigger · cascade-delete audit · backfill |
| **Code** (Claude) | `middleware.ts` · auth pages · settings page + icon · `viewerNow()` · `formatMoney()` · onboarding |

---

## Suggested order

1. Supabase config — enable OTP, sign-ups, confirm-email, URLs (section 1)
2. `src/middleware.ts` — session refresh + auth gating (section 3)
3. `profiles` table + trigger + backfill (section 5)
4. Auth UI — sign up / log in / forgot password (section 1)
5. Settings page + gear icon (section 4)
6. Timezone sweep via profile-aware `viewerNow()` (section 7)
7. Currency sweep via `formatMoney()` (section 6)
8. Onboarding + privacy note (section 8)
9. Real SMTP + branded templates before sharing (section 2)
