export function normalizeGuess(text: string): string { return text.normalize("NFKC").trim().toLowerCase().replace(/[\s_-]+/g, " "); }
export function guessScore(remainingMs: number, durationMs: number, position: number): number {
  const timeBonus = Math.round(400 * Math.max(0, Math.min(1, remainingMs / durationMs)));
  return Math.max(100, 100 + timeBonus + Math.max(0, 100 - position * 20));
}
export function maskWord(word: string, elapsedRatio = 0): string {
  const reveal = elapsedRatio >= .72 ? 2 : elapsedRatio >= .4 ? 1 : 0;
  let count = 0;
  return [...word].map((char, index) => {
    if (char === " ") return "  ";
    if (word.length > 4 && index % 3 === 1 && count < Math.min(reveal, Math.floor(word.replace(/ /g, "").length / 3))) { count++; return char; }
    return "_";
  }).join(" ");
}
export function rankPlayers<T extends { score: number; name: string }>(players: T[]): T[] { return [...players].sort((a,b) => b.score - a.score || a.name.localeCompare(b.name)); }
