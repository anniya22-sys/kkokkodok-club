// 화면 그리기 (3주차: data.js 예시 데이터 사용)
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- 공개 페이지 ----------
function renderPublic() {
  document.title = `${BRAND.name} | 콘텐츠 허브`;
  $("#brand-name").textContent = BRAND.name;
  $("#brand-definition").textContent = BRAND.definition;
  $("#brand-audience").textContent = `이런 분께: ${BRAND.audience}`;
  ["#contact-top", "#contact-hero"].forEach((id) => ($(id).href = BRAND.contactUrl));
  $("#footer-text").textContent = `© ${new Date().getFullYear()} ${BRAND.name}`;

  $("#services").innerHTML = BRAND.services
    .map((s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`)
    .join("");

  renderBooks();
  // 3주차 연습 모드: 화면에만 추가(새로고침하면 사라짐). 4주차에 Apps Script로 시트 저장 연결
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

  const posts = CONTENTS.filter((c) => c.status === "발행 완료");
  $("#posts").innerHTML = posts.length
    ? posts.map((p) => `<li><a href="${esc(p.postUrl)}">${esc(p.topic)}</a><div class="meta">${esc(p.publishedAt)}</div></li>`).join("")
    : `<li class="empty">발행된 콘텐츠가 곧 올라옵니다.</li>`;

  // 3주차 연습 모드: 화면 안내만 표시. 4주차에 Apps Script로 시트 저장 연결
  $("#inquiry-form").addEventListener("submit", (e) => {
    e.preventDefault();
    e.target.reset();
    $("#inquiry-done").classList.remove("hidden");
  });
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
function setStatus(id, status) {
  const item = CONTENTS.find((c) => c.id === id);
  if (item) item.status = status;
  renderAdmin();
}

function proposalCard(c) {
  return `<div class="card" style="margin-bottom:12px">
    <span class="badge">${esc(c.status)}</span>
    <h3 style="margin-top:8px">${esc(c.topic)}</h3>
    <p>독자 질문: ${esc(c.question)}</p>
    <p>선정 이유: ${esc(c.reason)}</p>
    <div class="actions">
      <button class="btn small" onclick="setStatus('${c.id}','작성 승인')">작성 승인</button>
      <button class="btn small ghost" onclick="setStatus('${c.id}','보류')">보류</button>
    </div>
  </div>`;
}

function draftCard(c) {
  const sources = (c.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> · ${esc(s.date)}</li>`)
    .join("");
  return `<div class="card" style="margin-bottom:12px">
    <span class="badge">${esc(c.status)}</span>
    <h3 style="margin-top:8px">${esc(c.topic)}</h3>
    <div class="draft">${esc(c.draft)}</div>
    <strong>출처 (${(c.sources || []).length}곳)</strong>
    <ul>${sources}</ul>
    <div class="checklist">
      <strong>검수 체크리스트</strong>
      <label><input type="checkbox"> 첫 문단 직접 답변</label>
      <label><input type="checkbox"> 질문형 소제목</label>
      <label><input type="checkbox"> 출처 3곳 이상 (공식 출처 1곳 포함, 링크·날짜)</label>
      <label><input type="checkbox"> 사실·수치 확인, 과장 표현 점검</label>
    </div>
    <div class="actions">
      <button class="btn small" onclick="setStatus('${c.id}','공개 승인')">공개 승인</button>
    </div>
  </div>`;
}

function renderAdmin() {
  const by = (s) => CONTENTS.filter((c) => c.status === s);

  const proposals = by("제안");
  $("#tab-proposals").innerHTML = proposals.length
    ? proposals.map(proposalCard).join("")
    : `<p class="empty">새 제안이 없습니다.</p>`;

  const drafts = by("초안");
  $("#tab-drafts").innerHTML = drafts.length
    ? drafts.map(draftCard).join("")
    : `<p class="empty">검수할 초안이 없습니다.</p>`;

  $("#tab-threads").innerHTML = `<div class="card">
    <h3>쓰레드 변환</h3>
    <p>발행 완료 원문을 쓰레드용 문구로 바꿉니다. 4주차에 Gemini API를 연결합니다.</p>
    <div class="actions"><button class="btn small" disabled>쓰레드용으로 변환</button></div>
  </div>`;

  $("#tab-records").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>주제</th><th>상태</th><th>제안일</th></tr></thead>
    <tbody>${CONTENTS.map((c) => `<tr><td>${esc(c.id)}</td><td>${esc(c.topic)}</td><td>${esc(c.status)}</td><td>${esc(c.proposedAt)}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

function initAdmin() {
  $("#enter").addEventListener("click", () => {
    // 3주차 연습 모드: 입력값 확인 없이 입장. 4주차에 Apps Script 확인으로 교체
    if (!$("#code").value.trim()) return alert("접근 코드를 입력하세요.");
    $("#gate").classList.add("hidden");
    $("#console").classList.remove("hidden");
    renderAdmin();
  });
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
