export type DemoEventStatus = "SCHEDULED" | "COMPLETED" | "SKIPPED";

export type DemoSet = {
  id: string;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight?: number;
  unit: "LB" | "KG";
  effort?: number;
  actualReps?: number;
  actualWeight?: number;
  status?: DemoEventStatus;
};

export type DemoWorkoutExercise = {
  id: string;
  exerciseId: string;
  name: string;
  notes?: string;
  sets: DemoSet[];
  previous: { weight?: number; reps: number; unit: "LB" | "KG" }[];
};

export type DemoWorkout = {
  id: string;
  clientId: string;
  name: string;
  scheduledAt: string;
  status: DemoEventStatus;
  finalizedAt?: string;
  exercises: DemoWorkoutExercise[];
};

export type DemoMeal = {
  id: string;
  clientId: string;
  name: string;
  scheduledAt: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  completedAt?: string;
  actuals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

export type DemoSupplement = {
  id: string;
  clientId: string;
  name: string;
  dosage: string;
  scheduledAt: string;
  completedAt?: string;
};

export type DemoClient = {
  id: string;
  name: string;
  initials: string;
  timezone: string;
  status: "ACTIVE";
};

export type DemoExercise = {
  id: string;
  name: string;
  scope: "GLOBAL" | "COACH";
};

export type DemoBodyweight = {
  id: string;
  clientId: string;
  value: number;
  measuredAt: string;
  unit: "LB" | "KG";
};
export type DemoActivity = {
  id: string;
  clientId: string;
  label: string;
  at: string;
};

export type DemoState = {
  version: 1;
  createdAt: string;
  timezone: string;
  primaryClientId: string;
  clients: DemoClient[];
  exercises: DemoExercise[];
  workouts: DemoWorkout[];
  meals: DemoMeal[];
  supplements: DemoSupplement[];
  bodyweights: DemoBodyweight[];
  activity: DemoActivity[];
};

export type DemoAction =
  | { type: "RESET"; state: DemoState }
  | { type: "ADD_EXERCISE"; exercise: DemoExercise }
  | { type: "ADD_WORKOUT"; workout: DemoWorkout }
  | { type: "ADD_MEAL"; meal: DemoMeal }
  | { type: "ADD_SUPPLEMENT"; supplement: DemoSupplement }
  | {
      type: "LOG_SET";
      workoutId: string;
      setId: string;
      reps?: number;
      weight?: number;
      status: "COMPLETED" | "SKIPPED";
    }
  | { type: "REOPEN_SET"; workoutId: string; setId: string }
  | { type: "FINALIZE_WORKOUT"; workoutId: string; at: string }
  | {
      type: "COMPLETE_MEAL";
      mealId: string;
      at: string;
      actuals?: DemoMeal["actuals"];
    }
  | { type: "COMPLETE_SUPPLEMENT"; supplementId: string; at: string }
  | { type: "LOG_BODYWEIGHT"; entry: DemoBodyweight }
  | { type: "ADD_ACTIVITY"; activity: DemoActivity };
