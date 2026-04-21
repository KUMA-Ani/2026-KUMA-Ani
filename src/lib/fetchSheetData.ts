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

export interface SiteInfo {
  schoolLogoUrl: string;
  deptLogoUrl: string;
  schoolUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  exhibitionTitle: string;
  exhibitionDate: string;
  exhibitionPlace: string;
  exhibitionDesc: string;
  mapUrl: string;         // 구글 지도 embed URL
  mapLinkUrl: string;     // 지도 클릭 시 이동할 URL
  bgImage: string;        // 메인 좌측 배경
}

export interface Year {
  id: string;
  label: string;
  thumbnail: string;
  active: boolean;
  current: boolean;
  trackCount: number;
  tracks: Track[];
}

export interface SiteData {
  years: Year[];
  info: SiteInfo;
}

function sheetCsvUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (ch === '"') {
      if (inQ && next === '"') {
        // escaped quote
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      cells.push(cur.trim());
      cur = '';
    } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQ) {
      if (ch === '\r') i++; // skip \n after \r
      cells.push(cur.trim());
      rows.push(cells);
      cells = [];
      cur = '';
    } else if (ch === '\r' && !inQ) {
      // lone \r
      cells.push(cur.trim());
      rows.push(cells);
      cells = [];
      cur = '';
    } else {
      cur += ch;
    }
  }

  // last cell/row
  if (cur || cells.length > 0) {
    cells.push(cur.trim());
    rows.push(cells);
  }

  return rows.filter(r => r.some(c => c !== ''));
}

}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(row => row.some(c => c !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
      return obj;
    });
}

function parseMembers(raw: string): Member[] {
  if (!raw) return [];
  return raw.split(',').map(s => {
    const p = s.trim().split(':');
    return { role: (p[0] ?? '').trim(), name: (p[1] ?? '').trim() };
  }).filter(m => m.name);
}

function parseScreenshots(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function getDefaultInfo(): SiteInfo {
  return {
    schoolLogoUrl: '',
    deptLogoUrl: '',
    schoolUrl: '',
    youtubeUrl: '',
    instagramUrl: '',
    exhibitionTitle: '졸업 전시회',
    exhibitionDate: '',
    exhibitionPlace: '',
    exhibitionDesc: '',
    mapUrl: '',
    mapLinkUrl: '',
    bgImage: '',
  };
}

function getFallback(): SiteData {
  return {
    info: getDefaultInfo(),
    years: [
      {
        id: '2026', label: '2026', active: true, current: true, thumbnail: '', trackCount: 2,
        tracks: [
          { id: 'Games', title: '게임 트랙', category: 'Game Track', description: '졸업 전시회 게임 트랙', bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80', bgColor: 'rgba(0,123,255,0.35)', projects: [] },
          { id: 'Animations', title: '애니메이션 트랙', category: 'Animation Track', description: '졸업 전시회 애니메이션 트랙', bgImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80', bgColor: 'rgba(220,53,69,0.35)', projects: [] }
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
  const SITEINFO_GID   = import.meta.env.SHEET_GID_SITEINFO ?? '4';

  if (!SPREADSHEET_ID) return getFallback();

  try {
    const [yearsRaw, tracksRaw, projectsRaw, infoRaw, siteInfoRaw] = await Promise.all([
      fetch(sheetCsvUrl(SPREADSHEET_ID, YEARS_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, TRACKS_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, PROJECTS_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, INFO_GID)).then(r => r.text()),
      fetch(sheetCsvUrl(SPREADSHEET_ID, SITEINFO_GID)).then(r => r.text()),
    ]);

    const cleanRows = (rows: Record<string, string>[]) =>
      rows.filter(row => !Object.values(row).some(v => v.startsWith('[')));

    const yearsRows    = cleanRows(rowsToObjects(parseCsv(yearsRaw)));
    const tracksRows   = cleanRows(rowsToObjects(parseCsv(tracksRaw)));
    const projectsRows = cleanRows(rowsToObjects(parseCsv(projectsRaw)));
    const infoRows     = cleanRows(rowsToObjects(parseCsv(infoRaw)));
    const siteInfoRows = rowsToObjects(parseCsv(siteInfoRaw));

    // SiteInfo: 키-값 형태 (A열=항목명, B열=값)
    const siMap: Record<string, string> = {};
    siteInfoRows.forEach(row => {
      const key = Object.values(row)[0] ?? '';
      const val = Object.values(row)[1] ?? '';
      if (key) siMap[key] = val;
    });

    const info: SiteInfo = {
      schoolLogoUrl:    siMap['학교로고 (URL, https://a.jpg,https://b.jpg]  && Github 내부 파일에 이미지를 넣는경우 /images/파일명.jpg)'] ?? siMap['학교로고URL'] ?? siMap['학교로고'] ?? '',
      deptLogoUrl:      siMap['학과로고 (URLhttps://a.jpg,https://b.jpg]  && Github 내부 파일에 이미지를 넣는경우 /images/파일명.jpg)'] ?? siMap['학과로고URL'] ?? siMap['학과로고'] ?? '',
      schoolUrl:        siMap['학교홈페이지URL'] ?? '',
      youtubeUrl:       siMap['유튜브URL'] ?? '',
      instagramUrl:     siMap['인스타URL'] ?? '',
      exhibitionTitle:  siMap['전시제목'] ?? '졸업 전시회',
      exhibitionDate:   siMap['전시기간'] ?? '',
      exhibitionPlace:  siMap['전시장소'] ?? '',
      exhibitionDesc:   siMap['전시개요'] ?? '',
      mapUrl:           siMap['지도embedURL (구글 지도 → 공유 → 지도 퍼가기 → <iframe src="..."> 에서 src= 안의 URL만 복사)'] ?? siMap['지도embedURL'] ?? '',
      mapLinkUrl:       siMap['지도링크URL'] ?? '',
      bgImage:          siMap['메인배경이미지'] ?? '',
    };

    const infoMap: Record<string, Record<string, string>> = {};
    infoRows.forEach(row => { if (row['작품ID']) infoMap[row['작품ID']] = row; });

    const projectMap: Record<string, Project[]> = {};
    projectsRows.forEach(row => {
      if (!row['작품ID'] || !row['연도ID'] || !row['트랙ID']) return;
      const key = `${row['연도ID']}__${row['트랙ID']}`;
      const inf = infoMap[row['작품ID']] ?? {};
      const project: Project = {
        id: row['작품ID'], type: row['타입'] === 'team' ? 'team' : 'individual',
        title: row['작품명'] ?? '', team: row['팀명/작가명'] ?? '',
        thumbnail: row['썸네일 URL'] ?? '', youtubeId: inf['유튜브ID'] ?? '',
        description: inf['작품개요'] ?? '', downloadUrl: inf['다운로드URL'] ?? '',
        members: parseMembers(inf['제작진'] ?? ''),
        screenshots: parseScreenshots(inf['이미지목록'] ?? ''),
      };
      if (!projectMap[key]) projectMap[key] = [];
      projectMap[key].push(project);
    });

    const trackMap: Record<string, Track[]> = {};
    tracksRows.forEach(row => {
      if (!row['연도ID'] || !row['트랙ID']) return;
      const yid = row['연도ID'];
      const track: Track = {
        id: row['트랙ID'], title: row['트랙명'] ?? '', category: row['카테고리 태그'] ?? '',
        description: row['설명'] ?? '', bgImage: row['배경이미지 URL'] ?? '',
        bgColor: row['오버레이 색상'] || 'rgba(0,0,0,0.5)',
        projects: projectMap[`${yid}__${row['트랙ID']}`] ?? [],
      };
      if (!trackMap[yid]) trackMap[yid] = [];
      trackMap[yid].push(track);
    });

    const years: Year[] = yearsRows.filter(row => row['연도ID']).map(row => ({
      id: row['연도ID'], label: row['라벨'] ?? row['연도ID'],
      thumbnail: row['배경이미지 URL'] ?? '',
      active: (row['활성 (Y/N)'] ?? 'Y') !== 'N',
      current: (row['현재전시 (Y/N)'] ?? 'N') === 'Y',
      trackCount: parseInt(row['트랙수'] ?? '1') || 1,
      tracks: trackMap[row['연도ID']] ?? [],
    }));

    if (years.length === 0) return getFallback();
    return { years, info };

  } catch (err) {
    console.error('[KUMA] 구글 시트 fetch 실패:', err);
    return getFallback();
  }
}
