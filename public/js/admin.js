// ============================================================
// KUMA Admin Core
// ============================================================

const ADMIN_ID = 'kuma_admin';
const ADMIN_PW = 'kuma2026!';
const STORAGE_KEY = 'kuma_site_data';
const AUTH_KEY = 'kuma_admin_auth';

// ── 인증 ──────────────────────────────────────────────────
export function isAdmin() {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

export function login(id, pw) {
  if (id === ADMIN_ID && pw === ADMIN_PW) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = '/';
}

// ── 데이터 ────────────────────────────────────────────────
let _cache = null;

export async function getData() {
  if (_cache) return _cache;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { _cache = JSON.parse(saved); return _cache; }
  const res = await fetch('/data/site.json');
  _cache = await res.json();
  return _cache;
}

export function saveData(data) {
  _cache = JSON.parse(JSON.stringify(data));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportJSON() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) { alert('저장된 데이터가 없습니다.'); return; }
  const blob = new Blob([JSON.stringify(JSON.parse(data), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'site.json';
  a.click();
}

export function resetToDefault() {
  if (!confirm('모든 수정사항을 초기화하시겠습니까?')) return;
  localStorage.removeItem(STORAGE_KEY);
  _cache = null;
  location.reload();
}

// ── 관리자 플로팅 바 (각 페이지 상단) ──────────────────────
export function injectAdminBar() {
  if (!isAdmin()) return;
  const existing = document.getElementById('admin-bar');
  if (existing) return;

  const bar = document.createElement('div');
  bar.id = 'admin-bar';
  bar.style.cssText = `
    position:fixed;top:0;left:0;right:0;z-index:9999;
    background:rgba(10,10,10,0.97);backdrop-filter:blur(10px);
    border-bottom:2px solid rgba(255,193,7,0.4);
    padding:0 24px;height:48px;
    display:flex;align-items:center;justify-content:space-between;
  `;
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;">
      <span style="color:#ffc107;font-size:0.8rem;font-weight:700;letter-spacing:1px;">🛠 관리자 모드</span>
      <a href="/admin/" style="color:rgba(255,255,255,0.5);font-size:0.75rem;text-decoration:none;padding:4px 10px;border:1px solid #333;border-radius:6px;transition:0.2s;"
        onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='rgba(255,255,255,0.5)'">
        대시보드
      </a>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="ab-export" style="${btnStyle('#007bff')}">JSON 내보내기</button>
      <button id="ab-reset" style="${btnStyle('#555')}">초기화</button>
      <button id="ab-logout" style="${btnStyle('#dc3545')}">로그아웃</button>
    </div>
  `;
  document.body.prepend(bar);
  document.body.style.paddingTop = '48px';
  document.body.classList.add('admin-mode');

  bar.querySelector('#ab-export').onclick = exportJSON;
  bar.querySelector('#ab-reset').onclick = resetToDefault;
  bar.querySelector('#ab-logout').onclick = logout;
}

function btnStyle(bg) {
  return `padding:5px 14px;border-radius:7px;border:none;background:${bg};color:#fff;font-size:0.75rem;cursor:pointer;`;
}

// ── 편집 모달 ─────────────────────────────────────────────
export function showEditModal({ title = '편집', fields = [], onSave }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;

  const fieldHTML = fields.map(f => `
    <div style="margin-bottom:14px;text-align:left;">
      <label style="color:#aaa;font-size:0.78rem;display:block;margin-bottom:5px;">${f.label}</label>
      ${f.type === 'textarea'
        ? `<textarea id="ef-${f.key}" rows="4" style="width:100%;box-sizing:border-box;padding:10px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#fff;font-size:0.9rem;resize:vertical;outline:none;font-family:inherit;">${f.value ?? ''}</textarea>`
        : `<input id="ef-${f.key}" type="text" value="${String(f.value ?? '').replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box;padding:10px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#fff;font-size:0.9rem;outline:none;" />`
      }
    </div>
  `).join('');

  overlay.innerHTML = `
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:20px;padding:32px;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;">
      <h2 style="color:#fff;margin:0 0 22px;font-size:1.15rem;">${title}</h2>
      ${fieldHTML}
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button id="ef-cancel" style="flex:1;padding:11px;background:#1a1a1a;border:1px solid #333;border-radius:10px;color:#888;cursor:pointer;font-size:0.9rem;">취소</button>
        <button id="ef-save" style="flex:1;padding:11px;background:#007bff;border:none;border-radius:10px;color:#fff;font-weight:700;cursor:pointer;font-size:0.9rem;">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const doSave = () => {
    const result = {};
    fields.forEach(f => { result[f.key] = document.getElementById('ef-'+f.key).value.trim(); });
    onSave(result);
    overlay.remove();
  };
  overlay.querySelector('#ef-save').onclick = doSave;
  overlay.querySelector('#ef-cancel').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  // 첫 번째 input에 포커스
  setTimeout(() => overlay.querySelector('input,textarea')?.focus(), 80);
}
