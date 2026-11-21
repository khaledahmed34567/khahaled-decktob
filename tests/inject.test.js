'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');

test('inject-settings replaces every placeholder and applies desktop guards', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ka-inject-'));
  fs.mkdirSync(path.join(tmp, 'www'), { recursive: true });
  fs.copyFileSync(path.join(root, 'www', 'app.js'), path.join(tmp, 'www', 'app.js'));
  fs.copyFileSync(path.join(root, 'package.json'), path.join(tmp, 'package.json'));
  const out = execFileSync(process.execPath, [path.join(root, 'scripts', 'inject-settings.js')], {
    env: Object.assign({}, process.env, {
      KA_PROJECT_ROOT: tmp,
      GH_REPO: 'khaledahmed34567/khahaled-decktob',
      BUILD_NO: '7',
      SITE_URL: 'https://example.test/',
      WEB_CLIENT_ID: ''
    }),
    encoding: 'utf8'
  });
  assert.match(out, /inject-settings: OK/);
  const s = fs.readFileSync(path.join(tmp, 'www', 'app.js'), 'utf8');
  assert.ok(!/__[A-Z_]+__/.test(s), 'no placeholders may remain');
  assert.ok(s.includes("GH_REPO:'khaledahmed34567/khahaled-decktob'"), 'repo injected');
  assert.ok(s.includes("BUILD:'7'"), 'build number injected');
  assert.ok(s.includes('window.KA_DESKTOP'), 'desktop guard injected');
  const guardCount = (s.match(/window\.KA_DESKTOP/g) || []).length;
  assert.equal(guardCount, 2, 'both update paths guarded');
});
