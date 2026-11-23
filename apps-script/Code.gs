/**
 * 콘텐츠 비서 — 기록 저장용 Apps Script (4주차)
 * 구글 시트에 붙어서 동작합니다. 수정하지 않고 그대로 사용하세요.
 * (꼬꼬독 추가: '일정' 시트 — 관리 페이지에서 다음 모임 등록, 첫 화면에 표시)
 *
 * 시트 메뉴 '콘텐츠 비서'
 *   ① 처음 설정          : '콘텐츠' 시트 만들기 + 관리 비밀번호 정하기
 *   ② 관리 비밀번호 바꾸기
 *   Gemini 키 넣기 (선택)
 */

const SHEET_NAME = '콘텐츠';
const HEADERS = ['ID', '제안일', '주제', '독자 질문', '선정 이유', '상태', '초안', '출처', '쓰레드 글',
  '작성 승인일', '공개 승인일', '원문 주소', '발행 완료일'];
const KEYS = ['id', 'proposedAt', 'topic', 'question', 'reason', 'status', 'draft', 'sources', 'threads',
  'writeApprovedAt', 'publishApprovedAt', 'url', 'publishedAt'];
const S = { PROPOSED: '제안', WRITE_OK: '작성 승인', DRAFT: '초안', PUBLISH_OK: '공개 승인', DONE: '발행 완료', HOLD: '보류' };
const GEMINI_MODEL_DEFAULT = 'gemini-2.5-flash';
const LINK_MARK = '[원문 링크]';
const MEETING_SHEET = '일정';
const MEETING_HEADERS = ['등록일', '날짜', '시간', '장소', '책 제목', '지은이', '발제자', '안내'];
const MEETING_KEYS = ['savedAt', 'date', 'time', 'place', 'book', 'author', 'presenter', 'note'];

/* ---------- 시트 메뉴 ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('콘텐츠 비서')
    .addItem('① 처음 설정', 'setup')
    .addItem('② 관리 비밀번호 바꾸기', 'setPassword')
    .addSeparator()
    .addItem('Gemini 키 넣기 (선택)', 'setGeminiKey')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME, 0);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  setPassword();
}

function setPassword() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('관리 비밀번호', '관리 페이지에서 쓸 새 비밀번호를 입력하세요. (4자 이상, 다른 곳에서 쓰지 않는 것)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const code = res.getResponseText().trim();
  if (code.length < 4) { ui.alert('4자 이상으로 다시 입력해 주세요.'); return; }
  PropertiesService.getScriptProperties().setProperty('ADMIN_CODE', code);
  ui.alert('저장했습니다. 이제 [배포 → 새 배포 → 웹 앱]으로 배포하세요.');
}

function setGeminiKey() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Gemini 키', 'Google AI Studio에서 받은 키를 붙여 넣으세요.', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const key = res.getResponseText().trim();
  if (!key) return;
  PropertiesService.getScriptProperties().setProperty('GEMINI_KEY', key);
  ui.alert('Gemini 키를 저장했습니다.');
}

/* ---------- 웹 요청 ---------- */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    if (action === 'ping') return out({ ok: true, message: '연결 성공' });
    if (action === 'public') {
      const posts = readAll()
        .filter(r => r.status === S.DONE && r.url)
        .map(r => ({ id: r.id, topic: r.topic, url: r.url, publishedAt: r.publishedAt }))
        .reverse();
      return out({ ok: true, posts: posts });
    }
    if (action === 'meeting') return out({ ok: true, meeting: nextMeeting() });
    return out({ ok: false, error: '알 수 없는 요청' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ ok: false, error: '요청 형식 오류' }); }
  const saved = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE');
  if (!saved || body.code !== saved) return out({ ok: false, error: '비밀번호가 맞지 않습니다' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case 'check': return out({ ok: true });
      case 'list': return out({ ok: true, items: readAll() });
      case 'setStatus': return out(setStatus(body.id, body.status));
      case 'addProposals': return out(addProposals(body.items || []));
      case 'saveDraft': return out(saveDraft(body));
      case 'markPublished': return out(markPublished(body.id, body.url));
      case 'geminiThreads': return out(geminiThreads(body.id));
      case 'saveMeeting': return out(saveMeeting(body.meeting || {}));
      case 'getMeeting': return out({ ok: true, meeting: nextMeeting() });
      default: return out({ ok: false, error: '알 수 없는 요청' });
    }
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 기능 ---------- */
function setStatus(id, status) {
  const row = findRow(id);
  if (!row) return { ok: false, error: '해당 ID 없음' };
  const cur = row.data.status;
  const allowed =
    (status === S.WRITE_OK && cur === S.PROPOSED) ||
    (status === S.PUBLISH_OK && cur === S.DRAFT) ||
    (status === S.HOLD && cur !== S.DONE);
  if (!allowed) return { ok: false, error: `'${cur}' 상태에서는 '${status}'로 바꿀 수 없습니다` };
  setCell(row.index, 'status', status);
  if (status === S.WRITE_OK) setCell(row.index, 'writeApprovedAt', today());
  if (status === S.PUBLISH_OK) setCell(row.index, 'publishApprovedAt', today());
  return { ok: true };
}

function addProposals(items) {
  const sh = sheet();
  const existing = readAll().map(r => String(r.topic).trim());
  let n = sh.getLastRow(); // 머리줄 포함
  const added = [];
  items.forEach(it => {
    const topic = String(it.topic || '').trim();
    if (!topic || existing.indexOf(topic) >= 0) return;
    const id = 'C' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyMMdd') + '-' + String(n).padStart(3, '0');
    n++;
    const rec = { id: id, proposedAt: today(), topic: topic, question: it.question || '', reason: it.reason || '', status: S.PROPOSED };
    sh.appendRow(KEYS.map(k => rec[k] || ''));
    existing.push(topic);
    added.push(id);
  });
  return { ok: true, added: added };
}

function saveDraft(b) {
  const row = findRow(b.id);
  if (!row) return { ok: false, error: '해당 ID 없음' };
  if (row.data.status !== S.WRITE_OK && row.data.status !== S.DRAFT) return { ok: false, error: `'작성 승인' 또는 '초안' 상태에서만 초안을 저장합니다 (현재: ${row.data.status})` };
  setCell(row.index, 'draft', b.draft || '');
  setCell(row.index, 'sources', JSON.stringify(b.sources || []));
  setCell(row.index, 'threads', b.threads || '');
  setCell(row.index, 'status', S.DRAFT);
  return { ok: true };
}

function markPublished(id, url) {
  const row = findRow(id);
  if (!row) return { ok: false, error: '해당 ID 없음' };
  if (row.data.status !== S.PUBLISH_OK) return { ok: false, error: `'공개 승인' 상태에서만 발행 완료로 바꿉니다 (현재: ${row.data.status})` };
  if (!url) return { ok: false, error: '원문 주소가 필요합니다' };
  setCell(row.index, 'url', url);
  const threads = String(row.data.threads || '');
  if (threads.indexOf(LINK_MARK) >= 0) setCell(row.index, 'threads', threads.split(LINK_MARK).join(url));
  setCell(row.index, 'publishedAt', today());
  setCell(row.index, 'status', S.DONE);
  return { ok: true };
}

function geminiThreads(id) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('GEMINI_KEY');
  if (!key) return { ok: false, error: 'Gemini 키가 없습니다. 시트 메뉴에서 넣어 주세요' };
  const row = findRow(id);
  if (!row) return { ok: false, error: '해당 ID 없음' };
  const model = props.getProperty('GEMINI_MODEL') || GEMINI_MODEL_DEFAULT;
  const prompt = '다음 글을 쓰레드(Threads)용 글로 바꿔 줘. 500자 이내, 핵심 1가지, 첫 줄은 질문이나 숫자로 시작, 마지막 줄에 원문 링크 자리 [원문 링크]. 과장 표현 없이.\n\n' + row.data.draft;
  const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (res.getResponseCode() !== 200) return { ok: false, error: 'Gemini 오류 ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) };
  const data = JSON.parse(res.getContentText());
  const text = (((data.candidates || [])[0] || {}).content || {}).parts ? data.candidates[0].content.parts.map(p => p.text || '').join('') : '';
  if (!text) return { ok: false, error: 'Gemini 응답이 비어 있습니다' };
  return { ok: true, text: (row.data.url ? text.split(LINK_MARK).join(row.data.url) : text).trim() };
}

/* ---------- 다음 모임 일정 ---------- */
function meetingSheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('시트 메뉴에서 [① 처음 설정]을 먼저 실행하세요');
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName(MEETING_SHEET);
  if (!sh) {
    sh = ss.insertSheet(MEETING_SHEET);
    sh.appendRow(MEETING_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, MEETING_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function saveMeeting(m) {
  const date = String(m.date || '').trim();
  const book = String(m.book || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: '날짜를 골라 주세요' };
  if (!book) return { ok: false, error: '책 제목을 적어 주세요' };
  const rec = {
    savedAt: today(), date: "'" + date, time: "'" + String(m.time || '').trim(),
    place: m.place, book: book, author: m.author, presenter: m.presenter, note: m.note
  };
  meetingSheet().appendRow(MEETING_KEYS.map(k => String(rec[k] || '').slice(0, 300)));
  return { ok: true, meeting: nextMeeting() };
}

// 오늘 이후 가장 가까운 모임 (같은 날짜를 여러 번 등록하면 마지막 것)
function nextMeeting() {
  const sh = meetingSheet();
  const last = sh.getLastRow();
  if (last < 2) return null;
  const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  let best = null;
  sh.getRange(2, 1, last - 1, MEETING_KEYS.length).getDisplayValues().forEach(r => {
    const o = {};
    MEETING_KEYS.forEach((k, i) => (o[k] = r[i]));
    if (o.date < now) return;
    if (!best || o.date <= best.date) best = o;
  });
  if (best) delete best.savedAt;
  return best;
}

/* ---------- 도구 ---------- */
function sheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('시트 메뉴에서 [① 처음 설정]을 먼저 실행하세요');
  return SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
}

function readAll() {
  const sh = sheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, KEYS.length).getDisplayValues().map(r => {
    const o = {};
    KEYS.forEach((k, i) => (o[k] = r[i]));
    return o;
  });
}

function findRow(id) {
  const all = readAll();
  for (let i = 0; i < all.length; i++) if (all[i].id === id) return { index: i + 2, data: all[i] };
  return null;
}

function setCell(rowIndex, key, value) {
  sheet().getRange(rowIndex, KEYS.indexOf(key) + 1).setValue(value);
}

function today() {
  // 앞의 ' 는 시트가 날짜를 자동 변환하지 않고 글자 그대로 저장하게 함
  return "'" + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
