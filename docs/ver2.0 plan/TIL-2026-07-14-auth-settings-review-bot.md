# 💻 TIL (Today I Learned) — 2026.07.11 ~ 07.14

> Shadowing Plus를 개인용 단일 유저 앱 → 실제 멀티유저 서비스로 리팩토링하는
> 세션. Phase 0(안전망) → Phase 1(auth+RLS) → settings 재구성 → Review 봇까지.

## 🚀 오늘 구현한 기능 / 학습 주제
- [Feature] Phase 0 — 안전망: stuck-job reaper + R2 미디어 프라이버시(공개 URL → 서명 URL)
- [Feature] Phase 1 — Supabase Auth(`@supabase/ssr`) + 전면 RLS + per-user isolation
- [Feature] 로그인 방식 전환: 매직링크 → 이메일/비밀번호 + Google OAuth
- [Feature] Settings 재구성: 페이지 라우트 → profile 드롭다운 → 모달(탭: Profile/Usage/Language)
- [Feature] Review 봇(Telegram): 만기 북마크 → 메신저 배달 → 버튼 채점 → SM-2
- [CS] Next.js 16 breaking changes, RLS 전환의 위험한 순서, React 포털 stacking context

## 🛠️ 핵심 구현 및 개념 정리

### 1. 주요 아키텍처 결정

**RLS OFF → ON 전환 (Phase 1의 핵심):** `DEFAULT auth.uid()`를 client-insert
테이블에 걸어서 클라이언트 쿼리 코드를 안 바꾸고도 소유권 자동 스탬프. 단
service key는 세션이 없어 `auth.uid()`가 NULL이므로, 파이프라인 insert는
`user_id`를 명시적으로 넘겨야 함.

```sql
-- 위험한 순서 주의: 컬럼추가 → backfill → NOT NULL → RLS 켜기 (순서 어기면 기존 행 고아됨)
ALTER TABLE folders ALTER COLUMN user_id SET NOT NULL, SET DEFAULT auth.uid();
-- service-key insert 테이블(videos/jobs)은 DEFAULT 없이 앱 코드에서 명시적으로 stamp
```

**Review 봇 — 채널 무관 코어 + 어댑터:** `select-due`(순수+테스트),
`gradeBookmark`(HTTP 라우트와 봇이 공유하는 단일 채점 경로), `ChannelAdapter`
인터페이스로 분리. 채널 결정(Slack vs Telegram)과 무관하게 코어부터 빌드.

```ts
// 웹훅에서 신원은 payload가 아니라 채널 ref로 조회 (보안 핵심)
// — 안 그러면 남의 북마크를 채점할 수 있음
const { data: settings } = await supabaseAdmin()
  .from("review_settings")
  .eq("channel", channel).eq("channel_user_ref", event.userRef).maybeSingle();
```

### 2. 왜 이 방식을 선택했는가? (Rationale)

- **매직링크 → 비밀번호/Google:** 매직링크는 리다이렉트가 취약(만료·URL 설정)했고
  UX가 불편. 비밀번호 로그인은 리다이렉트 왕복이 없어 세션 쿠키를 즉시 설정 → 실패 지점 제거.
- **Slack 대신 Telegram:** (리서치 워크플로우 결론) Slack 봇은 워크스페이스 밖의
  개인을 cold-DM 불가 — 언어 학습자는 동료가 아니라 낯선 사람. Telegram은 `/start` 후
  무료로 아무에게나 DM 가능. 브랜드도 "일/의무"(Slack) vs "개인/글로벌"(Telegram)로 후자가 적합.
- **Settings 모달 포털:** 사이드바에 `transform`이 있어 stacking context가 생겨
  `position:fixed` 모달이 사이드바 박스 안에 갇힘 → `createPortal(<body>)`로 탈출.

## 🚨 트러블슈팅 (Troubleshooting)

### 🔍 Issue 1 — Next.js 16: middleware가 사라짐
상황: `@supabase/ssr` 세션 갱신을 위해 `middleware.ts`를 만들려 했으나 Next 16 문서 확인.
```
Note: The middleware file convention is deprecated and has been renamed to proxy.
```
(출처: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`)

### 💡 Cause & Solution
원인: **Next.js 16.0.0에서 `middleware` → `proxy`로 이름 변경**. `middleware.ts`를
그대로 만들었으면 조용히 동작 안 했을 것. 해결: `web/src/proxy.ts` + `export function proxy()`.
(AGENTS.md의 "번들된 docs를 먼저 읽어라" 규칙이 이 버그를 막음.)

### 🔍 Issue 2 — 로그인 페이지 hydration mismatch
```
Hydration failed because the server rendered HTML didn't match the client.
+ <button className="login-google" ...
```
상황: `/login` 접속 시 "1 Issue" 팝업.

### 💡 Cause & Solution
원인: `useState(searchParams.get("error"))` — 렌더 중 `useSearchParams()` 값을
읽어 state를 seed하면 SSR/client가 달라짐. 해결: lazy initializer로 첫 렌더에서
한 번만 읽기. (프로젝트 ESLint가 `react-hooks/set-state-in-effect`로 우회안도 잡아줌)

## 🎯 Retrospective & Next Action

한 줄 평: "실제 앱을 띄워서 클릭해봐야 잡히는 버그가 많다 — build/typecheck만으론
hydration·stacking·리다이렉트 문제를 못 잡는다. 그리고 라이브러리 버전 breaking
change는 번들 docs를 먼저 읽는 게 정답."

미결/내일 할 일:
- [ ] **Phase 1 배포**: `008_auth_rls.sql`은 세션 레이어 배포 검증 후 적용 (runbook 순서 엄수). 2계정 isolation 테스트.
- [ ] **Review 봇 setup**: Telegram @BotFather 봇 생성 → 009 마이그레이션 → env → setWebhook → chat id 연결 (runbook 참고).
- [ ] Review 봇 후속: "Connect Telegram" 버튼(모달), 배치 내 여러 카드 순차 채점.
- [ ] Settings UI 디자인 리노베이션(스펙 문서 있음), 다크모드 여부 결정.
- [ ] Language 탭은 현재 preference만 저장 — 파이프라인 연결은 per-clip 언어(추후).
