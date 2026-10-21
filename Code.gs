/**
 * 걸으며 묻다 · 우리의 담벼락 — Physics and Beyond 사이트 게시판 저장소
 * 시트의 첫 번째 탭에 글이 한 줄씩 쌓입니다.
 * 글을 숨기려면 '숨김' 칸에 아무 글자(예: X)나 적으세요. 지우려면 그 줄을 삭제하세요.
 */
const HEAD = ['id', '시각', '방', '이름', '내용', '링크', '답글대상', '숨김'];
const ROOMS = ['r1', 'r2', 'r3', 'r4'];

function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEAD);
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 줄바꿈만 남기고 제어문자 제거, 길이 제한, 수식으로 해석되지 않게 막기
function clean_(s, max) {
  let t = String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function doGet(e) {
  const room = (e && e.parameter && e.parameter.room) || 'all';
  const rows = sheet_().getDataRange().getValues().slice(1);
  const posts = rows
    .filter(r => r[0] && String(r[7]).trim() === '' && (room === 'all' || r[2] === room))
    .map(r => ({
      id: String(r[0]),
      t: r[1] instanceof Date ? r[1].getTime() : 0,
      room: String(r[2]),
      name: String(r[3]),
      body: String(r[4]).replace(/^'/, ''),
      link: String(r[5]),
      parent: String(r[6] || '')
    }));
  return json_({ ok: true, posts: posts });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: '보낸 글의 형식이 올바르지 않습니다.' }); }
  const room = String(d.room || '');
  const name = clean_(d.name, 20);
  const body = clean_(d.body, 1500);
  const link = clean_(d.link, 300);
  const parent = clean_(d.parent, 20);
  if (ROOMS.indexOf(room) < 0) return json_({ ok: false, error: '어느 방의 글인지 알 수 없습니다.' });
  if (!name) return json_({ ok: false, error: '이름을 적어 주세요.' });
  if (!body) return json_({ ok: false, error: '내용을 적어 주세요.' });
  if (link && !/^https?:\/\//i.test(link)) return json_({ ok: false, error: '링크는 http:// 또는 https://로 시작해야 합니다.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    sheet_().appendRow([id, new Date(), room, name, body, link, parent, '']);
    return json_({ ok: true, id: id });
  } finally {
    lock.releaseLock();
  }
}
