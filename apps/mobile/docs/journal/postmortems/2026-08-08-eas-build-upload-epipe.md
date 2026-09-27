# Postmortem — EAS production 빌드 업로드가 `write EPIPE`로 반복 중단

- **날짜**: 2026-08-08
- **스텝**: Saylo TestFlight baseline production build
- **심각도**: P2

## 실패 현상
production build archive 업로드가 약 1.7–1.9 MB 전송 지점에서 반복 중단되어 원격 빌드가 생성되지 않았다.

```
write EPIPE
```

## 가설
- **H1**: Apple credentials 또는 provisioning profile 오류다.
- **H2**: EAS에 전송하는 monorepo archive가 불필요하게 크고 불안정한 연결에서 업로드 실패를 유발한다.

## 검증 방법과 결과
- H1 → Apple 로그인, distribution certificate 재사용, 새 App Store provisioning profile 생성까지 정상 완료해 기각.
- H2 → `eas build:inspect`로 archive를 열어 Git pack, web/docs, 사용하지 않는 assets가 포함됨을 확인. `.easignore` 적용 후 inspect archive를 약 11.8 MB에서 3.1 MB로 줄였고 실제 업로드 tar는 약 1.7 MB가 됨. 이후 동일 production build가 성공.

## 근본 원인
monorepo 루트에서 EAS archive를 만들면서 모바일 빌드에 필요 없는 저장소 파일과 생성물이 기본 archive에 포함됐다. 큰 archive 자체가 항상 실패 원인은 아니지만, 당시 연결에서 반복된 `EPIPE`의 노출 면적과 재시도 비용을 키웠다.

## 수정
저장소 루트 `.easignore`에 Git metadata, 다른 앱, 문서, 생성물, 모바일에서 사용하지 않는 starter font/image asset을 제외하는 규칙을 추가했다. 필요한 workspace package와 실제 앱 입력은 유지했다.

## 지표 before / after
- inspect archive: 약 11.8 MB → 약 3.1 MB
- upload: 반복 `write EPIPE` → production build `ef172c4d-277c-4af8-a92c-00fad1752ec2` FINISHED
- archive 재설치/검증: `npm ci` PASS, TypeScript PASS, ESLint error 0, iOS export 1,851 modules PASS

## 재발 방지 (회귀 스위트에 추가)
`.easignore`를 버전 관리하고, production build 전 `eas build:inspect` archive에서 필수 입력 존재 여부와 clean install·`npm run validate`를 확인한다.
