import { getServerSession } from "@/server/session";

export async function requireAuthUserId() {
  const session = await getServerSession();
  const authUserId = session?.user?.id;
  if (!authUserId) {
    throw new Error("UNAUTHORIZED");
  }
  return authUserId;
}

