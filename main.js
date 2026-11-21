'use strict';
const { app, BrowserWindow, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const APP_NAME = 'Khaled Ahmed';
const APP_ID = 'com.khaledahmed.desktop';
const BG = '#000000';

let win = null;
let server = null;
let autoUpdater = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(start).catch((e) => {
    console.error(e);
    app.quit();
  });
}

app.setAppUserModelId(APP_ID);
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf'
};

function startServer() {
  const root = path.join(__dirname, 'www');
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        let p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
        if (p === '/' || p === '') p = '/index.html';
        const file = path.normalize(path.join(root, p));
        if (file !== root && !file.startsWith(root + path.sep)) {
          res.writeHead(403);
          res.end();
          return;
        }
        fs.readFile(file, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
          });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500);
        res.end();
      }
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function initUpdater() {
  if (!app.isPackaged) return;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => {
    const v = info && info.version ? ' (' + info.version + ')' : '';
    const opts = {
      type: 'info',
      title: 'تحديث جديد',
      message: 'تم تنزيل تحديث جديد' + v,
      detail: 'أعد تشغيل التطبيق الآن لتثبيته، أو سيُثبّت تلقائيًا عند الإغلاق.',
      buttons: ['إعادة التشغيل الآن', 'لاحقًا'],
      defaultId: 0,
      cancelId: 1
    };
    const p = win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts);
    p.then((r) => {
      if (r.response === 0) autoUpdater.quitAndInstall();
    }).catch(() => {});
  });
  autoUpdater.on('error', () => {});
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    try {
      autoUpdater.checkForUpdates().catch(() => {});
    } catch (e) {}
  }, 6 * 60 * 60 * 1000);
}

function authPopupAllowed(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (
      u.hostname === 'accounts.google.com' ||
      u.hostname.endsWith('.firebaseapp.com') ||
      u.hostname.endsWith('.googleapis.com') ||
      u.hostname.endsWith('.google.com')
    );
  } catch (e) {
    return false;
  }
}

async function start() {
  server = await startServer();
  const port = server.address().port;
  const origin = 'http://127.0.0.1:' + port;
  const iconPath = path.join(__dirname, 'build', 'icon.png');

  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() !== 'window') return;
    contents.setWindowOpenHandler(({ url }) => {
      if (authPopupAllowed(url)) return { action: 'allow' };
      try {
        const u = new URL(url);
        if (u.protocol === 'https:' || u.protocol === 'http:') shell.openExternal(url);
      } catch (e) {}
      return { action: 'deny' };
    });
  });

  win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: BG,
    autoHideMenuBar: true,
    title: APP_NAME,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (authPopupAllowed(url)) return { action: 'allow' };
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' || u.protocol === 'http:') shell.openExternal(url);
    } catch (e) {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(origin)) {
      e.preventDefault();
      try {
        shell.openExternal(url);
      } catch (err) {}
    }
  });
  win.on('closed', () => {
    win = null;
  });

  win.loadURL(origin + '/index.html');
  initUpdater();
}

app.on('window-all-closed', () => {
  app.quit();
});
app.on('activate', () => {
  if (win === null && app.isReady()) start().catch(() => {});
});
app.on('quit', () => {
  if (server) {
    try {
      server.close();
    } catch (e) {}
  }
});
