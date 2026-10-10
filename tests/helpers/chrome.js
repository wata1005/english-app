// Runs the built index.html in headless Chrome with an injected probe script and returns the probe's JSON result.
// The probe must call `window.__done(result)` (synchronously or later).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const hasChrome = fs.existsSync(CHROME);

function runInChrome(probeBody, { legacy = null, budgetMs = 3000 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eigo-test-'));
  try {
    // Seed localStorage before the app script runs: clear it, then optionally put a legacy save.
    const seed = `<script>localStorage.clear();${legacy ? `localStorage.setItem('eigo-asobi-v1', ${JSON.stringify(legacy)});` : ''}
window.__errors = []; window.addEventListener('error', e => window.__errors.push(String(e.message)));
window.__done = r => { const pre = document.createElement('pre'); pre.id = 'RESULT'; pre.textContent = JSON.stringify({ result: r, errors: window.__errors }); document.body.appendChild(pre); };</script>`;
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const probe = `<script>(function () { try { ${probeBody} } catch (e) { window.__errors.push('probe: ' + e.message); window.__done(null); } })();</script>`;
    const file = path.join(dir, 'page.html');
    fs.writeFileSync(file, html.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + seed) + probe);
    // The default headless profile is fine because the seed clears localStorage (a fresh --user-data-dir makes Chrome linger).
    const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--window-size=500,900', `--virtual-time-budget=${budgetMs}`, '--dump-dom', 'file://' + file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
    const m = /<pre id="RESULT">([^<]*)<\/pre>/.exec(dom);
    if (!m) throw new Error('probe did not finish');
    const text = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return JSON.parse(text);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { runInChrome, hasChrome };
