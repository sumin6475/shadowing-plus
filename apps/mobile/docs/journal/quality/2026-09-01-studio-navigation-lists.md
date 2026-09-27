# 2026-09-01 · Studio 탐색과 최근 목록

범위: `src/screens/world.tsx`의 Studio 홈 및 Topic 상세 표시만 변경. 공용 디자인 토큰과 다른 화면은 변경하지 않음.

## 요청 반영

- Speaking folio 카드 전체 및 우측 상단 `More ›`가 기존 Speaking insight 화면으로 이동.
- 별도 파란 Speaking insight 배너 제거.
- Topics 아래 Recent Stories 목록 추가; 기존 Story row 디자인 재사용.
- Recent Stories와 Recently recorded를 데이터가 없어도 유지하고 Phrase 탭과 같은 Card 기반 empty state 표시.
- Topic 상세 Story row의 Draft 칩 제거; 상태 데이터는 변경하지 않음.
- `+ New story` 헤더 액션을 제거하고 목록 아래 기존 full accent `Pill`로 `Add new` 배치.

## 검증

| 단계 | 결과 | 비고 |
|---|---|---|
| TypeScript | PASS | `tsc --noEmit` |
| ESLint | PASS | error 0, 기존 warning 15 |
| Diff whitespace | PASS | `git diff --check -- src/screens/world.tsx` |
| iOS export | PASS | 2,107 modules, Hermes bundle 5.9 MB |
| Simulator launch | PASS | `Saylo Dev` 개발 빌드와 Metro 연결 |
| Authenticated visual check | PENDING | Simulator가 로그아웃 상태라 온보딩 화면에서 대기 |
