import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
const site  = spawn('python3', ['serve-cors.py','8123','/home/user/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/website'], { stdio:'ignore' });
const tools = spawn('python3', ['serve-cors.py','8124','mirror'], { stdio:'ignore' });
await new Promise(r => setTimeout(r, 900));
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--no-proxy-server'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0,200)));
page.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text().slice(0,160)); });

// SgComponent base is imported by full URL to dev.tools.sgraph.ai — unreachable here.
// Route those two absolute URLs to the mirror for the smoke run only.
await page.route('https://dev.tools.sgraph.ai/**', route => {
  const u = new URL(route.request().url());
  try {
    const body = readFileSync('mirror' + u.pathname);
    route.fulfill({ body, contentType: u.pathname.endsWith('.js') ? 'text/javascript' : 'text/plain',
                    headers: { 'access-control-allow-origin': '*' } });
  } catch { route.fulfill({ status: 404, body: 'not mirrored' }); }
});

const ready = page.waitForEvent('console', { predicate: () => false, timeout: 100 }).catch(()=>{});
await page.goto('http://127.0.0.1:8123/app/?origin=http://127.0.0.1:8124', { waitUntil: 'domcontentloaded' });
const gotReady = await page.waitForFunction(() => !!window.__tool, null, { timeout: 20000 }).then(()=>true).catch(()=>false);
console.log('tool published:', gotReady);
if (gotReady) {
  console.log('tool name ok:', await page.evaluate(() => window.__tool.meta.health().name ?? 'n/a'));
  console.log('methods:', await page.evaluate(() => window.__tool.meta.getMethods().join(',')));
  // ingest the real WhatsApp fixture through the API (no key needed for ingest)
  const buf = readFileSync('/home/user/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/tests/fixtures/whatsapp-voice-note-1.opus');
  const added = await page.evaluate(async (bytes) => {
    const f = new File([new Uint8Array(bytes)], 'whatsapp-voice-note-1.opus', { type: 'audio/ogg' });
    const r = await window.__tool.addFiles({ files: [f] });
    return JSON.stringify(r);
  }, Array.from(buf));
  console.log('addFiles:', added);
  console.log('getItems length:', await page.evaluate(() => window.__tool.getItems().length));
  // UI states: key panel visible, drop-zone rendered in shadow DOM
  console.log('key panel rendered:', await page.evaluate(() => !!document.querySelector('wa-key-panel')?.shadowRoot?.querySelector('input')));
  console.log('drop zone rendered:', await page.evaluate(() => !!document.querySelector('wa-drop-zone')?.shadowRoot?.querySelector('.wa-drop')));
}
await page.screenshot({ path: 'app-smoke.png', fullPage: true });
console.log('page errors:', errs.length ? errs.slice(0,6) : 'none');
await browser.close(); site.kill(); tools.kill(); process.exit(0);
