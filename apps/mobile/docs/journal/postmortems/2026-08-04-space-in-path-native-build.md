# Postmortem — 경로의 공백이 네이티브 빌드를 깨뜨림 (expo run:ios error 65)

- **날짜**: 2026-08-04
- **스텝**: 오디오 재생 — expo-audio 추가 후 dev-client 네이티브 재빌드
- **심각도**: P1 (네이티브 빌드 전면 차단)

## 실패 현상
`expo-audio`(네이티브 모듈)를 추가하고 워크트리에서 `npx expo run:ios`를 돌리자 xcodebuild가 error 65로 실패. 실패 지점은 expo-constants의 스크립트 페이즈:

```
› Executing expo-constants Pods/EXConstants » [CP-User] Generate app.config for prebuilt Constants.manifest
❌  Script '[CP-User] Generate app.config for prebuilt Constants.manifest' failed
   └─Pods/EXConstants
No such file or directory: /Users/jadekim/Documents/Code
...
CommandError: Failed to build iOS project. "xcodebuild" exited with error code 65.
```

## 가설
- **H1**: expo-audio 자체의 네이티브 설정/플러그인 문제.
- **H2**: 경로 문제 — 에러 경로가 `/Users/jadekim/Documents/Code`에서 잘림. 워크트리가 `…/Code HQ/…` 아래 있어 **"Code HQ"의 공백**에서 잘린 것.

## 검증 방법과 결과
- H1 → 기각. 실패한 건 expo-audio가 아니라 expo-constants의 config 생성 스크립트. expo-audio Pod은 정상 컴파일됨.
- H2 → 확정. 에러 문자열이 첫 공백(`Code` 다음)에서 정확히 잘림. 원래 폴더(`Code HQ/Shadowing Plus`, 공백 2개)가 빌드됐던 건 **기존 `ios/`를 재사용**했기 때문(fresh prebuild를 안 함). 워크트리는 fresh prebuild가 돌면서 이 스크립트를 처음 실행 → 공백 버그 노출.

## 근본 원인
`git worktree`를 `…/Code HQ/` 아래(공백 포함 경로)에 만들었고, `expo prebuild`가 생성하는 expo-constants의 `[CP-User] Generate app.config` 스크립트가 프로젝트 경로를 따옴표로 감싸지 않아 공백에서 인자가 쪼개짐. 사람이 아니라 **툴체인의 미따옴표 처리 + 우리의 공백 경로 선택**이 원인.

## 수정
워크트리를 공백 없는 경로로 이동:
```
git worktree move "…/Code HQ/Shadowing-Plus-mobile" "/Users/jadekim/Documents/shadowing-plus-mobile"
rm -rf apps/mobile/ios   # fresh prebuild 강제
npx expo run:ios         # → Build Succeeded
```
node_modules와 `.env`는 move가 함께 옮겨줌.

## 지표 before / after
`expo run:ios`: xcodebuild error 65 (config 스크립트 실패) → **Build Succeeded**, 새 dev-client(expo-audio 포함) 설치 완료.

## 재발 방지 (회귀 스위트에 추가)
- 프로젝트 메모리에 규칙 기록: **네이티브 빌드를 하는 워크트리/클론은 공백 없는 경로에 둔다**. `Code HQ/Shadowing Plus` 원본 폴더는 기존 `ios/` 덕에 우연히 빌드될 뿐이므로 신뢰하지 않는다.
- 자동 테스트는 없음(환경 제약). 대신 mobile-skeleton 메모리에 명문화해 다음 세션이 같은 함정을 피하게 함.
