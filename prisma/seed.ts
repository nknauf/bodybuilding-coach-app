import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";
import {
  ClientStatus,
  Equipment,
  EventStatus,
  ExerciseCategory,
  ExerciseScope,
  MuscleGroup,
  PrismaClient,
  Role,
  SetLogStatus,
  UserStatus,
  WeightUnit,
} from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required to seed");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: url }),
});

const ids = {
  adminUser: "00000000-0000-4000-8000-000000000001",
  coachAUser: "00000000-0000-4000-8000-000000000002",
  coachBUser: "00000000-0000-4000-8000-000000000003",
  clientAUser: "00000000-0000-4000-8000-000000000004",
  clientBUser: "00000000-0000-4000-8000-000000000005",
  coachA: "10000000-0000-4000-8000-000000000001",
  coachB: "10000000-0000-4000-8000-000000000002",
  clientA: "20000000-0000-4000-8000-000000000001",
  clientB: "20000000-0000-4000-8000-000000000002",
  squat: "30000000-0000-4000-8000-000000000001",
  bench: "30000000-0000-4000-8000-000000000002",
  row: "30000000-0000-4000-8000-000000000003",
  coachCurl: "30000000-0000-4000-8000-000000000004",
  workoutA: "40000000-0000-4000-8000-000000000001",
  workoutB: "40000000-0000-4000-8000-000000000002",
  workoutExerciseA: "41000000-0000-4000-8000-000000000001",
  workoutExerciseB: "41000000-0000-4000-8000-000000000002",
  setA1: "42000000-0000-4000-8000-000000000001",
  setA2: "42000000-0000-4000-8000-000000000002",
  setA3: "42000000-0000-4000-8000-000000000003",
  setB1: "42000000-0000-4000-8000-000000000004",
  setLogA1: "43000000-0000-4000-8000-000000000001",
  mealCompleted: "50000000-0000-4000-8000-000000000001",
  mealOverdue: "50000000-0000-4000-8000-000000000002",
  supplementScheduled: "60000000-0000-4000-8000-000000000001",
  supplementMissed: "60000000-0000-4000-8000-000000000002",
};

const now = new Date();
const offset = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

async function seed() {
  const users = [
    {
      id: ids.adminUser,
      email: "admin@example.test",
      firstName: "Avery",
      lastName: "Admin",
      role: Role.ADMIN,
      timezone: "America/New_York",
    },
    {
      id: ids.coachAUser,
      email: "coach.alex@example.test",
      firstName: "Alex",
      lastName: "Stone",
      role: Role.COACH,
      timezone: "America/New_York",
    },
    {
      id: ids.coachBUser,
      email: "coach.blair@example.test",
      firstName: "Blair",
      lastName: "Lee",
      role: Role.COACH,
      timezone: "America/Chicago",
    },
    {
      id: ids.clientAUser,
      email: "client.casey@example.test",
      firstName: "Casey",
      lastName: "Young",
      role: Role.CLIENT,
      timezone: "America/Los_Angeles",
    },
    {
      id: ids.clientBUser,
      email: "client.drew@example.test",
      firstName: "Drew",
      lastName: "Kim",
      role: Role.CLIENT,
      timezone: "America/Denver",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: UserStatus.ACTIVE,
        timezone: user.timezone,
      },
      create: { ...user, status: UserStatus.ACTIVE },
    });
  }

  await prisma.coachProfile.upsert({
    where: { id: ids.coachA },
    update: {},
    create: { id: ids.coachA, userId: ids.coachAUser },
  });
  await prisma.coachProfile.upsert({
    where: { id: ids.coachB },
    update: {},
    create: { id: ids.coachB, userId: ids.coachBUser },
  });
  await prisma.clientProfile.upsert({
    where: { id: ids.clientA },
    update: { coachId: ids.coachA, status: ClientStatus.ACTIVE },
    create: {
      id: ids.clientA,
      userId: ids.clientAUser,
      coachId: ids.coachA,
      status: ClientStatus.ACTIVE,
      joinedAt: offset(-720),
    },
  });
  await prisma.clientProfile.upsert({
    where: { id: ids.clientB },
    update: { coachId: ids.coachB, status: ClientStatus.ACTIVE },
    create: {
      id: ids.clientB,
      userId: ids.clientBUser,
      coachId: ids.coachB,
      status: ClientStatus.ACTIVE,
      joinedAt: offset(-720),
    },
  });

  const exercises = [
    {
      id: ids.squat,
      scope: ExerciseScope.GLOBAL,
      ownerCoachId: null,
      name: "Back Squat",
      normalizedName: "back squat",
      muscleGroup: MuscleGroup.LEGS,
      equipment: Equipment.BARBELL,
      category: ExerciseCategory.COMPOUND,
    },
    {
      id: ids.bench,
      scope: ExerciseScope.GLOBAL,
      ownerCoachId: null,
      name: "Bench Press",
      normalizedName: "bench press",
      muscleGroup: MuscleGroup.CHEST,
      equipment: Equipment.BARBELL,
      category: ExerciseCategory.COMPOUND,
    },
    {
      id: ids.row,
      scope: ExerciseScope.GLOBAL,
      ownerCoachId: null,
      name: "Cable Row",
      normalizedName: "cable row",
      muscleGroup: MuscleGroup.BACK,
      equipment: Equipment.CABLE,
      category: ExerciseCategory.COMPOUND,
    },
    {
      id: ids.coachCurl,
      scope: ExerciseScope.COACH,
      ownerCoachId: ids.coachA,
      name: "Alex Curl Finisher",
      normalizedName: "alex curl finisher",
      muscleGroup: MuscleGroup.ARMS,
      equipment: Equipment.DUMBBELL,
      category: ExerciseCategory.ISOLATION,
    },
  ];
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { id: exercise.id },
      update: exercise,
      create: exercise,
    });
  }

  await prisma.workout.upsert({
    where: { id: ids.workoutA },
    update: {
      scheduledAt: offset(-2),
      originalScheduledAt: offset(-2),
    },
    create: {
      id: ids.workoutA,
      coachId: ids.coachA,
      clientId: ids.clientA,
      name: "Lower strength",
      notes: "Controlled tempo. Stop two reps before failure.",
      durationMinutes: 60,
      scheduledAt: offset(-2),
      originalScheduledAt: offset(-2),
      scheduleTimezone: "America/Los_Angeles",
      storedStatus: EventStatus.OVERDUE,
      exercises: {
        create: {
          id: ids.workoutExerciseA,
          exerciseId: ids.squat,
          exerciseNameSnapshot: "Back Squat",
          orderIndex: 0,
          assignedSets: {
            create: [
              { id: ids.setA1, orderIndex: 0, expectedReps: 8 },
              { id: ids.setA2, orderIndex: 1, expectedReps: 8 },
              { id: ids.setA3, orderIndex: 2, expectedReps: 8 },
            ],
          },
        },
      },
    },
  });
  await prisma.workoutSetLog.upsert({
    where: { id: ids.setLogA1 },
    update: {},
    create: {
      id: ids.setLogA1,
      workoutId: ids.workoutA,
      workoutExerciseId: ids.workoutExerciseA,
      assignedSetId: ids.setA1,
      clientId: ids.clientA,
      status: SetLogStatus.COMPLETED,
      actualReps: 8,
      actualWeight: 225,
      weightUnit: WeightUnit.LB,
    },
  });
  await prisma.workout.upsert({
    where: { id: ids.workoutB },
    update: {},
    create: {
      id: ids.workoutB,
      coachId: ids.coachB,
      clientId: ids.clientB,
      name: "Upper strength",
      scheduledAt: offset(24),
      originalScheduledAt: offset(24),
      scheduleTimezone: "America/Denver",
      exercises: {
        create: {
          id: ids.workoutExerciseB,
          exerciseId: ids.bench,
          exerciseNameSnapshot: "Bench Press",
          orderIndex: 0,
          assignedSets: {
            create: { id: ids.setB1, orderIndex: 0, expectedReps: 6 },
          },
        },
      },
    },
  });

  const mealData = [
    {
      id: ids.mealCompleted,
      name: "Chicken rice bowl",
      scheduledAt: offset(-4),
      originalScheduledAt: offset(-4),
      storedStatus: EventStatus.COMPLETED,
      completedAt: offset(-3),
    },
    {
      id: ids.mealOverdue,
      name: "Greek yogurt snack",
      scheduledAt: offset(-2),
      originalScheduledAt: offset(-2),
      storedStatus: EventStatus.OVERDUE,
      completedAt: null,
    },
  ];
  for (const meal of mealData) {
    await prisma.mealEvent.upsert({
      where: { id: meal.id },
      update: {
        scheduledAt: meal.scheduledAt,
        originalScheduledAt: meal.originalScheduledAt,
        storedStatus: meal.storedStatus,
        completedAt: meal.completedAt,
      },
      create: {
        ...meal,
        coachId: ids.coachA,
        clientId: ids.clientA,
        scheduleTimezone: "America/Los_Angeles",
        expectedCalories: 600,
        expectedProteinGrams: 45,
        expectedCarbGrams: 70,
        expectedFatGrams: 15,
      },
    });
  }

  const supplements = [
    {
      id: ids.supplementScheduled,
      name: "Creatine",
      dosageText: "5 g",
      scheduledAt: offset(3),
      originalScheduledAt: offset(3),
      storedStatus: EventStatus.SCHEDULED,
    },
    {
      id: ids.supplementMissed,
      name: "Vitamin D",
      dosageText: "1 capsule",
      scheduledAt: offset(-24),
      originalScheduledAt: offset(-24),
      storedStatus: EventStatus.MISSED,
    },
  ];
  for (const supplement of supplements) {
    await prisma.supplementEvent.upsert({
      where: { id: supplement.id },
      update: {
        scheduledAt: supplement.scheduledAt,
        originalScheduledAt: supplement.originalScheduledAt,
        storedStatus: supplement.storedStatus,
      },
      create: {
        ...supplement,
        coachId: ids.coachA,
        clientId: ids.clientA,
        scheduleTimezone: "America/Los_Angeles",
      },
    });
  }

  for (let day = 0; day < 35; day += 1) {
    const measuredAt = new Date(now.getTime() - day * 86_400_000);
    const id = `70000000-0000-4000-8000-${String(day + 1).padStart(12, "0")}`;
    await prisma.bodyMetric.upsert({
      where: { id },
      update: {},
      create: {
        id,
        clientId: ids.clientA,
        creatorId: ids.clientAUser,
        value: 188 + day * 0.08,
        unit: WeightUnit.LB,
        measuredAt,
        isMorning: true,
      },
    });
  }

  await prisma.auditLog.upsert({
    where: { id: "80000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "80000000-0000-4000-8000-000000000001",
      actorUserId: ids.adminUser,
      actorRole: Role.ADMIN,
      action: "DEMO_DATA_SEEDED",
      entityType: "SYSTEM",
      entityId: "demo",
    },
  });
}

seed()
  .then(() => {
    console.log("Demo data seeded idempotently.");
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
