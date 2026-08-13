export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function fixedClock(instant: string | Date): Clock {
  const value = new Date(instant);
  return { now: () => new Date(value) };
}
