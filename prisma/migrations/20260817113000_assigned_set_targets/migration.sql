ALTER TABLE "AssignedSet"
ADD COLUMN "targetRepsMin" INTEGER,
ADD COLUMN "targetRepsMax" INTEGER,
ADD COLUMN "targetWeight" DECIMAL(8,2),
ADD COLUMN "targetWeightUnit" "WeightUnit",
ADD COLUMN "targetEffort" DECIMAL(3,1);

UPDATE "AssignedSet"
SET "targetRepsMin" = "expectedReps", "targetRepsMax" = "expectedReps";
