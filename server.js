const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, 'public');
const API_TARGET = 'https://bizflowapis.pixuate.dev';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(idx);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ──────────────────────────────────────────────
// 로컬 /custom/* mock — 카페 자동화 템플릿용
// 백엔드에 없는 custom 엔드포인트를 인메모리로 처리
// ──────────────────────────────────────────────
const mockStore = {
  staff: [],
  inventory: [],
  equipments: [],
  'staff-schedules': [],
  recipes: [],
  tables: [],
  stores: [],
  orders: [],
  'purchase-orders': [],
  'pos-sales': [],
};

function mockGetCollection(name) {
  return mockStore[name] || [];
}

function mockHandle(req, res, apiPath, body) {
  // /custom/<collection> or /custom/<collection>/<id>
  const rest = apiPath.replace(/^\/custom/, '');
  const parts = rest.split('/').filter(Boolean);
  const col = parts[0];
  const id = parts[1];
  const last = parts[parts.length - 1];

  // /custom/pos/sales?storeId=&date=
  if (col === 'pos' && last === 'sales') {
    const q = new URL(req.url, 'http://x').searchParams;
    const storeId = q.get('storeId') || 'store-demo';
    const date = q.get('date') || new Date().toISOString().split('T')[0];
    const sales = mockGetCollection('pos-sales').filter(s => s.storeId === storeId && (s.date === date || !s.date));
    json(res, 200, { data: sales });
    return;
  }
  // /custom/monthly-kpi?storeId=&month=
  if (col === 'monthly-kpi') {
    const q = new URL(req.url, 'http://x').searchParams;
    const storeId = q.get('storeId') || 'store-demo';
    const monthly = mockGetCollection('pos-sales').filter(s => s.storeId === storeId);
    const totalValue = monthly.reduce((sum, s) => sum + (s.value || s.dailySales || 0), 0);
    json(res, 200, { data: { storeId, totalValue, orderCount: monthly.length, month: q.get('month') } });
    return;
  }

  if (!col || !mockStore.hasOwnProperty(col)) {
    json(res, 404, { error: 'Not Found', detail: 'custom endpoint not mocked: ' + rest });
    return;
  }

  if (req.method === 'GET') {
    json(res, 200, { data: mockGetCollection(col) });
    return;
  }
  if (req.method === 'POST') {
    const item = { ...(body || {}), id: `${col}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString() };
    mockStore[col].push(item);
    json(res, 201, item);
    return;
  }
  if (req.method === 'PATCH' && id) {
    const arr = mockStore[col];
    const item = arr.find(x => x.id === id);
    if (!item) { json(res, 404, { error: 'Not Found' }); return; }
    Object.assign(item, body || {});
    json(res, 200, item);
    return;
  }
  json(res, 405, { error: 'Method Not Allowed' });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  let data = '';
  req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let parsed = {};
    try { parsed = JSON.parse(data || '{}'); } catch (e) { parsed = {}; }
    cb(data, parsed);
  });
}

function proxyApi(req, res) {
  const apiPath = req.url.substring('/api'.length) || '/';
  readBody(req, (rawBody, body) => {
    if (apiPath.startsWith('/custom')) {
      mockHandle(req, res, apiPath, body);
      return;
    }
    const targetUrl = API_TARGET + '/api' + apiPath;
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];
    delete headers.origin;
    delete headers.referer;
    if (rawBody && rawBody.length > 0) headers['content-length'] = Buffer.byteLength(rawBody);

    const upstream = https.request(targetUrl, {
      method: req.method,
      headers,
    }, (upRes) => {
      // 백엔드에 없는 엔드포인트는 로컬 mock으로 폴백
      if (upRes.statusCode === 404 || upRes.statusCode === 405) {
        upRes.resume();
        mockFallback(req, res, apiPath, body);
        return;
      }
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res);
    });
    upstream.on('error', (e) => {
      console.error('Proxy error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
    });
    if (rawBody && rawBody.length > 0) upstream.write(rawBody);
    upstream.end();
  });
}

// ──────────────────────────────────────────────
// 로컬 mock 폴백 — 백엔드에 없는 알림/커뮤니케이션/문서
// ──────────────────────────────────────────────
const notifStore = [];
let notifSeq = 0;

function mockFallback(req, res, apiPath, body) {
  const method = req.method;
  const rest = apiPath.split('?')[0];

  // /api/notifications
  if (rest === '/notifications') {
    if (method === 'POST') {
      const n = { id: `nt-${Date.now()}-${++notifSeq}`, ...(body || {}), createdAt: new Date().toISOString(), read: false };
      notifStore.push(n);
      json(res, 201, n);
      return;
    }
    if (method === 'GET') {
      json(res, 200, notifStore);
      return;
    }
  }
  // /api/notifications/read-all
  if (rest === '/notifications/read-all' && method === 'POST') {
    notifStore.forEach(n => n.read = true);
    json(res, 200, { ok: true });
    return;
  }
  // /api/notifications/:id
  const ntMatch = rest.match(/^\/notifications\/([^/]+)$/);
  if (ntMatch) {
    const n = notifStore.find(x => x.id === ntMatch[1]);
    if (method === 'PATCH' && n) { Object.assign(n, body || {}); json(res, 200, n); return; }
    if (method === 'DELETE' && n) { notifStore.splice(notifStore.indexOf(n), 1); json(res, 200, { ok: true }); return; }
    json(res, 404, { error: 'Not Found' });
    return;
  }

  // /api/communications/*
  if (rest.startsWith('/communications/')) {
    const kind = rest.split('/')[2];
    const id = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    json(res, 201, { id, kind, status: 'sent', ...(body || {}), sentAt: new Date().toISOString() });
    return;
  }

  // /api/documents/quote|contract
  if (rest.startsWith('/documents/')) {
    const kind = rest.split('/')[2];
    json(res, 201, { id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, kind, ...(body || {}), status: 'generated', createdAt: new Date().toISOString() });
    return;
  }

  // /api/reminders (POST/GET 폴백)
  if (rest === '/reminders') {
    if (method === 'POST') {
      json(res, 201, { id: `rm-${Date.now()}-${++notifSeq}`, ...(body || {}), createdAt: new Date().toISOString() });
      return;
    }
    if (method === 'GET') { json(res, 200, []); return; }
  }

  // /api/analytics/dashboard — 로컬 계산 폴백
  if (rest === '/analytics/dashboard') {
    json(res, 200, { current: { totalPipelineValue: 0, weightedForecast: 0, activeDeals: 0, winRate: 0, stageBreakdown: [], dealsRequiringAttention: 0, trends: {} } });
    return;
  }

  // 그 외 미지원 → 501
  json(res, 501, { error: 'Not implemented locally', path: rest });
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://x');
  if (parsed.pathname.startsWith('/api')) {
    proxyApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`BizFlow CRM (KO/EN/JA) 로컬 서버: http://localhost:${PORT}`);
  console.log(`API 프록시: /api -> ${API_TARGET}/api`);
});
