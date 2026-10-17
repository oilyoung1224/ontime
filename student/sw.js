/* ONTIME 서비스 워커 — 껍데기 파일(이 폴더 + /assets/)만 캐시한다. GAS(구글) 응답은 가로채지도 캐시하지도 않는다(항상 최신 · 개인정보) */
var VERSION = 'ontime-student-v3';
var FILES = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
             '../assets/config.js', '../assets/shell.js', '../assets/shell.css', '../assets/install.js'];
var OFFLINE = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<title>ONTIME</title><style>html,body{margin:0;height:100%;background:#F5B800;color:#3A2C00;font-family:-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}' +
  'div{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center}b{font-size:19px}' +
  'button{font:inherit;font-weight:800;font-size:16px;padding:12px 26px;border:0;border-radius:12px;background:#fff;color:#1A2233}</style></head>' +
  '<body><div><b>인터넷 연결을 확인하세요</b><button onclick="location.reload()">다시 시도</button></div></body></html>';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('ontime-student-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;          // 구글 주소 · 다른 곳은 손대지 않는다
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () {
      return caches.match('./', { ignoreSearch: true }).then(function (r) {
        return r || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {                                      // 껍데기 파일 — 새 것 먼저, 안 되면 캐시
    if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
});
