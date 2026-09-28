# 2026-09-28 — 로그인 버튼이 말없이 죽어 있던 문제

**증상 (그대로).** 이메일에 공백이 섞인 채(`sumin002 @gmail.com`) 로그인 시도 → 오류 메시지 없음, "Sign in" 버튼이 연한 색으로 눌리지 않음. 사용자는 왜 안 되는지 알 수 없었다.

**가설.** ① Supabase 인증 실패가 삼켜짐 → 아님(요청 자체가 안 나감). ② 클라이언트 검증이 버튼을 `disabled`로만 만들고 이유를 표시하지 않음 → 맞음.

**원인.** `sign-in.tsx`의 `canSubmit = emailValid && …`가 `Pressable.disabled`에 직접 연결. `EMAIL_RE`는 공백을 거부하지만 그 사실을 화면에 쓰는 코드가 없었다. "비활성 버튼 = 설명 없는 거절".

**수정.** 검증을 `src/lib/auth-form.ts`(순수)로 분리 — `emailProblem()`이 공백/`@` 없음/불완전 주소를 각각 다른 문장으로 돌려준다. 버튼은 요청 중일 때만 `disabled`; 미완성 폼에서 탭하면 `submitProblem()` 결과를 `warn` 빨강으로 표시(필드 아래 인라인 + 빨간 테두리, 버튼 위 알림 박스). 입력을 고치면 오류가 사라진다.

**전/후.** 전: 탭해도 아무 일 없음. 후: "Your email has a space in it. Remove it and try again."

**회귀 케이스.** `tests/auth-form.test.mjs` — `"sumin002 @gmail.com"`이 `/space/`를 포함한 문장을 돌려주는지 등 4케이스. `test:mvp` 스크립트에는 아직 안 묶음(다음 정리 때 추가).

**원칙.** 폼에서 버튼을 죽이는 조건은 전부 문장으로도 존재해야 한다. 조건은 있는데 문장이 없으면 그게 버그다.
