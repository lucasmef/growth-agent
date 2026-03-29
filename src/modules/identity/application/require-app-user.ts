import { PlatformRole } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { getPlatformAdminEmails } from "@/lib/env";

export async function requireAppUser() {
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
  const platformRole = getPlatformAdminEmails().includes(normalizedEmail)
    ? PlatformRole.ADMIN
    : PlatformRole.USER;

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
