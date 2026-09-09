# Studio 라우트 복구 — quality snapshot

Date: 2026-09-08

## Scope

- Studio 홈 하단에 `Browse` 블록을 추가해 진입점이 0이 된 세 화면을 복구: `studio`(speaking stats), `sessionsList`(all attempts), `topicsList`(Topics).
- `Your situations` 섹션 헤더에 상시 `All` 액션을 붙여, Situation이 하나라도 있으면 Topics로 갈 길이 사라지던 문제를 제거.
- `TopicsListScreen`의 Topic 카드 목적지를 legacy `domain`에서 새 `studioTopic`으로 변경. 이로써 등록만 되고 아무도 push하지 않던 `StudioTopicScreen`이 실제로 도달 가능해짐.

## Root cause

탭 라우팅이 `topics`/`sessions` → `StudioHomeScreen`으로 바뀌면서 `SpeakingWorldScreen`(world.tsx)이 shell에서 import조차 되지 않는 고아가 됐다. 그 화면이 `studio` / `sessionsList` / `topicsList`의 유일한 진입점이었기 때문에, 화면 코드는 멀쩡한 채로 도달 경로만 사라졌다. 코드 삭제가 아니라 진입점 소실이다.

## Automated checks

- `npm run typecheck`: PASS.
- `npm run lint:baseline`: PASS. 0 errors / 15 warnings (기존 기준 그대로, 신규 경고 없음).
- `npm run export:ios`: PASS. `tmp/export-ios` 내보내기 완료, Hermes 번들 6MB.
- Scoped diff: `studio-information.tsx` +61 / `world.tsx` 1줄. NativeTabs 하단바 파일 변경 0건.

## Not verified

- **Simulator 런타임 확인 없음.** 정적 검사와 번들 빌드까지만 통과했다. 세 개의 Browse 행이 실제로 각 화면을 열고 되돌아오는지는 기기/시뮬레이터에서 눌러봐야 한다.
- 원격 migration ledger 불일치(local 001–028 vs remote 020)는 그대로. 이번 변경은 DB를 건드리지 않는다.

## Deferred

`SpeakingWorldScreen`(world.tsx 460–667, 208줄)은 여전히 죽은 코드다. 삭제를 시도했더니 `folioRing`, `FolioDonut`, `DonutSlice`, `AnimatedRing`, `FOLIO_RING`과 reanimated/svg import까지 연쇄로 딸려 나와 경고가 15 → 20으로 늘었다. 라우트 복구 PR의 diff를 흐리므로 별도 정리 작업으로 분리했다.
