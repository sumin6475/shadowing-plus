# Quality snapshot — Phrase capture quick source menu

- **스텝**: 빠른 source menu + 공통 Phrase 편집기
- **대상**: `feat/mobile-skeleton`, Expo SDK 57, `phrase-capture` v5

## 결과

| gate | result | evidence |
|---|---|---|
| Diff whitespace | PASS | `git diff --check` |
| TypeScript | PASS | `npx tsc --noEmit` (exit 0) |
| ESLint | PASS | `npm run lint -- --quiet` (exit 0) |
| iOS production bundle | PASS | `npx expo export --platform ios` (1,850 modules, exit 0) |
| Resolved Expo permissions | PASS | CAMERA·RECORD_AUDIO 보존, camera/photos usage copy 확인 |
| Edge Function deploy | PASS | `phrase-capture` ACTIVE version 5, `verify_jwt=true` |
| Unauthorized text smoke | PASS | `{context_text}` anon-only invocation HTTP 401 |
| Unauthorized phrase-details smoke | PASS | `{phrase_text,context_text}` anon-only invocation HTTP 401 |
| Context translation contract | PASS | OCR·context·phrase-details 응답에 `context_translation`; 원문 수정 시 stale 번역 제거 |
| Multi-phrase static path | PASS | 저장 후 shared context 유지, Phrase 필드만 초기화, saved chip preview/edit 경로 확인 |
| Save sheet CTA layout | PASS | 세로 sheet에서 `full/flex:1` 제거, primary 100% 폭·Done 중앙 정렬; tsc/lint/export 통과 |
| In-place photo replacement | PASS | 현재 route에서 camera/library 재선택; 취소 시 기존 draft 유지, 새 asset 확정 후 OCR 재실행 |
| Context fingerprint persistence | PASS | 신규 `source_context.context_fingerprint`, raw legacy 및 최근 500개 normalized fallback 구현 |
| Save-another chip hydration | PASS | OCR 완료·`Save another` 직후 DB hydrate; 읽기 실패 시 in-memory chips 보존 |
| Physical iPhone build/install | PASS | `expo-clipboard` Pod compile/link, Xcode 0 errors, install 후 bundle launch와 process 유지 확인 |
| Picker presentation sequencing | PASS | iOS `Modal.onDismiss` 이후에만 camera/PHPicker 실행; TypeScript·ESLint PASS |
| Camera/photos/text UX | PENDING USER TAP | picker 직행·취소·붙여넣기·AI 채움·저장 확인 필요 |
| Authenticated text extraction | PENDING USER TAP | 로그인 세션에서 `Fill from context` 응답 확인 필요 |
| Authenticated phrase details | PENDING USER TAP | 직접 Phrase와 수정한 OCR Phrase에서 details 채움 확인 필요 |
| Authenticated multi-save/edit | PENDING USER TAP | 동일 OCR context에서 2개 저장→chip 확인→수정 저장 확인 필요 |
| Physical save sheet/replace photo | PENDING USER TAP | `Save another` 표시·정렬 및 Take again/Choose another→OCR 재실행 확인 필요 |
| Physical context rehydration | PENDING USER TAP | 첫 Phrase 저장→Save another chip 유지, 화면 재진입→동일 사진 OCR 후 legacy/new chip 복원 확인 필요 |

## 정적 경로 확인
- 전 화면 `CaptureFab`은 작은 modal menu만 열고, 카메라·사진은 성공한 asset이 있을 때에만 capture 화면을 push한다.
- 이미지 입력은 resize/compress 후 `phrase-capture`로 보내고, 텍스트 입력은 사용자의 `Fill from context` 탭에서만 같은 함수로 보낸다.
- 이미지와 텍스트는 Phrase·kind·meaning·note·Story를 편집하는 한 저장 경로로 합류한다.
- 텍스트 모드는 모델 응답이 아니라 사용자가 보낸 context 원문을 반환·검증 기준으로 고정한다.
- 직접 입력은 `manual`, 명시적 Paste 버튼은 `paste`, 이미지는 `image_ocr` source로 기록한다.
- `phrase_text` 모드는 사용자가 정한 Phrase를 서버에서 고정하고 kind·meaning·usage note만 생성한다.
- OCR/문맥 추천 후 Phrase가 바뀌면 `Update AI details`로 stale metadata를 표시한다.
- OCR·텍스트 AI 응답은 원문 전체의 자연스러운 한국어 번역을 반환하고 `source_context.context_translation`에 저장한다.
- 저장 후 `Save another`는 사진·원문·번역·source·Story를 유지하고 Phrase 전용 필드만 비운다.
- 같은 capture에서 저장된 항목은 `SAVED FROM THIS CONTEXT` chip으로 보이며 chip에서 저장값 확인·수정이 가능하다.
- 저장 완료 sheet는 배경 탭으로 닫히지 않아 `Save another`/`Done` 선택이 우발적으로 실행되지 않는다.
- 사진 preview 아래 `Take again`과 `Choose another`를 제공하고, picker 취소 시 기존 사진·OCR draft를 유지한다.
- 새 사진을 확정하면 현재 route에서 OCR을 다시 실행한다. 이 context에서 이미 저장한 Phrase가 있으면 Bank에는 보존됨을 안내한 뒤 화면의 context chip만 초기화한다.
- OCR/text Context는 이미지를 저장하지 않고 정규화된 `ctx1` fingerprint로 식별하며, OCR 완료와 Save another 직후 DB를 다시 읽어 chip을 복원한다.
- fingerprint 도입 전 Phrase는 원문 완전 일치와 bounded normalized fallback으로 같은 Context에 포함한다.
- 저장 성공 toast는 capture 화면을 pop한 뒤 shell에 표시된다.
- picker 취소는 route를 추가하지 않으며, 편집 중 이탈은 기존 unsaved-draft 확인을 유지한다.
- 실기기 첫 확인에서 Photos가 modal dismiss와 겹쳐 무한 loading 된 회귀를 수정했다. [postmortem](../postmortems/2026-08-07-image-picker-modal-dismiss-race.md)
- 저장 sheet에서 공용 `full` Pill이 세로 공간을 차지해 CTA가 사라진 회귀를 수정했다. [postmortem](../postmortems/2026-08-07-phrase-save-sheet-full-pill-collapse.md)
- Context chip을 local state에만 의존해 복원할 수 없던 회귀를 수정했다. [postmortem](../postmortems/2026-08-07-capture-context-chips-volatile-state.md)
