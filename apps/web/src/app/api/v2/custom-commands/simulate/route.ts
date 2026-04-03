import { fail, ok } from "@/lib/api";
import { assertManagedGuild, readCustomCommands } from "@/lib/dashboard";
import { requireAuthUserId } from "@/lib/dashboard-auth";

function matchTrigger(
  mode: "exact" | "contains" | "starts_with" | "regex_safe",
  trigger: string,
  input: string
) {
  const t = trigger.toLowerCase();
  const i = input.toLowerCase();
  if (mode === "exact") return i === t;
  if (mode === "contains") return i.includes(t);
  if (mode === "starts_with") return i.startsWith(t);
  try {
    return new RegExp(trigger, "i").test(input);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const authUserId = await requireAuthUserId();
    const body = (await req.json()) as {
      guildId?: string;
      input?: string;
      roleIds?: string[];
      channelId?: string;
    };
    if (!body.guildId || !body.input) return fail("guildId and input are required.", 400, "BAD_REQUEST");
    const guild = await assertManagedGuild(authUserId, body.guildId);
    const list = readCustomCommands(guild.settings)
      .filter((item) => item.status === "published")
      .sort((a, b) => b.priority - a.priority);

    const roles = new Set((body.roleIds ?? []).map(String));
    const channelId = body.channelId ?? "";
    const found =
      list.find((item) => {
        if (!matchTrigger(item.matchMode, item.trigger, body.input!)) return false;
        if (item.conditions.roles.length > 0 && !item.conditions.roles.some((r) => roles.has(r))) return false;
        if (item.conditions.channels.length > 0 && !item.conditions.channels.includes(channelId)) return false;
        return true;
      }) ?? null;

    if (!found) return ok({ matched: false, output: null });

    return ok({
      matched: true,
      output: {
        type: found.responseType,
        text: found.responseText,
        embed: found.responseType === "embed"
          ? {
              title: found.embedTitle ?? found.name,
              description: found.embedDescription ?? found.responseText,
              color: found.embedColor ?? "#5b8cff"
            }
          : null,
        buttons: found.buttons ?? []
      },
      matchedCommand: {
        id: found.id,
        name: found.name,
        trigger: found.trigger,
        mode: found.matchMode
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed.";
    if (msg === "UNAUTHORIZED") return fail("Unauthorized", 401, "UNAUTHORIZED");
    if (msg === "You do not manage this guild.") return fail(msg, 403, "FORBIDDEN");
    return fail(msg, 400, "FAILED");
  }
}

