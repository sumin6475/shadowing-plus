// Built-in story prompts shown as static gray copy on seeded/onboarding
// titles. Custom titles return null so the learner can write a description.

const PROMPTS: Record<string, string> = {
  "something i learned":
    "Something you picked up recently — a trick, a fact, an insight. Example: I learned that people remember the ending more than the beginning.",
  "what i do":
    "What you actually spend your days on. Example: I help people get comfortable speaking English out loud.",
  "my startup":
    "What you’re building and who it’s for. Example: We’re making a quiet place to practice the English you already know.",
  "a recent challenge":
    "A hard moment and what you did with it. Example: Last month I had to present in English with two days’ notice.",
  "my future plans":
    "Where you’re heading next, even if it’s still fuzzy. Example: I want to work somewhere I can use English every day.",
  background:
    "Where you come from — hometown, school, the path that led here. Example: I grew up in Seoul and moved here for work.",
  strengths:
    "What you’re good at, in your own words. Example: I stay calm when things get messy, and I ask good questions.",
  "future goals":
    "Where you want to be in a year or two. Example: I want to lead a small team and present without freezing.",
  "current project":
    "What you’re working on right now. Example: I’m shipping a first version of our speaking practice app.",
  interview:
    "The version of your story you’d tell in an interview. Example: Why this role, why now, and what you’d bring.",
  "my research":
    "What you’re studying and why it matters. Example: I’m looking at how people actually practice speaking, not how textbooks say they should.",
  "moving abroad":
    "Leaving home and landing somewhere new. Example: I moved last year and had to start over in English.",
  "biggest challenge":
    "The hardest thing you’ve had to work through. Example: Building something from scratch while still learning the language.",
  "trip to japan":
    "A trip that stuck with you. Example: A week in Kyoto where I got lost, ate well, and tried to keep up.",
  "morning routine":
    "How your day actually starts. Example: I walk to a café, put my phone away, and talk through one story out loud.",
  gym: "How you move, and why. Example: I lift three times a week because it clears my head before I sit down to work.",
  weekend:
    "What a good Saturday looks like for you. Example: Slow coffee, a long walk, and cooking something I don’t have a recipe for.",
  ai: "What you think about AI, in your own words. Example: I use it to draft, then I say the idea out loud until it sounds like me.",
  education:
    "How you learned — school, or the long way around. Example: I learned more from teaching others than from any class I sat in.",
  design:
    "How you think about making things. Example: I care more about how something feels to use than how it looks in a screenshot.",
};

function promptKey(title: string): string {
  return title.trim().toLocaleLowerCase("en").replace(/[’]/g, "'");
}

/** Built-in prompt for a seeded/onboarding story title, or null for custom stories. */
export function storyPromptFor(title: string): string | null {
  const key = promptKey(title);
  if (key === "write my own") return null;
  return PROMPTS[key] ?? null;
}
