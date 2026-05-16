// =============================================================
// SUPABASE AUTH CONFIGURATION
// -------------------------------------------------------------
// Edit ONLY these values. Do not edit auth.js or auth-guard.js.
//
// SETUP:
//   1. Create a free Supabase project at https://supabase.com
//   2. Project Settings → API → copy "Project URL" and "anon public key"
//   3. Paste them below
//   4. Auth → URL Configuration → add your GitHub Pages URL
//      (e.g. https://YOUR-USERNAME.github.io/spain-trip/) to
//      "Site URL" AND "Redirect URLs"
//   5. Auth → Providers → Email → toggle "Confirm email" OFF for
//      personal use (or configure SMTP if you want verification)
//   6. (Recommended) Auth → Providers → Email → toggle "Enable
//      Signups" OFF once you've created Phil's + Sarah's accounts
//
// The anon key is SAFE to commit to a public repo. It's designed
// for client-side use. Real security comes from Row-Level Security
// policies on your database tables (not needed for auth alone).
// =============================================================

window.AUTH_CONFIG = {
  // From Supabase → Project Settings → API
  SUPABASE_URL:      'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_PUBLIC_KEY_HERE',

  // Where to send users after they sign in
  LOGIN_REDIRECT: 'index.html',

  // The unprotected login page
  LOGIN_PAGE: 'login.html',

  // Allow new account creation from the login page.
  // Set to false once Phil's & Sarah's accounts exist.
  ALLOW_SIGNUP: true,

  // Allow "Forgot password?" flow (sends reset email)
  ALLOW_RESET: true
};
