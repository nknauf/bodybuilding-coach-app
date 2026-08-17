import { addDays, addHours, startOfWeek, subDays } from "date-fns";
import type { DemoAction, DemoState, DemoWorkout } from "./model";

const at = (day: Date, hour: number) => addHours(day, hour).toISOString();
const sets = (
  prefix: string,
  count: number,
  repsMin: number,
  repsMax = repsMin,
  weight?: number,
) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-s${index + 1}`,
    targetRepsMin: repsMin,
    targetRepsMax: repsMax,
    targetWeight: weight,
    unit: "LB" as const,
    effort: 8,
  }));

export function createDemoState(
  now = new Date(),
  timezone = "America/New_York",
): DemoState {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const todayOffset = Math.max(
    0,
    Math.min(
      6,
      Math.floor(
        (startOfDay(now).getTime() - startOfDay(monday).getTime()) / 86400000,
      ),
    ),
  );
  const today = addDays(monday, todayOffset);
  const clientId = "demo-client-maya";
  const workouts: DemoWorkout[] = [
    {
      id: "demo-workout-push",
      clientId,
      name: "Push A",
      scheduledAt: at(today, 12),
      status: "SCHEDULED",
      exercises: [
        {
          id: "we-bench",
          exerciseId: "bench",
          name: "Barbell Bench Press",
          notes: "Controlled eccentric",
          sets: sets("bench", 3, 8, 10, 135),
          previous: [
            { weight: 130, reps: 10, unit: "LB" },
            { weight: 130, reps: 9, unit: "LB" },
            { weight: 130, reps: 8, unit: "LB" },
          ],
        },
        {
          id: "we-incline",
          exerciseId: "incline",
          name: "Incline Dumbbell Press",
          sets: sets("incline", 3, 10, 12, 45),
          previous: [
            { weight: 40, reps: 12, unit: "LB" },
            { weight: 40, reps: 11, unit: "LB" },
          ],
        },
        {
          id: "we-lateral",
          exerciseId: "lateral",
          name: "Cable Lateral Raise",
          sets: sets("lateral", 3, 12, 15, 15),
          previous: [{ weight: 15, reps: 14, unit: "LB" }],
        },
      ],
    },
    {
      id: "demo-workout-legs",
      clientId,
      name: "Legs",
      scheduledAt: at(addDays(today, 2), 17),
      status: "SCHEDULED",
      exercises: [
        {
          id: "we-squat",
          exerciseId: "squat",
          name: "Back Squat",
          sets: sets("squat", 4, 6, 8, 185),
          previous: [{ weight: 180, reps: 8, unit: "LB" }],
        },
      ],
    },
    {
      id: "demo-workout-pull",
      clientId,
      name: "Pull A",
      scheduledAt: at(subDays(today, 2), 16),
      status: "COMPLETED",
      finalizedAt: at(subDays(today, 2), 17),
      exercises: [
        {
          id: "we-row",
          exerciseId: "row",
          name: "Chest-Supported Row",
          sets: sets("row", 3, 10, 10, 90).map((set) => ({
            ...set,
            actualReps: 10,
            actualWeight: 90,
            status: "COMPLETED" as const,
          })),
          previous: [],
        },
      ],
    },
  ];
  const bodyweights = Array.from({ length: 60 }, (_, index) => ({
    id: `weight-${index}`,
    clientId,
    value: Number(
      (142.8 - index * 0.035 + Math.sin(index / 3) * 0.35).toFixed(1),
    ),
    measuredAt: at(subDays(today, 59 - index), 7),
    unit: "LB" as const,
  }));
  return {
    version: 1,
    createdAt: now.toISOString(),
    timezone,
    primaryClientId: clientId,
    clients: [
      {
        id: clientId,
        name: "Maya Chen",
        initials: "MC",
        timezone,
        status: "ACTIVE",
      },
      {
        id: "demo-client-evan",
        name: "Evan Brooks",
        initials: "EB",
        timezone,
        status: "ACTIVE",
      },
      {
        id: "demo-client-sofia",
        name: "Sofia Ramirez",
        initials: "SR",
        timezone,
        status: "ACTIVE",
      },
    ],
    exercises: [
      { id: "bench", name: "Barbell Bench Press", scope: "GLOBAL" },
      { id: "incline", name: "Incline Dumbbell Press", scope: "GLOBAL" },
      { id: "lateral", name: "Cable Lateral Raise", scope: "GLOBAL" },
      { id: "squat", name: "Back Squat", scope: "GLOBAL" },
      { id: "row", name: "Chest-Supported Row", scope: "GLOBAL" },
      { id: "curl", name: "Dumbbell Curl", scope: "GLOBAL" },
    ],
    workouts,
    meals: [
      {
        id: "meal-1",
        clientId,
        name: "Chicken rice bowl",
        scheduledAt: at(today, 13),
        calories: 640,
        protein: 48,
        carbs: 72,
        fat: 16,
      },
      {
        id: "meal-2",
        clientId,
        name: "Greek yogurt & berries",
        scheduledAt: at(today, 9),
        calories: 320,
        protein: 30,
        carbs: 34,
        fat: 7,
        completedAt: at(today, 9.5),
      },
      {
        id: "meal-3",
        clientId,
        name: "Salmon and potatoes",
        scheduledAt: at(addDays(today, 1), 18),
        calories: 710,
        protein: 46,
        carbs: 68,
        fat: 25,
      },
    ],
    supplements: [
      {
        id: "supp-1",
        clientId,
        name: "Creatine",
        dosage: "5 g",
        scheduledAt: at(today, 8),
      },
      {
        id: "supp-2",
        clientId,
        name: "Vitamin D",
        dosage: "2,000 IU",
        scheduledAt: at(today, 8),
        completedAt: at(today, 8.2),
      },
      {
        id: "supp-3",
        clientId,
        name: "Fish Oil",
        dosage: "2 capsules",
        scheduledAt: at(today, 8),
      },
    ],
    bodyweights,
    activity: [
      {
        id: "activity-1",
        clientId,
        label: "Completed Pull A",
        at: at(subDays(today, 2), 17),
      },
      {
        id: "activity-2",
        clientId,
        label: "Logged bodyweight",
        at: at(today, 7),
      },
      {
        id: "activity-3",
        clientId,
        label: "Ate Greek yogurt & berries as planned",
        at: at(today, 9.5),
      },
    ],
  };
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "RESET") return action.state;
  if (action.type === "ADD_EXERCISE")
    return { ...state, exercises: [...state.exercises, action.exercise] };
  if (action.type === "ADD_WORKOUT")
    return { ...state, workouts: [...state.workouts, action.workout] };
  if (action.type === "ADD_MEAL")
    return { ...state, meals: [...state.meals, action.meal] };
  if (action.type === "ADD_SUPPLEMENT")
    return { ...state, supplements: [...state.supplements, action.supplement] };
  if (action.type === "LOG_SET")
    return {
      ...state,
      workouts: state.workouts.map((workout) =>
        workout.id !== action.workoutId
          ? workout
          : {
              ...workout,
              exercises: workout.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id !== action.setId
                    ? set
                    : {
                        ...set,
                        actualReps: action.reps,
                        actualWeight: action.weight,
                        status: action.status,
                      },
                ),
              })),
            },
      ),
    };
  if (action.type === "REOPEN_SET")
    return {
      ...state,
      workouts: state.workouts.map((workout) =>
        workout.id !== action.workoutId
          ? workout
          : {
              ...workout,
              exercises: workout.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id !== action.setId ? set : { ...set, status: undefined },
                ),
              })),
            },
      ),
    };
  if (action.type === "FINALIZE_WORKOUT")
    return {
      ...state,
      workouts: state.workouts.map((workout) =>
        workout.id === action.workoutId
          ? { ...workout, status: "COMPLETED", finalizedAt: action.at }
          : workout,
      ),
    };
  if (action.type === "COMPLETE_MEAL")
    return {
      ...state,
      meals: state.meals.map((meal) =>
        meal.id === action.mealId
          ? { ...meal, completedAt: action.at, actuals: action.actuals }
          : meal,
      ),
    };
  if (action.type === "COMPLETE_SUPPLEMENT")
    return {
      ...state,
      supplements: state.supplements.map((item) =>
        item.id === action.supplementId
          ? { ...item, completedAt: action.at }
          : item,
      ),
    };
  if (action.type === "LOG_BODYWEIGHT")
    return { ...state, bodyweights: [...state.bodyweights, action.entry] };
  if (action.type === "ADD_ACTIVITY")
    return { ...state, activity: [action.activity, ...state.activity] };
  return state;
}

export function readDemoState(value: string | null): DemoState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DemoState;
    return parsed.version === 1 && Array.isArray(parsed.clients)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
