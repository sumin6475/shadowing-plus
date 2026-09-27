/** Did the learner say this phrase? An offline check that runs on the live
 *  transcript while the mirror listens — no server, no AI. It forgives what
 *  speech naturally changes (contractions, verb forms, my/your, sb/sth
 *  placeholders) and nothing else: the phrase's words must still come in
 *  order, next to each other. */

// Pure module: no React Native imports, so `node --test` can load it.

/** A word, or a stand-in that takes `min`–`max` words (sb, sth, "(to)"). */
type Slot = { words: string[] } | { min: number; max: number };

const FILLERS = new Set(["uh", "um", "er", "erm", "ah", "hmm", "mm"]);
const POSSESSIVE = new Set([
  "my", "your", "his", "her", "its", "our", "their",
  "one's", "someone's", "somebody's", "sb's", "sth's",
]);
const REFLEXIVE = new Set([
  "myself", "yourself", "himself", "herself", "itself",
  "ourselves", "yourselves", "themselves", "oneself",
]);
/** Always a stand-in for the learner's own words. ("…" and "~" are turned
 *  into one before splitting, since they aren't word characters.) */
const PLACEHOLDER = new Set(["sb", "sth", "smb", "smth", "etc", "~any"]);
/** A stand-in only mid-phrase: "let someone down" means anyone, but
 *  "something like that" says those exact words. */
const MID_PLACEHOLDER = new Set(["someone", "somebody", "something"]);
/** "it's" is "it is"; "Jane's" is Jane's something. */
const S_IS = new Set([
  "it", "he", "she", "that", "what", "there", "here", "who", "where",
  "how", "when", "why", "this", "everything", "nothing", "everyone",
]);
const WHOLE: Record<string, string[]> = {
  "can't": ["can", "not"],
  "won't": ["will", "not"],
  "shan't": ["shall", "not"],
  "ain't": ["be", "not"],
  "let's": ["let", "us"],
  gonna: ["going", "to"],
  wanna: ["want", "to"],
  gotta: ["got", "to"],
  kinda: ["kind", "of"],
  sorta: ["sort", "of"],
  lemme: ["let", "me"],
  gimme: ["give", "me"],
};
const TAIL: Record<string, string> = {
  m: "am", re: "are", ve: "have", ll: "will", d: "would", s: "is",
};
const IRREGULAR: Record<string, string> = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  has: "have", had: "have", does: "do", did: "do", done: "do",
  went: "go", gone: "go", got: "get", gotten: "get", made: "make",
  took: "take", taken: "take", came: "come", gave: "give", given: "give",
  said: "say", told: "tell", kept: "keep", felt: "feel", thought: "think",
  brought: "bring", bought: "buy", caught: "catch", broke: "break",
  broken: "break", spoke: "speak", spoken: "speak", saw: "see", seen: "see",
  knew: "know", known: "know", ran: "run", left: "leave", met: "meet",
  found: "find", held: "hold", stood: "stand", sat: "sit", lost: "lose",
  paid: "pay", sent: "send", spent: "spend", built: "build", fell: "fall",
  fallen: "fall", wrote: "write", written: "write", ate: "eat", eaten: "eat",
  drove: "drive", driven: "drive", chose: "choose", chosen: "choose",
  wore: "wear", worn: "wear", threw: "throw", thrown: "throw", grew: "grow",
  grown: "grow", began: "begin", begun: "begin", won: "win",
  understood: "understand", heard: "hear", slept: "sleep", meant: "mean",
  taught: "teach", fought: "fight", led: "lead", fed: "feed", hung: "hang",
  stuck: "stick", woke: "wake", woken: "wake", forgot: "forget",
  forgotten: "forget", hid: "hide", hidden: "hide", shook: "shake",
  flew: "fly", flown: "fly", stole: "steal", stolen: "steal", sold: "sell",
  dealt: "deal", swore: "swear", sworn: "swear", bent: "bend", lent: "lend",
  children: "child", men: "man", women: "woman", people: "person",
};

/** One written word → the words it stands for: "I'm" → i, am. */
function expand(word: string): string[] {
  if (WHOLE[word]) return WHOLE[word];
  if (POSSESSIVE.has(word)) return ["~poss"];
  if (REFLEXIVE.has(word)) return ["~self"];
  const not = word.match(/^(.+)n't$/);
  if (not) return [not[1], "not"];
  const tail = word.match(/^(.+)'(m|re|ve|ll|d|s)$/);
  if (tail) {
    const [, base, rest] = tail;
    if (rest === "s" && !S_IS.has(base)) return [base];
    return [base, TAIL[rest]];
  }
  return [word.replace(/'/g, "")];
}

/** A crude stem that only has to be consistent: both the phrase and the
 *  transcript go through it, so "called", "calls" and "calling" all land on
 *  the same key as "call" — even when that key isn't a real word. */
function stem(word: string): string {
  if (word.startsWith("~")) return word;
  // Irregular forms map to their base, which then takes the same trims as the
  // base form itself would — "brought" and "bring" must land together.
  let w = IRREGULAR[word] ?? word;
  // Plural first, then the verb ending: "things" → thing → th, like "thing".
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 3 && /(?:ch|sh|ss|x|z|o)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && /[^su]s$/.test(w) && !w.endsWith("is")) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith("ied")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 3 && w.endsWith("ed") && !w.endsWith("eed")) w = w.slice(0, -2);
  if (w.length > 2 && w.endsWith("e")) w = w.slice(0, -1);
  return w.replace(/(.)\1$/, "$1");
}

/** Lower-cased pieces, apostrophes straightened, split on anything that
 *  isn't part of a word. */
function pieces(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .split(/[^a-z0-9'~]+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

/** The transcript as comparable words. */
export function spokenWords(transcript: string): string[] {
  return pieces(transcript)
    .flatMap(expand)
    .filter((w) => !FILLERS.has(w))
    .map(stem);
}

/** The phrase as slots: its words, with stand-ins for sb/sth and for
 *  optional "(to)" parts. A leading "to" or "be" goes too — "be on the fence"
 *  is said as "I'm still on the fence". */
export function phraseSlots(phrase: string): Slot[] {
  const slots: Slot[] = [];
  const raw = phrase
    .replace(/\.{2,}|…|~/g, " ~any ")
    .replace(/\([^)]*\)/g, " ~opt ")
    .split(/\s+/)
    .filter(Boolean);
  raw.forEach((token, i) => {
    const options = token.split("/").flatMap(pieces);
    if (!options.length) return;
    if (options.includes("~opt")) return void slots.push({ min: 0, max: 3 });
    const inner = i > 0 && i < raw.length - 1;
    if (
      options.some((o) => PLACEHOLDER.has(o) || (inner && MID_PLACEHOLDER.has(o)))
    )
      return void slots.push({ min: 1, max: 3 });
    // "on/at" is one slot with two acceptable words; "I'm" is two slots.
    if (options.length > 1 && token.includes("/"))
      return void slots.push({ words: options.map((o) => stem(expand(o)[0])) });
    for (const o of options)
      for (const w of expand(o)) slots.push({ words: [stem(w)] });
  });
  while (slots.length && !("words" in slots[0])) slots.shift();
  while (slots.length && !("words" in slots[slots.length - 1])) slots.pop();
  const literal = () => slots.filter((s) => "words" in s).length;
  for (const lead of ["to", "be"]) {
    const first = slots[0];
    if (first && "words" in first && first.words[0] === stem(lead) && literal() > 2)
      slots.shift();
  }
  return slots;
}

function matchesAt(slots: Slot[], words: string[], s: number, w: number): boolean {
  if (s === slots.length) return true;
  const slot = slots[s];
  if ("words" in slot)
    return w < words.length && slot.words.includes(words[w])
      ? matchesAt(slots, words, s + 1, w + 1)
      : false;
  for (let n = slot.min; n <= slot.max && w + n <= words.length; n++)
    if (matchesAt(slots, words, s + 1, w + n)) return true;
  return false;
}

/** Where in `words` the phrase was first said, or -1. The position orders
 *  phrases by when they were used. */
export function phraseIndex(words: string[], phrase: string): number {
  const slots = phraseSlots(phrase);
  if (!slots.length) return -1;
  for (let i = 0; i < words.length; i++) if (matchesAt(slots, words, 0, i)) return i;
  return -1;
}

export const phraseUsed = (transcript: string, phrase: string) =>
  phraseIndex(spokenWords(transcript), phrase) >= 0;
