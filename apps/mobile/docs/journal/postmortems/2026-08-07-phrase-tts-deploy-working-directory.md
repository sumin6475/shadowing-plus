# Postmortem — Phrase TTS 배포 엔트리포인트 경로 불일치

- **날짜**: 2026-08-07
- **스텝**: `phrase-tts` v2 배포
- **심각도**: P3 (첫 시도 실패, 원격 변경 없음)

## 실패 현상
`apps/mobile`에서 `supabase functions deploy phrase-tts`를 실행하자 CLI가 `apps/mobile/supabase/functions/phrase-tts/index.ts`를 찾으려 했고 HTTP 400 `Entrypoint path does not exist`로 배포가 중단됐다.

## 근본 원인
저장소의 Supabase 설정과 `entrypoint_path`는 저장소 루트 기준이다. 이미 `apps/mobile`에 들어간 상태에서 배포해 상대 경로에 `apps/mobile`이 한 번 더 붙었다.

## 수정
저장소 루트 `/Users/jadekim/Documents/shadowing-plus-mobile`에서 동일 함수 배포를 다시 실행했다. CLI가 `supabase/functions/phrase-tts/index.ts`를 업로드했고 ACTIVE version 2가 됐다.

## 검증
함수 목록에서 version 2, `verify_jwt=true`, ACTIVE를 확인했고 anon key만 보낸 POST가 HTTP 401을 반환했다.

## 재발 방지
이 저장소의 Supabase CLI 명령은 저장소 루트에서 실행한다. 프로젝트 ref를 읽을 때만 `apps/mobile/.env`의 명시 경로를 사용한다.
