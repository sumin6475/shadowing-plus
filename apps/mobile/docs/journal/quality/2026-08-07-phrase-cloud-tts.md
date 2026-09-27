# Quality snapshot — cached cloud phrase TTS

- **스텝**: Phrase Bank 클라우드 발음
- **대상**: `feat/mobile-skeleton`, `gpt-4o-mini-tts` / `marin`, Supabase Edge Functions + private R2
- **환경**: iOS production bundle + 연결된 iPhone(dev client)

## 결과

| gate | result | evidence |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` (exit 0) |
| ESLint | PASS | `npm run lint -- --quiet` (exit 0) |
| Diff whitespace | PASS | `git diff --check` |
| iOS production bundle | PASS | `expo export --platform ios` (1,845 modules, exit 0) |
| Edge Function deploy | PASS | `phrase-tts` ACTIVE version 1, `verify_jwt=true` |
| Unauthorized smoke | PASS | anon-only invocation HTTP 401 `Unauthorized` |
| Physical dev-client launch | PASS | connected iPhone process relaunched and running |
| Authenticated generation | PENDING USER TAP | 첫 Phrase 스피커 탭에서 OpenAI→R2 cache miss 생성 확인 필요 |
| Cache-hit replay | PENDING USER TAP | 두 번째 탭에서 동일 MP3 재생 확인 필요 |
| Device-TTS fallback | STATIC PASS | API/다운로드 실패와 15초 timeout 경로가 기존 `expo-speech`로 연결됨 |

## 읽은 것

비밀키·임의 텍스트 입력을 모바일에서 제거하고, RLS로 확인한 소유 phrase만 생성하도록 제한했다. 배포·인증 차단·앱 번들까지 통과했으며, 실제 비용이 발생하는 인증 사용자 생성과 두 번째 캐시 재생은 사용자의 실기기 탭 확인이 남았다.
