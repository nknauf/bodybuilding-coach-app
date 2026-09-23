export type SearchableExercise = { id: string; name: string };

const aliases: Record<string, string> = {
  db: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
};

export function normalizeExerciseQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => aliases[word] ?? word)
    .join(" ");
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

export function rankExercises<T extends SearchableExercise>(
  catalog: T[],
  query: string,
  limit = 5,
): T[] {
  const normalized = normalizeExerciseQuery(query);
  if (!normalized) return [];
  const terms = normalized.split(" ");
  return catalog
    .map((exercise) => {
      const name = normalizeExerciseQuery(exercise.name);
      const words = name.split(" ");
      let score = Infinity;
      if (name === normalized) score = 0;
      else if (name.startsWith(normalized)) score = 1;
      else if (
        terms.every((term) => words.some((word) => word.startsWith(term)))
      ) {
        score = 2 + words.length / 100;
      } else if (name.includes(normalized)) score = 3;
      else {
        const distances = terms.map((term) =>
          Math.min(...words.map((word) => editDistance(term, word))),
        );
        const total = distances.reduce((sum, distance) => sum + distance, 0);
        if (
          distances.every((distance) => distance <= 2) &&
          total <= Math.max(2, terms.length)
        ) {
          score = 4 + total / 10;
        }
      }
      return { exercise, score };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort(
      (a, b) =>
        a.score - b.score || a.exercise.name.localeCompare(b.exercise.name),
    )
    .slice(0, limit)
    .map((item) => item.exercise);
}
