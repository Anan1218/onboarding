# Accountability App - Build Progress

Each phase is independently testable. We verify it works before moving on.

---

## Phase 1: Hello World
**Goal:** App runs on your phone with basic navigation
**Test:** Open app on Expo Go, see tabs, navigate between screens

- [ ] Create Expo project
- [ ] Verify it runs on Expo Go
- [ ] Set up folder structure
- [ ] Create placeholder screens (Dashboard, Create, History, Profile)
- [ ] Verify tab navigation works

**Checkpoint:** App opens, you can tap between tabs

---

## Phase 2: Supabase Connection
**Goal:** App connects to Supabase, can read/write data
**Test:** Press a button, see data appear in Supabase dashboard

- [ ] Create Supabase project
- [ ] Add environment variables
- [ ] Create `shared/lib/supabase.ts` client
- [ ] Create `profiles` table only
- [ ] Add a test button that writes to profiles table
- [ ] Verify data appears in Supabase dashboard

**Checkpoint:** Button tap → row appears in Supabase

---

## Phase 3: Email Auth
**Goal:** User can sign up, log in, log out with email
**Test:** Create account, log out, log back in, sessions persist after restart

- [ ] Create auth screens (login/signup) with basic forms
- [ ] Create AuthContext for session state
- [ ] Implement email signup
- [ ] Implement email login
- [ ] Implement logout
- [ ] Add auth guard (redirect to login if not authenticated)
- [ ] Test session persistence

**Checkpoint:** Full email auth flow works, sessions persist

---

## Phase 4: User Profile
**Goal:** Logged-in user has a profile they can view/edit
**Test:** Sign up → auto-create profile → view profile → edit username

- [ ] Create profile on signup
- [ ] Build Profile screen showing user info
- [ ] Add edit functionality (username, venmo handle)
- [ ] Verify profile updates save to database

**Checkpoint:** User can see and edit their profile

---

## Phase 5: Create a Goal (Solo)
**Goal:** User can create a goal and see it on dashboard
**Test:** Fill form → submit → see goal appear in list

- [ ] Create `goals` table in Supabase
- [ ] Build GoalForm component
- [ ] Build GoalCard component
- [ ] Wire up Create screen with form
- [ ] Wire up Dashboard to list user's goals
- [ ] Verify goal appears after creation

**Checkpoint:** Create goal → see it on dashboard

---

## Phase 6: Invite Link & Join (For Friend Bets)
**Goal:** Share a link, friend opens it, joins the bet
**Test:** Create bet → copy link → open in browser → friend joins

- [ ] Generate invite code on bet creation
- [ ] Build InviteLink component (copy to clipboard)
- [ ] Create `bet_participants` table
- [ ] Build join flow (`app/join/[code].tsx`)
- [ ] Handle: not logged in → signup → then join
- [ ] Show both participants on bet detail

**Checkpoint:** Two users connected on same bet via invite link

---

## Phase 7: Photo Upload (No AI)
**Goal:** User can upload a photo as proof
**Test:** Take photo → upload → see it displayed in goal detail

- [ ] Create `proof_submissions` table
- [ ] Create `proofs` storage bucket
- [ ] Build ProofUploader component (camera + gallery)
- [ ] Upload photo to Supabase Storage
- [ ] Create proof_submission record
- [ ] Display uploaded proof in goal detail

**Checkpoint:** Photo uploads and displays correctly

---

## Phase 8: AI Verification
**Goal:** Uploaded photo gets analyzed by Gemini
**Test:** Upload photo → see AI verdict + reasoning

- [ ] Deploy `verify-proof` edge function
- [ ] Add Gemini API key to Supabase secrets
- [ ] Call edge function after upload
- [ ] Build VerificationResult component
- [ ] Display AI verdict (pass/fail + reasoning)

**Checkpoint:** AI analyzes photo and returns verdict

---

## Phase 9: Apple Subscription Setup
**Goal:** Set up App Store Connect subscriptions
**Test:** See subscription products in app, can initiate purchase

- [ ] Create App Store Connect subscription group
- [ ] Create subscription products ($5, $10, $20, $50 stakes)
- [ ] Configure free trial durations (3, 7, 14, 30 days)
- [ ] Install `react-native-iap`
- [ ] Fetch available products in app
- [ ] Display stake options when creating goal

**Checkpoint:** Can see subscription products, prices load correctly

---

## Phase 10: Apple Trial Flow
**Goal:** User stakes money via trial, gets charged if they fail
**Test:** Start trial → complete goal → trial cancelled (no charge)

- [ ] Start subscription trial when goal created
- [ ] Store subscription ID with goal record
- [ ] On AI verification success → cancel subscription
- [ ] On deadline pass without verification → user charged
- [ ] Handle App Store Server Notifications (webhooks)
- [ ] Show subscription status on goal detail

**Checkpoint:** Complete goal = no charge, fail goal = charged

---

## Phase 11: History & Polish
**Goal:** See past goals and outcomes
**Test:** Complete a goal → see it in history

- [ ] Wire up History screen with past goals
- [ ] Show outcome (completed/failed/charged)
- [ ] Add any missing UI polish

**Checkpoint:** Full app flow works end-to-end

---

## Phase 12: Google Login (Optional)
**Goal:** Add "Sign in with Google" option
**Test:** Tap Google button → OAuth flow → logged in

- [ ] Configure Google OAuth in Supabase
- [ ] Create Google Cloud OAuth credentials
- [ ] Build GoogleSignInButton component
- [ ] Add to login/signup screens

**Checkpoint:** Google OAuth works alongside email auth

---

## Phase 13: Crypto Friend Betting (Solana)
**Goal:** Two users can bet against each other with real escrow
**Test:** Both stake USDC → winner gets both stakes

- [ ] Set up Solana development environment
- [ ] Write escrow smart contract (Anchor framework)
- [ ] Deploy to Solana devnet
- [ ] Install `@solana/web3.js` and wallet adapter
- [ ] Build wallet connect UI (Phantom, Solflare)
- [ ] Create bet → both users stake USDC to escrow
- [ ] AI verifies → contract releases funds to winner
- [ ] Deploy to mainnet

**Checkpoint:** Real USDC moves between wallets based on bet outcome

---

## Phase 14: Dual Mode Support
**Goal:** User chooses between solo (Apple) or friend betting (crypto)
**Test:** Can create both types of goals from same app

- [ ] Add goal type selector (Solo vs Friend Bet)
- [ ] Solo → Apple Trial flow
- [ ] Friend Bet → Crypto escrow flow
- [ ] Different UI for each type
- [ ] Handle users without crypto wallet gracefully

**Checkpoint:** Both payment modes work in single app

---

## Current Status

**Phase:** 1 - Hello World
**Status:** Not started

---

## Payment Summary

| Mode | How it works | Money goes to |
|------|--------------|---------------|
| **Solo (Apple Trial)** | Fail goal = subscription charges | You (app revenue) |
| **Friend Bet (Crypto)** | USDC escrow, winner takes all | Friend (winner) |
