-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COACH', 'CLIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ExerciseScope" AS ENUM ('GLOBAL', 'COACH');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'LEGS', 'ARMS', 'CORE');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BARBELL', 'DUMBBELL', 'CABLE', 'BODYWEIGHT', 'PIN_LOADED_MACHINE', 'PLATE_LOADED_MACHINE');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('COMPOUND', 'ISOLATION', 'CARDIO', 'MOBILITY');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'OVERDUE', 'MISSED');

-- CreateEnum
CREATE TYPE "SetLogStatus" AS ENUM ('COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ScheduledEventKind" AS ENUM ('WORKOUT', 'MEAL', 'SUPPLEMENT');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('LB', 'KG');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "clerkUserId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastSignedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "coachId" UUID,
    "status" "ClientStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCoachHistory" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ClientCoachHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvite" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" UUID NOT NULL,
    "scope" "ExerciseScope" NOT NULL,
    "ownerCoachId" UUID,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "equipment" "Equipment" NOT NULL,
    "category" "ExerciseCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "durationMinutes" INTEGER,
    "coachComment" TEXT,
    "clientNotes" TEXT,
    "originalScheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduleTimezone" TEXT NOT NULL,
    "storedStatus" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "movedByClient" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" UUID NOT NULL,
    "workoutId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "exerciseNameSnapshot" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "coachNotes" TEXT,
    "clientNotes" TEXT,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedSet" (
    "id" UUID NOT NULL,
    "workoutExerciseId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "expectedReps" INTEGER NOT NULL,

    CONSTRAINT "AssignedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSetLog" (
    "id" UUID NOT NULL,
    "workoutId" UUID NOT NULL,
    "workoutExerciseId" UUID NOT NULL,
    "assignedSetId" UUID,
    "clientId" UUID NOT NULL,
    "status" "SetLogStatus" NOT NULL,
    "actualReps" INTEGER,
    "actualWeight" DECIMAL(8,2),
    "weightUnit" "WeightUnit",
    "isExtra" BOOLEAN NOT NULL DEFAULT false,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealEvent" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expectedCalories" INTEGER,
    "expectedProteinGrams" INTEGER,
    "expectedCarbGrams" INTEGER,
    "expectedFatGrams" INTEGER,
    "actualCalories" INTEGER,
    "actualProteinGrams" INTEGER,
    "actualCarbGrams" INTEGER,
    "actualFatGrams" INTEGER,
    "originalScheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduleTimezone" TEXT NOT NULL,
    "storedStatus" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "movedByClient" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealIngredient" (
    "id" UUID NOT NULL,
    "mealId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "MealIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementEvent" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dosageText" TEXT NOT NULL,
    "clientNote" TEXT,
    "originalScheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduleTimezone" TEXT NOT NULL,
    "storedStatus" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "movedByClient" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "recurrenceSeriesId" UUID,
    "recurrenceRule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReschedule" (
    "id" UUID NOT NULL,
    "kind" "ScheduledEventKind" NOT NULL,
    "eventId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "fromTime" TIMESTAMP(3) NOT NULL,
    "toTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReschedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMetric" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "value" DECIMAL(8,2) NOT NULL,
    "unit" "WeightUnit" NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "isMorning" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE INDEX "CoachProfile_userId_idx" ON "CoachProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- This composite key lets event foreign keys prove coach/client ownership.
CREATE UNIQUE INDEX "ClientProfile_id_coachId_key" ON "ClientProfile"("id", "coachId");

-- CreateIndex
CREATE INDEX "ClientProfile_coachId_status_idx" ON "ClientProfile"("coachId", "status");

-- CreateIndex
CREATE INDEX "ClientProfile_userId_status_idx" ON "ClientProfile"("userId", "status");

-- CreateIndex
CREATE INDEX "ClientCoachHistory_clientId_assignedAt_idx" ON "ClientCoachHistory"("clientId", "assignedAt");

-- CreateIndex
CREATE INDEX "ClientCoachHistory_coachId_endedAt_idx" ON "ClientCoachHistory"("coachId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvite_tokenHash_key" ON "ClientInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientInvite_coachId_status_idx" ON "ClientInvite"("coachId", "status");

-- CreateIndex
CREATE INDEX "ClientInvite_email_status_idx" ON "ClientInvite"("email", "status");

-- CreateIndex
CREATE INDEX "Exercise_scope_isActive_idx" ON "Exercise"("scope", "isActive");

-- CreateIndex
CREATE INDEX "Exercise_ownerCoachId_isActive_idx" ON "Exercise"("ownerCoachId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_ownerCoachId_normalizedName_key" ON "Exercise"("ownerCoachId", "normalizedName");

-- PostgreSQL treats NULL values as distinct, so global names need a partial index.
CREATE UNIQUE INDEX "Exercise_global_normalizedName_key"
ON "Exercise"("normalizedName")
WHERE "scope" = 'GLOBAL';

-- CreateIndex
CREATE INDEX "Workout_coachId_clientId_scheduledAt_idx" ON "Workout"("coachId", "clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Workout_clientId_scheduledAt_idx" ON "Workout"("clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Workout_storedStatus_scheduledAt_idx" ON "Workout"("storedStatus", "scheduledAt");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_workoutId_orderIndex_key" ON "WorkoutExercise"("workoutId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedSet_workoutExerciseId_orderIndex_key" ON "AssignedSet"("workoutExerciseId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSetLog_assignedSetId_key" ON "WorkoutSetLog"("assignedSetId");

-- CreateIndex
CREATE INDEX "WorkoutSetLog_workoutId_clientId_idx" ON "WorkoutSetLog"("workoutId", "clientId");

-- CreateIndex
CREATE INDEX "WorkoutSetLog_workoutExerciseId_isExtra_idx" ON "WorkoutSetLog"("workoutExerciseId", "isExtra");

-- CreateIndex
CREATE INDEX "MealEvent_coachId_clientId_scheduledAt_idx" ON "MealEvent"("coachId", "clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "MealEvent_clientId_scheduledAt_idx" ON "MealEvent"("clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "MealEvent_storedStatus_scheduledAt_idx" ON "MealEvent"("storedStatus", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "MealIngredient_mealId_orderIndex_key" ON "MealIngredient"("mealId", "orderIndex");

-- CreateIndex
CREATE INDEX "SupplementEvent_coachId_clientId_scheduledAt_idx" ON "SupplementEvent"("coachId", "clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SupplementEvent_clientId_scheduledAt_idx" ON "SupplementEvent"("clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SupplementEvent_storedStatus_scheduledAt_idx" ON "SupplementEvent"("storedStatus", "scheduledAt");

-- CreateIndex
CREATE INDEX "SupplementEvent_recurrenceSeriesId_idx" ON "SupplementEvent"("recurrenceSeriesId");

-- CreateIndex
CREATE INDEX "EventReschedule_actorUserId_createdAt_idx" ON "EventReschedule"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventReschedule_kind_eventId_key" ON "EventReschedule"("kind", "eventId");

-- CreateIndex
CREATE INDEX "BodyMetric_clientId_measuredAt_idx" ON "BodyMetric"("clientId", "measuredAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCoachHistory" ADD CONSTRAINT "ClientCoachHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCoachHistory" ADD CONSTRAINT "ClientCoachHistory_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvite" ADD CONSTRAINT "ClientInvite_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_ownerCoachId_fkey" FOREIGN KEY ("ownerCoachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_clientId_coachId_fkey" FOREIGN KEY ("clientId", "coachId") REFERENCES "ClientProfile"("id", "coachId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedSet" ADD CONSTRAINT "AssignedSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_assignedSetId_fkey" FOREIGN KEY ("assignedSetId") REFERENCES "AssignedSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEvent" ADD CONSTRAINT "MealEvent_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEvent" ADD CONSTRAINT "MealEvent_clientId_coachId_fkey" FOREIGN KEY ("clientId", "coachId") REFERENCES "ClientProfile"("id", "coachId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealIngredient" ADD CONSTRAINT "MealIngredient_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "MealEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementEvent" ADD CONSTRAINT "SupplementEvent_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementEvent" ADD CONSTRAINT "SupplementEvent_clientId_coachId_fkey" FOREIGN KEY ("clientId", "coachId") REFERENCES "ClientProfile"("id", "coachId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReschedule" ADD CONSTRAINT "EventReschedule_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMetric" ADD CONSTRAINT "BodyMetric_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMetric" ADD CONSTRAINT "BodyMetric_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants that Prisma's schema language cannot express.
ALTER TABLE "Exercise"
  ADD CONSTRAINT "Exercise_scope_owner_check"
  CHECK (
    ("scope" = 'GLOBAL' AND "ownerCoachId" IS NULL)
    OR ("scope" = 'COACH' AND "ownerCoachId" IS NOT NULL)
  );

ALTER TABLE "Workout"
  ADD CONSTRAINT "Workout_duration_check"
  CHECK ("durationMinutes" IS NULL OR ("durationMinutes" BETWEEN 1 AND 1440));

ALTER TABLE "AssignedSet"
  ADD CONSTRAINT "AssignedSet_reps_check"
  CHECK ("expectedReps" BETWEEN 1 AND 1000);

ALTER TABLE "WorkoutSetLog"
  ADD CONSTRAINT "WorkoutSetLog_assignment_check"
  CHECK (
    ("isExtra" = true AND "assignedSetId" IS NULL)
    OR ("isExtra" = false AND "assignedSetId" IS NOT NULL)
  ),
  ADD CONSTRAINT "WorkoutSetLog_values_check"
  CHECK (
    ("actualReps" IS NULL OR "actualReps" BETWEEN 0 AND 1000)
    AND ("actualWeight" IS NULL OR "actualWeight" BETWEEN 0 AND 10000)
  );

ALTER TABLE "MealEvent"
  ADD CONSTRAINT "MealEvent_nutrition_check"
  CHECK (
    ("expectedCalories" IS NULL OR "expectedCalories" BETWEEN 0 AND 20000)
    AND ("actualCalories" IS NULL OR "actualCalories" BETWEEN 0 AND 20000)
    AND ("expectedProteinGrams" IS NULL OR "expectedProteinGrams" BETWEEN 0 AND 2000)
    AND ("expectedCarbGrams" IS NULL OR "expectedCarbGrams" BETWEEN 0 AND 3000)
    AND ("expectedFatGrams" IS NULL OR "expectedFatGrams" BETWEEN 0 AND 1000)
    AND ("actualProteinGrams" IS NULL OR "actualProteinGrams" BETWEEN 0 AND 2000)
    AND ("actualCarbGrams" IS NULL OR "actualCarbGrams" BETWEEN 0 AND 3000)
    AND ("actualFatGrams" IS NULL OR "actualFatGrams" BETWEEN 0 AND 1000)
  );

ALTER TABLE "BodyMetric"
  ADD CONSTRAINT "BodyMetric_value_check"
  CHECK ("value" > 0 AND "value" <= 2000);
