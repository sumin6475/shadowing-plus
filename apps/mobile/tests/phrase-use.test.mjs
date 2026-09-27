import test from "node:test";
import assert from "node:assert/strict";
import { phraseIndex, phraseUsed, spokenWords } from "../src/lib/phrase-use.ts";

test("a phrase counts when its words are said in order", () => {
  assert.equal(phraseUsed("honestly I am swamped this week with reports", "I'm swamped this week"), true);
  assert.equal(phraseUsed("I’m swamped", "I'm swamped"), true, "curly apostrophes");
  assert.equal(phraseUsed("so let's call it a day", "call it a day"), true);
});

test("verb forms, my/your and placeholders still count", () => {
  assert.equal(phraseUsed("we called it a day early", "call it a day"), true);
  assert.equal(phraseUsed("I finally made up my mind", "make up one's mind"), true);
  assert.equal(phraseUsed("don't take your family for granted", "take sth for granted"), true);
  assert.equal(phraseUsed("he let his whole team down", "let someone down"), true);
  assert.equal(phraseUsed("I'm still on the fence about it", "be on the fence"), true);
  assert.equal(phraseUsed("these things happen", "thing happens"), true);
  assert.equal(phraseUsed("she brought it up again", "bring sth up"), true);
  assert.equal(phraseUsed("I'm gonna head out", "going to head out"), true);
  assert.equal(phraseUsed("see you on the weekend", "on/at the weekend"), true);
  assert.equal(phraseUsed("not only fast but also cheap", "not only ... but also"), true);
});

test("the same words out of order, or apart, do not count", () => {
  assert.equal(phraseUsed("I call my mom every day", "call it a day"), false);
  assert.equal(phraseUsed("the fence was on fire", "on the fence"), false);
  assert.equal(phraseUsed("", "call it a day"), false);
  assert.equal(phraseUsed("anything at all", "sth"), false, "a phrase of only stand-ins matches nothing");
  // "something" at the edge is the literal word, not a stand-in.
  assert.equal(phraseUsed("like that", "something like that"), false);
  assert.equal(phraseUsed("yeah something like that", "something like that"), true);
});

test("the index orders phrases by when they were first said", () => {
  const words = spokenWords("I'm swamped, so let's call it a day and I'm swamped again");
  const swamped = phraseIndex(words, "I'm swamped");
  const day = phraseIndex(words, "call it a day");
  assert.ok(swamped >= 0 && day > swamped);
  assert.equal(phraseIndex(words, "on the fence"), -1);
});
