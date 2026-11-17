# 2026-11-17 — 같은 이메일로 Google 로그인하면 프로필 사진이 Google 사진으로 바뀜

## 증상
이메일로 가입하고 프로필 사진을 올려 쓰던 계정에, 같은 이메일의 Google(또는 Apple)로 로그인하면 같은 계정·같은 데이터로 들어가지만 프로필 사진이 Google에 설정된 사진으로 바뀌어 버림.

## 가설
1. 앱이 로그인 후 사진을 덮어씀 → 아님. 사진을 쓰는 곳은 `pickAndUploadAvatar`/`clearUploadedAvatar`뿐.
2. Supabase가 OAuth 로그인 때 provider 프로필로 `user_metadata`를 갱신 → **맞음.**

## 원인
GoTrue는 OAuth 로그인 때마다 provider claim(`avatar_url`, `picture`, `name`, `full_name` …)을 `raw_user_meta_data`에 병합한다. 앱은 업로드 사진의 URL을 바로 그 `avatar_url` 키에 저장했고, 화면은 `avatar_url`부터 읽었다. 읽기 전용 DB 확인(email+google 계정 `c83ee0aa…`): `avatar_path = c83ee0aa…/avatar.jpg`는 남아 있는데 `avatar_url` 호스트가 `lh3.googleusercontent.com`.

## 수정
- `src/lib/avatar-url.ts`(새, 순수): `avatar_path`가 있으면 업로드 사진이 우선, URL은 storage public URL로 다시 만든다. 캐시 버스터는 새 키 `avatar_version`, 없으면 예전 `avatar_url`의 `?t=`(같은 경로일 때). 경로가 없을 때만 `avatar_url` → `picture`.
- `profile-photo.ts`: `avatarUrlFromMetadata`가 위 함수를 쓰고, 업로드 시 `avatar_version` 저장, 삭제 시 비움.
- `avatar_path`·`avatar_version`은 어떤 provider도 보내지 않는 키라 다음 로그인에도 안 덮인다.

## 전/후
- 전: Google 로그인 뒤 아바타 = Google 사진.
- 후: `avatar_path`가 있으면 아바타 = 올린 사진(이미 덮인 기존 계정도 앱 업데이트만으로 복구). 사진을 지운 계정은 Google 사진을 보여줌.

## 미확인
실기기/시뮬레이터에서 연결 계정으로 실제 로그인 후 확인. 웹 앱은 이 키를 쓰는지 안 봄(모바일만 수정).

## 회귀 테스트
`tests/avatar-url.test.mjs`(5건, `test:mvp`에 포함). 첫 건이 이 사고 그대로(`avatar_path` + Google `avatar_url`/`picture`).
