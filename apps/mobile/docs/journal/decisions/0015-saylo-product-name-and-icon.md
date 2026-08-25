# ADR 0015 — Saylo 제품명과 더블루프 아이콘

- **날짜**: 2026-08-08
- **스텝**: App Store v1 브랜딩
- **상태**: accepted

## 맥락 (Context)

App Store 제출용 첫 네이티브 빌드 전에 사용자에게 보이는 제품명과 홈 화면
아이콘을 확정해야 한다. 기존 `Shadowing+` 이름은 개발 단계의 프로젝트 이름이며,
Speaking World와 셀프토크를 아우르는 짧은 소비자 브랜드가 필요하다.

## 검토한 선택지 (Options)

1. **Shadowing+ 유지** — 기존 코드·프로젝트명과 일치하지만 제품 방향을
   shadowing 학습으로 좁게 보이게 한다.
2. **Saylo로 변경** — 말하기 중심 정체성을 짧게 전달하지만 앱 내부 문구와
   네이티브 아이콘을 함께 갱신해야 한다.
3. **제출 직전에 변경** — 당장 재빌드를 피할 수 있지만 회귀 테스트 빌드와
   제출 빌드의 네이티브 브랜딩이 달라진다.

## 결정 (Decision)

사용자 표시 이름을 `Saylo`로 바꾸고, 승인된 blue/ice 더블루프 이미지를 iOS
앱 아이콘으로 사용한다. 기존 bundle identifier와 EAS slug는 기술 식별자로 유지한다.

## 기각 이유 (판단의 증거)

`Shadowing+`는 현재 제품이 추구하는 자기 이야기·Speaking World 범위보다 좁다.
제출 직전 변경은 아이콘과 표시 이름을 실기기 회귀 매트릭스에서 검증할 기회를
잃으므로 선택하지 않는다.

## 결과 (Consequences)

새 네이티브 development build가 필요하다. 소스·권한 문구의 사용자 노출 브랜드도
Saylo로 맞추되 bundle identifier, URL scheme, EAS project identity는 바꾸지 않는다.
App Store Connect에서 `Saylo` 이름을 사용할 수 없거나 상표 검토에서 충돌이
발견되면 스토어 표시명만 재검토한다.
