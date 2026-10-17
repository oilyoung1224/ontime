/* ONTIME 설치 안내 (K-4) — 학생 · 리포트 · 관리 3개 앱만
 *   이미 설치해서 앱으로 열림 → 안내 없음
 *   카카오톡 · 네이버 · 인스타 · 페이스북 · 라인 등 앱 안 브라우저 → 위 띠 "이 화면에서는 설치가 안 돼요"(안드로이드: 크롬에서 열기)
 *   안드로이드 크롬 · 삼성 인터넷 → beforeinstallprompt를 받으면 아래 띠 [앱 설치]
 *   아이폰 사파리 → 아래 띠 "공유 버튼 → [홈 화면에 추가]"
 *   [닫기] → 7일 동안 다시 안 띄움
 */
(function () {
  'use strict';
  var app = document.body.getAttribute('data-app'), C = window.ONTIME, A = C.APP[app];
  if (!A || !A.install) return;
  var KEY = 'ontime.install.hide.' + app, WEEK = 7 * 86400000;
  var ua = navigator.userAgent || '';

  function standalone() {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; }
  }
  function hidden() { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < WEEK; } catch (e) { return false; } }
  function hideWeek() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  if (standalone() || hidden()) return;

  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var inApp = /KAKAOTALK|NAVER\(inapp|NAVER|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|; wv\)/i.test(ua);
  var safari = ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Whale|NAVER|KAKAOTALK/i.test(ua);

  var share = '<svg width="18" height="22" viewBox="0 0 18 22" aria-label="공유 버튼"><path d="M9 1v13M4.5 5.5 9 1l4.5 4.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<path d="M5 9H2v12h14V9h-3" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>';
  var dots = '<svg width="20" height="6" viewBox="0 0 20 6" aria-label="더보기 버튼"><circle cx="3" cy="3" r="2.4" fill="#fff"/><circle cx="10" cy="3" r="2.4" fill="#fff"/><circle cx="17" cy="3" r="2.4" fill="#fff"/></svg>';

  function band(where, html) {
    var b = document.createElement('div');
    b.className = 'sh-band ' + where;
    b.setAttribute('role', 'region'); b.setAttribute('aria-label', '설치 안내');
    b.innerHTML = html + '<button type="button" class="x" aria-label="닫기">닫기</button>';
    b.querySelector('.x').onclick = function () { hideWeek(); b.remove(); };
    document.body.appendChild(b);
    return b;
  }

  if (inApp) {                                                           // 문자 · 카톡 링크로 처음 여는 경우(리포트 앱)
    if (android) {
      var intent = 'intent://' + location.host + location.pathname + location.search + location.hash + '#Intent;scheme=https;package=com.android.chrome;end';
      band('top', '<span class="t">이 화면에서는 설치가 안 돼요</span><a class="go" href="' + intent.replace(/"/g, '&quot;') + '">크롬에서 열기</a>');
    } else {
      band('top', '<span class="t">설치하려면 오른쪽 아래 ' + dots + ' → <b>[Safari로 열기]</b></span>');
    }
    return;
  }
  if (safari) {
    band('bottom', '<span class="t">공유 버튼 ' + share + ' → <b>[홈 화면에 추가]</b>를 누르세요</span>');
    return;
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    var ev = e;
    var b = band('bottom', '<button type="button" class="go">앱 설치</button><span class="t">홈 화면에 ' + A.name + '을 추가하면 더 빨라요</span>');
    b.querySelector('.go').onclick = function () {
      ev.prompt();
      ev.userChoice.then(function () { b.remove(); }, function () { b.remove(); });
    };
  });
  window.addEventListener('appinstalled', function () { var b = document.querySelector('.sh-band'); if (b) b.remove(); });
})();
