# Quality snapshot — Phrase detail hierarchy

- **스텝**: Phrase 상세 hero/context/action 위계 + 저장값 편집
- **대상**: `feat/mobile-skeleton`, Expo SDK 57

## 결과

| gate | result | evidence |
|---|---|---|
| Diff whitespace | PASS | `git diff --check` |
| TypeScript | PASS | `npx tsc --noEmit` (exit 0) |
| ESLint | PASS | `npm run lint -- --quiet` (exit 0) |
| iOS production bundle | PASS | `npx expo export --platform ios` (1,851 modules, exit 0) |
| Saved kind visibility | PASS | hero에 `PhraseKind` label chip 렌더 |
| Edit persistence path | PASS | overflow → edit sheet → `updatePhraseDetails` → local detail state 갱신 |
| Delete persistence path | PASS | 확인 dialog → `deletePhrase` → back + notice |
| Source hierarchy | PASS | video는 context metadata+link, photo/paste/manual은 metadata-only |
| Detail FAB collision | PASS | shell에서 `phrase` route의 global capture FAB 제외 |
| Hero vertical balance | PASS | 200pt min-height + 22pt vertical inset + `space-between`; TypeScript·ESLint·diff check 통과 |
| Physical visual/tap pass | PENDING USER TAP | hero 높이, context panel, overflow/edit sheet, long text wrapping 확인 필요 |
