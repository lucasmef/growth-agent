import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Agent",
  description: "Agentic growth OS for Instagram and TikTok.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="pt-BR">
      <ClerkProvider>
        <body>
          <header className="site-header">
            <Link className="brand" href="/">
              Growth Agent
            </Link>

            <nav className="site-nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/onboarding">Onboarding</Link>
            </nav>

            <div className="auth-actions">
              {session.userId ? (
                <UserButton />
              ) : (
                <>
                <SignInButton mode="modal">
                  <button className="button button-secondary" type="button">
                    Entrar
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="button button-primary" type="button">
                    Criar conta
                  </button>
                </SignUpButton>
                </>
              )}
            </div>
          </header>
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
