import test from "node:test";
import assert from "node:assert/strict";
import {
  balancedPhrasesForDay,
  discoverySlotsForDay,
  isDiscoveryPhrase,
  isReinforcementPhrase,
} from "../src/lib/daily-phrase-ranking.ts";

const today = "2026-10-11";
const now = new Date(`${today}T16:00:00Z`).getTime();
const at = (daysAgo) => new Date(now - daysAgo * 86_400_000).toISOString();
const phrase = (id, intervalDays, reviewed = true) => ({
  id,
  learningStatus: reviewed ? "practicing" : "new",
  createdAt: at(40),
  dueAt: at(0),
  intervalDays,
  lastReviewedAt: reviewed ? at(intervalDays || 1) : null,
  lastPracticedAt: reviewed ? at(intervalDays || 1) : null,
  lastSelfTalkUsedAt: null,
  lapses: 0,
  reviewPinUntil: null,
});

test("new and 30-day phrases are discovery; 1/3/7-day phrases are reinforcement", () => {
  assert.equal(isDiscoveryPhrase(phrase("new", 0, false)), true);
  assert.equal(isDiscoveryPhrase(phrase("month", 30)), true);
  for (const days of [1, 3, 7]) assert.equal(isReinforcementPhrase(phrase(`d${days}`, days)), true);
  assert.equal(isReinforcementPhrase(phrase("month", 30)), false);
});

test("daily counts keep the intended 20/80 mix with both lanes present", () => {
  const bank = [
    ...Array.from({ length: 5 }, (_, index) => phrase(`new-${index}`, index ? 30 : 0, index > 0)),
    ...Array.from({ length: 20 }, (_, index) => phrase(`due-${index}`, [1, 3, 7][index % 3])),
  ];
  for (const [limit, expectedDiscovery] of [[2, 1], [5, 1], [10, 2]]) {
    const picked = balancedPhrasesForDay(bank, today, limit, now);
    assert.equal(picked.length, limit);
    assert.equal(picked.filter(isDiscoveryPhrase).length, expectedDiscovery, `${limit} phrases`);
    assert.equal(picked.filter(isReinforcementPhrase).length, limit - expectedDiscovery, `${limit} phrases`);
  }
});

test("one phrase per day gives discovery one slot in each stable five-day cycle", () => {
  const slots = Array.from({ length: 5 }, (_, offset) => {
    const date = new Date(Date.UTC(2026, 9, 11 + offset)).toISOString().slice(0, 10);
    return discoverySlotsForDay(1, date);
  });
  assert.equal(slots.reduce((sum, value) => sum + value, 0), 1);
});

test("a missing lane spills to the best remaining phrases instead of shrinking the deck", () => {
  const reinforcementOnly = [phrase("d1", 1), phrase("d3", 3), phrase("d7", 7)];
  assert.equal(balancedPhrasesForDay(reinforcementOnly, today, 2, now).length, 2);
  const discoveryOnly = [phrase("new", 0, false), phrase("month", 30)];
  assert.equal(balancedPhrasesForDay(discoveryOnly, today, 2, now).length, 2);
});
