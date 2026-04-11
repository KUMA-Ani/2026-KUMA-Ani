// 구글 시트에서 데이터를 fetch해서 사이트 데이터 구조로 변환

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

function sheetCsvUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

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

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
      return obj;
    });
}

function parseMembers(raw: string): Member[] {
  if (!raw) return [];
  return raw.split(',').map(s => {
    const parts = s.trim().split(':');
    return { role: (parts[0] ?? '').trim(), name: (parts[1] ?? '').trim() };
  }).filter(m => m.name);
}

function parseScreenshots(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

// fallback 데이터 (시트 연결 전 기본값)
function getFallback(): SiteData {
  return {
    years: [
      {
        id: '2026',
        label: '2026',
        active: true,
        thumbnail: '',
        trackCount: 2,
        tracks: [
          {
            id: 'Games',
            title: '게임 트랙',
            category: 'Game Track',
            description: '2026 게임 애니메이션과 졸업 전시회',
            bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
            bgColor: 'rgba(0,123,255,0.35)',
            projects: []
          },
          {
            id: 'Animations',
            title: '애니메이션 트랙',
            category: 'Animation Track',
            description: '2026 게임 애니메이션과 졸업 전시회',
            bgImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80',
            bgColor: 'rgba(220,53,69,0.35)',
            projects: []
          }
        ]
      }
    ]
  };
}

export async function fetchSiteData(): Promise<SiteData> {
  const SPREADSHEET_ID = import.meta.env.GOOGLE_SHEET_ID;
  const YEARS_GID      = import.meta.env.SHEET_GID_YEARS    ?? '0';
  const TRACKS_GID     = import.meta.env.SHEET_GID_TRACKS   ?? '1';
  const PROJECTS_GID   = import.meta.env.SHEET_GID_PROJECTS ?? '2';
  const INFO_GID       = import.meta.env.SHEET_GID_INFO     ?? '3';

  if (!SPREADSHEET_ID) {
    return getFallback();
  }

  try {
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

    // 안내 행(첫 번째 데이터 행) 제거 - 대괄호로 시작하는 행은 안내문
    const cleanRows = (rows: Record<string, string>[]) =>
      rows.filter(row => !Object.values(row).some(v => v.startsWith('[')));

    const cleanYears    = cleanRows(yearsRows);
    const cleanTracks   = cleanRows(tracksRows);
    const cleanProjects = cleanRows(projectsRows);
    const cleanInfo     = cleanRows(infoRows);

    const infoMap: Record<string, Record<string, string>> = {};
    cleanInfo.forEach(row => { if (row['작품ID']) infoMap[row['작품ID']] = row; });

    const projectMap: Record<string, Project[]> = {};
    cleanProjects.forEach(row => {
      if (!row['작품ID'] || !row['연도ID'] || !row['트랙ID']) return;
      const key = `${row['연도ID']}__${row['트랙ID']}`;
      const info = infoMap[row['작품ID']] ?? {};
      const project: Project = {
        id:          row['작품ID'],
        type:        row['타입'] === 'team' ? 'team' : 'individual',
        title:       row['작품명'] ?? '',
        team:        row['팀명/작가명'] ?? '',
        thumbnail:   row['썸네일 URL'] ?? '',
        youtubeId:   info['유튜브ID'] ?? '',
        description: info['작품개요'] ?? '',
        downloadUrl: info['다운로드URL'] ?? '',
        members:     parseMembers(info['제작진'] ?? ''),
        screenshots: parseScreenshots(info['이미지목록'] ?? ''),
      };
      if (!projectMap[key]) projectMap[key] = [];
      projectMap[key].push(project);
    });

    const trackMap: Record<string, Track[]> = {};
    cleanTracks.forEach(row => {
      if (!row['연도ID'] || !row['트랙ID']) return;
      const yid = row['연도ID'];
      const track: Track = {
        id:          row['트랙ID'],
        title:       row['트랙명'] ?? '',
        category:    row['카테고리 태그'] ?? '',
        description: row['설명'] ?? '',
        bgImage:     row['배경이미지 URL'] ?? '',
        bgColor:     row['오버레이 색상'] || 'rgba(0,0,0,0.5)',
        projects:    projectMap[`${yid}__${row['트랙ID']}`] ?? [],
      };
      if (!trackMap[yid]) trackMap[yid] = [];
      trackMap[yid].push(track);
    });

    const years: Year[] = cleanYears
      .filter(row => row['연도ID'])
      .map(row => ({
        id:         row['연도ID'],
        label:      row['라벨'] ?? row['연도ID'],
        thumbnail:  row['배경이미지 URL'] ?? '',
        active:     row['활성 (Y/N)'] !== 'N' && row['활성 (Y/N)'] !== 'FALSE',
        trackCount: parseInt(row['트랙수'] ?? '1') || 1,
        tracks:     trackMap[row['연도ID']] ?? [],
      }));

    if (years.length === 0) return getFallback();
    return { years };

  } catch (err) {
    console.error('[KUMA] 구글 시트 fetch 실패:', err);
    return getFallback();
  }
}
