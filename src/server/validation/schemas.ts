import { z } from "zod";

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const optionalNumber = (schema: z.ZodType<number, unknown>) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

export const uuidSchema = z.string().uuid();
export const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");

export const createCoachSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  firstName: boundedText(80),
  lastName: boundedText(80),
  timezone: timezoneSchema,
});

export const createClientSchema = createCoachSchema;

export const exerciseSchema = z.object({
  name: boundedText(120),
  muscleGroup: z.enum(["CHEST", "BACK", "SHOULDERS", "LEGS", "ARMS", "CORE"]),
  equipment: z.enum([
    "BARBELL",
    "DUMBBELL",
    "CABLE",
    "BODYWEIGHT",
    "PIN_LOADED_MACHINE",
    "PLATE_LOADED_MACHINE",
  ]),
  category: z.enum(["COMPOUND", "ISOLATION", "CARDIO", "MOBILITY"]),
});

const scheduledBase = z.object({
  clientId: uuidSchema,
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a local date and time"),
});

export const workoutSchema = scheduledBase.extend({
  name: boundedText(120),
  notes: z.string().trim().max(2000).optional(),
  durationMinutes: optionalNumber(z.coerce.number().int().min(1).max(1440)),
  exercises: z
    .array(
      z.object({
        exerciseId: uuidSchema,
        notes: z.string().trim().max(1000).optional(),
        expectedReps: z.array(z.number().int().min(1).max(1000)).min(1).max(20),
      }),
    )
    .min(1)
    .max(30),
});

export const mealSchema = scheduledBase.extend({
  name: boundedText(120),
  description: z.string().trim().max(2000).optional(),
  expectedCalories: optionalNumber(z.coerce.number().int().min(0).max(20000)),
  expectedProteinGrams: optionalNumber(
    z.coerce.number().int().min(0).max(2000),
  ),
  expectedCarbGrams: optionalNumber(z.coerce.number().int().min(0).max(3000)),
  expectedFatGrams: optionalNumber(z.coerce.number().int().min(0).max(1000)),
});

export const supplementSchema = scheduledBase.extend({
  name: boundedText(120),
  dosageText: boundedText(200),
});

export const setLogSchema = z.object({
  workoutId: uuidSchema,
  assignedSetId: uuidSchema,
  status: z.enum(["COMPLETED", "SKIPPED"]),
  actualReps: optionalNumber(z.coerce.number().int().min(0).max(1000)),
  actualWeight: optionalNumber(z.coerce.number().min(0).max(10000)),
  weightUnit: z.enum(["LB", "KG"]).optional(),
});

export const extraSetSchema = z.object({
  workoutId: uuidSchema,
  workoutExerciseId: uuidSchema,
  actualReps: z.number().int().min(0).max(1000),
  actualWeight: z.number().min(0).max(10000).optional(),
  weightUnit: z.enum(["LB", "KG"]).optional(),
});

export const completeMealSchema = z.object({
  mealId: uuidSchema,
  actualCalories: optionalNumber(z.coerce.number().int().min(0).max(20000)),
  actualProteinGrams: optionalNumber(z.coerce.number().int().min(0).max(2000)),
  actualCarbGrams: optionalNumber(z.coerce.number().int().min(0).max(3000)),
  actualFatGrams: optionalNumber(z.coerce.number().int().min(0).max(1000)),
});

export const bodyMetricSchema = z.object({
  value: z.coerce.number().positive().max(2000),
  unit: z.enum(["LB", "KG"]),
  measuredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a local date and time"),
  isMorning: z.coerce.boolean().default(false),
});

export const rescheduleSchema = z.object({
  kind: z.enum(["WORKOUT", "MEAL", "SUPPLEMENT"]),
  eventId: uuidSchema,
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a local date and time"),
});

export const workoutNotesSchema = z.object({
  workoutId: uuidSchema,
  workoutNotes: z.string().trim().max(2000).optional(),
  exerciseId: uuidSchema.optional(),
  exerciseNotes: z.string().trim().max(1000).optional(),
});
