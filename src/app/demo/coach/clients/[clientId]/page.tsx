import { CoachClientDemo } from "@/components/demo/coach-client-demo";
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <CoachClientDemo clientId={clientId} />;
}
