# Cafe24 OAuth 릴레이 Worker

Cafe24 OAuth 인증을 로컬 개발 환경에서 사용하기 위한 Cloudflare Worker입니다.

## 작동 방식

```
[Cafe24] → [Worker URL] → 302 → [localhost:8000/api/v1/channels/cafe24/oauth/callback]
```

Cafe24가 Worker URL로 리다이렉트하면, Worker가 브라우저를 localhost:8000으로 다시 보냅니다.
브라우저(팝업)가 요청하는 것이므로 localhost = 개발자 본인의 PC입니다.

## 배포 방법

### 방법 1: Cloudflare 대시보드 (클릭만으로 배포)

1. [Cloudflare 가입](https://dash.cloudflare.com/sign-up) (무료)
2. Workers & Pages → Create → Worker
3. 이름 입력 (예: `cafe24-oauth-relay`) → Deploy
4. Edit Code 클릭 → `index.js` 내용으로 교체 → Save and Deploy
5. 배포된 URL 확인 (예: `https://cafe24-oauth-relay.YOUR-ID.workers.dev`)

### 방법 2: CLI (wrangler)

```bash
npm install -g wrangler
wrangler login
cd cloudflare/cafe24-oauth-relay
wrangler deploy
```

## 배포 후 설정

1. `.env`의 `CAFE24_REDIRECT_URI`를 Worker URL로 변경:
   ```
   CAFE24_REDIRECT_URI=https://cafe24-oauth-relay.YOUR-ID.workers.dev
   ```

2. [Cafe24 개발자센터](https://developers.cafe24.com/)에서 앱 설정 → Redirect URI에 위 URL 등록 (1회)

3. 이후 터널 없이 OAuth 연결 사용 가능 — 로컬 서버(`make dev`)만 켜두면 됨
