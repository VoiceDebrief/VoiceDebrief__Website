import { chromium } from 'playwright';
import { spawn, execFile } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { promisify } from 'util';
const run = promisify(execFile);
const KEY = process.env.OR_KEY;

const site = spawn('python3', ['serve-cors.py','8123','/home/user/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/website'], { stdio:'ignore' });
await new Promise(r => setTimeout(r, 900));
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--no-proxy-server'] });
const page = await browser.newPage();
await page.route('https://dev.tools.sgraph.ai/**', route => {
  const u = new URL(route.request().url());
  try { route.fulfill({ body: readFileSync('mirror'+u.pathname), contentType:'text/javascript', headers:{'access-control-allow-origin':'*'} }); }
  catch { route.fulfill({ status:404, body:'nm' }); }
});
await page.route('https://openrouter.ai/**', async route => {
  const req = route.request();
  const cors = { 'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,http-referer,x-title','access-control-allow-methods':'GET,POST,OPTIONS' };
  if (req.method()==='OPTIONS') return route.fulfill({ status:204, headers:cors });
  const args=['-sS','-m','120','-X',req.method(),req.url(),'-H','Content-Type: application/json'];
  const h=req.headers(); if(h['authorization']) args.push('-H','Authorization: '+h['authorization']);
  const b=req.postData(); if(b){ writeFileSync('.rq.json',b); args.push('--data-binary','@.rq.json'); }
  try { const { stdout } = await run('curl', args, { maxBuffer: 64*1024*1024 });
        route.fulfill({ status:200, body:stdout, headers:{...cors,'content-type':'application/json'} }); }
  catch(e){ route.fulfill({ status:502, body:String(e).slice(0,200), headers:cors }); }
});
await page.goto('http://127.0.0.1:8123/app/', { waitUntil:'domcontentloaded' });
await page.waitForFunction(() => !!window.__tool, null, { timeout: 25000 });
await page.evaluate(k => window.__tool.setApiKey({ apiKey: k }), KEY);

const bytes = Array.from(readFileSync('/home/user/SGraph-AI__SaaS__WhatsApp__Audio__Transcription/tests/fixtures/whatsapp-voice-note-2.opus'));
const CASES = [
  ['baseline .opus',      'note.opus', 'audio/ogg'],
  ['.ogg audio/ogg',      'note.ogg',  'audio/ogg'],
  ['.ogg application/ogg','note.ogg',  'application/ogg'],
  ['.ogg empty mime',     'note.ogg',  ''],
  ['.ogg video/ogg',      'note.ogg',  'video/ogg'],
  ['.oga audio/ogg',      'note.oga',  'audio/ogg'],
];
for (const [label, name, type] of CASES) {
  const r = await page.evaluate(async ({ bytes, name, type }) => {
    try {
      await window.__tool.clearAll();
      const f = new File([new Uint8Array(bytes)], name, { type });
      window.__normalised = null;
      window.addEventListener('wa:normalised', e => { window.__normalised = e.detail.reason }, { once: true });
      const r = await window.__tool.runPass({ file: f });
      return { stage:'runPass', ok: !!(r.transcript||'').trim(), detail: (r.transcript||'(EMPTY)').slice(0,62),
               norm: window.__normalised };
    } catch (e) { return { stage:'transcribe', ok:false, detail: (e.code||'') + ' ' + (e.message||String(e)).slice(0,110) }; }
  }, { bytes, name, type });
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${label.padEnd(22)} ${r.detail}\n        ↳ ${r.norm || '(no change needed)'}`);
}
await browser.close(); site.kill(); process.exit(0);
