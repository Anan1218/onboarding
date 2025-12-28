# Accountability App - Build Progress

Each phase is independently testable. We verify it works before moving on.

**Tech Stack:** Expo + React Native | TypeScript (strict) | NativeWind | Supabase | Gemini AI | Apple IAP

**Architecture:** Vertical slice (feature-based) | No `as` casts | ESLint Airbnb

**Detailed specs:** See `/phases/` folder for comprehensive implementation guides.

---

## Phase 1: Hello World
**Goal:** App runs on your phone with basic navigation
**Test:** Open app on Expo Go, see tabs, navigate between screens
**Spec:** [phase-01-hello-world.md](./phases/phase-01-hello-world.md)

- [ ] Create Expo project with TypeScript strict mode
- [ ] Configure NativeWind v4 (Tailwind for RN)
- [ ] Set up ESLint with Airbnb config (no `as` casts allowed)
- [ ] Create folder structure (vertical slice architecture)
- [ ] Create placeholder screens (Dashboard, Create, History, Profile)
- [ ] Verify tab navigation works

**Checkpoint:** App opens, you can tap between tabs

---

## Phase 2: Supabase Connection
**Goal:** App connects to Supabase, can read/write data
**Test:** Press a button, see data appear in Supabase dashboard
**Spec:** [phase-02-supabase-connection.md](./phases/phase-02-supabase-connection.md)

- [ ] Create Supabase project
- [ ] Add environment variables
- [ ] Create `shared/lib/supabase.ts` client
- [ ] Create `profiles` table with RLS
- [ ] Add test button that verifies connection
- [ ] Verify RLS blocks unauthorized writes

**Checkpoint:** Button tap → connection verified

---

## Phase 3: Email Auth
**Goal:** User can sign up, log in, log out with email
**Test:** Create account, log out, log back in, sessions persist after restart
**Spec:** [phase-03-email-auth.md](./phases/phase-03-email-auth.md)

- [ ] Create auth screens (login/signup) with forms
- [ ] Create AuthContext with type-safe hooks
- [ ] Implement email signup (auto-creates profile)
- [ ] Implement email login
- [ ] Implement logout with confirmation
- [ ] Add auth guard (redirect to login if not authenticated)
- [ ] Test session persistence

**Checkpoint:** Full email auth flow works, sessions persist

---

## Phase 4: User Profile
**Goal:** Logged-in user has a profile they can view/edit
**Test:** Sign up → auto-create profile → view profile → edit username
**Spec:** [phase-04-user-profile.md](./phases/phase-04-user-profile.md)

- [ ] Create profile on signup (via AuthContext)
- [ ] Build ProfileView component
- [ ] Build ProfileEditForm component
- [ ] Add edit functionality (username, venmo handle)
- [ ] Verify profile updates save to database

**Checkpoint:** User can see and edit their profile

---

## Phase 5: Create a Goal (with Recurring Habits)
**Goal:** User can create one-time goals OR recurring habits
**Test:** Create "Gym 3x/week" → see progress tracker → complete 3 times
**Spec:** [phase-05-create-goal.md](./phases/phase-05-create-goal.md)

- [ ] Create `goals` table with recurrence support
- [ ] Create `goal_completions` table for tracking recurring progress
- [ ] Build GoalForm with frequency options (once, daily, X per week/month)
- [ ] Build GoalCard showing progress (2/3 completed this week)
- [ ] Build GoalList with pull-to-refresh
- [ ] Wire up Dashboard to list active goals
- [ ] Create goal detail page with completion history

**Checkpoint:** Create recurring goal → complete it multiple times → see progress

---

## Phase 6: Accountability Partner (with Friend-Verify)
**Goal:** Share a link, friend joins and can verify your completions
**Test:** Create goal → invite friend → friend approves your completion
**Spec:** [phase-06-accountability-partner.md](./phases/phase-06-accountability-partner.md)

- [ ] Create `goal_participants` table with RLS
- [ ] Generate invite code on goal creation
- [ ] Build InviteLink component (copy to clipboard)
- [ ] Build join flow (`app/join/[code].tsx`)
- [ ] Handle: not logged in → signup → then join
- [ ] Show participants on goal detail
- [ ] **Friend-verify:** Partners can approve/reject completions
- [ ] Push notification to partner when verification needed

**Checkpoint:** Friend receives notification → approves completion → goal marked done

---

## Phase 7: Verification Types (Photo, Self, Friend)
**Goal:** Multiple ways to verify goal completion
**Test:** Create goal with each verify type → complete using that method
**Spec:** [phase-07-photo-upload.md](./phases/phase-07-photo-upload.md)

- [ ] Create `completions` table (replaces proof_submissions)
- [ ] Add `verification_type` field (photo_ai, self, friend)
- [ ] Create `proofs` storage bucket (private)
- [ ] **Photo verify:** Camera + gallery → AI verification
- [ ] **Self verify:** One-tap "I did it" button
- [ ] **Friend verify:** Request sent to partner → they approve
- [ ] Build CompletionCard component for each type
- [ ] Display completion history in goal detail

**Checkpoint:** All three verification methods work

---

## Phase 8: AI Verification
**Goal:** Uploaded photo gets analyzed by Gemini
**Test:** Upload photo → see AI verdict + reasoning
**Spec:** [phase-08-ai-verification.md](./phases/phase-08-ai-verification.md)

- [ ] Deploy `verify-proof` edge function
- [ ] Add Gemini API key to Supabase secrets
- [ ] Call edge function after upload
- [ ] Build VerificationResult component
- [ ] Display AI verdict (pass/fail + reasoning)
- [ ] Real-time updates when verification completes

**Checkpoint:** AI analyzes photo and returns verdict

---

## Phase 9: Apple Subscription Setup
**Goal:** Set up App Store Connect subscriptions
**Test:** See subscription products in app, can initiate purchase
**Spec:** [phase-09-apple-subscription-setup.md](./phases/phase-09-apple-subscription-setup.md)

- [ ] Create App Store Connect app
- [ ] Create subscription group "Accountability Stakes"
- [ ] Create products ($5, $10, $20, $50) with trial periods
- [ ] Install `react-native-iap`
- [ ] Build StakeSelector component
- [ ] Fetch and display available products
- [ ] Test sandbox purchases

**Checkpoint:** Can see subscription products, prices load correctly

---

## Phase 10: Apple Trial Flow
**Goal:** User stakes money via trial, gets charged if they fail
**Test:** Start trial → complete goal → trial cancelled (no charge)
**Spec:** [phase-10-apple-trial-flow.md](./phases/phase-10-apple-trial-flow.md)

- [ ] Start subscription trial when staked goal created
- [ ] Store subscription ID with goal record
- [ ] Deploy `apple-webhook` edge function
- [ ] On AI verification success → cancel subscription
- [ ] On deadline pass → user charged (handled by Apple)
- [ ] Build SubscriptionStatus component
- [ ] Show subscription status on goal detail

**Checkpoint:** Complete goal = no charge, fail goal = charged

---

## Phase 11: History, Notifications & Polish
**Goal:** See past goals, get notified on failures, final polish
**Test:** Fail a goal → friends get notified → see in history
**Spec:** [phase-11-history-polish.md](./phases/phase-11-history-polish.md)

- [ ] Create history service with stats
- [ ] Build HistoryStats component (completion rate, streaks)
- [ ] Build HistoryCard component
- [ ] Build HistoryList with pull-to-refresh
- [ ] **Push notifications setup** (expo-notifications)
- [ ] **Notify friends on failure** (shame notification)
- [ ] Notify user of upcoming deadlines
- [ ] Add tab bar icons
- [ ] Add loading skeletons and empty states

**Checkpoint:** Full app flow works, notifications fire correctly

---

## Phase 12: Google Login
**Goal:** Add "Sign in with Google" option
**Test:** Tap Google button → OAuth flow → logged in
**Spec:** [phase-12-google-login.md](./phases/phase-12-google-login.md)

- [ ] Configure Google OAuth in Supabase
- [ ] Create Google Cloud OAuth credentials
- [ ] Install expo-auth-session
- [ ] Build GoogleSignInButton component
- [ ] Create useGoogleAuth hook
- [ ] Add to login/signup screens
- [ ] Handle profile creation for OAuth users

**Checkpoint:** Google OAuth works alongside email auth

---

## Current Status

**Phase:** 1 - Hello World
**Status:** Not started

---

## Architecture Overview

See [phase-00-architecture.md](./phases/phase-00-architecture.md) for:
- Complete folder structure
- TypeScript strict rules
- Banned patterns (no `as`, no `any`, no `!`)
- Component/hook/service templates
- Database conventions
- Testing strategy

---

## Payment Model

| Scenario | What Happens |
|----------|--------------|
| Create goal with $10 stake | User starts subscription with 7-day trial |
| Complete goal (AI verified) | Subscription cancelled, no charge |
| Miss deadline | Trial ends, user charged $10 |
| Cancel goal early | Subscription cancelled, no charge |

The subscription trial period = goal deadline. Stakes become app revenue when users fail.
