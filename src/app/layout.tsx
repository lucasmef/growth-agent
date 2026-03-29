import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import {
  getDevelopmentAuthIdentity,
  isClerkConfigured,
  isDevelopmentAuthEnabled,
} from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Agent",
  description: "Agentic growth OS for Instagram and TikTok.",
};

async function HeaderContent({ children }: { children: React.ReactNode }) {
  const useClerk = isClerkConfigured() && !isDevelopmentAuthEnabled();
  const session = useClerk ? await auth() : null;
  const devIdentity = isDevelopmentAuthEnabled() ? getDevelopmentAuthIdentity() : null;

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          Growth Agent
        </Link>

        <nav className="site-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/onboarding">Onboarding</Link>
        </nav>

        <div className="auth-actions">
          {useClerk && session?.userId ? (
            <UserButton />
          ) : useClerk ? (
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
          ) : (
            <div className="helper-text">
              Dev auth ativo: {devIdentity?.email ?? "local-admin@growth-agent.dev"}
            </div>
          )}
        </div>
      </header>
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const useClerk = isClerkConfigured() && !isDevelopmentAuthEnabled();

  return (
    <html lang="pt-BR">
      <body>
        {useClerk ? (
          <ClerkProvider>
            <HeaderContent>{children}</HeaderContent>
          </ClerkProvider>
        ) : (
          <HeaderContent>{children}</HeaderContent>
        )}
      </body>
    </html>
  );
}
