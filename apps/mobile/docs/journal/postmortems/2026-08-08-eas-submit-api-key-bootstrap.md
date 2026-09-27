# Postmortem — 첫 EAS Submit이 API 키 미설정으로 시작 전 중단

- **날짜**: 2026-08-08
- **스텝**: Saylo 1.0.0 (5) TestFlight submit
- **심각도**: P2

## 실패 현상
검증된 build ID를 비대화식으로 제출하려 했지만 App Store Connect API 키가 없어 업로드 시작 전에 중단됐다.

```
App Store Connect API Keys cannot be set up in --non-interactive mode.
Error: submit command failed.
```

## 가설
- **H1**: API 키가 EAS 프로젝트에 아직 없으며 최초 1회 대화식 설정이 필요하다.
- **H2**: IPA 또는 App Store Connect 앱 연결이 잘못됐다.

## 검증 방법과 결과
- H1 → 대화식 submit에서 Apple 계정 로그인 후 키 생성 선택지가 나타나 확인.
- H2 → 같은 build ID와 ASC app ID가 설정 후 그대로 예약·업로드되어 기각.

## 근본 원인
`--non-interactive`는 기존 App Store Connect API 키를 사용할 수는 있지만 최초 키 생성은 수행하지 않는다. 프로젝트의 첫 EAS Submit이라 사전 키가 없었다.

## 수정
Apple 계정으로 인증하고 EAS Submit 전용 API 키를 최소 권한 `APP_MANAGER` 역할로 생성·연결한 뒤 동일 build ID 제출을 재개했다.

## 지표 before / after
- 최초 submit: 업로드 시작 전 exit 1
- 설정 후 submit: exit 0, App Store Connect binary accepted

## 재발 방지 (회귀 스위트에 추가)
동일 EAS 프로젝트의 이후 제출은 연결된 API 키를 사용해 비대화식으로 실행한다. 새 프로젝트의 첫 제출 체크리스트에는 API 키 bootstrap 여부 확인을 포함한다.
