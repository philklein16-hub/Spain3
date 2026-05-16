// =============================================================
// AUTH GUARD — runs synchronously on every protected page
// Add to any page that should require login:
//   <script src="auth-guard.js"></script>
// (Place right before </head>)
// =============================================================
(function () {
  // 1. Hide page immediately (CSS rule hides <html> while .auth-pending)
  document.documentElement.classList.add('auth-pending');

  // 2. Fast synchronous check for any Supabase session token.
  //    Format: sb-<project-ref>-auth-token
  var hasSession = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) {
        hasSession = true;
        break;
      }
    }
  } catch (e) {
    // localStorage blocked (private mode, etc.) — treat as no session
  }

  // 3. No token at all → redirect immediately, before any other script runs.
  //    Preserve the intended destination so login can return there.
  if (!hasSession) {
    var redirect = encodeURIComponent(location.pathname + location.search);
    location.replace('login.html?redirect=' + redirect);
    return;
  }

  // 4. Token exists. Lazy-load the SDK + config + auth.js to verify it
  //    server-side. auth.js will either reveal the page or redirect.
  function loadScript(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;            // preserve execution order
    s.onload = onload || null;
    s.onerror = function () {
      console.error('[auth-guard] Failed to load ' + src);
      // Fail closed: redirect to login if we can't verify the session
      location.replace('login.html');
    };
    document.head.appendChild(s);
  }

  loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', function () {
    loadScript('auth-config.js', function () {
      loadScript('auth.js');
    });
  });
})();
