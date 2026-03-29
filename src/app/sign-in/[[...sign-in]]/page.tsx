import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="page-shell auth-shell">
      <SignIn />
    </main>
  );
}
