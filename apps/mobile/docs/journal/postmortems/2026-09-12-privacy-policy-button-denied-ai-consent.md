# 2026-09-12 — "Privacy Policy" 버튼이 AI 동의를 영구 거부로 저장했다

## 증상 (기기, TestFlight build 23)

4분 58초 Free talk을 끝냈는데 결과 화면에 두 카드가 동시에 빨간 글씨로 떴다.

```
Couldn’t analyze this time. Try again.
Couldn’t check your Phrase Bank.
```

`Try again` / `Try Phrase Bank again`을 눌러도 같은 문구가 다시 떴다. 세션 저장(`Saved`
칩)과 전사는 정상 — 즉 로그인과 DB 쓰기는 살아 있었다.

## 가설

1. Edge Function 장애 → `supabase functions list`로 8개 전부 `ACTIVE` 확인.
2. OpenAI 키 누락 → `supabase secrets list`에 `OPENAI_API_KEY` 존재.
3. JWT 만료 → 같은 화면에서 `createTalkSession` 쓰기가 성공했으므로 기각.
4. **두 호출의 공통 선행 단계** — `diagnoseTalk`와 `suggestTalkPhrase`는 둘 다 네트워크
   이전에 `requireAiProcessingConsent()`를 통과해야 한다. 여기서 던지면 두 기능이 **함께**
   같은 모양으로 죽는다. 관측된 증상과 정확히 일치.

## 근본 원인

`src/lib/ai-consent.tsx`의 동의 알림창에서 **"Privacy Policy" 버튼이 `save(false)`를
호출**했다.

```ts
{ text: "Privacy Policy", onPress: () => save(false, () => void openLegalUrl(PRIVACY_POLICY_URL)) },
```

정책을 **읽어보려는 행동이 거부로 기록**된다. 저장된 버전이 현재 `AI_CONSENT_VERSION`과
같아지므로 `aiProcessingConsentFromMetadata`는 `"unset"`이 아니라 `"denied"`를 돌려주고,
알림창은 다시는 뜨지 않는다. 그때부터 AI 기능 전부가 영구히 꺼진다.

두 번째 결함이 이걸 진단 불가능하게 만들었다. `talk.tsx`는 실제 에러를 버리고 고정 문구로
덮어썼다(`setDiagErr(ANALYSIS_ERROR_COPY)`). `AiProcessingConsentRequiredError`는 원인을
정확히 담은 메시지를 갖고 있었는데도 화면엔 절대 성공할 수 없는 "Try again"만 남았다.

세 번째로, 결과 헤더의 `resultSub`에 `diagState === "error"` 분기가 없었다. 둘 다 실패하면
`bankState === "error"` 분기로 떨어져 **"Focus coaching is ready."** 라는 거짓말을 출력했다.
스크린샷에서 헤더와 카드가 서로 모순되는 이유가 이것이다.

## 고친 것

- `ai-consent.tsx`: Privacy Policy는 아무것도 저장하지 않는다. 동의는 `unset`으로 남아
  다음 실행에 다시 묻는다. (읽기는 결정이 아니다.)
- `talk.tsx`: `AiProcessingConsentRequiredError`를 `aiOff` 상태로 따로 잡아, 재시도 버튼
  두 개 대신 **"AI feedback is off"** 카드 하나 + Privacy로 가는 버튼을 띄운다. 그 외
  실패는 삼킨 고정 문구 대신 실제 에러 메시지를 보여준다.
- `talk.tsx`: `resultSub`에 `aiOff` / `diagState === "error"` 분기 추가. 코칭이 실패했을 때
  준비됐다고 말하지 않는다.

## 남은 것 (미검증)

이 세션의 실패가 정말 동의 거부였는지는 **기기에서 Profile → Privacy → Allow OpenAI
processing 토글을 확인해야** 확정된다. Edge Function 로그를 여기서 읽을 수 없었다
(Management API 토큰이 키체인에 있고 접근이 차단됨). 토글이 켜져 있는데도 실패한다면
원인은 다른 곳이고, 이제는 화면이 실제 에러 메시지를 보여주므로 그걸 보고 다시 판단한다.

## 회귀 방어

동의 게이트는 순수 함수(`aiProcessingConsentFromMetadata`)라 테스트 가능하다. 아직
테스트 스위트에 추가하지 않음 — 다음 패스에서 "정책 읽기는 상태를 바꾸지 않는다"를
케이스로 넣을 것.
