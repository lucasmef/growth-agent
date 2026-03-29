import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

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

  return db.user.upsert({
    where: {
      authProviderId: userId,
    },
    update: {
      email,
      name: clerkUser?.fullName ?? clerkUser?.firstName ?? undefined,
    },
    create: {
      authProviderId: userId,
      email,
      name: clerkUser?.fullName ?? clerkUser?.firstName ?? undefined,
    },
  });
}
