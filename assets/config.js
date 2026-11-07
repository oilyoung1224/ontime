/* ONTIME 껍데기 앱 — 주소·화면 경로 표. 값은 이 파일 1곳에만 둔다.
 * 도메인을 붙이면 BASE만 바꾼다. 여기에는 공개해도 되는 값(이미 학생들이 쓰는 웹앱 주소)만 넣는다. */
window.ONTIME = {
  GAS: 'https://ontime-supabase.vercel.app/',
  BASE: 'https://oilyoung1224.github.io/ontime',
  // 폴더 → GAS ?view= 값('' = 학생 앱, null = GAS를 열지 않음)
  VIEW: { student: '', report: 'report', admin: 'admin', board: 'board', gate: 'gate', notice: 'notice', guide: null },
  // 앱 이름 · 색 (manifest와 같은 값)
  APP: {
    student: { name: 'ONTIME',       color: '#F5B800', install: true },
    report:  { name: 'ONTIME리포트', color: '#1F8F5F', install: true },
    admin:   { name: 'ONTIME관리',   color: '#18213B', install: true },
    board:   { name: 'ONTIME 현황판', color: '#17223A', install: false },
    gate:    { name: '학원 노트북',  color: '#17223A', install: false },
    notice:  { name: '공부의 신 공지', color: '#111111', install: false }   // [v42] 학부모 공지 페이지(?k=링크키)
  },
  // [007] 학부모 리포트 새 기록 알림(웹 푸시) — 공개키(공개해도 되는 값) · 구독을 받는 새 앱 주소. 비밀키는 새 앱 환경변수에만
  PUSH: {
    key: 'BHsVt_ld3zBSMjQ15pIxJwVIqMfQnO_HYXu8K6kmquVw4OqUPRsxv8MojCTfNJ8KNQ4NJnntfwN7SAofeV1RU3Y',
    api: 'https://ontime-supabase.vercel.app/api/push/'
  },
  // GAS 화면이 이동을 부탁할 수 있는 경로(ontime:navigate)
  PATHS: ['/student/', '/report/', '/admin/', '/board/', '/gate/', '/guide/']
};
