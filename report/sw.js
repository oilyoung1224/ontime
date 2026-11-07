/* ONTIME리포트 서비스 워커 — 껍데기 파일(이 폴더 + /assets/)만 캐시한다. GAS(구글) 응답은 가로채지도 캐시하지도 않는다(항상 최신 · 개인정보) */
// [007] v5 = 새 기록 알림(웹 푸시) — 알림 1개(점수 · 결과 없음) · 같은 학생은 tag로 1개 · 아이콘 숫자 · 누르면 [오늘] 탭(src=push)
//   버전이 바뀌면 이미 설치한 앱도 다시 설치하지 않고 다음에 열 때 새 워커로 바뀐다(install에서 skipWaiting · activate에서 clients.claim)
var VERSION = 'ontime-report-v5';
var FILES = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
             '../assets/config.js', '../assets/shell.js', '../assets/shell.css', '../assets/install.js', '../assets/push.js'];
var OFFLINE = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<title>ONTIME리포트</title><style>html,body{margin:0;height:100%;background:#1F8F5F;color:#FFFFFF;font-family:-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}' +
  'div{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center}b{font-size:19px}' +
  'button{font:inherit;font-weight:800;font-size:16px;padding:12px 26px;border:0;border-radius:12px;background:#fff;color:#1A2233}</style></head>' +
  '<body><div><b>인터넷 연결을 확인하세요</b><button onclick="location.reload()">다시 시도</button></div></body></html>';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('ontime-report-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
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

// ── [007] 새 기록 알림 ──────────────────────────────────────────────────
//   서버가 보내는 값 = { sid, name, badge } 뿐(점수 · 결과 없음). 내용 문구는 여기서 정한다
var PUSH_TITLE = 'ONTIME리포트';
function pushUrl() { return new URL('./?src=push#today', self.registration.scope).href; }
function setBadge(n) {
  try { if (self.navigator && self.navigator.setAppBadge) return n > 0 ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge(); } catch (e) {}
  return Promise.resolve();
}
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  var name = String(d.name || '').slice(0, 20), sid = String(d.sid || '').slice(0, 40), badge = Math.max(0, Math.min(99, Number(d.badge) || 0));
  e.waitUntil(Promise.all([
    self.registration.showNotification(PUSH_TITLE, {
      body: (name ? name + ' ' : '') + '오늘 탭에 새 기록이 있어요',
      tag: 'today-' + sid,
      icon: './icons/icon-192.png', badge: './icons/icon-192.png',
      data: { sid: sid }
    }),
    setBadge(badge)
  ]));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = pushUrl();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
        return c.focus().then(function (w) { return w && 'navigate' in w ? w.navigate(url) : null; }).catch(function () { return self.clients.openWindow(url); });
      }
    }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type !== 'ontime:seen') return;
  e.waitUntil(Promise.all([
    setBadge(0),
    self.registration.getNotifications(d.sid ? { tag: 'today-' + d.sid } : {}).then(function (ns) { ns.forEach(function (n) { n.close(); }); })
  ]));
});
