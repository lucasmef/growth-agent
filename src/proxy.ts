import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { isClerkConfigured, isDevelopmentAuthEnabled } from "@/lib/env";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/workspaces(.*)",
  "/api/projects(.*)",
]);

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkConfigured() || isDevelopmentAuthEnabled()) {
    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
