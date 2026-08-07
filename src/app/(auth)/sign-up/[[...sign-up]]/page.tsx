import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="bg-muted/40 grid min-h-screen place-items-center p-6">
      <SignUp path="/sign-up" routing="path" />
    </main>
  );
}
