# Context-aware Chunk Explanation — Reference Example

**Purpose:** Web player에서 사용자가 자막의 짧은 표현을 선택해 Phrase Bank에
저장할 때, AI가 제공해야 하는 설명의 깊이와 형식을 고정한다.

이 예시는 사전식 단어 나열이 아니다. 학습자가 “단어는 아는데, 이 문맥에서 이렇게
쓰이는 것은 처음”이라고 느끼는 경우를 해결하는 **문맥형 청크 설명**의 기준이다.

## Source context

> So, for now, I’m going to play it safe. I’m going to stick with my cheap
> pairs. But maybe in the future if I feel like I get this issue under control
> and I’m a little bit more responsible, then I’ll take the plunge and buy a
> nice pair of sunglasses. I’ll work on it and maybe one day if you see me
> around town, I’ll be sporting some really cool specs.

**Learner question:**

> In this context, what is “take the plunge,” what is the sport meaning, and
> what are the specs? Except for the word “plunge,” I know the word, but I
> haven't seen those words used like this.

## Reference answer (Korean)

제시해주신 문장에서 쓰인 세 가지 표현은 모두 일상 대화나 구어체에서 정말 자주
쓰이는 유용한 표현들입니다. 단어 하나만의 뜻보다, 이 문맥에서 어떤 장면을 만드는지
함께 보면 더 잘 기억됩니다.

### 1. `take the plunge`

- **의미:** 망설이던 끝에 큰마음을 먹고 결단을 내리다.
- **문맥에서:** 싼 선글라스만 쓰며 망설이던 사람이, 잃어버리거나 망가뜨릴 걱정을
  감수하고 좋은 선글라스를 사기로 하는 것입니다.
- **이미지:** 원래 `plunge`는 물속으로 뛰어드는 느낌입니다. 그래서 여기서는
  “비용이나 위험이 조금 부담스럽지만, 과감하게 실행에 옮긴다”는 뉘앙스가 납니다.

### 2. `sport` (동사) / `sporting`

- **의미:** 옷, 액세서리, 헤어스타일 등을 멋지게 또는 눈에 띄게 착용하고 다니다.
- **문맥에서:** `sporting some really cool specs`는 운동을 한다는 뜻이 아니라,
  **멋진 안경을 쓰고 자랑스럽게 다니는 모습**을 말합니다.
- **비교:** `wearing`보다 조금 더 스타일을 의식하고, 사람들이 알아볼 만하게
  착용한다는 느낌이 있습니다.

### 3. `specs`

- **의미:** 안경 또는 선글라스. `spectacles`의 가벼운 구어체 줄임말입니다.
- **문맥에서:** 전자제품의 `specs`(사양)가 아니라, 앞에서 말한 선글라스를
  가리킵니다.

### 전체 자연스러운 해석

> “지금은 안전하게 저렴한 선글라스를 계속 쓸 거예요. 하지만 나중에 이 문제를 잘
> 관리하게 되고 좀 더 책임감이 생겼다고 느끼면, 큰마음을 먹고 좋은 선글라스 한
> 벌을 살 거예요. 노력하다가 언젠가 동네에서 저를 보면, 제가 정말 멋진 선글라스를
> 쓰고 다니고 있을지도 몰라요.”

## Product writing requirements derived from this example

When the app explains a saved chunk, it should:

1. Use Korean Markdown with a short heading and scannable bullets.
2. Give the meaning **in this context**, not only a dictionary gloss.
3. Name the familiar-but-different usage explicitly (for example, noun `sport`
   versus verb `sport`).
4. Include a compact imagery/nuance note only when it increases recall.
5. End with one natural whole-context translation when multiple selected chunks
   belong to the same utterance.
6. Avoid excessive grammar terminology, generic filler, or claims that a phrase
   is “native-like.”
7. Keep stored fields concise: `meaning_ko` is a short contextual meaning;
   `usage_note` is the reusable nuance. The longer explanation can be displayed
   before save or stored in `source_context` as an optional explanation payload.

**Source:** founder-supplied learning example, 2026-07-24.
