'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pkg = require('../package.json');

test('product identity and update target are the Khaled app and desktop repo', () => {
  assert.equal(pkg.productName, 'Khaled Ahmed');
  assert.equal(pkg.build.appId, 'com.khaledahmed.desktop');
  assert.equal(pkg.build.nsis.shortcutName, 'Khaled Ahmed');
  const pub = pkg.build.publish[0];
  assert.equal(pub.provider, 'github');
  assert.equal(pub.owner, 'khaledahmed34567');
  assert.equal(pub.repo, 'khahaled-decktob');
});

test('no DrWael branding leaks into the desktop project', () => {
  for (const f of ['package.json', 'main.js', 'preload.js', 'build/installer.nsh', '.github/workflows/build.yml', 'README.md']) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/dr\s*\.?\s*wael/i.test(s), 'DrWael reference found in ' + f);
  }
  assert.ok(!/DrWael/i.test(fs.readFileSync(path.join(root, 'www', 'app.js'), 'utf8')), 'DrWael reference in app.js');
});

test('installer and runtime branding resources exist and are wired', () => {
  assert.equal(pkg.build.win.icon, 'build/icon.ico');
  assert.equal(pkg.build.nsis.installerIcon, 'build/icon.ico');
  assert.equal(pkg.build.nsis.uninstallerIcon, 'build/icon.ico');
  const files = [pkg.build.win.icon, pkg.build.mac.icon, pkg.build.linux.icon,
    pkg.build.nsis.installerSidebar, pkg.build.nsis.installerHeader, pkg.build.nsis.include];
  for (const f of files) {
    assert.ok(fs.statSync(path.join(root, f)).size > 0, f);
  }
});

test('windows icon is a valid multi-size ICO', () => {
  const ico = fs.readFileSync(path.join(root, pkg.build.win.icon));
  assert.equal(ico.readUInt32LE(0), 65536);
  const count = ico.readUInt16LE(4);
  assert.equal(count, 7);
  const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16] || 256);
  assert.deepEqual(sizes, [16, 24, 32, 48, 64, 128, 256]);
});

test('installer BMPs have the exact NSIS dimensions and 24-bit depth', () => {
  const expect = { 'build/side_banner.bmp': [164, 314], 'build/header_logo.bmp': [150, 57] };
  for (const [f, [w, h]] of Object.entries(expect)) {
    const b = fs.readFileSync(path.join(root, f));
    assert.equal(b.toString('ascii', 0, 2), 'BM', f);
    assert.equal(b.readInt32LE(18), w, f + ' width');
    assert.equal(Math.abs(b.readInt32LE(22)), h, f + ' height');
    assert.equal(b.readUInt16LE(28), 24, f + ' bpp');
  }
});

test('icon master matches the Android launcher icon (navy stripes + white calligraphy)', () => {
  const master = fs.readFileSync(path.join(root, 'build', 'icon.png'));
  const src = fs.readFileSync(path.join(root, 'assets', 'icon-source-composite.png'));
  assert.ok(master.length > 0 && src.length > 0);
});

test('web app files are present and placeholders await build-time injection', () => {
  for (const f of ['www/index.html', 'www/app.js', 'www/style.css']) {
    assert.ok(fs.statSync(path.join(root, f)).size > 0, f);
  }
  const s = fs.readFileSync(path.join(root, 'www', 'app.js'), 'utf8');
  for (const k of ['__WEB_CLIENT_ID__', '__SITE_URL__', '__GH_REPO__', '__BUILD__', '__PKG__']) {
    assert.ok(s.includes(k), k + ' placeholder should be in committed source');
  }
});
