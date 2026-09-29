export function parseRepRange(value: string) {
  const match = value.trim().match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2] ?? match[1]);
  return min >= 1 && max <= 1000 && min <= max ? { min, max } : null;
}

export function duplicateExercise<
  T extends { id?: string; sets: { id?: string }[] },
>(exercise: T): T {
  return {
    ...exercise,
    id: undefined,
    sets: exercise.sets.map((set) => ({ ...set, id: undefined })),
  };
}
