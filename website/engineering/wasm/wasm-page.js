/* The version stamp, as a FILE rather than an inline <script>.

   The engineering pages carry no CSP of their own today, so an inline script
   would work here — but the home page's did too, right up until M3 gave that
   page a policy and the stamp went dead with nothing failing anywhere a test
   could see it. A file costs nothing and cannot be broken by a policy added
   later (tests/unit/csp.test.mjs). */
const stamp = document.getElementById('site-version')
if (stamp) fetch('/version.txt', { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : 'dev'))
    .then(v => { stamp.textContent = v.trim() })
    .catch(() => {})
