"use client";

import { authClient } from "@/lib/auth-client";
import { PrimaryButton, SecondaryButton } from "./ui";

export function AuthControls({ compact = false }: { compact?: boolean }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <SecondaryButton disabled>Loading session...</SecondaryButton>;
  }

  if (!session) {
    return (
      <PrimaryButton
        className={compact ? "h-8 px-3 py-1 text-xs" : ""}
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
      {!compact ? <span className="text-sm text-muted-foreground">Signed in as {session.user.name}</span> : null}
      <SecondaryButton
        className={compact ? "h-8 px-3 py-1 text-xs" : ""}
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
