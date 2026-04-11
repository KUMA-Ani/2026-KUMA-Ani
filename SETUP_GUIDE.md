# KUMA 졸업전시회 - 구글 시트 연동 설정 가이드

---

## 📋 1단계: 구글 스프레드시트 만들기

아래 링크로 템플릿을 복사하거나, 새 시트를 만들어서 탭을 4개 추가하세요.

### 시트 탭 구성 및 컬럼

---

#### 📅 Years (연도 목록)
| 연도ID | 라벨 | 배경이미지 | 활성 | 트랙수 |
|--------|------|------------|------|--------|
| 2026 | 2026 | https://... | Y | 2 |
| 2027 | 2027 | https://... | Y | 1 |

- **연도ID**: 영문/숫자 (예: 2026) — URL에 사용됨
- **라벨**: 카드에 표시되는 텍스트
- **배경이미지**: 카드 배경 이미지 URL (구글 드라이브 공개 링크 또는 외부 URL)
- **활성**: Y = 공개 / N = 준비중
- **트랙수**: 1이면 트랙 선택 화면 없이 바로 작품 목록으로 이동

---

#### 🎮 Tracks (트랙 목록)
| 연도ID | 트랙ID | 트랙명 | 카테고리 | 설명 | 배경이미지 | 오버레이색상 |
|--------|--------|--------|----------|------|------------|-------------|
| 2026 | Games | 게임 트랙 | Game Track | 게임 트랙 전시실입니다. | https://... | rgba(0,123,255,0.35) |
| 2026 | Animations | 애니메이션 트랙 | Animation Track | 애니메이션 트랙 전시실입니다. | https://... | rgba(220,53,69,0.35) |
| 2027 | Animations | 애니메이션 트랙 | Animation Track | 2027 애니메이션 트랙입니다. | https://... | rgba(220,53,69,0.35) |

- **연도ID**: Years 탭의 연도ID와 일치해야 함
- **트랙ID**: 영문 (예: Games, Animations) — URL에 사용됨
- **오버레이색상**: rgba 형식으로 입력 (배경 이미지 위에 깔리는 색)

---

#### 🎨 Projects (작품 목록)
| 연도ID | 트랙ID | 작품ID | 타입 | 작품명 | 팀명 | 썸네일 |
|--------|--------|--------|------|--------|------|--------|
| 2026 | Games | g-t-001 | team | 우리의 게임 | Team A | https://... |
| 2026 | Games | g-i-001 | individual | 나의 게임 | 홍길동 | https://... |
| 2026 | Animations | a-t-001 | team | 우리의 애니 | Studio A | https://... |

- **작품ID**: 고유한 영문+숫자 (예: g-t-001) — URL에 사용됨
- **타입**: `team` 또는 `individual`
- **썸네일**: 작품 목록 카드에 표시되는 이미지 URL

---

#### 📝 ProjectInfo (작품 상세 정보)
| 작품ID | 유튜브ID | 작품개요 | 다운로드URL | 제작진 | 이미지목록 |
|--------|----------|----------|-------------|--------|------------|
| g-t-001 | dQw4w9WgXcQ | 이 게임은... | https://... | 팀장:홍길동,프로그래밍:김철수,아트:이영희 | https://img1.jpg,https://img2.jpg |
| a-t-001 | xxxxxxxxxxx | 이 애니는... | | 감독:홍길동,원화:김철수 | https://img1.jpg |

- **유튜브ID**: 유튜브 URL에서 `v=` 뒤의 문자열 (예: `dQw4w9WgXcQ`)
- **다운로드URL**: 게임 트랙만 입력, 애니는 빈칸
- **제작진**: `역할:이름,역할:이름` 형식으로 쉼표로 구분
- **이미지목록**: 이미지 URL을 쉼표로 구분

---

## 🔓 2단계: 시트 공개 설정

구글 시트가 **공개 읽기** 상태여야 사이트 빌드 시 데이터를 가져올 수 있습니다.

1. 구글 시트 우측 상단 **공유** 클릭
2. **링크가 있는 모든 사용자** 선택
3. 권한: **뷰어** 설정
4. **완료**

---

## 🆔 3단계: 시트 ID 및 GID 확인

URL 예시: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`**`/edit#gid=`**`0`**

- **GOOGLE_SHEET_ID** = URL 중간의 긴 문자열
- **SHEET_GID_YEARS** = Years 탭 클릭 후 URL 끝 `gid=` 숫자
- 나머지 탭들도 같은 방식으로 확인

---

## ⚙️ 4단계: Vercel 환경변수 설정

1. Vercel 대시보드 → 프로젝트 선택 → **Settings** → **Environment Variables**
2. 아래 변수들 추가:

```
GOOGLE_SHEET_ID       = 스프레드시트 ID
SHEET_GID_YEARS       = Years 탭 GID
SHEET_GID_TRACKS      = Tracks 탭 GID
SHEET_GID_PROJECTS    = Projects 탭 GID
SHEET_GID_INFO        = ProjectInfo 탭 GID
```

---

## 🔗 5단계: Vercel Deploy Hook 설정

1. Vercel 대시보드 → 프로젝트 → **Settings** → **Git** → **Deploy Hooks**
2. Hook 이름: `Google Sheets` / Branch: `main`
3. **Create Hook** → URL 복사 (이 URL은 절대 공개하지 마세요!)

---

## 📜 6단계: Google Apps Script 설정

1. 구글 시트 상단 메뉴 → **확장 프로그램** → **Apps Script**
2. `google-apps-script.js` 파일 내용을 전체 붙여넣기
3. 맨 위 `VERCEL_DEPLOY_HOOK` 값에 5단계에서 복사한 URL 붙여넣기
4. 저장 (Ctrl+S)
5. **트리거 설정**:
   - 왼쪽 시계 아이콘(트리거) 클릭
   - **트리거 추가** → 함수: `onEdit` → 이벤트: `스프레드시트 수정 시`
   - 저장

---

## ✅ 완료! 이후 작업 방법

### 작품 추가하기
1. Projects 탭에 행 추가 (연도ID, 트랙ID, 작품ID, 타입, 작품명, 팀명, 썸네일)
2. ProjectInfo 탭에 행 추가 (작품ID, 유튜브ID, 작품개요 등)
3. 저장하면 약 **1~2분 후** 자동으로 사이트 반영

### 연도 추가하기
1. Years 탭에 행 추가
2. Tracks 탭에 해당 연도의 트랙 추가
3. 저장

### 수동으로 바로 배포하기
- 시트 상단 메뉴 → **🚀 KUMA 배포** → **지금 바로 배포하기**
