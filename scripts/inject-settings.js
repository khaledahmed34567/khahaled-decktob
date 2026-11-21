'use strict';
// Injects build-time settings into www/app.js (placeholders) and applies the
// desktop guard for the in-app APK update check. Fails loudly if a marker is
// missing so a silent source change can never ship a broken config.
const fs = require('fs');
const path = require('path');

const root = process.env.KA_PROJECT_ROOT || path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const file = path.join(root, 'www', 'app.js');
let s = fs.readFileSync(file, 'utf8');

const repo = (process.env.GH_REPO || 'khaledahmed34567/khahaled-decktob').trim();
const buildNo = (process.env.BUILD_NO || '1').trim();
const siteUrl = (process.env.SITE_URL || '').trim();
const webClientId = (process.env.WEB_CLIENT_ID || '').trim();

const pairs = [
  ['__WEB_CLIENT_ID__', webClientId],
  ['__SITE_URL__', siteUrl],
  ['__GH_REPO__', repo],
  ['__BUILD__', buildNo],
  ['__PKG__', String(pkg.version)]
];
for (const [k, v] of pairs) {
  if (!s.includes(k)) {
    console.error('inject-settings: placeholder missing in www/app.js: ' + k);
    process.exit(1);
  }
  s = s.split(k).join(v);
}

const checkSig = 'async function checkUpdate(manual){';
if (!s.includes(checkSig)) {
  console.error('inject-settings: checkUpdate signature not found');
  process.exit(1);
}
s = s.replace(
  checkSig,
  checkSig + "if(window.KA_DESKTOP){if(manual)toast('التحديث التلقائي مفعّل في نسخة سطح المكتب');return}"
);

const updSig = "var sm=row.querySelector('small'),repo=cfg('GH_REPO')||REPO_DEF,cur=await curBuild();";
if (!s.includes(updSig)) {
  console.error('inject-settings: updStatus signature not found');
  process.exit(1);
}
s = s.replace(
  updSig,
  "var sm=row.querySelector('small');if(window.KA_DESKTOP){sm.textContent='نسخة سطح المكتب، التحديث التلقائي مفعّل من مستودع الإصدارات';return}var repo=cfg('GH_REPO')||REPO_DEF,cur=await curBuild();"
);

fs.writeFileSync(file, s, 'utf8');
console.log('inject-settings: OK (repo=' + repo + ', build=' + buildNo + ', version=' + pkg.version + ')');
