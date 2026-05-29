# Spain Assistant — First-Time Deploy Guide

This guide will get the in-app AI assistant working. **Estimated time: 20-30 minutes**, most of it waiting for things to install.

You'll bounce between three places:
- 🖥️ **Terminal** (the black-window app on your Mac — open with ⌘+Space, type "Terminal", hit Enter)
- 🌐 **Browser** (Safari or Chrome, for signing into things)
- 📱 **Xcode** (only at the very end)

---

## What you're building

Right now your iOS app has a ✨ floating button, but tapping it will fail because there's no server to talk to. We're going to:

1. Get an Anthropic API key (so Claude has billing attached)
2. Install a tool called "Supabase CLI" on your Mac
3. Upload a small piece of code to Supabase that acts as a middleman
4. Tell the iOS app the secret password to talk to that middleman

That's it. Let's go.

---

## STEP 1 — Get your Anthropic API key (5 minutes)

**Where:** 🌐 Browser

1. Open this URL: **https://console.anthropic.com**
2. Sign up (or sign in if you already have an account).
3. You'll need to add a credit card and put **$5 of credit** on the account. Click **Plans & Billing** in the left sidebar → **Add credit** → put $5 on it. (That $5 will last weeks of personal use — Claude is roughly $3 per million tokens, and a normal chat message is a few hundred tokens.)
4. In the left sidebar click **API Keys** → **Create Key**.
5. Name it `SpainTrip iOS`.
6. **COPY THE KEY IMMEDIATELY.** It looks like `sk-ant-api03-abc123...` and starts with `sk-ant-`. **You won't be able to see it again** after closing this window.
7. Paste it into a Notes app or somewhere safe for now. We'll use it in Step 4.

✅ **You should now have:** an Anthropic API key in a Notes app, starting with `sk-ant-`.

---

## STEP 2 — Install Homebrew (skip if you already have it)

**Where:** 🖥️ Terminal

Homebrew is a tool that installs other tools. You may already have it from the iOS build process.

Check if it's installed by running:

```bash
brew --version
```

- ✅ If you see `Homebrew 4.something` → **skip to Step 3**.
- ❌ If you see `command not found: brew` → run this exact command (copy-paste the whole thing):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It will ask for your Mac password (the one you log in with). Type it (it won't show characters as you type — that's normal) and hit Enter. Installation takes 3-5 minutes.

When it finishes, it will print 2-3 lines under "Next steps:" telling you to run two `echo` commands and one `eval` command. **Copy and run them exactly as shown** — they add Homebrew to your shell so it works in future Terminal windows.

✅ **You should now be able to run `brew --version` and see a version number.**

---

## STEP 3 — Install the Supabase CLI (2 minutes)

**Where:** 🖥️ Terminal

Run:

```bash
brew install supabase/tap/supabase
```

Wait for it to finish (about 1-2 minutes).

Verify it worked:

```bash
supabase --version
```

✅ **You should see a version number like `2.something`.**

---

## STEP 4 — Log into Supabase from Terminal (2 minutes)

**Where:** 🖥️ Terminal → 🌐 Browser → 🖥️ Terminal

Run:

```bash
supabase login
```

This will:
1. Print a URL.
2. **Automatically open your browser** to that URL.
3. Ask you to sign into Supabase (use the same Google/email account you used for your web app's Supabase project).
4. Show a page that says "Authorize Supabase CLI" — click **Authorize**.
5. The browser will say something like "You can now close this window."
6. Go back to Terminal — you'll see `Finished supabase login.`

✅ **You should be logged in.**

---

## STEP 5 — Link Terminal to your Supabase project (1 minute)

**Where:** 🖥️ Terminal

First, navigate into your trip project folder. **Copy this command exactly:**

```bash
cd /Users/philklein/Desktop/spain-trip
```

Now link this folder to your existing Supabase project:

```bash
supabase link --project-ref uvujjniuwsgmuxbtbkns
```

It may ask for a **database password**. If you remember it, type it. If you don't, **just press Enter** — we don't need the database for this feature, only edge functions.

✅ **You should see:** `Finished supabase link.`

---

## STEP 6 — Generate a "shared secret" password (30 seconds)

**Where:** 🖥️ Terminal

This is a random password that the iOS app will use to identify itself to the server.

Run:

```bash
openssl rand -hex 32
```

You'll see a long string of random characters like:
```
4a8b2c9e1f3d7a5b6c8e0f2a4b6d8e0c1a3b5d7f9e1c3a5b7d9f1e3c5a7b9d1f
```

**COPY THIS STRING.** Paste it into your Notes app under "Spain Assistant Shared Secret". You'll use it twice in the next two steps.

✅ **You should now have:** the long random hex string in your Notes app.

---

## STEP 7 — Upload your secrets to the Supabase server (1 minute)

**Where:** 🖥️ Terminal

We're going to tell the server two passwords: your Anthropic API key, and the shared secret.

**Command 1** — replace `PASTE-YOUR-ANTHROPIC-KEY-HERE` with the `sk-ant-...` key from Step 1:

```bash
supabase secrets set ANTHROPIC_API_KEY=PASTE-YOUR-ANTHROPIC-KEY-HERE
```

**Command 2** — replace `PASTE-YOUR-HEX-SECRET-HERE` with the long hex string from Step 6:

```bash
supabase secrets set SPAIN_TRIP_SHARED_SECRET=PASTE-YOUR-HEX-SECRET-HERE
```

Verify both are uploaded:

```bash
supabase secrets list
```

✅ **You should see both `ANTHROPIC_API_KEY` and `SPAIN_TRIP_SHARED_SECRET` listed** (the values will be hidden — that's fine, they're stored encrypted).

---

## STEP 8 — Deploy the edge function (1 minute)

**Where:** 🖥️ Terminal

This uploads the small piece of server code I wrote (it's at `supabase/functions/spain-assistant/index.ts` in this folder).

```bash
supabase functions deploy spain-assistant --no-verify-jwt
```

Takes about 30 seconds.

✅ **You should see:** `Deployed Functions on project uvujjniuwsgmuxbtbkns: spain-assistant`

---

## STEP 9 — Test that the server works (1 minute)

**Where:** 🖥️ Terminal

Before touching Xcode, let's confirm the server is alive.

**Replace `PASTE-YOUR-HEX-SECRET-HERE`** with the same hex string from Step 6, then run:

```bash
curl -X POST \
  "https://uvujjniuwsgmuxbtbkns.functions.supabase.co/spain-assistant" \
  -H "Content-Type: application/json" \
  -H "x-spain-trip-secret: PASTE-YOUR-HEX-SECRET-HERE" \
  -d '{"system":"You are friendly.","messages":[{"role":"user","content":"Say hola in one short sentence."}]}'
```

✅ **You should see a JSON response like:**

```json
{"text":"¡Hola, amigo! Hope you're having a wonderful day.","usage":{...}}
```

If you see this — **the hard part is done.** 🎉

❌ **If you see an error**, jump to "Troubleshooting" at the bottom.

---

## STEP 10 — Tell the iOS app the shared secret (2 minutes)

**Where:** 📱 Xcode

1. Open **Xcode**.
2. Open your SpainTrip project (File → Open Recent → SpainTrip, or navigate to `/Users/philklein/Desktop/Desktop - Phil's MacBook Air/SpainTrip/SpainTrip.xcodeproj`).
3. In the left sidebar (Project Navigator), expand **SpainTrip** → **Assistant** → click **AssistantConfig.swift**.
4. Find this line (around line 22):

   ```swift
   static let sharedSecret = "REPLACE_WITH_LONG_RANDOM_STRING"
   ```

5. **Replace** `REPLACE_WITH_LONG_RANDOM_STRING` with your hex secret from Step 6 (keep the quotes). It should now look like:

   ```swift
   static let sharedSecret = "4a8b2c9e1f3d7a5b6c8e0f2a4b6d8e0c1a3b5d7f9e1c3a5b7d9f1e3c5a7b9d1f"
   ```

6. Save with ⌘S.

---

## STEP 11 — Build, run, and chat (1 minute)

**Where:** 📱 Xcode

1. At the top of Xcode, pick your iPhone (or a Simulator) from the device picker.
2. Hit ⌘R (or click the ▶️ play button).
3. App launches → unlock with Face ID.
4. Tap the **✨ floating sparkle button** in the bottom-right corner.
5. Tap one of the suggested prompts, or type your own.

✅ **Claude should reply within a few seconds.**

🎉 **You're done!** Sarah can now ask the assistant anything — *"What's a good tapas bar near our hotel tonight?"*, *"Tell me about the Royal Alcázar"*, *"What's a unique day trip from Barcelona?"* — and get answers that know your actual itinerary.

---

## Troubleshooting

### "Unauthorized" when curl-testing in Step 9
- The hex secret in your curl command doesn't match what you set in Step 7. Try Step 7 again, then Step 9 again with the same value.

### "Server misconfigured: missing ANTHROPIC_API_KEY"
- Re-run the first command in Step 7. Make sure the key starts with `sk-ant-`.

### "Upstream error" with status 401
- Your Anthropic API key is invalid or has no billing. Go back to Step 1, create a new key, and re-run Step 7's first command.

### "Upstream error" with status 429
- You've hit Anthropic's rate limit. Wait 60 seconds and try again.

### The iOS app shows an error in the chat
- The shared secret in `AssistantConfig.swift` doesn't match the one on the server. Re-do Step 10 carefully — copy-paste, don't retype.

### "command not found: supabase"
- Step 3 didn't finish. Re-run `brew install supabase/tap/supabase`.

### Anything else
- Run `supabase functions logs spain-assistant` in Terminal to see what the server is complaining about.

---

## Ongoing maintenance

- **Watch your spend:** https://console.anthropic.com/usage — a normal day of chatting is pennies.
- **View logs anytime:** `supabase functions logs spain-assistant`
- **Rotate the secret if you ever leak it:** redo Steps 6, 7 (just the second command), 10, and rebuild.
