// 구글 시트와 주고받는 기능 (4주차)
const SheetAPI = {
  url() {
    return (window.APP_CONFIG && window.APP_CONFIG.SHEET_API_URL) || "";
  },
  connected() {
    return !!this.url();
  },
  getCode() {
    try { return sessionStorage.getItem("adminCode") || ""; } catch (e) { return ""; }
  },
  setCode(code) {
    try { sessionStorage.setItem("adminCode", code); } catch (e) {}
  },
  async publicPosts() {
    const r = await fetch(this.url() + "?action=public");
    return r.json();
  },
  async meeting() {
    const r = await fetch(this.url() + "?action=meeting");
    return r.json();
  },
  async call(action, payload = {}) {
    const r = await fetch(this.url(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action, code: this.getCode() }, payload))
    });
    return r.json();
  }
};
