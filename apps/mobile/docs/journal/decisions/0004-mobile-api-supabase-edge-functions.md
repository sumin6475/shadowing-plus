# ADR 0004 — 모바일 서버 API를 Vercel → Supabase Edge Functions로

- **날짜**: 2026-08-06
- **스텝**: Speak 진단이 실기기에서 Vercel에 못 붙는 문제 해결 + 모바일 백엔드 방향
- **상태**: accepted — 실기기 검증 완료 (2026-08-06: 진단 moments 정상 표시, Vercel Protocol error 우회 확인)

## 맥락 (Context)
실기기에서 앱의 **네이티브 fetch가 Vercel 모든 라우트에 "Protocol error"**(`The operation couldn't be completed. Protocol error`)로 실패. 그런데 **Safari·PWA·curl·앱→Supabase는 전부 정상.** 즉 폰·네트워크·Vercel 자체는 멀쩡하고, **iOS URLSession ↔ Vercel-엣지 호스트 특정 비호환**이다(Wi-Fi·셀룰러 무관, 결정적·재현됨). 정확한 근본원인(TLS/HTTP 핸드셰이크)은 네이티브 레벨 디버깅이 필요.

리서치: iOS fetch "Protocol error"는 RN/iOS의 알려진 반복 버그 부류(axios#2641 동일 문구, iOS 18.4 회귀 등)이고 호스트/CDN 특정. 그리고 **Expo+Supabase 앱의 표준 아키텍처는 "앱→Supabase 직접(auth/DB RLS) + 서버로직·시크릿은 Supabase Edge Functions"**, Vercel은 웹 프론트용 — 네이티브 앱이 Vercel API를 직접 부르는 게 비표준이었다.

## 검토한 선택지 (Options)
1. **Supabase Edge Function (채택)** — 진단 로직을 Deno 함수로. 앱이 이미 잘 닿는 supabase.co 전송 재사용, OpenAI 키는 Supabase 시크릿, `functions.invoke`가 JWT 자동 첨부.
2. **VPS 자체호스팅**(Oracle/Dokploy/nginx) — plain HTTPS라 앱이 붙긴 하겠지만 **서버 운영·배포·보안·비용 부담 최대**.
3. **네이티브 URLSession 패치**(`RCTSetCustomNSURLSessionConfigurationProvider`로 HTTP/1.1 강제 등) — 취약한 네이티브 패치, 비표준, 유지보수 리스크.
4. **Vercel 유지 + 근본원인 디버깅** — 며칠 소요·불확실, 성공해도 비표준 구조 유지.

## 결정 (Decision)
옵션 1. 진단 API를 `supabase/functions/talk-diagnose`(Deno)로 이전하고, 모바일 클라는 `supabase.functions.invoke("talk-diagnose")` 사용. **웹은 무변경** — 자체 Vercel 라우트(`web/src/app/api/talk/diagnose`) 계속 사용. Edge Function은 모바일 전용·additive.

## 기각 이유 (판단의 증거)
옵션 2/3은 검증된 전송(supabase.co)이 눈앞에 있는데 굳이 운영부담(2)이나 취약 패치(3)를 지는 것. 옵션 4는 앱이 이미 Supabase는 잘 쓰므로(같은 dev 빌드에서 성공) dev-artifact가 아닌 호스트 특정 문제 → 디버깅이 오래 걸리고 성공해도 비표준. 리서치가 옵션 1을 **버그 우회가 아니라 Expo+Supabase 앱의 정석**으로 뒷받침.

## 결과 (Consequences)
- 모바일 서버로직이 `supabase/functions/`로 이동, **웹(Vercel)과 물리적으로 분리**. 진단이 `EXPO_PUBLIC_API_BASE_URL`(Vercel)과 무관해짐.
- **Supabase CLI 세팅 필요** — worktree 루트에서만, `functions`·`secrets`·`link`만. **`db push`/`reset`/`pull` 금지**(공유 prod DB=웹이 씀).
- OpenAI 키가 두 곳(Vercel env + Supabase secret)에 존재 — 별개 저장소, 웹/모바일 각자.
- **후속**: `/api/media`(재생) 등 다른 모바일-필요 라우트도 같은 방식 이전 후보. usage_events 비용기록은 Edge Function에서 아직 미구현(웹 라우트만 함).
- **재검토 조건**: iOS↔Vercel 근본원인이 밝혀져 간단히 고쳐지면, 또는 Edge Functions 유지비/한계가 커지면 재검토.
