# Postmortem — `Save another` 이후 Context chip 복원 실패

- **날짜**: 2026-08-07
- **영향**: 첫 Phrase 저장 후 `Save another`로 돌아왔을 때 `SAVED FROM THIS CONTEXT`가 비어, 같은 문장에서 무엇을 이미 저장했는지 확인할 수 없었음.

## 원인
chip 목록의 유일한 근거가 `PhraseCaptureScreen`의 `savedPhrases` React state였다. 새 insert 결과가 현재 mounted 화면에 남아 있다는 전제였고, DB에서 동일 Context 기록을 다시 읽는 경로가 없었다. 따라서 화면 state가 재생성되거나 기존 Phrase가 `already`로 판정되는 등 로컬 append가 유지되지 않는 경우 복구할 수 없었다.

## 수정
- 신규 저장에 정규화 OCR Context의 fingerprint를 `source_context`에 함께 기록한다.
- OCR/텍스트 AI 완료 시 동일 fingerprint의 저장 Phrase를 DB에서 hydrate한다.
- `Save another`가 Phrase 필드를 비운 직후에도 동일 Context를 다시 hydrate한다.
- fingerprint 도입 전 항목은 raw Context 및 bounded normalized fallback으로 복원한다.
- 읽기 실패 시 현재 in-memory chip을 지우지 않아 네트워크 오류를 데이터 소실처럼 보이지 않게 한다.

## 회귀 확인
- TypeScript PASS
- ESLint PASS
- `git diff --check` PASS
- iOS production export PASS(1,850 modules)
- 연결된 iPhone 앱 재실행/process 유지 PASS
- 인증 사용자 DB hydrate와 chip 시각 확인은 사용자 탭 대기

품질 스냅샷: [Phrase capture quick source menu](../quality/2026-08-07-phrase-capture-quick-source-menu.md)
