/* ONTIME리포트 새 기록 알림 받기 (작업지시 007 2단계) — 리포트 앱(report/)만
 *   보이는 조건: 홈 화면에 설치한 앱으로 열림(아이폰은 이때만 푸시가 됨 · iOS 16.4+) · 로그인됨(보관 토큰 있음)
 *               · 알림 권한을 아직 묻지 않음(Notification.permission === 'default') · 이 기기 미구독 · [나중에] 뒤 7일 지남
 *   설치 안 된 브라우저로 열었으면 이 띠 대신 설치 안내 띠(install.js) 그대로
 *   [알림 받기] → 권한 묻기(누른 순간에만 물을 수 있음) → 허용: 구독 → 새 앱 /api/push/subscribe(구독 + 보관 토큰)
 *                                                     거절: 다시 묻지 않음 · /api/push/deny(관리 화면 집계에만)
 *   이미 허용한 기기인데 구독이 사라졌으면(브라우저가 지움) 조용히 다시 구독해 서버에 알린다
 *   [알림 켜짐/꺼짐 버튼] 리포트 화면 위쪽 줄 버튼이 shell.js를 거쳐 window.ONTIME_PUSH를 부른다
 *     state = on(받는 중) · off(꺼 둠 · 아직 안 물음) · blocked(휴대폰에서 거절) · asking(아래 띠의 [새 기록 알림 받기]를 눌러야 함)
 *     끄기 = 이 기기 구독 해지 + /api/push/unsubscribe + "직접 껐음"(OFF_KEY) 표시 — 이 표시가 있으면 몰래 다시 구독하지 않고 띠도 띄우지 않는다
 *     켜기 = 허용돼 있으면 바로 구독 · 아직 안 물었으면 아래 띠를 띄움(휴대폰 허용 질문은 이 껍데기 화면을 직접 눌러야 뜬다)
 */
(function () {
  'use strict';
  var C = window.ONTIME, app = document.body.getAttribute('data-app');
  if (app !== 'report' || !C.PUSH || !C.PUSH.key) return;
  var TOKEN_KEY = 'ontime.report.session', HIDE_KEY = 'ontime.push.hide', OFF_KEY = 'ontime.push.off', WEEK = 7 * 86400000;
  var ua = navigator.userAgent || '';
  var DEV = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iOS' : /Android/i.test(ua) ? 'Android' : '기타';

  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function standalone() {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; }
  }
  function supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function keyBytes(b64) {
    var s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(s), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function post(path, body) {
    return fetch(C.PUSH.api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), mode: 'cors', credentials: 'omit' })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
  }
  function send(sub) { return post('subscribe', { token: get(TOKEN_KEY), sub: sub.toJSON ? sub.toJSON() : sub, dev: DEV }); }
  function subscribe(reg) {
    return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(C.PUSH.key) }).then(send);
  }

  if (!standalone() || !supported()) return;

  var band = null, watchers = [];
  function tell(st) { watchers.forEach(function (f) { try { f(st); } catch (e) {} }); }   // 리포트 화면 버튼에 새 상태 알림
  function hideBand() { if (band) { band.remove(); band = null; } }
  function showBand(reg, force) {
    if (band || (!force && Date.now() - Number(get(HIDE_KEY) || 0) < WEEK)) return;
    band = document.createElement('div');
    band.className = 'sh-band bottom';
    band.setAttribute('role', 'region'); band.setAttribute('aria-label', '알림 받기');
    band.innerHTML = '<button type="button" class="go">새 기록 알림 받기</button><span class="t">오늘 탭에 새 기록이 생기면 알려 드려요</span>' +
                     '<button type="button" class="x">나중에</button>';
    band.querySelector('.x').onclick = function () { set(HIDE_KEY, String(Date.now())); hideBand(); tell('off'); };
    band.querySelector('.go').onclick = function () {
      var b = this; b.disabled = true;
      Notification.requestPermission().then(function (p) {
        if (p === 'granted') { del(OFF_KEY); return subscribe(reg).then(function (r) {
          hideBand();
          if (!r || !r.ok) set(HIDE_KEY, String(Date.now() - WEEK + 86400000));   // 서버 저장 실패 — 내일 다시
          tell(r && r.ok ? 'on' : 'off');
        }); }
        if (p === 'denied') { post('deny', { token: get(TOKEN_KEY), dev: DEV }); tell('blocked'); }
        else tell('off');
        hideBand();
      }).catch(function () { b.disabled = false; });
    };
    document.body.appendChild(band);
  }

  /** 로그인됐는지 · 권한 · 구독 상태를 보고 띠를 띄우거나 조용히 다시 구독 */
  function check() {
    if (!get(TOKEN_KEY)) { hideBand(); return; }
    if (get(OFF_KEY)) return;                                                          // 학부모가 직접 껐다 — 띠도 다시 구독도 하지 않음
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (Notification.permission === 'default' && !sub) { showBand(reg); return; }
        if (Notification.permission === 'granted' && !sub) { subscribe(reg); return; }   // 브라우저가 구독을 지웠다 — 다시
        if (Notification.permission === 'granted' && sub && !get('ontime.push.sent')) { send(sub).then(function (r) { if (r && r.ok) set('ontime.push.sent', '1'); }); }
      });
    }).catch(function () {});
  }
  // 로그인 직후에 토큰이 생긴다 — 리포트 화면이 ontime:save를 보낸 뒤 다시 본다(shell.js가 ontime:pushcheck 이벤트를 쏜다)
  window.addEventListener('ontime:pushcheck', function () { setTimeout(check, 300); });

  /** 지금 이 기기 상태 — on · off · blocked */
  function state() {
    if (Notification.permission === 'denied') return Promise.resolve('blocked');
    if (get(OFF_KEY) || Notification.permission !== 'granted') return Promise.resolve('off');
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (sub) { return sub ? 'on' : 'off'; }).catch(function () { return 'off'; });
  }
  function turnOn() {
    if (Notification.permission === 'denied') return Promise.resolve('blocked');
    return navigator.serviceWorker.ready.then(function (reg) {
      if (Notification.permission !== 'granted') { del(OFF_KEY); showBand(reg, true); return 'asking'; }   // 허용 질문은 껍데기 화면을 직접 눌러야 뜬다
      del(OFF_KEY);
      return reg.pushManager.getSubscription().then(function (sub) { return sub ? send(sub) : subscribe(reg); })
        .then(function (r) { return r && r.ok ? 'on' : 'error'; });
    }).catch(function () { return 'error'; });
  }
  function turnOff() {
    set(OFF_KEY, '1'); hideBand();
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return 'off';
      var j = sub.toJSON ? sub.toJSON() : sub;
      return sub.unsubscribe().catch(function () {}).then(function () {
        return post('unsubscribe', { token: get(TOKEN_KEY), sub: j, dev: DEV });
      }).then(function () { return 'off'; });
    }).catch(function () { return 'off'; });
  }
  // shell.js가 리포트 화면의 요청(ontime:push)을 여기로 넘긴다
  window.ONTIME_PUSH = {
    run: function (op) { return op === 'on' ? turnOn() : op === 'off' ? turnOff() : state(); },
    watch: function (f) { if (watchers.indexOf(f) < 0) watchers.push(f); }
  };
  setTimeout(check, 1500);
})();
