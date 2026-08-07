# Postmortem — 네이티브 iOS fetch가 Vercel 모든 라우트에 "Protocol error"

- **날짜**: 2026-08-06
- **스텝**: Speak 진단 실기기 검증 (로컬 웹 E2E는 됐으나 prod 전환 후 실패)
- **상태**: 해결. 모바일 API를 Supabase Edge Function으로 이전해 우회. 실기기서 진단 + phrase 저장 확인.

## 증상 (verbatim)
로컬 웹(:3000)으로는 진단 E2E 성공했는데, prod 전환 후 실기기에서:
```
fetch failed: UnexpectedException: The operation couldn't be completed.
Protocol error (at ExpoModulesCore/Promise.swift:56)
```
그리고 apiFetch에 URL을 박은 뒤:
```
Couldn't reach the API at https://shadowing-plus.vercel.app — fetch failed: ... Protocol error
```
transcript 저장("Saved to your sessions")은 됐는데 진단 fetch만 실패.

## 진단 경로 (hypotheses → 좁힘)
1. `.env`가 죽은 로컬(:3000) 가리킴 → "Could not connect". **맞았고 고침**(prod로) → 그래도 "Protocol error"로 바뀜.
2. `.env` 오타/스킴 → apiFetch에 **URL을 에러에 박아** 확인: `https://shadowing-plus.vercel.app` **정확함**. 오타 아님.
3. 캠퍼스망 TLS 검열 → **셀룰러에서도 동일 실패** → 특정 네트워크 아님.
4. Vercel HTTP/3(QUIC) → curl에 **alt-svc h3 안 보임**, HTTP/2 정상 → 약함.
5. **결정적 대조**: Safari·PWA·curl → Vercel **정상**. 앱→Supabase **정상**. 앱→Vercel **모든 라우트 실패**(진단 POST + 클립 GET `/api/media`,`/api/jobs`).

## 근본 원인
**iOS URLSession(RN 0.86 new-arch) ↔ Vercel-엣지 호스트 특정 비호환.** 폰·네트워크·Vercel 자체는 정상(브라우저/curl로 증명), 앱의 네이티브 fetch가 Vercel 호스트로만 전송 레벨에서 깨짐(TLS/HTTP 핸드셰이크). 정확한 하위 원인은 네이티브 디버깅 영역이라 미확정 — 리서치상 iOS fetch "Protocol error"는 RN/iOS의 알려진 호스트 특정 버그 부류.

## 수정 (before → after)
- **before**: 모바일 진단이 Vercel 라우트(`apiJson("/api/talk/diagnose")`) 호출 → Protocol error.
- **after**: 진단을 **Supabase Edge Function**(`supabase/functions/talk-diagnose`, Deno)로 이전, 클라는 `supabase.functions.invoke("talk-diagnose")` → 앱이 이미 잘 닿는 supabase.co 전송 사용 → **성공**. 결정: [[decisions/0004-mobile-api-supabase-edge-functions]].

## 교훈 / 재발 방지
- **"조건별로 되고 안 되고"일 때, 대조군으로 층을 갈라라** — Safari(브라우저) vs 앱, Supabase vs Vercel, Wi-Fi vs 셀룰러. 이 3개 대조가 "네트워크냐/호스트냐/앱 fetch 스택이냐"를 한 번에 갈랐다.
- **에러에 대상 URL을 박아라** — `apiFetch`가 실패 시 base URL을 문구에 넣게 고친 게(이번 커밋) 진짜 진단 도구였다. "Could not connect"만으론 몇 턴을 헤맸다. **이게 이 실패의 회귀 방지책**(다음에 같은 부류 뜨면 화면에서 즉시 URL이 보임).
- **Expo 앱의 표준은 앱→Supabase(+Edge Functions), Vercel은 웹용.** 네이티브가 Vercel API 직접 호출은 비표준이었다.
- **후속**: `/api/media`(재생)도 같은 Protocol error 대상 → Edge Function/Storage 서명 URL로 이전 필요.
