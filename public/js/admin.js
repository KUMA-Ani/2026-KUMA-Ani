// ============================================================
// KUMA Admin Core
// ============================================================

const ADMIN_ID = 'kuma_admin';
const ADMIN_PW = 'kuma2026!';
const STORAGE_KEY = 'kuma_site_data';

// ── 인증 ──────────────────────────────────────────────────
export function isAdmin() {
  return sessionStorage.getItem('kuma_admin_auth') === 'true';
}

export function login(id, pw) {
  if (id === ADMIN_ID && pw === ADMIN_PW) {
    sessionStorage.setItem('kuma_admin_auth', 'true');
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem('kuma_admin_auth');
  location.reload();
}

// ── 데이터 ────────────────────────────────────────────────
let _cache = null;

export async function getData() {
  if (_cache) return _cache;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    _cache = JSON.parse(saved);
    return _cache;
  }
  // fallback: fetch from site.json
  const res = await fetch('/data/site.json');
  _cache = await res.json();
  return _cache;
}

export function saveData(data) {
  _cache = data;
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

// ── 관리자 플로팅 바 ──────────────────────────────────────
export function injectAdminBar() {
  if (!isAdmin()) return;
  const bar = document.createElement('div');
  bar.id = 'admin-bar';
  bar.innerHTML = `
    <div class="ab-inner">
      <span class="ab-badge">🛠 관리자 모드</span>
      <div class="ab-actions">
        <button class="ab-btn" id="ab-export">JSON 내보내기</button>
        <button class="ab-btn ab-reset" id="ab-reset">초기화</button>
        <button class="ab-btn ab-logout" id="ab-logout">로그아웃</button>
      </div>
    </div>
  `;
  bar.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    background: rgba(15,15,15,0.95); backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255,200,0,0.3);
    padding: 10px 24px;
  `;
  bar.querySelector('.ab-inner').style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    max-width: 1400px; margin: 0 auto;
  `;
  bar.querySelector('.ab-badge').style.cssText = `
    color: #ffc107; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px;
  `;
  bar.querySelector('.ab-actions').style.cssText = `display: flex; gap: 10px;`;
  bar.querySelectorAll('.ab-btn').forEach(b => {
    b.style.cssText = `
      padding: 6px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.08); color: #fff; font-size: 0.8rem;
      cursor: pointer; transition: background 0.2s;
    `;
    b.onmouseenter = () => b.style.background = 'rgba(255,255,255,0.15)';
    b.onmouseleave = () => b.style.background = 'rgba(255,255,255,0.08)';
  });
  document.getElementById('ab-export')?.addEventListener('click', exportJSON);
  document.getElementById('ab-reset')?.addEventListener('click', resetToDefault);
  document.getElementById('ab-logout')?.addEventListener('click', logout);
  document.body.appendChild(bar);
  // 바 높이만큼 body 패딩
  document.body.style.paddingBottom = '52px';
}

// ── 로그인 모달 ───────────────────────────────────────────
export function showLoginModal(onSuccess) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
  `;
  overlay.innerHTML = `
    <div style="background:#111;border:1px solid #333;border-radius:20px;padding:40px;width:340px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:8px;">🔐</div>
      <h2 style="color:#fff;margin:0 0 24px;font-size:1.3rem;">관리자 로그인</h2>
      <input id="admin-id" type="text" placeholder="아이디" style="
        width:100%;box-sizing:border-box;padding:12px 16px;margin-bottom:10px;
        background:#1a1a1a;border:1px solid #333;border-radius:10px;
        color:#fff;font-size:1rem;outline:none;
      "/>
      <input id="admin-pw" type="password" placeholder="비밀번호" style="
        width:100%;box-sizing:border-box;padding:12px 16px;margin-bottom:20px;
        background:#1a1a1a;border:1px solid #333;border-radius:10px;
        color:#fff;font-size:1rem;outline:none;
      "/>
      <p id="admin-err" style="color:#ff4d4d;font-size:0.85rem;margin:0 0 12px;display:none;">
        아이디 또는 비밀번호가 틀렸습니다.
      </p>
      <div style="display:flex;gap:10px;">
        <button id="admin-cancel" style="
          flex:1;padding:12px;background:#1a1a1a;border:1px solid #333;
          border-radius:10px;color:#888;font-size:0.95rem;cursor:pointer;
        ">취소</button>
        <button id="admin-submit" style="
          flex:1;padding:12px;background:#ffc107;border:none;
          border-radius:10px;color:#000;font-weight:700;font-size:0.95rem;cursor:pointer;
        ">로그인</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const doLogin = () => {
    const id = document.getElementById('admin-id').value;
    const pw = document.getElementById('admin-pw').value;
    if (login(id, pw)) {
      overlay.remove();
      onSuccess?.();
    } else {
      document.getElementById('admin-err').style.display = 'block';
    }
  };
  document.getElementById('admin-submit').onclick = doLogin;
  document.getElementById('admin-pw').onkeydown = e => e.key === 'Enter' && doLogin();
  document.getElementById('admin-cancel').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  setTimeout(() => document.getElementById('admin-id')?.focus(), 100);
}

// ── 인라인 편집 모달 (텍스트/이미지URL) ──────────────────
export function showEditModal({ title = '편집', fields = [], onSave }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  const fieldHTML = fields.map(f => `
    <div style="margin-bottom:16px;text-align:left;">
      <label style="color:#aaa;font-size:0.8rem;display:block;margin-bottom:6px;">${f.label}</label>
      ${f.type === 'textarea'
        ? `<textarea id="ef-${f.key}" rows="4" style="width:100%;box-sizing:border-box;padding:10px 14px;background:#1a1a1a;border:1px solid #333;border-radius:10px;color:#fff;font-size:0.95rem;resize:vertical;outline:none;">${f.value ?? ''}</textarea>`
        : `<input id="ef-${f.key}" type="text" value="${(f.value ?? '').replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box;padding:10px 14px;background:#1a1a1a;border:1px solid #333;border-radius:10px;color:#fff;font-size:0.95rem;outline:none;" />`
      }
    </div>
  `).join('');

  overlay.innerHTML = `
    <div style="background:#111;border:1px solid #333;border-radius:20px;padding:36px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;">
      <h2 style="color:#fff;margin:0 0 24px;font-size:1.2rem;">${title}</h2>
      ${fieldHTML}
      <div style="display:flex;gap:10px;margin-top:8px;">
        <button id="ef-cancel" style="flex:1;padding:12px;background:#1a1a1a;border:1px solid #333;border-radius:10px;color:#888;cursor:pointer;">취소</button>
        <button id="ef-save" style="flex:1;padding:12px;background:#007bff;border:none;border-radius:10px;color:#fff;font-weight:700;cursor:pointer;">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('ef-save').onclick = () => {
    const result = {};
    fields.forEach(f => { result[f.key] = document.getElementById('ef-'+f.key).value; });
    onSave(result);
    overlay.remove();
  };
  document.getElementById('ef-cancel').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}
