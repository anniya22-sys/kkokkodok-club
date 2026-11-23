// 화면 그리기 (4주차: 구글 시트 연결 / 주소가 비어 있으면 data.js 예시 데이터)
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LIVE = typeof SheetAPI !== "undefined" && SheetAPI.connected();
let ITEMS = typeof CONTENTS !== "undefined" ? CONTENTS : [];

// ---------- 공개 페이지 ----------
async function renderPublic() {
  document.title = `${BRAND.name} | 콘텐츠 허브`;
  $("#brand-name").textContent = BRAND.name;
  $("#brand-definition").textContent = BRAND.definition;
  $("#brand-audience").textContent = `이런 분께: ${BRAND.audience}`;
  ["#contact-top", "#contact-hero"].forEach((id) => { const el = $(id); if (el) el.href = BRAND.contactUrl; });
  $("#footer-text").textContent = `© ${new Date().getFullYear()} ${BRAND.name}`;
  $("#services").innerHTML = BRAND.services
    .map((s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`)
    .join("");

  // 3주차 기능 유지: 책 추천(화면에만 추가, 새로고침하면 사라짐)
  renderBooks();
  $("#book-form").addEventListener("submit", (e) => {
    e.preventDefault();
    BOOKS.unshift({
      title: $("#book-title").value.trim(),
      author: $("#book-author").value.trim(),
      by: $("#book-by").value.trim(),
      reason: $("#book-reason").value.trim()
    });
    e.target.reset();
    renderBooks();
  });

  // 3주차 기능 유지: 문의하기(화면 안내만 표시)
  $("#inquiry-form").addEventListener("submit", (e) => {
    e.preventDefault();
    e.target.reset();
    $("#inquiry-done").classList.remove("hidden");
  });

  let posts = ITEMS.filter((c) => c.status === "발행 완료").map((c) => ({ topic: c.topic, url: c.postUrl, publishedAt: c.publishedAt }));
  if (LIVE) {
    try {
      const r = await SheetAPI.publicPosts();
      if (r.ok) posts = r.posts;
    } catch (e) { /* 연결 실패 시 예시 유지 */ }
  }
  $("#posts").innerHTML = posts.length
    ? posts.map((p) => `<li><a href="${esc(p.url)}">${esc(p.topic)}</a><div class="meta">${esc(p.publishedAt)}</div></li>`).join("")
    : `<li class="empty">발행된 콘텐츠가 곧 올라옵니다.</li>`;
}

function renderBooks() {
  $("#book-list").innerHTML = BOOKS.length
    ? BOOKS.map((b) => `<div class="card book-card">
        <h3>${esc(b.title)}</h3>
        ${b.author ? `<div class="meta">${esc(b.author)}</div>` : ""}
        <p>${esc(b.reason)}</p>
        ${b.by ? `<div class="meta">추천: ${esc(b.by)}</div>` : ""}
      </div>`).join("")
    : `<p class="empty">아직 추천된 책이 없어요. 첫 번째 책을 추천해 주세요!</p>`;
}

// ---------- 관리 페이지 ----------
function notice(msg) {
  const el = $("#notice");
  if (el) el.textContent = msg;
}

async function loadItems() {
  if (!LIVE) return;
  const r = await SheetAPI.call("list");
  if (!r.ok) { notice("불러오기 실패: " + r.error); return; }
  ITEMS = r.items;
}

async function setStatus(id, status) {
  if (LIVE) {
    const r = await SheetAPI.call("setStatus", { id, status });
    if (!r.ok) { alert(r.error); return; }
    await loadItems();
  } else {
    const item = ITEMS.find((c) => c.id === id);
    if (item) item.status = status;
  }
  renderAdmin();
  const done = { "작성 승인": "좋아요! Claude 대화창에 '눌렀어'라고 알려 주세요.", "공개 승인": "좋아요! Claude 대화창에 '눌렀어'라고 알려 주세요.", "보류": "보류했습니다." };
  notice(done[status] || "저장했습니다.");
}

function sourcesOf(c) {
  if (Array.isArray(c.sources)) return c.sources;
  try { return JSON.parse(c.sources || "[]"); } catch (e) { return []; }
}

function proposalCard(c) {
  return `<div class="card" style="margin-bottom:12px">
    <span class="badge">${esc(c.status)}</span>
    <h3 style="margin-top:8px">${esc(c.topic)}</h3>
    <p>독자 질문: ${esc(c.question)}</p>
    <p>선정 이유: ${esc(c.reason)}</p>
    <div class="actions">
      <button class="btn small" onclick="setStatus('${esc(c.id)}','작성 승인')">이 주제로 써 줘</button>
      <button class="btn small ghost" onclick="setStatus('${esc(c.id)}','보류')">보류</button>
    </div>
  </div>`;
}

function draftCard(c) {
  const src = sourcesOf(c);
  const list = src.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> · ${esc(s.date)}</li>`).join("");
  return `<div class="card" style="margin-bottom:12px">
    <span class="badge">${esc(c.status)}</span>
    <h3 style="margin-top:8px">${esc(c.topic)}</h3>
    <div class="draft">${esc(c.draft)}</div>
    <strong>출처 (${src.length}곳)</strong>
    <ul>${list}</ul>
    <div class="checklist">
      <strong>읽어 보고 확인하기</strong>
      <label><input type="checkbox"> 첫 문단이 질문에 바로 답함</label>
      <label><input type="checkbox"> 소제목이 질문 형태</label>
      <label><input type="checkbox"> 출처 3곳 이상, 링크·날짜 있음</label>
      <label><input type="checkbox"> 사실·숫자 확인, 과장 표현 없음</label>
    </div>
    <div class="actions">
      <button class="btn small" onclick="setStatus('${esc(c.id)}','공개 승인')">이 글 올려 줘</button>
      <button class="btn small ghost" onclick="setStatus('${esc(c.id)}','보류')">보류</button>
    </div>
  </div>`;
}

function threadCard(c) {
  return `<div class="card" style="margin-bottom:12px">
    <span class="badge">${esc(c.status)}</span>
    <h3 style="margin-top:8px">${esc(c.topic)}</h3>
    <div class="draft" id="th-${esc(c.id)}">${esc(c.threads || "쓰레드 글이 아직 없습니다.")}</div>
    <div class="actions">
      <button class="btn small" onclick="copyThreads('${esc(c.id)}')">복사</button>
      ${LIVE ? `<button class="btn small ghost" onclick="geminiRewrite('${esc(c.id)}')">Gemini로 다시 쓰기</button>` : ""}
    </div>
  </div>`;
}

async function copyThreads(id) {
  const text = $(`#th-${id}`).textContent;
  try { await navigator.clipboard.writeText(text); notice("복사했습니다. 쓰레드에 붙여 넣으세요."); }
  catch (e) { notice("복사가 막혔습니다. 글을 직접 드래그해 복사하세요."); }
}

async function geminiRewrite(id) {
  notice("Gemini가 다시 쓰는 중입니다…");
  const r = await SheetAPI.call("geminiThreads", { id });
  if (!r.ok) { notice(r.error); return; }
  $(`#th-${id}`).textContent = r.text;
  notice("Gemini 버전입니다. 마음에 들면 복사하세요.");
}

function renderAdmin() {
  const by = (...s) => ITEMS.filter((c) => s.includes(c.status));

  const proposals = by("제안");
  $("#tab-proposals").innerHTML = proposals.length
    ? proposals.map(proposalCard).join("")
    : `<p class="empty">새 제안이 없습니다. Claude에게 주제 제안을 요청하세요.</p>`;

  const drafts = by("초안");
  $("#tab-drafts").innerHTML = drafts.length
    ? drafts.map(draftCard).join("")
    : `<p class="empty">읽어 볼 초안이 없습니다.</p>`;

  const threads = by("공개 승인", "발행 완료").filter((c) => c.threads);
  $("#tab-threads").innerHTML = threads.length
    ? threads.map(threadCard).join("")
    : `<p class="empty">발행한 글이 생기면 쓰레드용 글이 여기에 나타납니다.</p>`;

  $("#tab-records").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>주제</th><th>상태</th><th>제안일</th><th>원문</th></tr></thead>
    <tbody>${ITEMS.map((c) => `<tr><td>${esc(c.id)}</td><td>${esc(c.topic)}</td><td>${esc(c.status)}</td><td>${esc(c.proposedAt)}</td><td>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">보기</a>` : ""}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

async function enterAdmin() {
  const code = $("#code").value.trim();
  if (!code) return alert("관리 비밀번호를 입력하세요.");
  if (LIVE) {
    SheetAPI.setCode(code);
    const r = await SheetAPI.call("check");
    if (!r.ok) return alert(r.error || "비밀번호가 맞지 않습니다.");
    await loadItems();
  }
  $("#gate").classList.add("hidden");
  $("#console").classList.remove("hidden");
  notice(LIVE ? "구글 시트와 연결되어 있습니다." : "연습 모드: 예시 데이터입니다. 새로고침하면 처음 상태로 돌아갑니다.");
  renderAdmin();
}

function initAdmin() {
  $("#enter").addEventListener("click", enterAdmin);
  $("#code").addEventListener("keydown", (e) => { if (e.key === "Enter") enterAdmin(); });
  const refresh = $("#refresh");
  if (refresh) refresh.addEventListener("click", async () => { await loadItems(); renderAdmin(); notice("새로 불러왔습니다."); });
  const sheetUrl = window.APP_CONFIG && window.APP_CONFIG.SHEET_URL;
  const openSheet = $("#open-sheet");
  if (openSheet && sheetUrl) { openSheet.href = sheetUrl; openSheet.classList.remove("hidden"); }
  document.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
      ["proposals", "drafts", "threads", "records"].forEach((t) =>
        $(`#tab-${t}`).classList.toggle("hidden", t !== btn.dataset.tab)
      );
    })
  );
}

if (document.body.dataset.page === "public") renderPublic();
if (document.body.dataset.page === "admin") initAdmin();
