# ADR 0006 — "Stuck" = 즉석 메모(유저 입력), transcript 추론 아님

- **날짜**: 2026-08-06
- **스텝**: mobile — self-talk(Mirror) Stuck 기능
- **상태**: accepted

## 맥락 (Context)
self-talk 중 "Stuck" 버튼(라이프부이 = "막혔어, 도와줘")을 진짜 기능으로 만들려 함. 처음엔 Stuck 탭 시 **타임스탬프 + 그 시점까지의 transcript**를 캡처해 AI가 "무엇에 막혔는지 추론"하게 했다(talk-stuck v1). done 화면에 "Where you got stuck" 섹션도 붙였다. 그런데 실기기에서 "**뜨긴 하는데 잘 되는지 모르겠다**"는 피드백 — 즉 grounding이 약했다.

핵심 제약: (1) 막히는 순간 학습자는 **모국어(L1)로 튀어나온다**(예: 한국어). (2) 앱 STT는 **영어 전용**(en-US, on-device)이라 L1 발화는 애초에 transcript에 안 잡힌다. (3) 앱은 **N:1** — L1이 사람마다 다름(ko/es/ru/…), 대상은 영어 하나.

## 검토한 선택지 (Options)
1. **transcript 추론** — Stuck 시점의 영어 transcript로 AI가 막힌 지점을 추론. 장점: 무입력(흐름 안 끊김). 단점: L1 발화 미포착 + 추론이라 부정확, "정말 그걸 도와준 건지" 검증 불가.
2. **즉석 메모(유저 명시 입력)** — Stuck 탭 → 작은 입력창 → 학습자가 **L1으로** "이거 영어로 뭐지" 한 줄 → 이후 AI가 그 메모를 영어로 변환. 장점: grounded(유저가 직접 말함), L1 문제 자연 해소. 단점: 잠깐 타이핑(흐름 소폭 끊김).
3. **즉시 도움(팝업 힌트)** — 막히면 큐/힌트를 그 자리서 보여줌. 별도 방향(사용자가 "실유저 니즈 나오면 나중"으로 보류).

## 결정 (Decision)
**옵션 2 — Stuck = 즉석 메모.** 탭하면 자동 포커스 입력창(녹음 계속), 학습자 **L1으로** 한 줄, "Keep going"이면 저장. Finish 후 `talk-stuck`가 각 메모를 **영어 표현 + 예문**으로 변환해 done의 "Where you got stuck" 섹션에 표시(YOU WANTED TO SAY = 메모 원문 / SAY IT LIKE THIS = 영어). 메모 시점은 "그 자리서 바로"(사용자 선택).

## 기각 이유 (판단의 증거)
- **transcript 추론 기각**: 실검증에서 grounding 불명 + L1 발화가 en-US STT에 안 잡혀 원인 자체를 못 봄. 명시적 유저 입력이 있으면 AI가 추측할 필요가 없다.
- **즉시 도움 보류**: 유효하지만 실유저 니즈 검증 전엔 과설계. 메모 방식이 데이터(막힌 표현 모음)도 쌓아줘 이후 도움 기능의 재료가 됨.

## 결과 (Consequences)
- **감수**: 메모 타이핑으로 발화가 잠깐 끊긴다(수용). 빈 메모는 마킹 안 함(= 취소). 끝에 몰아 적는 대신 순간 포착이라 내용 신선.
- **N:1 파생 결정**: 메모 안내(placeholder/title)는 **유저 L1로** 떠야 함 → `src/lib/first-language.ts`(기기 로케일 추론, `setFirstLanguage` override 훅, ko/es/ru/en) 신설. 한국어 하드코딩 금지. 메모 내용 자체는 다국어 그대로 `talk-stuck`(gpt-4o-mini)가 영어로 변환.
- **재검토 조건(revisit trigger)**: (1) 타이핑 끊김이 흐름을 크게 해친다는 신호 → "라이브 마킹 → 끝나고 메모" 또는 음성 메모로 전환, (2) 실유저가 "그 자리서 도움"을 원하면 옵션 3 추가, (3) Settings에 main-language 선택이 생기면 `setFirstLanguage`로 로케일 추론 override.
