import type { ChatInputCommandInteraction, User } from "discord.js";

export function getTargetUser(
  interaction: ChatInputCommandInteraction,
  optionName = "user"
): User {
  return interaction.options.getUser(optionName) ?? interaction.user;
}

export function getAvatarUrl(user: User, size = 512) {
  return user.displayAvatarURL({
    extension: "png",
    forceStatic: false,
    size
  });
}
