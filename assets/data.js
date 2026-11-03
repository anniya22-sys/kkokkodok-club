// 브랜드·콘텐츠 데이터 (3주차: 예시 데이터 / 4주차: Google Sheets 연결로 교체)
// 이 파일의 BRAND 값을 내 브랜드 정보로 바꾸세요.

const BRAND = {
  name: "꼬꼬독 독서모임",
  definition: "꼬꼬독은 부담 없이 함께 읽고 나누는 독서모임입니다.",
  audience: "책을 함께 읽고 싶은 교육자들의 모임",
  services: [
    { title: "월간 독서모임", desc: "한 달에 한 권, 다 못 읽어도 함께 나누는 모임" },
    { title: "발제자료 공유", desc: "이번 모임과 지난 모임 발제자료를 한곳에서" },
    { title: "모임 기록·사진", desc: "나눈 이야기와 모임 사진을 모아 다시 보기" }
  ],
  contactUrl: "#inquiry"
};

// 회원 책 추천 (3주차: 화면에서만 추가 / 4주차: Google Sheets에 저장)
const BOOKS = [];

// 상태: 제안 → 작성 승인 → 초안 → 공개 승인 → 발행 완료 (보류 별도)
const CONTENTS = [
  {
    id: "C001",
    proposedAt: "2026-11-01",
    topic: "공공기관 AI 교육, 무엇부터 시작해야 할까?",
    question: "AI 교육을 처음 도입하는 기관은 어떤 순서로 준비하나요?",
    reason: "예시 데이터: 연말 교육 계획 수립 시기",
    status: "발행 완료",
    postUrl: "#",
    publishedAt: "2026-11-02"
  },
  {
    id: "C002",
    proposedAt: "2026-11-02",
    topic: "생성형 AI 업무 활용 가이드라인 만드는 법",
    question: "직원용 AI 사용 가이드라인에는 무엇을 넣어야 하나요?",
    reason: "예시 데이터: 도입 기관의 공통 질문",
    status: "초안",
    draft: "예시 초안입니다. 4주차에 Claude가 출처를 확인해 실제 초안을 작성합니다.\n\n첫 문단에는 질문에 대한 직접 답변이 2~3문장으로 들어갑니다.",
    sources: [
      { title: "예시 출처 1 (공식 기관)", url: "https://example.com", date: "2026-10-01" },
      { title: "예시 출처 2", url: "https://example.com", date: "2026-10-15" },
      { title: "예시 출처 3", url: "https://example.com", date: "2026-10-20" }
    ]
  },
  {
    id: "C003",
    proposedAt: "2026-11-03",
    topic: "회의록 정리에 AI를 쓰면 무엇이 달라질까?",
    question: "회의록 작성에 AI를 어떻게 활용하나요?",
    reason: "예시 데이터: 업무 자동화 입문 주제",
    status: "제안"
  },
  {
    id: "C004",
    proposedAt: "2026-11-03",
    topic: "AX 컨설팅은 어떤 순서로 진행될까?",
    question: "AX 컨설팅을 받으면 어떤 결과물이 나오나요?",
    reason: "예시 데이터: 서비스 소개 연계",
    status: "제안"
  },
  {
    id: "C005",
    proposedAt: "2026-11-03",
    topic: "비개발자도 업무 도구를 만들 수 있을까?",
    question: "바이브코딩으로 무엇을 만들 수 있나요?",
    reason: "예시 데이터: 교육 과정 연계",
    status: "제안"
  }
];
