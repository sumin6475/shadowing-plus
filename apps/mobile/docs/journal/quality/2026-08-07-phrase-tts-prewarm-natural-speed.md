# Quality snapshot — Phrase TTS prewarm + natural speed

- **스텝**: 신규 Phrase 음성 사전 생성과 자연 회화 속도
- **대상**: `feat/mobile-skeleton`, Expo SDK 57, `phrase-tts` v2

## 결과

| gate | result | evidence |
|---|---|---|
| Diff whitespace | PASS | `git diff --check` |
| TypeScript | PASS | `npx tsc --noEmit` (exit 0) |
| ESLint | PASS | `npm run lint -- --quiet` (exit 0) |
| iOS production bundle | PASS | `npx expo export --platform ios` (1,845 modules, exit 0) |
| Edge Function deploy | PASS | `phrase-tts` ACTIVE version 2, `verify_jwt=true` |
| Unauthorized smoke | PASS | anon-only invocation HTTP 401 |
| Physical dev-client launch | PASS | 연결된 iPhone 앱 재실행 후 process 유지 |
| Holdout code review | PASS | 2 high + 2 medium 수정 후 독립 재리뷰 APPROVE |
| Authenticated v2 generation | PENDING USER TAP | 새 Phrase 저장 또는 기존 Phrase 상세 진입 후 생성 확인 필요 |
| Natural-speed listening | PENDING USER TAP | 정상 회화 속도·연음·명료도 실기기 청음 필요 |

## 정적 경로 확인
- `createPhrase()`는 새 row 및 Story link 완료 뒤 `prewarmPhraseSpeech(id)`를 fire-and-forget으로 호출한다.
- 같은 앱 프로세스의 동시 prewarm/fetch는 phrase id별 Promise로 합쳐진다.
- Phrase 상세는 mount 시 자동 재생 없이 URL을 설정해 `expo-audio`가 즉시 로드한다.
- v2 cache namespace 때문에 기존 느린 v1 MP3는 재사용되지 않는다.
- prewarm 실패는 저장 결과에 영향을 주지 않으며 탭 시 cloud retry → device fallback이 남는다.
