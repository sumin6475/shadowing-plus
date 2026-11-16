# Postmortem — Speaking review가 항상 실패: 서버 함수가 배포되지 않은 채 앱만 나감

- **날짜**: 2026-11-16
- **스텝**: TestFlight 51 (1.0.1, main ed0f72f) 확인 중
- **심각도**: P1 (Speaking review 전부 실패, 세션 데이터는 안전)

## 실패 현상
TestFlight 51에서 Talk를 끝내고 Feedback 페이지로 넘기면 매번 같은 화면이 떴다. ↻를 눌러도 같았다.

```
Something went wrong
Couldn’t complete the analysis. Your session is safe. Please try again.
```

## 가설
- **H1**: 앱의 새 자동 시작/상태 코드(#40)에 문제가 있다.
- **H2**: AI 호출(OpenAI) 단계에서 실패한다.
- **H3**: 서버가 요청 자체를 거절한다.

## 검증 방법과 결과
- 문구는 `advanced-feedback.ts`의 `message()`가 모르는 코드에 쓰는 기본값이다. 앱이 서버 오류를 받았다는 뜻이라 H1은 약해졌다.
- Production DB를 읽기 전용으로 조회(`supabase db query --remote --read-only`)했다. `feedback_generation_attempts`의 마지막 행은 2026-11-11 17:16이었고, 오늘 세션 `b0feacf8…`은 리포트 0개였다. 시도 행은 `claim` 단계에서 생기므로 그 전에 막힌 것이다. H2는 기각.
- `supabase functions list`: `talk-advanced-feedback` v1, 2026-11-06 배포. `git log`: 그 뒤 `18a0dee`(11-11)가 `parseRequest`의 허용 키에 `responseLanguage`를 추가했고, 앱도 같은 커밋부터 그 값을 보낸다. v1은 모르는 키가 있으면 `feedback_bad_request`(400)를 던진다. → H3 확정.

## 근본 원인
엣지 함수는 앱 빌드와 따로 손으로 배포하는데, 서버와 앱이 함께 바뀐 커밋(`18a0dee`)에서 서버 쪽 배포가 빠졌다. 빌드 전에 "라이브 함수 = 저장소 코드"인지 확인하는 단계가 없었다. 11-11 성공 1건은 그 전 클라이언트에서 나온 것이라 문제가 바로 드러나지 않았다.

## 수정
- `talk-advanced-feedback`를 저장소(main ed0f72f) 코드로 재배포: v1 → v2 (2026-11-16, 사용자 승인). 앱 재빌드는 필요 없다.

## 지표 before / after
- 배포 전: 11-11 이후 생성 시도 0건, 화면은 항상 실패.
- 배포 후: 라이브 v2 소스가 저장소와 파일 단위로 일치(`verify:edge-deploys`). 실기기(TestFlight 51)에서 같은 세션 `b0feacf8…`의 ↻ → 2026-11-16 18:50 UTC 리포트 `ready`, 7.0초, error_code 없음.

## 재발 방지 (회귀 스위트에 추가)
- `npm run verify:edge-deploys`(`scripts/verify-edge-deploys.mjs`) 추가.
  - 라이브 함수 소스를 임시 폴더로 내려받아 저장소의 `supabase/functions`와 파일 단위로 비교한다.
  - 다르면 exit 1로 끝난다.
  - 커밋 날짜 비교는 버렸다. 처음 버전은 8개를 잘못 잡았다(작업 트리에서 배포한 뒤 커밋한 경우).
- TestFlight 빌드 전에 실행한다. 첫 실행에서 아직 다른 함수 4개가 나왔다.
  - `phrase-tts`, `phrase-capture`, `phrase-embed`: `_shared/mobile-usage.ts`의 가격표 한 줄만 다르다.
  - `ask-assist`: 노트 맥락·대화 기록 기능이 빠져 있다.
