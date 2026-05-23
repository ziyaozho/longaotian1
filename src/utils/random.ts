export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomChoice = <T>(arr: readonly T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const randomChoices = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const checkProbability = (probability: number): boolean => {
  return Math.random() < probability;
};

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const weightedRandom = <T>(items: { item: T; weight: number }[]): T => {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let random = Math.random() * totalWeight;
  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1].item;
};
