import { auth } from "@clerk/nextjs/server";

export async function isAdmin(): Promise<boolean> {
  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId) {
    return false;
  }

  const { userId } = await auth();
  return userId === adminUserId;
}

export async function requireAdmin(): Promise<void> {
  const allowed = await isAdmin();
  if (!allowed) {
    throw new Error("Unauthorized");
  }
}
