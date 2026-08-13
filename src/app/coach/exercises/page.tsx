import { requireActor } from "@/server/auth/current-user";
import { requireCoachProfileId } from "@/server/auth/authorization";
import { db } from "@/server/db/client";
import { createExerciseAction } from "@/app/actions/coach";
import { MutationForm } from "@/components/mutation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ExercisesPage() {
  const actor = await requireActor(["COACH"]);
  const coachId = requireCoachProfileId(actor);
  const exercises = await db.exercise.findMany({
    where: {
      isActive: true,
      OR: [{ scope: "GLOBAL" }, { ownerCoachId: coachId }],
    },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>Exercise catalog</CardTitle>
          <p className="text-muted-foreground text-sm">
            Global exercises plus your private catalog. Scheduled workouts
            retain a name snapshot after renames.
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{exercise.name}</p>
                <span className="text-muted-foreground text-xs">
                  {exercise.scope.toLowerCase()}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {exercise.muscleGroup} ·{" "}
                {exercise.equipment.replaceAll("_", " ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Custom exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <MutationForm
            action={createExerciseAction}
            submitLabel="Add exercise"
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" maxLength={120} required />
            </div>
            <SelectField
              name="muscleGroup"
              label="Muscle group"
              values={["CHEST", "BACK", "SHOULDERS", "LEGS", "ARMS", "CORE"]}
            />
            <SelectField
              name="equipment"
              label="Equipment"
              values={[
                "BARBELL",
                "DUMBBELL",
                "CABLE",
                "BODYWEIGHT",
                "PIN_LOADED_MACHINE",
                "PLATE_LOADED_MACHINE",
              ]}
            />
            <SelectField
              name="category"
              label="Category"
              values={["COMPOUND", "ISOLATION", "CARDIO", "MOBILITY"]}
            />
          </MutationForm>
        </CardContent>
      </Card>
    </div>
  );
}

function SelectField({
  name,
  label,
  values,
}: {
  name: string;
  label: string;
  values: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className="bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
      >
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </div>
  );
}
