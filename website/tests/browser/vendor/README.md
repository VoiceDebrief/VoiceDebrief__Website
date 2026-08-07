# Vendored test dependencies

| File        | What                | Version | Licence | Source                                             |
|-------------|---------------------|---------|---------|----------------------------------------------------|
| `qunit.js`  | QUnit test runner   | 2.24.1  | MIT     | https://cdn.jsdelivr.net/npm/qunit@2.24.1/qunit/   |
| `qunit.css` | QUnit visual runner | 2.24.1  | MIT     | https://cdn.jsdelivr.net/npm/qunit@2.24.1/qunit/   |

Vendored (not CDN-loaded) so the browser unit tests run offline, in CI, and in
sandboxes with no third-party network access — and so a CDN change can never
alter what the gate runs. QUnit is MIT-licensed, © OpenJS Foundation and other
contributors; the licence header is retained at the top of each file.

To upgrade: replace both files with the same-version pair from the jsdelivr URL
above and update this table.
