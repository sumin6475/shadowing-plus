# Postmortem — 모바일이 미적용 DB 컬럼 때문에 홈 전체를 막고 원문 오류 노출

- **날짜**: 2026-08-07
- **스텝**: Phrase Bank 정본 전환 후 홈 실기기 확인
- **심각도**: P1 (진행 데이터 영역 로딩 불가)

## 실패 현상
Today 화면의 Phrase Bank 조회가 `column phrase_items.is_favorite does not exist`로 실패했고, 해당 DB 원문이 사용자 화면에 그대로 표시됐다. migration 022 적용 전 앱이 새 컬럼을 SELECT한 것이 직접 원인이었다.

## 근본 원인
additive schema 변경이라도 클라이언트와 DB의 배포 시점이 다를 수 있다는 rollout window를 고려하지 않았다. 하나의 optional 컬럼을 기본 SELECT에 포함해 전체 표현 데이터가 함께 실패했고, 화면이 `Error.message`를 그대로 렌더해 내부 스키마도 노출했다.

## 수정
- `is_favorite` 미존재 오류만 식별해 해당 컬럼 없이 재조회하고, 기존 표현·SRS 데이터는 정상 표시한다.
- fallback에서 즐겨찾기는 `false`로 취급하며 즐겨찾기 쓰기는 “temporarily unavailable”로 제한한다.
- Today/Phrases 오류 카드는 저장 데이터가 안전하다는 일반 안내만 보여주고 DB 원문을 숨긴다.
- Retry 및 빈 Messages의 `New message` 버튼을 명시적으로 중앙 정렬했다.

## 검증
TypeScript PASS, 변경 파일 ESLint 오류 0, iOS production export PASS(1,840 modules), `git diff --check` PASS.

## 재발 방지
모바일이 migration보다 먼저 배포될 수 있는 신규 optional 컬럼은 읽기 fallback 또는 단계적 rollout을 둔다. 서버·DB 오류 원문은 로그용으로만 유지하고 사용자 UI에는 recovery action 중심 문구를 표시한다.
