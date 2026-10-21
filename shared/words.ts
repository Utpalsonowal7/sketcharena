export const WORDS = {
  animals: ["elephant", "penguin", "butterfly", "octopus", "giraffe", "dolphin", "kangaroo", "hedgehog", "flamingo", "turtle", "rabbit", "jellyfish", "peacock", "crocodile", "panda", "seahorse", "dragonfly", "caterpillar", "parrot", "snail"],
  objects: ["umbrella", "bicycle", "headphones", "telescope", "backpack", "skateboard", "toothbrush", "alarm clock", "lighthouse", "keyboard", "snow globe", "teapot", "sunglasses", "guitar", "hot air balloon", "rocket", "sandcastle", "birthday cake", "campfire", "treasure chest"],
  places: ["treehouse", "waterfall", "volcano", "playground", "library", "space station", "mountain", "island", "campsite", "castle", "desert", "bowling alley", "train station", "aquarium", "windmill", "skate park", "rainforest", "igloo", "beach", "farm"],
} as const;

export function chooseWords(category: keyof typeof WORDS | "mixed", used: Set<string>, random = Math.random): string[] {
  const all: string[] = category === "mixed" ? Object.values(WORDS).flat() : [...WORDS[category]];
  let pool = all.filter((word) => !used.has(word));
  if (pool.length < 3) pool = [...all];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
