// ============================================================
// KUMA 졸업전시회 - 구글 시트 자동 배포 스크립트
// 구글 시트 > 확장 프로그램 > Apps Script 에 붙여넣기
// ============================================================

// ▼ 여기에 Vercel Deploy Hook URL을 입력하세요
const VERCEL_DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/여기에URL입력';

// 마지막 배포로부터 최소 대기 시간 (초) - 연속 저장 시 과도한 배포 방지
const DEPLOY_COOLDOWN_SEC = 30;

// ────────────────────────────────────────────────────────────
// 시트 수정 시 자동 트리거
// ────────────────────────────────────────────────────────────
function onEdit(e) {
  // 스크립트 속성에서 마지막 배포 시각 확인
  const props = PropertiesService.getScriptProperties();
  const lastDeploy = parseInt(props.getProperty('lastDeploy') || '0');
  const now = Math.floor(Date.now() / 1000);

  if (now - lastDeploy < DEPLOY_COOLDOWN_SEC) {
    console.log(`쿨다운 중... (${DEPLOY_COOLDOWN_SEC - (now - lastDeploy)}초 남음)`);
    return;
  }

  triggerDeploy();
  props.setProperty('lastDeploy', String(now));
}

// ────────────────────────────────────────────────────────────
// 수동 배포 트리거 (메뉴에서 실행 가능)
// ────────────────────────────────────────────────────────────
function manualDeploy() {
  triggerDeploy();
  SpreadsheetApp.getUi().alert('✅ 배포가 시작됐습니다!\n\n약 1~2분 후 사이트에 반영됩니다.');
}

function triggerDeploy() {
  try {
    const response = UrlFetchApp.fetch(VERCEL_DEPLOY_HOOK, {
      method: 'post',
      muteHttpExceptions: true,
    });
    console.log('배포 트리거 성공:', response.getResponseCode());
  } catch (err) {
    console.error('배포 트리거 실패:', err);
  }
}

// ────────────────────────────────────────────────────────────
// 스프레드시트 열릴 때 커스텀 메뉴 추가
// ────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 KUMA 배포')
    .addItem('지금 바로 배포하기', 'manualDeploy')
    .addToUi();
}
