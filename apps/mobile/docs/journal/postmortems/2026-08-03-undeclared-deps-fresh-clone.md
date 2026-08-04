# Postmortem — 선언 안 된 의존성 때문에 fresh 워크트리가 깨짐 (svg, eslint)

- **날짜**: 2026-08-03 (svg) · 2026-08-04 (eslint)
- **스텝**: 워크트리 분리 / 정리
- **심각도**: P2

## 실패 현상
새 git worktree에서 `npm install` 후:

1) 스켈레톤이 렌더링되다가 `react-native-svg`가 없어 아이콘/차트/맵이 전부 크래시. `ls node_modules/react-native-svg` → 없음.
2) 나중에 `expo lint` 실행 시:
```
Error: Cannot find module 'eslint'
Require stack: ...
```
`package.json` devDependencies에는 `@types/react`, `typescript`만 있었음.

## 가설
- **H1**: npm install이 실패했다.
- **H2**: 해당 패키지들이 애초에 `package.json`에 없다 — 예전 폴더의 `node_modules`에만 (과거 어느 시점에 자동 설치되어) 존재했고, 선언은 안 됨. fresh install은 그래서 못 받음.

## 검증 방법과 결과
- H1 → 기각. install은 성공(exit 0).
- H2 → 확정. `react-native-svg`는 원래 Pods(`RNSVG 15.15.4`)엔 있었지만 `package.json`엔 없었음. `eslint`/`eslint-config-expo`도 `eslint.config.js`는 있는데 devDependencies엔 없음 → `expo lint`가 첫 실행 시 대화형으로 설치하려다 non-interactive에서 크래시.

## 근본 원인
"동작하니까 됐다"의 함정: 패키지가 한 번 `node_modules`에 들어오면(수동/자동), `package.json`에 선언하지 않아도 그 폴더에선 계속 동작한다. 새 워크트리/클론/CI는 lockfile+manifest만 보므로 즉시 깨진다. 원인은 사람 실수가 아니라 **선언되지 않은 상태를 오래 감춰 준 개발 환경**.

## 수정
```
npx expo install react-native-svg          # 15.15.4 — Pods 버전과 일치하게 핀
npm install --save-dev eslint eslint-config-expo
```
둘 다 커밋(`92eb5c8`, `2509b6e`)해서 이제 fresh clone이 `npm install`만으로 해결됨.

## 지표 before / after
- svg: fresh install에서 즉시 크래시 → 정상 렌더.
- lint: `expo lint`가 크래시 → **0 errors** (tsc + `expo export --platform ios`도 통과).

## 재발 방지 (회귀 스위트에 추가)
- 두 패키지 모두 `package.json`에 선언 → fresh clone이 재현 가능.
- 룰: **"node_modules에 있으니 됐다"로 넘어가지 말고 반드시 `package.json`에 선언**. 새 워크트리에서 `tsc + lint + expo export` 3종을 헬스 게이트로 돌려 이런 누락을 조기에 잡는다(이번에 정리 단계에서 실제로 잡힘).
