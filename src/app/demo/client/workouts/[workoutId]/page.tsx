import { DemoWorkout } from "@/components/demo/demo-workout";
export default async function Page({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  return <DemoWorkout workoutId={workoutId} />;
}
