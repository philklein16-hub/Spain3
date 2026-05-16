// =============================================================
// AUTH CORE — Supabase client + helpers + user pill
// Loaded by auth-guard.js on protected pages, and inline on login.html
// =============================================================
(function () {
  if (!window.supabase) {
    console.error('[auth] Supabase SDK not loaded');
    return;
  }
  if (!window.AUTH_CONFIG) {
    console.error('[auth] auth-config.js not loaded');
    return;
  }

  var cfg = window.AUTH_CONFIG;

  // Bail loudly if the user forgot to configure
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('YOUR-') !== -1 ||
      !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.indexOf('YOUR_') !== -1) {
    document.documentElement.classList.remove('auth-pending');
    console.error('[auth] auth-config.js is not configured. Edit it with your Supabase URL and anon key.');
    if (location.pathname.indexOf('login.html') === -1) {
      // On a protected page, show a clear message
      document.body.innerHTML = '<div style="font-family:system-ui;padding:40px;max-width:600px;margin:0 auto;color:#1a1f2e"><h1>Auth not configured</h1><p>Edit <code>auth-config.js</code> with your Supabase project URL and anon key, then redeploy.</p></div>';
    }
    return;
  }

  // Single shared client instance
  var client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession:      true,
      autoRefreshToken:    true,
      detectSessionInUrl:  true,    // for password reset / email confirmation links
      flowType:            'pkce'   // more secure than implicit flow
    }
  });

  // Public API
  window.SpainAuth = {
    client: client,
    config: cfg,

    getSession: function () {
      return client.auth.getSession().then(function (r) { return r.data.session; });
    },

    getUser: function () {
      return client.auth.getUser().then(function (r) { return r.data.user; });
    },

    signIn: function (email, password) {
      return client.auth.signInWithPassword({ email: email, password: password });
    },

    signUp: function (email, password) {
      return client.auth.signUp({
        email: email,
        password: password,
        options: { emailRedirectTo: location.origin + basePath() + 'login.html' }
      });
    },

    signOut: function () {
      return client.auth.signOut().then(function () {
        location.replace(cfg.LOGIN_PAGE);
      });
    },

    resetPassword: function (email) {
      return client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + basePath() + 'login.html'
      });
    },

    updatePassword: function (newPassword) {
      return client.auth.updateUser({ password: newPassword });
    },

    onAuthChange: function (cb) {
      return client.auth.onAuthStateChange(cb);
    }
  };

  function basePath() {
    // e.g. "/spain-trip/" or "/"
    return location.pathname.replace(/[^/]*$/, '');
  }

  var isLoginPage = location.pathname.indexOf('login.html') !== -1;

  // Verify session server-side on every protected page load
  if (!isLoginPage) {
    client.auth.getSession().then(function (result) {
      var session = result.data.session;
      if (!session) {
        // Stale/invalid token — bounce to login
        var redirect = encodeURIComponent(location.pathname + location.search);
        location.replace(cfg.LOGIN_PAGE + '?redirect=' + redirect);
        return;
      }
      // Valid session — reveal page and inject user pill
      document.documentElement.classList.remove('auth-pending');
      injectUserPill(session.user);
    }).catch(function (err) {
      console.error('[auth] getSession failed', err);
      location.replace(cfg.LOGIN_PAGE);
    });
  }

  // React to auth state changes (token refresh, sign-out from another tab, etc.)
  client.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT' && !isLoginPage) {
      location.replace(cfg.LOGIN_PAGE);
      return;
    }
    if (event === 'SIGNED_IN' && session && !isLoginPage) {
      injectUserPill(session.user);
    }
    if (event === 'PASSWORD_RECOVERY' && isLoginPage) {
      // Supabase delivered the user to login.html with a recovery token
      // login.html can listen for this to show the "set new password" form
      window.dispatchEvent(new CustomEvent('auth:password-recovery'));
    }
  });

  // ---- User pill (email + sign-out) injected into .nav ------------
  function injectUserPill(user) {
    if (!user) return;
    var nav = document.querySelector('.nav');
    if (!nav || nav.querySelector('.auth-pill')) return;

    var firstPart = (user.email || 'You').split('@')[0];
    var pill = document.createElement('div');
    pill.className = 'auth-pill';
    pill.setAttribute('role', 'group');
    pill.setAttribute('aria-label', 'Account');

    var who = document.createElement('span');
    who.className = 'auth-pill-email';
    who.title = user.email || '';
    who.textContent = firstPart;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'auth-pill-signout';
    btn.textContent = 'Sign out';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '…';
      window.SpainAuth.signOut();
    });

    pill.appendChild(who);
    pill.appendChild(btn);
    nav.appendChild(pill);
  }
})();
