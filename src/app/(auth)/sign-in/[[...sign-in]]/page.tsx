import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="bg-muted/40 grid min-h-screen place-items-center p-6">
      <SignIn path="/sign-in" routing="path" />
    </main>
  );
}
