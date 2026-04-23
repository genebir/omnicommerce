/**
 * Cafe24 OAuth 콜백 릴레이 Worker
 *
 * Cafe24가 이 Worker URL로 리다이렉트하면, 브라우저의 localhost:8000으로 다시 보낸다.
 * Cafe24 개발자센터에 이 Worker URL을 Redirect URI로 1회 등록하면 영구 사용 가능.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL("http://localhost:8000/api/v1/channels/cafe24/oauth/callback");
    target.search = url.search;
    return Response.redirect(target.toString(), 302);
  },
};
