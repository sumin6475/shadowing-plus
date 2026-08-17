# Mobile Product Model: Speaking World

> Status: Canonical content and object model
>
> Recorded: 2026-08-02
>
> Updated: 2026-08-16

Read this with
[`personal-speaking-studio-strategy.md`](personal-speaking-studio-strategy.md), which
defines the market, audience, brand, and go-to-market direction. This document
defines how a learner's language is organized inside the product.

## Definition

This is not a curriculum that decides what every learner should study. It helps a
learner build the English needed to express their own life, interests, ideas,
projects, study, and work.

The learner does not merely practice language supplied by the app. They bring useful
English found in content or life, connect it to something they personally want to
say, and test whether it returns in speech.

The persistent whole is the learner's **Speaking World**.

## Core model

```text
My life
  ↓
Speaking World
  ↓
Domain — broad internal grouping
  ↓
Topic — something I genuinely want to talk about
  ↓
Version — how I shape it for a person, purpose, or length
  ↓
Attempt — one real self-talk recording
```

The product loop is not `Lesson → Exercise`. It is:

```text
My life → Topic → useful language → self-talk → one repair → speak again
```

## Initial Speaking World

The initial map is a starting aid, not a fixed curriculum.

```text
Speaking World

├── About me
│   ├── My background
│   ├── Someone who influenced me
│   └── What I want next
│
├── Work / Study
│   ├── My current project
│   ├── My startup
│   ├── My research
│   └── Something I have been learning
│
├── Experiences
│   ├── Moving abroad
│   ├── A challenge I went through
│   └── A trip I remember
│
├── Daily life
│   ├── My morning
│   ├── How I spend my weekend
│   └── A habit I am changing
│
└── Ideas / Culture
    ├── A film I keep thinking about
    ├── An idea I want to explain
    └── Something I changed my mind about
```

The learner may skip, rename, delete, and add Topics. The map helps AI notice
possibilities; it does not assign homework.

`Domain` is an internal organization and recommendation concept. The interface
should show concrete group names such as `Work / Study` or `Ideas / Culture`, not
force the learner to understand a data-model term.

## Topic, Version, and Attempt

- **Topic:** `My current project` or `A film I keep thinking about` — something the
  learner wants to express repeatedly.
- **Version:** a 30-second introduction, a relaxed explanation to a friend, or a
  more focused explanation for a meetup.
- **Attempt:** one actual recording made through self-talk or Mirror mode.

A Topic is what the learner wants to talk about. A Version is how that meaning is
shaped for a particular moment. An Attempt is evidence of what the learner could
actually say.

```text
Topic: My current project
├── Version: 30-second introduction
├── Version: explain it to a new friend
└── Attempts: Aug 12, Aug 16
```

## Language belongs to the Topic

The phrase library is not an isolated vocabulary warehouse. Language is captured
with source and context, then connected to a Topic where the learner may want to use
it.

```text
Topic: My current project

Useful language
- What I'm trying to do is...
- One thing I realized is...
- The trade-off is...
```

The central flow is:

```text
find language
→ save it with provenance
→ connect it to a Topic
→ try to retrieve it from meaning
→ use it in speech
```

Display and suggestion are not proof of ability. Evidence progresses only when the
learner earns it:

```text
Saved → Recognized → Retrieved → Used
```

## Self-talk and Mirror mode

Self-talk is the practice method. Mirror mode is its signature experience.

- The learner sees themselves while speaking.
- The product saves audio and Attempt history, not video.
- AI analysis appears after the Attempt instead of interrupting speech.
- The learner receives one high-value repair and speaks again.
- Progress is heard through Attempts and observed through retrieval evidence, not a
  universal fluency score.

Any privacy statement about camera or video behavior must match the verified native
implementation.

## AI's role

AI should:

- understand what the learner was trying to mean;
- identify one meaning, structure, or retrieval gap;
- recognize when learner-owned language returned in an Attempt;
- retrieve 1–3 relevant expressions with provenance;
- suggest a small next repair;
- surface a past Topic or phrase when it becomes relevant again;
- suggest possible Topics or Versions without assigning a curriculum.

AI should not:

- invent the learner's facts, beliefs, or life story;
- replace the learner's voice with a polished full script;
- flood the learner with grammar corrections;
- equate an AI suggestion with `Retrieved` or `Used`;
- turn every Topic into a workplace scenario;
- optimize for native-likeness or accent elimination.

## Product principles

1. **You build your own Speaking World.** The learner decides what matters.
2. **English starts from your life, not a curriculum.** Topics come from real
   interests, ideas, experiences, projects, study, and work.
3. **Phrases are captured, not merely assigned.** Useful language may come from any
   lawful source the learner encounters.
4. **Retrieval matters more than collection.** A saved phrase becomes valuable when
   it returns from the learner's own intention.
5. **The tool supports thinking, not testing.** Progress is clearer meaning and more
   usable language, not a manufactured score.
6. **AI expands possibility without taking authorship.** It structures, retrieves,
   and suggests; the learner supplies the meaning.
7. **Private by default.** Personal Topics and audio remain private unless the
   learner explicitly requests an Audience Check.

## Decision filter

Before adding a feature or screen, ask:

1. Does it help a learner capture useful English with low friction?
2. Does it connect language to something the learner genuinely wants to say?
3. Does it make productive retrieval or a second Attempt more likely?
4. Does it deepen or expand the learner's Speaking World?
5. Does AI preserve the learner's authorship and voice?
6. Does it avoid rebuilding a generic curriculum, chatbot, workplace coach, score
   dashboard, or public social feed?
