"use client";

import { authClient } from "@/lib/auth-client";
import { PrimaryButton, SecondaryButton } from "./ui";

export function AuthControls() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <SecondaryButton disabled>Loading session...</SecondaryButton>;
  }

  if (!session) {
    return (
      <PrimaryButton
        onClick={async () => {
          await authClient.signIn.social({
            provider: "discord",
            callbackURL: "/dashboard"
          });
        }}
      >
        Continue with Discord
      </PrimaryButton>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Signed in as {session.user.name}</span>
      <SecondaryButton
        onClick={async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.href = "/";
              }
            }
          });
        }}
      >
        Sign out
      </SecondaryButton>
    </div>
  );
}
