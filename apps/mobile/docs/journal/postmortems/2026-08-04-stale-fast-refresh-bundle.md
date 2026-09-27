# Postmortem — 이미 지운 코드가 유령처럼 살아있던 stale 번들 (ReferenceError: useEffect)

- **날짜**: 2026-08-04
- **스텝**: Phrases 실데이터 연결 — 임시 검증 코드 제거 후 재실행
- **심각도**: P2

## 실패 현상
검증용 임시 코드(`// TEMP-VERIFY`)를 shell.tsx에서 제거하고 앱을 재실행하니 빨간 화면:

```
ERROR  [ReferenceError: Property 'useEffect' doesn't exist]
Code: shell.tsx
> 61 |   useEffect(() => {          // TEMP-VERIFY: open the first real clip's reader
     |   ^
Call Stack
  AppShell (src/shell.tsx:61:3)
```

문제는 **shell.tsx:61의 그 `useEffect`는 이미 디스크에서 삭제된 코드**라는 것. 파일을 확인하니 해당 라인엔 아무것도 없었음(`grep TEMP-VERIFY` → 0, `useEffect` 사용 0회). tsc도 통과.

## 가설
- **H1**: 되돌리기 편집이 실제로 적용 안 됨(파일에 코드가 남아있다).
- **H2**: 디스크는 깨끗한데 Metro가 **stale 번들**을 서빙 중 — 편집 도중의 fast-refresh(HMR) 패치가 캐시된 베이스 위에 얹혀 깨진 상태를 만듦.

## 검증 방법과 결과
- H1 → 기각. `sed -n '55,65p' shell.tsx`로 확인: 55–65 라인에 temp 코드 없음. tsc PASS.
- H2 → 확정. Metro 로그에 `iOS Bundled … (1 module)` 같은 증분 HMR 흔적. 앱은 삭제 전 상태를 캐시로 들고 있었고, 일반 재실행(terminate+launch)은 그 캐시 번들을 재사용.

## 근본 원인
편집 중 여러 번의 fast-refresh가 임시 코드가 있는 중간 상태를 캐시했고, temp 코드 제거 후에도 Metro 트랜스폼 캐시가 그 모듈을 무효화하지 않아 **삭제된 코드를 참조하는 번들**을 계속 서빙. 원인은 코드가 아니라 **HMR/캐시 무효화의 틈**.

## 수정
Metro를 캐시 클리어로 재시작:
```
lsof -ti :8081 | xargs kill -9
npx expo start --dev-client -c   # -c = clear cache
# 앱 재실행 → 깨끗하게 로드
```

## 지표 before / after
빨간 화면(유령 ReferenceError) → 정상 로드, Phrases 실데이터 렌더.

## 재발 방지 (회귀 스위트에 추가)
- 룰(메모리에 기록): **임시 검증 코드를 제거한 뒤 검증할 땐 Metro를 `-c`로 재시작**한다. 일반 재실행은 stale 번들을 재사용할 수 있다.
- 파생 규칙: "옛 화면이 계속 나온다" 류 증상은 대개 코드가 아니라 **어떤 Metro가(어느 폴더에서/어떤 캐시로) 서빙 중인가**의 문제다.
