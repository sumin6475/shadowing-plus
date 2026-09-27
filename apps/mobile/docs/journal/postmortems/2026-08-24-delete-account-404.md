# 2026-08-24 · 계정 삭제 "Check your connection" 오류 — 함수 미배포

## 증상 (verbatim)

기기에서 Profile → Delete account → Delete 확인 후:

> Couldn't delete your account
> We couldn't delete your account. Check your connection and try again.

네트워크는 정상이었음.

## 가설

1. 함수 배포 누락 (404) — 클라이언트 폴백 문구 노출
2. 함수 내부 500 (cascade 실패, service key 문제)
3. 클라이언트-서버 계약 불일치

## 진단

무인증 프로브로 구분 — `delete-account`는 **404 `{"code":"NOT_FOUND","message":"Requested function was not found"}`**, 배포된 `talk-diagnose`는 401. 즉 블로커 수정(5.1.1(v))의 Edge Function이 **작업 트리에만 존재하고 한 번도 배포된 적 없음** (`git status`: `supabase/functions/delete-account/` untracked).

클라이언트 `lib/account.ts`의 `readFunctionError`는 응답 body에서 `error` 필드만 찾는데, Supabase 플랫폼 404 body는 `code`/`message` 스키마라 매칭 실패 → "Check your connection" 폴백. 문구가 원인(네트워크)을 가려 진단이 늦어짐.

## 수정

```bash
npx supabase functions deploy delete-account --project-ref hetcnrmzrksbjoeczeze
npx supabase functions deploy talk-diagnose --project-ref hetcnrmzrksbjoeczeze
```

(talk-diagnose는 level(CEFR) 프롬프트 변경이 로컬에만 있던 것도 함께 해소 — 구버전 배포는 level을 무시하고 b1 폴백.)

## Before / After

| | Before | After |
|---|---|---|
| `POST /functions/v1/delete-account` (무인증) | 404 NOT_FOUND | 401 UNAUTHORIZED_NO_AUTH_HEADER |
| 앱에서 삭제 시도 | "Check your connection" 실패 | (함정 통과 — 플랫폼 JWT 게이트 → 함수 getUser() 이중 검증) |

배포 전 점검: 전 유저 테이블 ON DELETE CASCADE (migrations 008–023) 확인, R2·service role 시크릿 이미 프로젝트에 존재 확인.

## 남은 단계

- ~~버리는 계정 E2E~~ **완료 (08-25)**: 기기에서 가입 → Profile → Delete account → 삭제·사인아웃 정상 동작 확인. 확인 Alert(destructive) 정상 노출 확인.
- ~~커밋~~ **완료 (08-25)**: 08-21 커밋 이후 작업 트리 전체를 feat 커밋 + docs(journal) 커밋으로 반영.

## 후속 (08-25)

- 사용자 리포트: "확인 팝업이 안 떴다" — 코드상 확인 Alert(settings.tsx `confirmDeleteAccount`)이 `deleteAccount()`의 유일한 호출 경로이고, 직전의 실패 팝업("Check your connection")도 같은 Alert 스택에서 정상 노출됐으므로 확인 팝업은 테스트 빌드에 포함되어 있었음. RN `Alert.alert` = iOS 네이티브 UIAlertController(destructive 빨간 Delete + Cancel).

## 배운 것

- 기능 완성 = 코드 + **배포 + E2E**. 08-24 저널 자체가 "배포 후 E2E 필요"를 적어두고 멈췄고, 다음 세션에서 그 갭이 "연결 오류"로 재발견됐다. 배포 못한 기능은 없는 기능이다.
- 클라이언트 에러 폴백 문구는 원인을 추측하게 만들지 말 것 — "connection" 폴백이 서버 404를 네트워크 문제로 위장했다.

## 회귀 방지

- 배포 후 무인증 프로브(404 vs 401)를 배포 확인 절차로: `.agents/deploys/` 노트에 "Production route bodies" 검증 항목으로 이미 패턴화되어 있음 — 새 함수(delete-account)에 이 패턴을 처음 적용하지 않은 것이 실수.
