import { PlatformRole } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import {
  getDevelopmentAuthIdentity,
  getPlatformAdminEmails,
  isDevelopmentAuthEnabled,
} from "@/lib/env";

function resolvePlatformRole(email: string) {
  const normalizedEmail = email.toLowerCase();
  const platformAdminEmails = getPlatformAdminEmails();

  if (
    platformAdminEmails.includes(normalizedEmail) ||
    (platformAdminEmails.length === 0 && isDevelopmentAuthEnabled())
  ) {
    return PlatformRole.ADMIN;
  }

  return PlatformRole.USER;
}

export async function requireAppUser() {
  if (isDevelopmentAuthEnabled()) {
    const identity = getDevelopmentAuthIdentity();
    const email = identity.email.toLowerCase();

    return db.user.upsert({
      where: {
        authProviderId: `dev:${email}`,
      },
      update: {
        email,
        name: identity.name,
        platformRole: resolvePlatformRole(email),
      },
      create: {
        authProviderId: `dev:${email}`,
        email,
        name: identity.name,
        platformRole: resolvePlatformRole(email),
      },
    });
  }

  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );
  const fallbackEmail = clerkUser?.emailAddresses[0];
  const email = primaryEmail?.emailAddress ?? fallbackEmail?.emailAddress;

  if (!email) {
    throw new Error("Authenticated user has no email address");
  }

  const normalizedEmail = email.toLowerCase();
  const platformRole = resolvePlatformRole(normalizedEmail);

  return db.user.upsert({
    where: {
      authProviderId: userId,
    },
    update: {
      email,
      name: clerkUser?.fullName ?? clerkUser?.firstName ?? undefined,
      platformRole,
    },
    create: {
      authProviderId: userId,
      email,
      name: clerkUser?.fullName ?? clerkUser?.firstName ?? undefined,
      platformRole,
    },
  });
}

export async function requirePlatformAdmin() {
  const appUser = await requireAppUser();

  if (appUser.platformRole !== PlatformRole.ADMIN) {
    throw new Error("Platform admin access required");
  }

  return appUser;
}
