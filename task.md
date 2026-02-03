# Task: Schedule Send Architecture (Local Worker)
This task tracks the implementation of a "Schedule Send" feature for LinkedIn, Email, and SMS that runs without server-side credentials by using a local automation worker.

## Goals
- Allow users to schedule messages in the UI.
- Execute sends on the user's local machine using their existing login sessions (LinkedIn) and local apps (Messages, Mail).

## Phase 1: Database Setup
- [x] **Verify `scheduled_outreach` Table**
    - [x] Ensure the table exists in Supabase.
    - [x] Confirm RLS policies allow the user to read/write their own rows.

## Phase 2: UI Implementation
- [x] **Create `ScheduleModal` Component** (Integrated into `OutreachEmailsPage`)
- [x] **Update `OutreachEmailsPage`**
    - [x] Add a "Schedule" button.
    - [x] Connect button to `scheduled_outreach` table.
- [x] **Dashboard / Status View**
    - [x] "Upcoming Outreach" card exists.

## Phase 3: Local Worker Implementation
This is the core "agent" that runs on the user's machine.

- [x] **Setup Worker Script**
    - [x] Create `scripts/worker.ts`.
    - [x] Add dependencies: `puppeteer`, `dotenv`. (Run `npm install` if missing).
    - [x] Script loops/polls Supabase.
- [x] **Implement Channels**
    - [x] **LinkedIn**: Uses Puppeteer to launch Chrome.
    - [x] **SMS (Mac)**: Uses `osascript` (AppleScript).
    - [x] **Email (Mac)**: Uses `osascript` (AppleScript).
- [x] **Update Status**
    - [x] Updates row `status` to 'sent' after success.

## How to Run
1. Ensure dependencies are installed: `npm install`
2. Run the worker: `npm run worker`
3. Keep the terminal open. The worker will poll for messages every minute.
