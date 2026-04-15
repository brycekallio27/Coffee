# Coffee? – LinkedIn Contact Importer Extension

Chrome extension (Manifest V3) that scrapes LinkedIn profiles and adds contacts directly to Coffee?.

## Installing

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select this `extension/` folder
4. The Coffee? icon appears in your toolbar

## Usage

1. Navigate to any `linkedin.com/in/…` profile
2. Click the Coffee? extension icon
3. Sign in with your Coffee? account (email + password) — stored locally, one-time
4. Review / edit the pre-filled contact fields
5. Click **Add to Coffee?**

## What it scrapes

| Field | Source |
|---|---|
| First / Last Name | `<h1>` heading |
| Job Title | Parsed from headline (before " at ") |
| Company | Parsed from headline or Experience section |
| LinkedIn URL | Current page URL |
| Email | `mailto:` link — only if already visible on the profile |

> **Note on email:** LinkedIn only shows emails to connected users who've enabled it in their privacy settings. If it's not visible on the page, the email field will be blank — fill it in manually if you have it.

## Notes

- Auth token is stored in `chrome.storage.local` on your device only
- No data is sent anywhere except directly to your Supabase project
- Requires an active Coffee? account
