/* ONTIME 껍데기 공통 스크립트 (K-3 · K-7)
 * - 화면 전체 iframe 1개로 GAS 웹앱을 연다. 껍데기 주소의 ?…와 #…은 그대로 넘기고, view 값은 폴더가 정한다
 * - 로딩 가림막 → GAS가 ontime:ready를 보내면 걷는다. 15초 안에 안 오면 "연결이 느려요 · 다시 시도"
 * - 로그인 유지: GAS 화면이 보낸 토큰을 이 껍데기(github.io) 저장소에 보관하고, 다음에 열 때 돌려준다(주소창에 넣지 않음)
 * 사용: <body data-app="student"> + config.js → shell.js 순서로 불러온다
 */
(function () {
  'use strict';
  var C = window.ONTIME, app = document.body.getAttribute('data-app'), A = C.APP[app] || { name: 'ONTIME', color: '#0E1626' };
  var KEY = 'ontime.' + app + '.session';
  var TYPES = { 'ontime:ready': 1, 'ontime:save': 1, 'ontime:clear': 1, 'ontime:navigate': 1 };
  var READY_MS = 15000;

  function store(op, v) {
    try {
      if (op === 'get') return localStorage.getItem(KEY) || '';
      if (op === 'set') localStorage.setItem(KEY, v);
      if (op === 'del') localStorage.removeItem(KEY);
    } catch (e) {}
    return '';
  }
  function standalone() {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; }
  }

  /** GAS 주소 — view는 폴더가 정한다(사용자가 넣은 view는 버림). 나머지 ?값 · #값은 그대로 */
  function gasUrl() {
    var q = [], view = C.VIEW[app];
    if (view) q.push('view=' + encodeURIComponent(view));
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var k = decodeURIComponent(kv.split('=')[0] || '');
      if (k === 'view') return;
      if (k === 'app' && app === 'student') return;
      q.push(kv);
    });
    if (app === 'student' && standalone()) q.push('app=1');          // 설치된 아이콘으로 열었다 — 학생 앱 "로그인 유지" 기본 켜짐
    if (app === 'report' && standalone() && !/(^|&)src=/.test(location.search.replace(/^\?/, ''))) q.push('src=icon');   // [v45 .b] 학부모 열람 경로 = 아이콘(문자 링크는 src=sms)
    return C.GAS + (q.length ? '?' + q.join('&') : '') + location.hash;
  }

  // ── 화면 ──
  var clock = '<svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="#fff"/>' +
              '<path d="M32 16v16l11 7" stroke="' + A.color + '" stroke-width="6" stroke-linecap="round" fill="none"/></svg>';
  var cover = document.createElement('div');
  cover.className = 'sh-cover';
  cover.innerHTML = clock + '<div class="sh-msg">불러오는 중</div><button type="button" class="sh-retry" hidden>다시 시도</button>';
  document.body.appendChild(cover);
  var msg = cover.querySelector('.sh-msg'), retry = cover.querySelector('.sh-retry');

  var frame = null, ready = false, slowT = null, goneT = null;
  function showCover() { clearTimeout(goneT); cover.hidden = false; cover.style.display = ''; cover.classList.remove('gone'); }
  function hideCover() { clearTimeout(goneT); cover.classList.add('gone'); cover.hidden = true; cover.style.display = 'none'; }   // 바로 치운다(타이머 · 전환 효과에 기대지 않음)
  function offline() {
    if (frame) { frame.remove(); frame = null; }
    showCover();
    msg.textContent = '인터넷 연결을 확인하세요';
    retry.hidden = false;
  }
  function open() {
    if (navigator.onLine === false) { offline(); return; }
    ready = false;
    showCover(); msg.textContent = '불러오는 중'; retry.hidden = true;
    if (frame) frame.remove();
    frame = document.createElement('iframe');
    frame.className = 'sh-frame';
    frame.title = A.name;
    frame.setAttribute('allow', 'clipboard-write; autoplay');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.src = gasUrl();
    document.body.insertBefore(frame, cover);
    clearTimeout(slowT);
    slowT = setTimeout(function () {
      if (ready) return;
      showCover();
      msg.textContent = '연결이 느려요'; retry.hidden = false;
    }, READY_MS);
  }
  retry.onclick = open;
  window.addEventListener('offline', function () { if (!ready) offline(); });
  window.addEventListener('online', function () { if (!frame) open(); });

  // ── GAS 화면과의 메시지 — 구글 화면(*.googleusercontent.com)에서 온 것만, 정해진 type만 받는다 ──
  function fromGas(origin) { return /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com$/.test(String(origin || '')); }
  window.addEventListener('message', function (e) {
    if (!fromGas(e.origin)) return;
    var d = e.data;
    if (!d || typeof d !== 'object' || !TYPES[d.type]) return;
    if (d.type === 'ontime:ready') {
      ready = true; clearTimeout(slowT);
      hideCover();
      try { e.source.postMessage({ type: 'ontime:session', token: store('get') }, e.origin); } catch (x) {}
    } else if (d.type === 'ontime:save') {
      if (typeof d.token === 'string' && d.token && d.token.length < 4000) store('set', d.token);
    } else if (d.type === 'ontime:clear') {
      store('del');
    } else if (d.type === 'ontime:navigate') {
      var p = String(d.path || '');
      if (C.PATHS.indexOf(p) >= 0) location.href = C.BASE + p;
    }
  });

  window.ONTIME_SHELL = { app: app, reload: open, gasUrl: gasUrl };
  open();
})();
