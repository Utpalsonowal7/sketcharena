import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGuess,
  guessScore,
  maskWord,
  rankPlayers,
} from "../shared/rules.js";
import { chooseWords } from "../shared/words.js";
test("guesses normalize case, unicode and separators", () => {
  assert.equal(normalizeGuess("  Hot-Air   Balloon "), "hot air balloon");
  assert.equal(normalizeGuess("ＰＡＮＤＡ"), "panda");
});
test("faster guesses earn more, scores are bounded", () => {
  assert.ok(guessScore(50000, 60000, 0) > guessScore(1000, 60000, 0));
  assert.ok(guessScore(60000, 60000, 0) > guessScore(60000, 60000, 2));
  assert.equal(guessScore(-100, 60000, 99), 100);
});
test("hints never reveal short words or full answers", () => {
  assert.equal(maskWord("cat", 1), "_ _ _");
  assert.ok(maskWord("elephant", 0.8).includes("l"));
  assert.ok(maskWord("elephant", 1).includes("_"));
});
test("word selection gives distinct choices and avoids recent words", () => {
  const used = new Set(["elephant", "penguin"]);
  const choices = chooseWords("animals", used, () => 0.5);
  assert.equal(new Set(choices).size, 3);
  assert.ok(choices.every((w) => !used.has(w)));
});
test("ranking does not mutate the original list", () => {
  const players = [
    { name: "B", score: 2 },
    { name: "A", score: 3 },
  ];
  assert.equal(rankPlayers(players)[0].name, "A");
  assert.equal(players[0].name, "B");
});
