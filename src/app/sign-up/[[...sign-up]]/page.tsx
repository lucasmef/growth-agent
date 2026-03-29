import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="page-shell auth-shell">
      <SignUp />
    </main>
  );
}
