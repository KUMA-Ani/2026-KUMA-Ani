// ============================================================
// 구글 시트에서 데이터를 fetch해서 사이트 데이터 구조로 변환
// 빌드 타임에 실행됨 (Astro SSG)
// ============================================================

export interface Member {
  role: string;
  name: string;
}

export interface Project {
  id: string;
  type: 'team' | 'individual';
  title: string;
  team: string;
  thumbnail: string;
  youtubeId: string;
  description: string;
  downloadUrl: string;
  members: Member[];
  screenshots: string[];
}

export interface Track {
  id: string;
  title: string;
  category: string;
  description: string;
  bgImage: string;
  bgColor: string;
  projects: Project[];
}

export interface Year {
  id: string;
  label: string;
  thumbnail: string;
  active: boolean;
  trackCount: number;
  tracks: Track[];
}

export interface SiteData {
  years: Year[];
}

// 구글 시트 CSV export URL 생성
// 시트 ID와 각 탭의 GID로 CSV를 직접 fetch
function sheetCsvUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

// CSV 파싱 (따옴표 포함 처리)
function parseCsv(csv: string): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

// rows[0]을 헤더로, 나머지를 객체 배열로 변환
function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(row => row.some(cell => cell !== '')) // 빈 행 제거
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
      return obj;
    });
}

// 제작진 파싱: "역할:이름, 역할:이름" 형식
function parseMembers(raw: string): Member[] {
  if (!raw) return [];
  return raw.split(',').map(s => {
    const parts = s.trim().split(':');
    return { role: (parts[0] ?? '').trim(), name: (parts[1] ?? '').trim() };
  }).filter(m => m.name);
}

// 이미지 목록 파싱: 줄바꿈 또는 쉼표로 구분
function parseScreenshots(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

// 메인 fetch 함수
export async function fetchSiteData(): Promise<SiteData> {
  const SPREADSHEET_ID = import.meta.env.GOOGLE_SHEET_ID;
  const YEARS_GID      = import.meta.env.SHEET_GID_YEARS      ?? '0';
  const TRACKS_GID     = import.meta.env.SHEET_GID_TRACKS     ?? '1';
  const PROJECTS_GID   = import.meta.env.SHEET_GID_PROJECTS   ?? '2';
  const INFO_GID       = import.meta.env.SHEET_GID_INFO       ?? '3';

  if (!SPREADSHEET_ID) {
    console.warn('[KUMA] GOOGLE_SHEET_ID 환경변수가 없습니다. 로컬 fallback 데이터를 사용합니다.');
    const fallback = await import('../data/site.json');
    return fallback as unknown as SiteData;
  }

  try {
    // 4개 시트 동시 fetch
    const [yearsRaw, tracksRaw, projectsRaw, infoRaw] = await Promise.all([
      fetch(sheetCsvUrl(SPREADSHEET_ID, YEARS_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, TRACKS_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, PROJECTS_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, INFO_GID)).then(r => r.text()),
    ]);

    const yearsRows    = rowsToObjects(parseCsv(yearsRaw));
    const tracksRows   = rowsToObjects(parseCsv(tracksRaw));
    const projectsRows = rowsToObjects(parseCsv(projectsRaw));
    const infoRows     = rowsToObjects(parseCsv(infoRaw));

    // ProjectInfo를 작품ID로 인덱싱
    const infoMap: Record<string, Record<string, string>> = {};
    infoRows.forEach(row => { if (row['작품ID']) infoMap[row['작품ID']] = row; });

    // Projects를 연도+트랙ID로 그루핑
    const projectMap: Record<string, Project[]> = {};
    projectsRows.forEach(row => {
      const key = `${row['연도ID']}__${row['트랙ID']}`;
      const info = infoMap[row['작품ID']] ?? {};
      const project: Project = {
        id:          row['작품ID'],
        type:        (row['타입'] === 'team' ? 'team' : 'individual'),
        title:       row['작품명'],
        team:        row['팀명'],
        thumbnail:   row['썸네일'],
        youtubeId:   info['유튜브ID'] ?? '',
        description: info['작품개요'] ?? '',
        downloadUrl: info['다운로드URL'] ?? '',
        members:     parseMembers(info['제작진'] ?? ''),
        screenshots: parseScreenshots(info['이미지목록'] ?? ''),
      };
      if (!projectMap[key]) projectMap[key] = [];
      projectMap[key].push(project);
    });

    // Tracks를 연도ID로 그루핑
    const trackMap: Record<string, Track[]> = {};
    tracksRows.forEach(row => {
      const yid = row['연도ID'];
      const track: Track = {
        id:          row['트랙ID'],
        title:       row['트랙명'],
        category:    row['카테고리'],
        description: row['설명'],
        bgImage:     row['배경이미지'],
        bgColor:     row['오버레이색상'] || 'rgba(0,0,0,0.5)',
        projects:    projectMap[`${yid}__${row['트랙ID']}`] ?? [],
      };
      if (!trackMap[yid]) trackMap[yid] = [];
      trackMap[yid].push(track);
    });

    // Years 조립
    const years: Year[] = yearsRows.map(row => ({
      id:         row['연도ID'],
      label:      row['라벨'],
      thumbnail:  row['배경이미지'],
      active:     row['활성'] !== 'N' && row['활성'] !== 'FALSE' && row['활성'] !== '0',
      trackCount: parseInt(row['트랙수'] ?? '1'),
      tracks:     trackMap[row['연도ID']] ?? [],
    }));

    return { years };

  } catch (err) {
    console.error('[KUMA] 구글 시트 fetch 실패, fallback 사용:', err);
    const fallback = await import('../data/site.json');
    return fallback as unknown as SiteData;
  }
}
